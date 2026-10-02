/**
 * Pestaña "Pagos" del perfil del socio. El estado de cuenta y los botones
 * Cobrar / Avisar están en la cabecera del perfil; aquí va el detalle:
 * datos de la membresía, calendario del año y la lista de facturas.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ExternalLink, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { PaymentCalendar } from '../PaymentCalendar';
import { InvoicePrint, InvoiceRowMenu, StatusBadge, useCanVoidInvoice, VoidInvoiceButton, VoidInvoiceDialog } from '../billing/shared';
import type { MemberAccount } from '../../hooks/useMemberAccount';
import { effectiveStatus, fmtDate, monthLabel, type InvoiceRow } from '../../lib/billing';
import { formatMoney } from '../../lib/dashboardHelpers';
import { formatBs } from '../../lib/currency';

const INITIAL_ROWS = 12;

export function MemberPaymentsTab({ account, invoices, loading }: { account: MemberAccount; invoices: InvoiceRow[]; loading: boolean }) {
  const navigate = useNavigate();
  const { member, today, debt, lastPaid, plan } = account;
  const canVoid = useCanVoidInvoice();

  const [toPrint, setToPrint] = useState<InvoiceRow | null>(null);
  const [toDelete, setToDelete] = useState<InvoiceRow | null>(null);
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(
    () => [...invoices].sort((a, b) => (a.due_date < b.due_date ? 1 : a.due_date > b.due_date ? -1 : 0)),
    [invoices],
  );
  const rows = showAll ? sorted : sorted.slice(0, INITIAL_ROWS);
  const printMember = member && { name: member.name, cedula: member.cedula, member_number: member.member_number, plan: plan?.name, phone: member.phone };

  return (
    <div className="space-y-6">
      {/* Membresía y calendario */}
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-5">
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <Meta label="Plan" value={plan ? plan.name : 'Sin plan'} sub={plan ? `${formatMoney(Number(plan.price))} · ${plan.duration_days} días` : undefined} />
            <Meta label="Al día hasta" value={member?.paid_until ? monthLabel(member.paid_until) : '—'} />
            <Meta
              label="Último pago"
              value={lastPaid ? fmtDate(lastPaid.paid_at) : '—'}
              sub={lastPaid ? `${formatMoney(Number(lastPaid.amount))}${lastPaid.method ? ` · ${lastPaid.method}` : ''}` : undefined}
            />
            <Meta label="Facturas" value={String(invoices.length)} sub={debt ? `${debt.count} sin pagar` : invoices.length ? 'Todas pagadas' : undefined} />
          </dl>

          <div className="border-t border-border pt-4">
            <PaymentCalendar invoices={invoices} startDate={member?.start_date} />
          </div>
        </CardContent>
      </Card>

      {/* Facturas */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Facturas
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate('/facturacion')}>
            Ir a Facturación <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted/60" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
              Este socio todavía no tiene facturas.
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm" data-testid="member-invoices">
                <thead>
                  <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Período</th>
                    <th className="px-4 py-2.5 font-medium">Vence</th>
                    <th className="px-4 py-2.5 font-medium">Estado</th>
                    <th className="px-4 py-2.5 font-medium">Pago</th>
                    <th className="px-4 py-2.5 font-medium text-right">Monto</th>
                    <th className="px-4 py-2.5"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inv) => {
                    const st = effectiveStatus(inv, today);
                    return (
                      <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <span className="block">{inv.concept || monthLabel(inv.due_date.slice(0, 10))}</span>
                          <span className="block font-mono text-xs text-muted-foreground">{inv.invoice_number}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{fmtDate(inv.due_date)}</td>
                        <td className="px-4 py-3"><StatusBadge status={st} /></td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {st === 'Pagada' ? (
                            <>
                              <span className="block text-foreground tabular-nums">{fmtDate(inv.paid_at)}</span>
                              <span className="block text-xs">{[inv.method, inv.payments?.currency === 'VES' && inv.payments.amount_original != null && formatBs(Number(inv.payments.amount_original)), inv.reference && `Ref. ${inv.reference}`].filter(Boolean).join(' · ')}</span>
                            </>
                          ) : st === 'Anulada' ? (
                            <span className="block max-w-[220px] truncate text-xs italic" title={inv.void_reason ?? ''}>{inv.void_reason ?? 'Anulada'}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold tabular-nums ${st === 'Anulada' ? 'text-muted-foreground line-through' : ''}`}>{formatMoney(Number(inv.amount))}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canVoid(inv) && <VoidInvoiceButton inv={inv} onVoid={() => setToDelete(inv)} />}
                            <InvoiceRowMenu
                              inv={inv}
                              canVoid={canVoid(inv)}
                              onPrint={() => setToPrint(inv)}
                              onVoid={() => setToDelete(inv)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sorted.length > INITIAL_ROWS && (
                <div className="border-t border-border p-2 text-center">
                  <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? 'Mostrar menos' : `Ver las ${sorted.length} facturas`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <InvoicePrint invoice={toPrint} member={printMember || undefined} onClose={() => setToPrint(null)} />
      <VoidInvoiceDialog invoice={toDelete} memberName={member?.name ?? 'El socio'} onClose={() => setToDelete(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Meta({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}
