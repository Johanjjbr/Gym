/**
 * Pagos del día: para el chequeo/cierre diario de recepción.
 * - Pagos por fecha de pago (coincide con el estado de cuenta del banco).
 * - Totales por método y por moneda ($ y Bs).
 * - Anulados se muestran tachados con su motivo (no suman).
 * - Aviso aparte: pagos registrados ese día con fecha anterior.
 * - Exportar CSV e imprimir cierre.
 */
import { useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Download, Loader2, Printer, Wallet } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useDailyPayments } from '../../hooks/useInvoices';
import {
  amountLabel, isVoided, paymentsCsv, paymentTime, summarizeDay, type DayPayment, type DaySummary,
} from '../../lib/dailyPayments';
import { formatBs, formatRate, formatUSD } from '../../lib/currency';
import { addDays, toDateOnly } from '../../lib/dashboardHelpers';
import { fmtDate } from '../../lib/billing';
import { useGymInfo } from './shared';

const longDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Props {
  memberById: Map<string, { name: string }>;
  onOpenInvoice: (invoiceId: string) => void;
}

export function DailyPayments({ memberById, onOpenInvoice }: Props) {
  const today = toDateOnly(new Date());
  const [day, setDay] = useState(today);
  const q = useDailyPayments(day);
  const gym = useGymInfo();
  const payments = q.data?.payments ?? [];
  const backdated = q.data?.backdated ?? [];
  const sum = summarizeDay(payments);
  const isToday = day === today;
  const nameOf = (p: DayPayment) =>
    p.users?.name ?? (p.user_id && memberById.get(p.user_id)?.name) ?? (p.member_name ? `${p.member_name} (eliminado)` : 'Socio eliminado');

  const exportCsv = () => {
    const blob = new Blob(['﻿' + paymentsCsv(day, payments)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pagos_${day}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const printClose = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(closingHtml(gym.name, day, payments, sum, nameOf));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-4" data-testid="daily-payments">
      {/* Cabecera con navegación de fecha */}
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Pagos del {isToday ? 'día' : fmtDate(day)}</h2>
            <p className="text-sm text-muted-foreground">{capital(longDate(day))}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border border-border">
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-r-none" onClick={() => setDay(addDays(day, -1))} aria-label="Día anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <label className="flex h-9 items-center gap-2 border-x border-border px-3 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={day}
                  max={today}
                  onChange={(e) => e.target.value && setDay(e.target.value)}
                  className="bg-transparent text-sm outline-none [color-scheme:dark]"
                  aria-label="Elegir fecha"
                  data-testid="day-input"
                />
              </label>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-l-none" disabled={isToday} onClick={() => setDay(addDays(day, 1))} aria-label="Día siguiente">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {!isToday && <Button size="sm" variant="outline" className="h-9" onClick={() => setDay(today)}>Hoy</Button>}
            <Button size="sm" variant="outline" className="h-9" onClick={printClose} disabled={payments.length === 0}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir cierre
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={exportCsv} disabled={payments.length === 0}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Cargando pagos…</div>
      ) : q.error ? (
        <p className="py-10 text-center text-sm text-[#ff3b5c]">No se pudieron cargar los pagos: {(q.error as Error).message}</p>
      ) : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="day-totals">
            <MiniStat label="Total del día" value={formatUSD(sum.totalUsd)} hint={`${sum.count} pago${sum.count === 1 ? '' : 's'}${sum.voidedCount ? ` · ${sum.voidedCount} anulado${sum.voidedCount === 1 ? '' : 's'}` : ''}`} />
            <MiniStat label="Recibido en dólares" value={formatUSD(sum.usdReceived)} hint="Efectivo $ y Zelle" />
            <MiniStat label="Recibido en bolívares" value={formatBs(sum.vesReceived)} hint="Pago Móvil, transferencia y punto" />
          </div>

          {payments.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-14 text-center text-muted-foreground">
                <Wallet className="mx-auto mb-3 h-10 w-10 opacity-50" />
                No hay pagos registrados {isToday ? 'hoy' : 'este día'}.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              {/* Lista de pagos */}
              <Card className="bg-card border-border min-w-0 overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm" data-testid="day-payments-table">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Hora</th>
                          <th className="px-4 py-3 font-medium">Socio</th>
                          <th className="px-4 py-3 font-medium">Motivo</th>
                          <th className="px-4 py-3 font-medium">Método · Ref.</th>
                          <th className="px-4 py-3 font-medium text-right">Monto</th>
                          <th className="px-4 py-3 font-medium">Registró</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => {
                          const inv = p.invoices?.[0];
                          const voided = isVoided(p);
                          return (
                            <tr
                              key={p.id}
                              className={`border-b border-border last:border-0 ${inv?.id ? 'cursor-pointer hover:bg-muted/40' : ''} ${voided ? 'text-muted-foreground' : ''}`}
                              onClick={() => inv?.id && onOpenInvoice(inv.id)}
                              data-testid="day-payment-row"
                            >
                              <td className="px-4 py-3 tabular-nums">{paymentTime(p) ?? '—'}</td>
                              <td className="px-4 py-3">
                                <span className="block font-medium">{nameOf(p)}</span>
                                {inv?.invoice_number && <span className="block font-mono text-xs text-muted-foreground">{inv.invoice_number}</span>}
                              </td>
                              <td className="px-4 py-3 max-w-[220px]">
                                <span className="block">{inv?.concept ?? '—'}</span>
                                {voided && (
                                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]" title={inv?.void_reason ?? ''}>
                                    Anulado{inv?.void_reason ? `: ${inv.void_reason}` : ''}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="block">{p.method ?? '—'}</span>
                                {inv?.reference && <span className="block font-mono text-xs text-muted-foreground">Ref. {inv.reference}</span>}
                              </td>
                              <td className={`px-4 py-3 text-right tabular-nums ${voided ? 'line-through' : 'font-semibold'}`}>
                                <span className="block">{amountLabel(p)}</span>
                                {p.currency === 'VES' && (
                                  <span className="block text-xs font-normal text-muted-foreground">
                                    {formatUSD(Number(p.amount))}{p.exchange_rate ? ` · tasa ${formatRate(Number(p.exchange_rate))}` : ''}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{p.staff?.name ?? '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Totales por método */}
              <Card className="bg-card border-border h-fit">
                <CardContent className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">Por método de pago</h3>
                  <ul className="divide-y divide-border text-sm" data-testid="by-method">
                    {sum.byMethod.map((m) => (
                      <li key={m.method} className="flex items-start justify-between gap-3 py-2">
                        <span>
                          <span className="block">{m.method}</span>
                          <span className="block text-xs text-muted-foreground">{m.count} pago{m.count === 1 ? '' : 's'}</span>
                        </span>
                        <span className="text-right tabular-nums">
                          <span className="block font-semibold">{m.currency === 'VES' ? formatBs(m.amount) : formatUSD(m.amount)}</span>
                          {m.currency === 'VES' && <span className="block text-xs text-muted-foreground">{formatUSD(m.usd)}</span>}
                        </span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between pt-3 font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">{formatUSD(sum.totalUsd)}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {backdated.length > 0 && (
            <Card className="border-[#eab308]/30 bg-[#eab308]/5">
              <CardContent className="p-4 text-sm">
                <p className="mb-2 flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4 text-[#eab308]" />
                  Registrados este día con fecha de pago anterior ({backdated.length})
                </p>
                <p className="mb-2 text-xs text-muted-foreground">No suman en este día: cuentan en la fecha en que se pagaron.</p>
                <ul className="space-y-1">
                  {backdated.map((p) => (
                    <li key={p.id} className={`flex flex-wrap justify-between gap-2 ${isVoided(p) ? 'text-muted-foreground line-through' : ''}`}>
                      <span>{nameOf(p)} · {p.invoices?.[0]?.concept ?? '—'} · pagado el {fmtDate(p.date)}</span>
                      <span className="tabular-nums">{p.method} · {amountLabel(p)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Hoja de cierre para imprimir. */
function closingHtml(gymName: string, day: string, payments: DayPayment[], sum: DaySummary, nameOf: (p: DayPayment) => string) {
  const rows = payments
    .map((p) => {
      const inv = p.invoices?.[0];
      const voided = isVoided(p);
      return `<tr class="${voided ? 'void' : ''}">
        <td>${paymentTime(p) ?? ''}</td><td>${esc(nameOf(p))}</td><td>${esc(inv?.concept ?? '')}${voided ? ` <em>(anulado${inv?.void_reason ? ': ' + esc(inv.void_reason) : ''})</em>` : ''}</td>
        <td>${esc(p.method ?? '')}</td><td>${esc(inv?.reference ?? '')}</td><td class="r">${amountLabel(p)}</td><td>${esc(p.staff?.name ?? '')}</td></tr>`;
    })
    .join('');
  const methods = sum.byMethod
    .map((m) => `<tr><td>${esc(m.method)}</td><td class="r">${m.count}</td><td class="r">${m.currency === 'VES' ? formatBs(m.amount) : formatUSD(m.amount)}</td><td class="r">${formatUSD(m.usd)}</td></tr>`)
    .join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cierre ${day}</title>
  <style>body{font-family:system-ui,sans-serif;font-size:12px;color:#111;padding:16px}h1{font-size:18px;margin:0}h2{font-size:14px;margin:18px 0 6px}
  table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:5px;text-align:left}th{background:#f3f3f3}.r{text-align:right}
  .void td{color:#888;text-decoration:line-through}.tot td{font-weight:700}.sign{margin-top:40px;display:flex;gap:60px}.sign div{border-top:1px solid #333;padding-top:4px;width:200px}</style></head>
  <body><h1>${esc(gymName)} · Cierre de caja</h1><p>${capital(longDate(day))}</p>
  <h2>Resumen</h2><table><tr><th>Método</th><th class="r">Pagos</th><th class="r">Monto</th><th class="r">Equivalente $</th></tr>${methods}
  <tr class="tot"><td>Total</td><td class="r">${sum.count}</td><td></td><td class="r">${formatUSD(sum.totalUsd)}</td></tr></table>
  <p>Recibido en dólares: <b>${formatUSD(sum.usdReceived)}</b> · Recibido en bolívares: <b>${formatBs(sum.vesReceived)}</b>${sum.voidedCount ? ` · Anulados: ${sum.voidedCount}` : ''}</p>
  <h2>Detalle</h2><table><tr><th>Hora</th><th>Socio</th><th>Motivo</th><th>Método</th><th>Ref.</th><th class="r">Monto</th><th>Registró</th></tr>${rows}</table>
  <div class="sign"><div>Entregado por</div><div>Revisado por</div></div></body></html>`;
}
