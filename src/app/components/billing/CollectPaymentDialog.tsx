/**
 * Panel único de cobro. Reemplaza "Registrar Cobro", "Pago Adelantado" y
 * "Pagar factura": se elige el socio, cuántos períodos paga, y se ve antes de
 * confirmar exactamente qué meses se saldan y cuánto se cobra.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, Minus, Plus, Search, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { usePayPeriods, type BillingMember } from '../../hooks/useInvoices';
import { buildPaymentPlan, fmtDate, paidThrough, type InvoiceRow } from '../../lib/billing';
import { formatBs, formatRate, methodCurrency, needsReference as methodNeedsReference, PAYMENT_METHODS, rateStatus, toBs, type PaymentMethod } from '../../lib/currency';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { ExchangeRateDialog } from './ExchangeRateButton';
import { formatMoney, toDateOnly } from '../../lib/dashboardHelpers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: BillingMember[];
  invoices: InvoiceRow[];
  /** Socio preseleccionado (desde una fila de la tabla o "Socios con deuda"). */
  initialUserId?: string | null;
}

const MAX_PERIODS = 12;

export function CollectPaymentDialog({ open, onOpenChange, members, invoices, initialUserId }: Props) {
  const today = toDateOnly(new Date());
  const pay = usePayPeriods();

  const [userId, setUserId] = useState<string | null>(null);
  const [months, setMonths] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>('Efectivo $');
  const [rateOpen, setRateOpen] = useState(false);
  const ratesQ = useExchangeRates();
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(today);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Reiniciar cada vez que se abre
  useEffect(() => {
    if (!open) return;
    setUserId(initialUserId ?? null);
    setMethod('Efectivo $');
    setReference('');
    setPaidOn(toDateOnly(new Date()));
    setNotes('');
    setShowNotes(false);
  }, [open, initialUserId]);

  const member = members.find((m) => m.id === userId) ?? null;
  const memberInvoices = useMemo(() => invoices.filter((i) => i.user_id === userId), [invoices, userId]);
  const openCount = memberInvoices.filter((i) => i.status === 'Pendiente' || i.status === 'Vencida').length;

  // Por defecto: todo lo adeudado (o 1 período si está al día)
  useEffect(() => {
    if (userId) setMonths(Math.min(Math.max(openCount, 1), MAX_PERIODS));
  }, [userId, openCount]);

  const plan = useMemo(
    () => buildPaymentPlan(memberInvoices, member?.plans ?? null, months, today, member),
    [memberInvoices, member, months, today],
  );

  const blocker = !member
    ? null
    : member.is_free_user
      ? 'Este socio está exento de pago.'
      : !member.plans
        ? 'El socio no tiene un plan asignado. Asígnale uno desde su ficha para poder cobrarle.'
        : Number(member.plans.price) <= 0
          ? 'El plan del socio no tiene precio.'
          : null;

  const needsReference = methodNeedsReference(method);
  const currency = methodCurrency(method);
  const rate = useMemo(() => rateStatus(ratesQ.data ?? [], paidOn), [ratesQ.data, paidOn]);
  // Igual que el servidor: cada factura se convierte y redondea por separado
  const totalBs = rate.rate ? plan.periods.reduce((a, p) => a + toBs(p.amount, rate.rate!), 0) : null;
  const missingRate = currency === 'VES' && !ratesQ.isLoading && rate.state === 'missing';
  const canSubmit = !!member && !blocker && months >= 1 && !pay.isPending && paidOn <= today && !(currency === 'VES' && !rate.rate);

  const submit = () => {
    if (!member || !canSubmit) return;
    pay.mutate(
      { user_id: member.id, months, method, reference, notes, paid_on: paidOn },
      {
        onSuccess: (r) => {
          const bs = currency === 'VES' && totalBs !== null ? ` (${formatBs(totalBs)})` : '';
          toast.success(`Cobrado ${formatMoney(Number(r.total))}${bs} a ${member.name}`, {
            description: `${r.paid} período${r.paid === 1 ? '' : 's'}${plan.coversThrough ? ` · al día hasta el ${fmtDate(plan.coversThrough)}` : ''}`,
          });
          onOpenChange(false);
        },
        onError: (e: Error) => toast.error('No se pudo registrar el cobro', { description: e.message }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-xl max-h-[92vh] overflow-y-auto" data-testid="collect-dialog">
        <DialogHeader>
          <DialogTitle>Cobrar</DialogTitle>
          <DialogDescription>Se saldan primero los meses adeudados más antiguos; si paga más, se adelantan los siguientes.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {/* Socio */}
          {member ? (
            <MemberSummary member={member} openCount={openCount} onChange={() => setUserId(null)} />
          ) : (
            <MemberPicker members={members} invoices={invoices} onPick={setUserId} />
          )}

          {member && blocker && (
            <p className="rounded-lg border border-[#eab308]/30 bg-[#eab308]/10 p-3 text-sm" role="alert">
              {blocker}
            </p>
          )}

          {member && !blocker && (
            <>
              {/* Períodos */}
              <section className="space-y-2">
                <Label>Períodos a cobrar</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center rounded-lg border border-border">
                    <Button type="button" variant="ghost" size="icon" aria-label="Menos" disabled={months <= 1} onClick={() => setMonths((m) => Math.max(1, m - 1))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 text-center text-lg tabular-nums" data-testid="periods-count" aria-live="polite">
                      {months}
                    </span>
                    <Button type="button" variant="ghost" size="icon" aria-label="Más" disabled={months >= MAX_PERIODS} onClick={() => setMonths((m) => Math.min(MAX_PERIODS, m + 1))}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {openCount > 1 && (
                    <QuickChip active={months === openCount} onClick={() => setMonths(Math.min(openCount, MAX_PERIODS))}>
                      Todo lo adeudado ({openCount})
                    </QuickChip>
                  )}
                  {[3, 6, 12].filter((n) => n !== openCount).map((n) => (
                    <QuickChip key={n} active={months === n} onClick={() => setMonths(n)}>
                      {n} meses
                    </QuickChip>
                  ))}
                </div>
              </section>

              {/* Vista previa */}
              <section className="rounded-lg border border-border">
                <ul className="divide-y divide-border" data-testid="payment-preview">
                  {plan.periods.map((p) => (
                    <li key={p.due} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        {p.label}
                        <PeriodTag overdue={p.overdue} isNew={!p.invoiceId} future={p.due > today} />
                      </span>
                      <span className="tabular-nums">{formatMoney(p.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-3">
                  <span className="text-sm text-muted-foreground">
                    {plan.coversThrough ? `Queda al día hasta el ${fmtDate(plan.coversThrough)}` : ''}
                  </span>
                  <span className="text-right">
                    <span className="block text-2xl font-semibold tabular-nums" data-testid="payment-total">
                      {formatMoney(plan.total)}
                    </span>
                    {currency === 'VES' && totalBs !== null && (
                      <span className="block text-sm tabular-nums text-muted-foreground" data-testid="payment-total-bs">
                        = <span className="font-semibold text-foreground">{formatBs(totalBs)}</span> · tasa {formatRate(rate.rate!)}
                        {rate.state === 'recent' && ` del ${rate.rateDate!.slice(8, 10)}/${rate.rateDate!.slice(5, 7)}`}
                      </span>
                    )}
                  </span>
                </div>
              </section>

              {/* Método: define la moneda */}
              <section className="space-y-2">
                <Label>Método de pago</Label>
                <div className="grid gap-3 sm:grid-cols-[2fr_3fr]" role="radiogroup" aria-label="Método de pago">
                  {([['En dólares', PAYMENT_METHODS.filter((m) => methodCurrency(m) === 'USD')], ['En bolívares', PAYMENT_METHODS.filter((m) => methodCurrency(m) === 'VES')]] as const).map(([title, list]) => (
                    <div key={title} className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">{title}</p>
                      <div className={`grid gap-2 ${list.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {list.map((m) => (
                          <button
                            key={m}
                            type="button"
                            role="radio"
                            aria-checked={method === m}
                            onClick={() => setMethod(m)}
                            className={`h-10 rounded-lg border px-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              method === m ? 'border-[#10f94e] bg-[#10f94e]/10 text-[#10f94e]' : 'border-border hover:bg-muted'
                            }`}
                            data-testid={`method-${m}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {missingRate && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#ff3b5c]/30 bg-[#ff3b5c]/10 p-3 text-sm" role="alert">
                    <span>
                      No hay tasa BCV cargada{paidOn === today ? ' para hoy' : ` para el ${paidOn.split('-').reverse().join('/')}`}. Cárgala para cobrar en bolívares.
                    </span>
                    <Button type="button" size="sm" variant="outline" onClick={() => setRateOpen(true)}>Cargar tasa</Button>
                  </div>
                )}
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="collect-ref">Referencia{needsReference ? '' : ' (opcional)'}</Label>
                  <Input
                    id="collect-ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={needsReference ? 'Nro. de operación' : '—'}
                    data-testid="input-reference"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collect-date">Fecha de pago</Label>
                  <Input
                    id="collect-date"
                    type="date"
                    value={paidOn}
                    max={today}
                    onChange={(e) => setPaidOn(e.target.value || today)}
                    data-testid="input-paid-on"
                  />
                  {paidOn !== today && <p className="text-xs text-muted-foreground">Se registrará con fecha anterior.</p>}
                </div>
              </div>

              {showNotes ? (
                <div className="space-y-2">
                  <Label htmlFor="collect-notes">Notas</Label>
                  <Textarea id="collect-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              ) : (
                <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setShowNotes(true)}>
                  + Agregar nota
                </button>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-semibold min-w-40"
              data-testid="btn-confirm-collect"
            >
              {pay.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {member && !blocker
                    ? `Cobrar ${currency === 'VES' && totalBs !== null ? formatBs(totalBs) : formatMoney(plan.total)}`
                    : 'Cobrar'}
                </>
              )}
            </Button>
          </div>
        </form>
        <ExchangeRateDialog open={rateOpen} onOpenChange={setRateOpen} />
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

function MemberSummary({ member, openCount, onChange }: { member: BillingMember; openCount: number; onChange: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3" data-testid="selected-member">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 rounded-full bg-[#10f94e]/10 p-2 text-[#10f94e]">
          <UserRound className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{member.name}</p>
          <p className="text-xs text-muted-foreground">
            {[member.cedula && `CI ${member.cedula}`, member.plans ? `${member.plans.name} · ${formatMoney(Number(member.plans.price))}` : 'Sin plan']
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="text-xs mt-1">
            <StatusDot status={member.status} /> {member.status}
            {' · '}
            {openCount > 0 ? (
              <span className="text-[#ff3b5c]">
                {openCount} período{openCount === 1 ? '' : 's'} sin pagar
              </span>
            ) : member.paid_until ? (
              <span className="text-muted-foreground">Al día hasta el {fmtDate(paidThrough(member))}</span>
            ) : (
              <span className="text-muted-foreground">Sin pagos registrados</span>
            )}
          </p>
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onChange} aria-label="Cambiar socio">
        <X className="h-4 w-4 mr-1" /> Cambiar
      </Button>
    </div>
  );
}

function MemberPicker({ members, invoices, onPick }: { members: BillingMember[]; invoices: InvoiceRow[]; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const owed = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of invoices) if (i.status === 'Pendiente' || i.status === 'Vencida') m.set(i.user_id, (m.get(i.user_id) ?? 0) + Number(i.amount));
    return m;
  }, [invoices]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = members.filter(
      (m) =>
        !term ||
        m.name.toLowerCase().includes(term) ||
        m.cedula?.toLowerCase().includes(term) ||
        m.member_number?.toLowerCase().includes(term),
    );
    // Primero los que deben
    return list.sort((a, b) => (owed.get(b.id) ?? 0) - (owed.get(a.id) ?? 0)).slice(0, 8);
  }, [members, q, owed]);

  useEffect(() => setActive(0), [q]);

  return (
    <div className="space-y-2">
      <Label htmlFor="collect-member">Socio</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id="collect-member"
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === 'Enter' && results[active]) { e.preventDefault(); onPick(results[active].id); }
          }}
          placeholder="Nombre, cédula o N° de socio"
          className="pl-9"
          role="combobox"
          aria-expanded
          aria-controls="collect-member-list"
          autoComplete="off"
          data-testid="search-member"
        />
      </div>
      <ul id="collect-member-list" role="listbox" className="rounded-lg border border-border divide-y divide-border max-h-72 overflow-y-auto">
        {results.length === 0 && <li className="p-3 text-sm text-muted-foreground">Sin resultados</li>}
        {results.map((m, i) => {
          const debt = owed.get(m.id) ?? 0;
          return (
            <li key={m.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => onPick(m.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? 'bg-muted' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[m.cedula && `CI ${m.cedula}`, m.plans?.name ?? 'Sin plan', m.is_free_user && 'Exento', m.status !== 'Activo' && m.status]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {debt > 0 && <span className="shrink-0 text-xs text-[#ff3b5c] tabular-nums">debe {formatMoney(debt)}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function QuickChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 rounded-full border px-3 text-xs transition-colors ${active ? 'border-[#10f94e] text-[#10f94e] bg-[#10f94e]/10' : 'border-border text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}

function PeriodTag({ overdue, isNew, future }: { overdue: boolean; isNew: boolean; future: boolean }) {
  if (isNew && !future) return <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-muted text-muted-foreground">Mes actual</span>;
  if (overdue) return <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-[#ff3b5c]/15 text-[#ff3b5c]">Vencida</span>;
  if (isNew) return <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-[#3b82f6]/15 text-[#60a5fa]">Adelanto</span>;
  return <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-[#eab308]/15 text-[#eab308]">Pendiente</span>;
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'Activo' ? '#10f94e' : status === 'Suspendido' ? '#ff3b5c' : '#6b7280';
  return <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: color }} aria-hidden />;
}
