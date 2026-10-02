/**
 * Pestaña "Pagos" de la ficha del socio.
 *  1. Estado de cuenta: si debe, cuánto y desde cuándo, o hasta cuándo está al día,
 *     con un único botón "Cobrar" (el mismo panel que en Facturación).
 *  2. Calendario del año.
 *  3. Una sola lista de facturas (antes se mostraba la misma lista dos veces).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, FileText, Gift, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { PaymentCalendar } from '../PaymentCalendar';
import { CollectPaymentDialog } from '../billing/CollectPaymentDialog';
import { DeleteInvoiceDialog, InvoicePrint, InvoiceRowMenu, NotifyButton, StatusBadge, useCanDeleteInvoice, useGymInfo } from '../billing/shared';
import { useBillingMember } from '../../hooks/useInvoices';
import {
  dueInWords, effectiveStatus, fmtDate, membersWithDebt, monthLabel, nextDueFor, overdueReminderText, REMINDER_DAYS,
  upcomingReminderText, type InvoiceRow, type NextDue,
} from '../../lib/billing';
import { daysBetween, formatMoney, toDateOnly } from '../../lib/dashboardHelpers';

const INITIAL_ROWS = 12;

export function MemberPaymentsTab({ userId, invoices, loading }: { userId: string; invoices: InvoiceRow[]; loading: boolean }) {
  const navigate = useNavigate();
  const today = toDateOnly(new Date());
  const { data: member } = useBillingMember(userId);
  const canDelete = useCanDeleteInvoice();

  const [collectOpen, setCollectOpen] = useState(false);
  const [toPrint, setToPrint] = useState<InvoiceRow | null>(null);
  const [toDelete, setToDelete] = useState<InvoiceRow | null>(null);
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(
    () => [...invoices].sort((a, b) => (a.due_date < b.due_date ? 1 : a.due_date > b.due_date ? -1 : 0)),
    [invoices],
  );
  const debt = useMemo(() => membersWithDebt(invoices, today)[0], [invoices, today]);
  const lastPaid = useMemo(
    () => invoices.filter((i) => i.status === 'Pagada' && i.paid_at).sort((a, b) => (a.paid_at! < b.paid_at! ? 1 : -1))[0],
    [invoices],
  );
  const gym = useGymInfo();
  // Próximo vencimiento (aunque la factura del período todavía no exista)
  const next = useMemo(() => (member ? nextDueFor(member, invoices, today) : null), [member, invoices, today]);
  const daysLeft = next ? daysBetween(today, next.due) : null;
  const overdue = !!debt && debt.overdueTotal > 0;
  const dueSoon = !overdue && daysLeft !== null && daysLeft >= 0 && daysLeft <= REMINDER_DAYS;
  const notice = !member
    ? null
    : overdue
      ? overdueReminderText(member.name, debt!, gym.name, formatMoney)
      : dueSoon && next
        ? upcomingReminderText(member.name, next, gym.name, formatMoney)
        : null;

  const plan = member?.plans ?? null;
  const exempt = member?.is_free_user === true;
  const cannotCollect = exempt ? 'Socio exento de pago' : !plan ? 'Sin plan asignado' : null;
  const rows = showAll ? sorted : sorted.slice(0, INITIAL_ROWS);
  const printMember = member && { name: member.name, cedula: member.cedula, member_number: member.member_number, plan: plan?.name, phone: member.phone };

  return (
    <div className="space-y-6">
      {/* Estado de cuenta */}
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <AccountStatus
              loading={loading || !member}
              exempt={exempt}
              hasPlan={!!plan}
              debt={debt}
              next={next}
              daysLeft={daysLeft}
              paidUntil={member?.paid_until ?? null}
            />
            <div className="flex flex-col items-stretch gap-1 md:items-end">
              <Button
                className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-semibold"
                onClick={() => setCollectOpen(true)}
                disabled={!member || !!cannotCollect}
                data-testid="member-btn-cobrar"
              >
                <Wallet className="mr-2 h-4 w-4" /> Cobrar
              </Button>
              {cannotCollect ? (
                <span className="text-xs text-muted-foreground">{cannotCollect}</span>
              ) : notice ? (
                <NotifyButton phone={member?.phone} message={notice} />
              ) : (
                <span className="text-xs text-muted-foreground">Deuda o meses por adelantado</span>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm md:grid-cols-4">
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
                              <span className="block text-xs">{[inv.method, inv.reference].filter(Boolean).join(' · ')}</span>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(Number(inv.amount))}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <InvoiceRowMenu
                              inv={inv}
                              canDelete={canDelete(inv)}
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

      {member && (
        <CollectPaymentDialog
          open={collectOpen}
          onOpenChange={setCollectOpen}
          members={[member]}
          invoices={invoices}
          initialUserId={member.id}
        />
      )}
      <InvoicePrint invoice={toPrint} member={printMember || undefined} onClose={() => setToPrint(null)} />
      <DeleteInvoiceDialog invoice={toDelete} memberName={member?.name ?? 'El socio'} onClose={() => setToDelete(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function AccountStatus({
  loading, exempt, hasPlan, debt, next, daysLeft, paidUntil,
}: {
  loading: boolean;
  exempt: boolean;
  hasPlan: boolean;
  debt: ReturnType<typeof membersWithDebt>[number] | undefined;
  next: NextDue | null;
  daysLeft: number | null;
  paidUntil: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }
  if (exempt) {
    return <StatusLine icon={Gift} tone="muted" title="Exento de pago" detail="No se le generan facturas ni se le suspende por deuda." />;
  }
  if (debt && debt.overdueTotal > 0) {
    return (
      <StatusLine
        icon={AlertTriangle}
        tone="red"
        title={`Debe ${formatMoney(debt.total)}`}
        detail={`${debt.count} período${debt.count === 1 ? '' : 's'} sin pagar · desde ${monthLabel(debt.oldestDue)} · ${debt.daysLate} día${debt.daysLate === 1 ? '' : 's'} de atraso`}
      />
    );
  }
  if (next && daysLeft !== null && daysLeft >= 0 && daysLeft <= REMINDER_DAYS) {
    return (
      <StatusLine
        icon={Clock}
        tone="amber"
        title={`${dueInWords(daysLeft)} · ${formatMoney(next.amount)}`}
        detail={`${next.label} · ${fmtDate(next.due)}. Avísale para que pague a tiempo: si no, se suspende al día siguiente.`}
      />
    );
  }
  if (!hasPlan) {
    return <StatusLine icon={AlertTriangle} tone="amber" title="Sin plan asignado" detail="Asígnale un plan desde Editar para poder facturarle." />;
  }
  return (
    <StatusLine
      icon={CheckCircle2}
      tone="green"
      title={paidUntil ? `Al día hasta ${monthLabel(paidUntil)}` : 'Sin deudas'}
      detail={next ? `Próximo vencimiento: ${fmtDate(next.due)} · ${formatMoney(next.amount)}` : 'Todavía no tiene pagos registrados.'}
    />
  );
}

const TONE = {
  red: 'text-[#ff3b5c] bg-[#ff3b5c]/10',
  amber: 'text-[#eab308] bg-[#eab308]/10',
  green: 'text-[#10f94e] bg-[#10f94e]/10',
  muted: 'text-muted-foreground bg-muted',
};

function StatusLine({ icon: Icon, tone, title, detail }: { icon: typeof Wallet; tone: keyof typeof TONE; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3" data-testid="account-status">
      <span className={`rounded-lg p-2.5 ${TONE[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado de cuenta</p>
        <p className="text-2xl font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function Meta({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}
