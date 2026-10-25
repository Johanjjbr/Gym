/**
 * HTML imprimible de los reportes mensuales ("Guardar como PDF" desde el navegador).
 */
import { formatBs, formatUSD } from './currency';
import { fmtDate } from './billing';
import { amountLabel, type DayPayment } from './dailyPayments';
import { hourLabel, type AttendanceReport, type IncomeReport, type MemberMovement, type MembersReport } from './reports';

export interface PrintHeader {
  orgName: string;
  rif?: string;
  logoUrl?: string;
  scope: string; // "Todas las sedes" / nombre de la sede
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
/** Solo logos guardados por el sistema (data URL de imagen). */
const logoOk = (v?: string) => !!v && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v);

function page(h: PrintHeader, title: string, monthLabel: string, body: string): string {
  const now = new Date();
  const generated = `${fmtDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)} ${now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)} · ${esc(monthLabel)}</title>
<style>
body{font-family:system-ui,sans-serif;font-size:12px;color:#111;padding:20px;max-width:960px;margin:auto}
header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px}
header img{height:52px;width:auto;max-width:140px;object-fit:contain}
h1{font-size:18px;margin:0}h2{font-size:14px;margin:18px 0 6px}.muted{color:#666}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}
.kpi{border:1px solid #ddd;border-radius:6px;padding:8px}.kpi b{display:block;font-size:16px}
table{width:100%;border-collapse:collapse;margin-bottom:6px}th,td{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left}
th{background:#f3f3f3}.r{text-align:right}.tot td{font-weight:700}.void td{color:#888;text-decoration:line-through}
footer{margin-top:24px;font-size:10px;color:#666}
@media print{body{padding:0}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body>
<header>${logoOk(h.logoUrl) ? `<img src="${h.logoUrl}" alt="">` : ''}<div><h1>${esc(h.orgName)} · ${esc(title)}</h1>
<div class="muted">${esc(monthLabel)} · ${esc(h.scope)}${h.rif ? ` · RIF ${esc(h.rif)}` : ''}</div></div></header>
${body}
<footer>Generado el ${esc(generated)}</footer></body></html>`;
}

const kpis = (items: [string, string][]) =>
  `<div class="kpis">${items.map(([k, v]) => `<div class="kpi"><span class="muted">${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`;

const table = (head: string[], rows: string[][], rightCols: number[] = []) =>
  rows.length === 0
    ? '<p class="muted">Sin registros.</p>'
    : `<table><tr>${head.map((x, i) => `<th${rightCols.includes(i) ? ' class="r"' : ''}>${esc(x)}</th>`).join('')}</tr>${rows
        .map((r) => `<tr>${r.map((c, i) => `<td${rightCols.includes(i) ? ' class="r"' : ''}>${c}</td>`).join('')}</tr>`)
        .join('')}</table>`;

export function incomeHtml(h: PrintHeader, r: IncomeReport, nameOf: (p: DayPayment) => string): string {
  const s = r.summary;
  const body =
    kpis([
      ['Total equivalente', formatUSD(s.totalUsd)],
      ['Recibido en dólares', formatUSD(s.usdReceived)],
      ['Recibido en bolívares', formatBs(s.vesReceived)],
      ['Pagos', `${s.count}${s.voidedCount ? ` (+${s.voidedCount} anulados)` : ''}`],
    ]) +
    '<h2>Por método de pago</h2>' +
    table(
      ['Método', 'Pagos', 'Monto', 'Equivalente $'],
      [
        ...s.byMethod.map((m) => [esc(m.method), String(m.count), m.currency === 'VES' ? formatBs(m.amount) : formatUSD(m.amount), formatUSD(m.usd)]),
        ['<b>Total</b>', `<b>${s.count}</b>`, '', `<b>${formatUSD(s.totalUsd)}</b>`],
      ],
      [1, 2, 3],
    ) +
    '<h2>Por día</h2>' +
    table(
      ['Día', 'Pagos', 'Dólares', 'Bolívares', 'Equivalente $'],
      r.byDay.map((d) => [fmtDate(d.day), String(d.count), formatUSD(d.usd), formatBs(d.ves), formatUSD(d.totalUsd)]),
      [1, 2, 3, 4],
    ) +
    '<h2>Detalle de pagos</h2>' +
    table(
      ['Fecha', 'Socio', 'Motivo', 'Método', 'Ref.', 'Monto'],
      r.payments.map((p) => {
        const inv = p.invoices?.[0];
        return [fmtDate(String(p.date)), esc(nameOf(p)), esc(inv?.concept ?? ''), esc(p.method ?? ''), esc(inv?.reference ?? ''), amountLabel(p)];
      }),
      [5],
    ) +
    (r.voided.length
      ? '<h2>Anulados</h2>' +
        table(
          ['Fecha', 'Socio', 'Motivo de anulación', 'Monto'],
          r.voided.map((p) => [fmtDate(String(p.date)), esc(nameOf(p)), esc(p.invoices?.[0]?.void_reason ?? ''), amountLabel(p)]),
          [3],
        )
      : '');
  return page(h, 'Ingresos del mes', r.range.label, body);
}

const movements = (list: MemberMovement[]) => table(['Fecha', 'Socio', 'Detalle'], list.map((m) => [fmtDate(m.date), esc(m.name), esc(m.detail)]));

export function membersHtml(h: PrintHeader, r: MembersReport): string {
  const body =
    kpis([
      [`Activos al ${fmtDate(r.closeDay)}`, String(r.activeAtClose)],
      ['Altas del mes', String(r.newMembers.length)],
      ['Bajas del mes', String(r.dropped.length)],
      ['Suspendidos al cierre', String(r.suspendedAtClose)],
    ]) +
    (r.historySince && r.historySince > r.range.from
      ? `<p class="muted">Las bajas y suspensiones se registran desde el ${fmtDate(r.historySince)}.</p>`
      : !r.historySince
        ? '<p class="muted">Todavía no hay bajas ni suspensiones registradas.</p>'
        : '') +
    '<h2>Activos por plan</h2>' +
    table(['Plan', 'Activos'], r.byPlan.map((p) => [esc(p.plan), String(p.active)]), [1]) +
    `<h2>Altas (${r.newMembers.length})</h2>` + movements(r.newMembers) +
    `<h2>Bajas (${r.dropped.length})</h2>` + movements(r.dropped) +
    `<h2>Suspensiones por falta de pago (${r.suspended.length})</h2>` + movements(r.suspended) +
    `<h2>Reactivaciones (${r.reactivated.length})</h2>` + movements(r.reactivated);
  return page(h, 'Socios del mes', r.range.label, body);
}

export function attendanceHtml(h: PrintHeader, r: AttendanceReport): string {
  const body =
    kpis([
      ['Visitas', String(r.visits)],
      ['Socios que vinieron', String(r.uniqueMembers)],
      ['Promedio por día', String(r.avgPerDay).replace('.', ',')],
      ['Hora pico', r.peakHour !== null ? hourLabel(r.peakHour) : '—'],
    ]) +
    '<h2>Visitas por día</h2>' +
    table(['Día', 'Visitas'], r.byDay.map((d) => [fmtDate(d.day), String(d.visits)]), [1]) +
    '<h2>Visitas por hora</h2>' +
    table(['Hora', 'Visitas'], r.byHour.map((x) => [hourLabel(x.hour), String(x.visits)]), [1]) +
    '<h2>Visitas por socio</h2>' +
    table(['Socio', 'Visitas', 'Última visita'], r.byMember.map((m) => [esc(m.name), String(m.visits), fmtDate(m.lastVisit)]), [1]) +
    `<h2>Socios activos que no vinieron (${r.absent.length})</h2>` +
    table(['Socio'], r.absent.map((m) => [esc(m.name)]));
  return page(h, 'Asistencia del mes', r.range.label, body);
}

/** Abre el reporte en una ventana nueva y lanza el diálogo de impresión. */
export function openPrint(html: string): boolean {
  const w = window.open('', '_blank', 'width=1000,height=750');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
  return true;
}

export function downloadCsv(csv: string, fileName: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
