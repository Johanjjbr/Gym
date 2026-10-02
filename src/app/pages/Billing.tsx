/**
 * Facturación
 *  - Indicadores fijos (no cambian con los filtros)
 *  - Vista "Facturas": búsqueda, estado y mes, sin recargar la página
 *  - Vista "Socios con deuda": una fila por socio, ordenada por atraso
 *  - Un único flujo "Cobrar" (CollectPaymentDialog)
 * Parámetros de URL: ?vista=deudores | por-vencer  ·  ?cobrar=<id de socio>
 */
import { toast } from 'sonner';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  AlertCircle, AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, Clock, CreditCard,
  FileText, MoreHorizontal, Phone, Printer, RefreshCw, Search, Trash2, Wallet, X,
} from 'lucide-react';

import { useInvoices, useBillingMembers, usePaymentsSince, useProcessRecurringPayments } from '../hooks/useInvoices';
import {
  billingKpis, dueInWords, effectiveStatus, fmtDate, isOpen, membersWithDebt, monthLabel, overdueReminderText, REMINDER_DAYS,
  statusCounts, upcomingRenewals, upcomingReminderText,
  type InvoiceRow, type InvoiceStatus,
} from '../lib/billing';
import { DeleteInvoiceDialog, InvoicePrint, InvoiceRowMenu, NotifyButton, StatusBadge, useCanDeleteInvoice, useGymInfo } from '../components/billing/shared';
import { formatMoney, monthStart, toDateOnly } from '../lib/dashboardHelpers';
import { CollectPaymentDialog } from '../components/billing/CollectPaymentDialog';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

type View = 'facturas' | 'deudores' | 'por-vencer';
type StatusFilter = 'all' | InvoiceStatus;

const PAGE_SIZE = 25;


export function Billing() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = toDateOnly(new Date());

  const vista = params.get('vista');
  const view: View = vista === 'deudores' || vista === 'por-vencer' ? vista : 'facturas';
  const setView = (v: View) => {
    const next = new URLSearchParams(params);
    if (v === 'facturas') next.delete('vista');
    else next.set('vista', v);
    setParams(next, { replace: true });
  };

  // ---- Datos
  const invoicesQ = useInvoices();
  const membersQ = useBillingMembers();
  const paymentsQ = usePaymentsSince(monthStart(today));
  const runBilling = useProcessRecurringPayments();
  const canDelete = useCanDeleteInvoice();

  const invoices = (invoicesQ.data ?? []) as InvoiceRow[];
  const members = membersQ.data ?? [];
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const nameOf = (id: string) => memberById.get(id)?.name ?? 'Socio eliminado';

  // ---- Estado de UI
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [month, setMonth] = useState<string>('all'); // 'yyyy-MM' | 'all'
  const [page, setPage] = useState(0);

  const [collectFor, setCollectFor] = useState<string | null | undefined>(undefined); // undefined = cerrado
  const [detail, setDetail] = useState<InvoiceRow | null>(null);
  const [toDelete, setToDelete] = useState<InvoiceRow | null>(null);
  const [toPrint, setToPrint] = useState<InvoiceRow | null>(null);

  // ?cobrar=<id> abre el cobro con el socio elegido (desde Dashboard, ficha del socio, etc.)
  useEffect(() => {
    const id = params.get('cobrar');
    if (id !== null) {
      setCollectFor(id || null);
      const next = new URLSearchParams(params);
      next.delete('cobrar');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => setPage(0), [search, status, month]);

  // ---- Derivados
  const kpis = useMemo(() => billingKpis(invoices, paymentsQ.data ?? [], today), [invoices, paymentsQ.data, today]);
  // Solo deuda VENCIDA; lo que vence pronto está en "Por vencer"
  const debtors = useMemo(() => membersWithDebt(invoices, today).filter((d) => d.overdueTotal > 0), [invoices, today]);
  const renewals = useMemo(() => upcomingRenewals(members, invoices, today), [members, invoices, today]);
  const renewalsTotal = renewals.reduce((s, r) => s + r.amount, 0);
  const gym = useGymInfo();
  const counts = useMemo(() => statusCounts(invoices, today), [invoices, today]);
  const months = useMemo(
    () => [...new Set(invoices.map((i) => i.due_date.slice(0, 7)))].sort().reverse(),
    [invoices],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices
      .filter((inv) => {
        if (status !== 'all' && effectiveStatus(inv, today) !== status) return false;
        if (month !== 'all' && inv.due_date.slice(0, 7) !== month) return false;
        if (!term) return true;
        const m = memberById.get(inv.user_id);
        return (
          m?.name.toLowerCase().includes(term) ||
          m?.cedula?.toLowerCase().includes(term) ||
          inv.invoice_number?.toLowerCase().includes(term) ||
          inv.concept?.toLowerCase().includes(term) ||
          inv.reference?.toLowerCase().includes(term) ||
          inv.notes?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => (a.due_date < b.due_date ? 1 : a.due_date > b.due_date ? -1 : (b.invoice_number ?? '').localeCompare(a.invoice_number ?? '')));
  }, [invoices, status, month, search, memberById, today]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasFilters = status !== 'all' || month !== 'all' || search !== '';

  const isInitialLoading = invoicesQ.isLoading || membersQ.isLoading;
  const loadError = invoicesQ.error || membersQ.error;


  return (
    <div className="space-y-6 min-w-0" data-testid="billing-page">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl mb-1">Facturación</h1>
          <p className="text-muted-foreground">Cobros, mensualidades y deudas</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Más acciones" data-testid="btn-more">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem
                disabled={runBilling.isPending}
                onSelect={() => runBilling.mutate()}
                data-testid="btn-procesar-recurrentes"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Ejecutar facturación ahora
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                Se ejecuta sola cada madrugada: marca vencidas, suspende y genera las facturas del mes.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-semibold"
            onClick={() => setCollectFor(null)}
            data-testid="btn-cobrar"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Cobrar
          </Button>
        </div>
      </div>

      {loadError && (
        <Card className="border-[#ff3b5c]/30">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-[#ff3b5c]" /> No se pudo cargar la facturación: {(loadError as Error).message}
            </span>
            <Button size="sm" variant="outline" onClick={() => { invoicesQ.refetch(); membersQ.refetch(); }}>Reintentar</Button>
          </CardContent>
        </Card>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" data-testid="billing-kpis">
        <Kpi
          label="Cobrado este mes"
          value={formatMoney(kpis.collectedThisMonth)}
          hint={`${kpis.paymentsThisMonth} pago${kpis.paymentsThisMonth === 1 ? '' : 's'} · ${monthLabel(today)}`}
          icon={Wallet}
          tone="green"
          loading={isInitialLoading || paymentsQ.isLoading}
        />
        <Kpi
          label="Por cobrar"
          value={formatMoney(kpis.openTotal)}
          hint={`${kpis.openCount} factura${kpis.openCount === 1 ? '' : 's'} abierta${kpis.openCount === 1 ? '' : 's'}`}
          icon={FileText}
          tone="blue"
          loading={isInitialLoading}
          onClick={() => { setView('facturas'); setStatus('all'); }}
        />
        <Kpi
          label="Vencido"
          value={formatMoney(kpis.overdueTotal)}
          hint={kpis.debtorCount ? `${kpis.debtorCount} socio${kpis.debtorCount === 1 ? '' : 's'} con deuda vencida` : 'Nadie tiene deuda vencida'}
          icon={AlertTriangle}
          tone={kpis.overdueTotal > 0 ? 'red' : 'muted'}
          loading={isInitialLoading}
          onClick={() => setView('deudores')}
        />
        <Kpi
          label={`Vencen en ${REMINDER_DAYS} días`}
          value={formatMoney(renewalsTotal)}
          hint={renewals.length ? `${renewals.length} socio${renewals.length === 1 ? '' : 's'} por avisar` : 'Nadie vence en estos días'}
          icon={CalendarClock}
          tone={renewals.length ? 'amber' : 'muted'}
          loading={isInitialLoading}
          onClick={() => setView('por-vencer')}
        />
      </div>

      {/* Vistas */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit" role="tablist">
        <TabButton active={view === 'facturas'} onClick={() => setView('facturas')} testId="tab-facturas">
          <FileText className="w-4 h-4" /> Facturas
        </TabButton>
        <TabButton active={view === 'deudores'} onClick={() => setView('deudores')} testId="tab-deudores">
          <AlertTriangle className="w-4 h-4" /> Con deuda
          {debtors.length > 0 && <span className="rounded-full bg-[#ff3b5c] px-1.5 text-[11px] text-white tabular-nums">{debtors.length}</span>}
        </TabButton>
        <TabButton active={view === 'por-vencer'} onClick={() => setView('por-vencer')} testId="tab-por-vencer">
          <CalendarClock className="w-4 h-4" /> Por vencer
          {renewals.length > 0 && <span className="rounded-full bg-[#eab308] px-1.5 text-[11px] text-black tabular-nums">{renewals.length}</span>}
        </TabButton>
      </div>

      {view === 'facturas' ? (
        <Card className="bg-card border-border min-w-0 overflow-hidden">
          <CardContent className="p-0">
            {/* Barra de filtros */}
            <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
              <div className="relative lg:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Socio, cédula, N° de factura o referencia…"
                  className="pl-9"
                  aria-label="Buscar facturas"
                  data-testid="search-invoices"
                />
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
                {([
                  ['all', 'Todas', counts.all],
                  ['Vencida', 'Vencidas', counts.Vencida],
                  ['Pendiente', 'Pendientes', counts.Pendiente],
                  ['Pagada', 'Pagadas', counts.Pagada],
                ] as const).map(([key, label, n]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={status === key}
                    onClick={() => setStatus(key)}
                    data-testid={`filter-${key}`}
                    className={`h-8 rounded-full border px-3 text-sm transition-colors ${
                      status === key ? 'border-foreground/40 bg-foreground/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label} <span className="tabular-nums opacity-70">{n}</span>
                  </button>
                ))}
              </div>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-9 rounded-md border border-border bg-input px-3 text-sm lg:ml-auto"
                aria-label="Filtrar por mes"
                data-testid="filter-month"
              >
                <option value="all">Todos los meses</option>
                {months.map((m) => (
                  <option key={m} value={m}>{monthLabel(`${m}-01`)}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground border-b border-border">
                <span>Mostrando {filtered.length} de {invoices.length} facturas</span>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => { setSearch(''); setStatus('all'); setMonth('all'); }}>
                  <X className="h-3.5 w-3.5" /> Limpiar filtros
                </button>
              </div>
            )}

            {/* Tabla */}
            {isInitialLoading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <FileText className="mx-auto mb-3 h-10 w-10 opacity-50" />
                {hasFilters ? 'Ninguna factura coincide con los filtros.' : 'Todavía no hay facturas.'}
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm" data-testid="invoices-table">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Socio</th>
                      <th className="px-4 py-3 font-medium">Motivo</th>
                      <th className="px-4 py-3 font-medium">Vence</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Referencia</th>
                      <th className="px-4 py-3 font-medium text-right">Monto</th>
                      <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((inv) => {
                      const st = effectiveStatus(inv, today);
                      const m = memberById.get(inv.user_id);
                      return (
                        <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/40" data-testid="invoice-row">
                          <td className="px-4 py-3">
                            <button className="text-left hover:underline" onClick={() => navigate(`/usuarios/${inv.user_id}`)}>
                              <span className="block font-medium">{m?.name ?? 'Socio eliminado'}</span>
                            </button>
                            <span className="block text-xs text-muted-foreground font-mono">{inv.invoice_number}</span>
                          </td>
                          <td className="px-4 py-3 max-w-[260px]">
                            <span className="block">{inv.concept || '—'}</span>
                            {inv.notes && <span className="block truncate text-xs italic text-muted-foreground" title={inv.notes}>{inv.notes}</span>}
                          </td>
                          <td className="px-4 py-3 tabular-nums">{fmtDate(inv.due_date)}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={st} />
                            {st === 'Pagada' && inv.paid_at && (
                              <span className="block text-xs text-muted-foreground mt-0.5">{fmtDate(inv.paid_at)} · {inv.method}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs tabular-nums">
                            {inv.reference ? (
                              <button
                                type="button"
                                className="hover:text-[#10f94e]"
                                title="Copiar referencia"
                                onClick={() => navigator.clipboard?.writeText(inv.reference!).then(() => toast.success('Referencia copiada'), () => {})}
                              >
                                {inv.reference}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(Number(inv.amount))}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {isOpen(inv) && (
                                <Button
                                  size="sm"
                                  className="bg-[#10f94e] text-black hover:bg-[#0ed145] h-8"
                                  onClick={() => setCollectFor(inv.user_id)}
                                  data-testid={`pay-${inv.invoice_number}`}
                                >
                                  Cobrar
                                </Button>
                              )}
                              <InvoiceRowMenu
                                inv={inv}
                                canDelete={canDelete(inv)}
                                onView={() => setDetail(inv)}
                                onPrint={() => setToPrint(inv)}
                                onDelete={() => setToDelete(inv)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {pageCount > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
                <span>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} aria-label="Página siguiente">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : view === 'deudores' ? (
        <Card className="bg-card border-border min-w-0 overflow-hidden">
          <CardContent className="p-0">
            {isInitialLoading ? (
              <TableSkeleton />
            ) : debtors.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">Ningún socio tiene deuda vencida.</div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm" data-testid="debtors-table">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Socio</th>
                      <th className="px-4 py-3 font-medium">Debe desde</th>
                      <th className="px-4 py-3 font-medium">Atraso</th>
                      <th className="px-4 py-3 font-medium text-right">Total adeudado</th>
                      <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {debtors.map((d) => {
                      const m = memberById.get(d.user_id);
                      return (
                        <tr key={d.user_id} className="border-b border-border last:border-0 hover:bg-muted/40" data-testid="debtor-row">
                          <td className="px-4 py-3">
                            <button className="text-left font-medium hover:underline" onClick={() => navigate(`/usuarios/${d.user_id}`)}>
                              {nameOf(d.user_id)}
                            </button>
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                              {m?.status && m.status !== 'Activo' && <span className="text-[#ff3b5c]">{m.status}</span>}
                              {m?.phone && (
                                <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                                  <Phone className="h-3 w-3" aria-hidden /> {m.phone}
                                </a>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {monthLabel(d.oldestDue)}
                            <span className="block text-xs text-muted-foreground">{d.count} factura{d.count === 1 ? '' : 's'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {d.daysLate > 0 ? (
                              <span className={d.daysLate > 30 ? 'text-[#ff3b5c] font-medium' : 'text-[#eab308]'}>
                                {d.daysLate} día{d.daysLate === 1 ? '' : 's'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Por vencer</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(d.total)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <NotifyButton phone={m?.phone} message={overdueReminderText(nameOf(d.user_id), d, gym.name, formatMoney)} />
                              <Button size="sm" className="bg-[#10f94e] text-black hover:bg-[#0ed145] h-8" onClick={() => setCollectFor(d.user_id)}>
                                Cobrar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border min-w-0 overflow-hidden">
          <CardContent className="p-0">
            <p className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
              Socios activos cuya mensualidad vence en los próximos {REMINDER_DAYS} días. Avísales para que paguen a tiempo:
              el día siguiente al vencimiento quedan suspendidos.
            </p>
            {isInitialLoading ? (
              <TableSkeleton />
            ) : renewals.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">Nadie vence en los próximos {REMINDER_DAYS} días.</div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm" data-testid="renewals-table">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Socio</th>
                      <th className="px-4 py-3 font-medium">Vence</th>
                      <th className="px-4 py-3 font-medium">Período</th>
                      <th className="px-4 py-3 font-medium text-right">Monto</th>
                      <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {renewals.map((r) => {
                      const m = memberById.get(r.user_id);
                      return (
                        <tr key={r.user_id} className="border-b border-border last:border-0 hover:bg-muted/40" data-testid="renewal-row">
                          <td className="px-4 py-3">
                            <button className="text-left font-medium hover:underline" onClick={() => navigate(`/usuarios/${r.user_id}`)}>
                              {nameOf(r.user_id)}
                            </button>
                            {m?.phone && (
                              <a href={`tel:${m.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                <Phone className="h-3 w-3" aria-hidden /> {m.phone}
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={r.daysLeft === 0 ? 'text-[#ff3b5c] font-medium' : 'text-[#eab308]'}>{dueInWords(r.daysLeft)}</span>
                            <span className="block text-xs text-muted-foreground tabular-nums">{fmtDate(r.due)}</span>
                          </td>
                          <td className="px-4 py-3">
                            {r.label}
                            <span className="block text-xs text-muted-foreground">{m?.plans?.name}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(r.amount)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <NotifyButton phone={m?.phone} message={upcomingReminderText(nameOf(r.user_id), r, gym.name, formatMoney)} />
                              <Button size="sm" variant="outline" className="h-8" onClick={() => setCollectFor(r.user_id)}>
                                Cobrar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---- Diálogos ---- */}
      <CollectPaymentDialog
        open={collectFor !== undefined}
        onOpenChange={(o) => !o && setCollectFor(undefined)}
        members={members}
        invoices={invoices}
        initialUserId={collectFor ?? null}
      />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  Factura {detail.invoice_number} <StatusBadge status={effectiveStatus(detail, today)} />
                </DialogTitle>
                <DialogDescription>{nameOf(detail.user_id)}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label="Motivo" value={detail.concept || '—'} wide />
                <Field label="Monto" value={formatMoney(Number(detail.amount))} />
                <Field label="Vence" value={fmtDate(detail.due_date)} />
                {detail.paid_at && <Field label="Pagada el" value={fmtDate(detail.paid_at)} />}
                {detail.method && <Field label="Método" value={detail.method} />}
                {detail.reference && <Field label="Referencia" value={detail.reference} />}
                {detail.invoice_number && <Field label="N° de factura" value={detail.invoice_number} />}
                {detail.notes && <Field label="Notas" value={detail.notes} wide />}
              </dl>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                {canDelete(detail) && (
                  <Button variant="ghost" className="text-[#ff3b5c] hover:text-[#ff3b5c] hover:bg-[#ff3b5c]/10 mr-auto" onClick={() => setToDelete(detail)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                  </Button>
                )}
                <Button variant="outline" onClick={() => setToPrint(detail)}>
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </Button>
                {isOpen(detail) && (
                  <Button className="bg-[#10f94e] text-black hover:bg-[#0ed145]" onClick={() => { setCollectFor(detail.user_id); setDetail(null); }}>
                    <CreditCard className="h-4 w-4 mr-2" /> Cobrar
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <DeleteInvoiceDialog
        invoice={toDelete}
        memberName={toDelete ? nameOf(toDelete.user_id) : ''}
        onClose={() => setToDelete(null)}
        onDeleted={() => setDetail(null)}
      />

      <InvoicePrint
        invoice={toPrint}
        onClose={() => setToPrint(null)}
        member={(() => {
          const m = toPrint ? memberById.get(toPrint.user_id) : undefined;
          return m && { name: m.name, cedula: m.cedula, member_number: m.member_number, plan: m.plans?.name, phone: m.phone };
        })()}
      />

      {runBilling.isPending && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-border bg-popover px-4 py-2 text-sm shadow-lg flex items-center gap-2">
          <Clock className="h-4 w-4 animate-spin" /> Ejecutando facturación…
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const TONES = {
  green: 'text-[#10f94e] bg-[#10f94e]/10',
  blue: 'text-[#3b82f6] bg-[#3b82f6]/10',
  red: 'text-[#ff3b5c] bg-[#ff3b5c]/10',
  amber: 'text-[#eab308] bg-[#eab308]/10',
  muted: 'text-muted-foreground bg-muted',
};

function Kpi({
  label, value, hint, icon: Icon, tone, loading, onClick,
}: {
  label: string; value: string; hint: string; icon: typeof Wallet; tone: keyof typeof TONES; loading?: boolean; onClick?: () => void;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-xl border border-border bg-card p-4 text-left transition-colors ${onClick ? 'hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums truncate">{value}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{loading ? ' ' : hint}</p>
        </div>
        <span className={`rounded-lg p-2 ${TONES[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Wrapper>
  );
}

function TabButton({ active, onClick, testId, children }: { active: boolean; onClick: () => void; testId: string; children: ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      data-testid={testId}
      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-muted/60" />
      ))}
    </div>
  );
}

