/**
 * Lógica pura de facturación (sin React ni Supabase), espejo de las funciones
 * SQL plan_next_due() y pay_periods() para mostrar vistas previas exactas.
 * Fechas como 'yyyy-MM-dd' en hora local del gimnasio.
 */
import { addDays, daysBetween, monthStart, shiftMonth, type DateStr } from './dashboardHelpers';

export type InvoiceStatus = 'Pendiente' | 'Vencida' | 'Pagada' | 'Anulada';

export interface InvoiceRow {
  id: string;
  user_id: string;
  plan_id?: string | null;
  invoice_number?: string | null;
  concept?: string | null;
  amount: number | string;
  due_date: string;
  status: InvoiceStatus | string;
  paid_at?: string | null;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
  created_at?: string | null;
  payment_id?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
  /** Cómo se cobró (embebido desde payments vía payment_id) */
  payments?: {
    currency?: string | null;
    amount_original?: number | string | null;
    exchange_rate?: number | string | null;
    created_at?: string | null;
    staff?: { name?: string | null } | null;
  } | null;
}

export interface PlanRow {
  id: string;
  name: string;
  price: number | string;
  duration_days: number;
  type?: string | null;
}

export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export { PAYMENT_METHODS, type PaymentMethod } from './currency';

export const dateOnly = (d: string) => d.slice(0, 10);

export function monthLabel(d: DateStr): string {
  const [y, m] = d.split('-').map(Number);
  return `${MONTHS_ES[m - 1]} ${y}`;
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "24 oct" */
export function shortDate(d: DateStr): string {
  const [, m, day] = d.slice(0, 10).split('-').map(Number);
  return `${day} ${MONTHS_SHORT[m - 1]}`;
}

/** Día `day` del mes de `ref` (o el último día si el mes es más corto). Igual que anchor_date() en SQL. */
export function anchorDate(ref: DateStr, day: number): DateStr {
  const [y, m] = ref.slice(0, 10).split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(Math.max(day, 1), last)).padStart(2, '0')}`;
}

const isMonthly = (days: number) => (days >= 28 && days <= 31) || (days >= 60 && days <= 360 && days % 30 === 0) || days === 365 || days === 366;

/**
 * Siguiente vencimiento respetando el día de pago del socio (cobro por
 * aniversario). Mismo cálculo que plan_next_due(last, days, day) en SQL.
 * Sin `day` se usa el día de `last`.
 */
export function planNextDue(last: DateStr, days: number, day?: number | null): DateStr {
  const d = day ?? Number(last.slice(8, 10));
  if (days >= 28 && days <= 31) return anchorDate(shiftMonth(last, 1), d);
  if (days >= 60 && days <= 360 && days % 30 === 0) return anchorDate(shiftMonth(last, days / 30), d);
  if (days === 365 || days === 366) return anchorDate(shiftMonth(last, 12), d);
  return addDays(last, Math.max(days, 1));
}

/** Inicio del ciclo vigente: último día de pago <= hoy. Igual que billing_cycle_start() en SQL. */
export function cycleStart(today: DateStr, day: number, days: number): DateStr {
  if (!isMonthly(days)) return today;
  const a = anchorDate(today, day);
  return a <= today ? a : anchorDate(shiftMonth(today, -1), day);
}

/** Período que cubre una factura: "24 oct – 23 nov" (o "24 oct" si es pago único). */
export function periodLabel(due: DateStr, days: number, day?: number | null, type?: string | null): string {
  if (type === 'Visita') return shortDate(due);
  return `${shortDate(due)} – ${shortDate(addDays(planNextDue(due, days, day), -1))}`;
}

/** Último día cubierto por la factura pagada que vence en `lastPaidDue`. */
export function coverageEnd(lastPaidDue: DateStr, days: number, day?: number | null): DateStr {
  return addDays(planNextDue(lastPaidDue, days, day), -1);
}

/** Datos de cobro del socio (día de pago y primer cobro si viene migrado). */
export interface BillingAnchor {
  billing_day?: number | null;
  billing_start?: string | null;
  start_date?: string | null;
}

/** Hasta qué día está cubierto el socio (fin del último período pagado). */
export function paidThrough(m: (BillingAnchor & { paid_until?: string | null; plans?: { duration_days: number } | null }) | null | undefined): DateStr | null {
  if (!m?.paid_until) return null;
  return coverageEnd(m.paid_until.slice(0, 10), m.plans?.duration_days ?? 30, billingDayOf(m));
}

export function billingDayOf(m: BillingAnchor | null | undefined): number {
  return m?.billing_day ?? (m?.start_date ? Number(String(m.start_date).slice(8, 10)) : 1);
}

/**
 * Estado que se muestra. Una factura 'Pendiente' con fecha pasada se muestra
 * como 'Vencida' aunque el proceso nocturno todavía no la haya marcado.
 */
export function effectiveStatus(inv: Pick<InvoiceRow, 'status' | 'due_date'>, today: DateStr): InvoiceStatus {
  if (inv.status === 'Pendiente' && dateOnly(inv.due_date) < today) return 'Vencida';
  return inv.status as InvoiceStatus;
}

export const isOpen = (inv: Pick<InvoiceRow, 'status'>) => inv.status === 'Pendiente' || inv.status === 'Vencida';

// ---------------------------------------------------------------------------
// Vista previa del cobro
// ---------------------------------------------------------------------------

export interface PlannedPeriod {
  due: DateStr;
  label: string; // 'Octubre 2026'
  amount: number;
  /** Factura existente que se salda; null = se crea al cobrar. */
  invoiceId: string | null;
  invoiceNumber: string | null;
  overdue: boolean;
}

export interface PaymentPlan {
  periods: PlannedPeriod[];
  total: number;
  openCount: number;
  /** Último día cubierto tras el cobro (ej. 23/11). */
  coversThrough: DateStr | null;
}

/**
 * Qué cobraría pay_periods(user, months): primero las facturas abiertas más
 * antiguas y, si sobran períodos, las siguientes según el plan.
 */
export function buildPaymentPlan(
  userInvoices: InvoiceRow[],
  plan: PlanRow | null | undefined,
  months: number,
  today: DateStr,
  anchor?: BillingAnchor | null,
): PaymentPlan {
  const day = billingDayOf(anchor);
  const open = userInvoices
    .filter(isOpen)
    .sort((a, b) => (dateOnly(a.due_date) < dateOnly(b.due_date) ? -1 : 1));

  const periods: PlannedPeriod[] = [];
  for (const inv of open.slice(0, months)) {
    const due = dateOnly(inv.due_date);
    periods.push({
      due,
      label: plan ? periodLabel(due, plan.duration_days, day, plan.type) : shortDate(due),
      amount: Number(inv.amount) || 0,
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number ?? null,
      overdue: effectiveStatus(inv, today) === 'Vencida',
    });
  }

  if (periods.length < months && plan) {
    const allDues = userInvoices.map((i) => dateOnly(i.due_date)).sort();
    let last: DateStr | null = allDues.length ? allDues[allDues.length - 1] : null;
    while (periods.length < months) {
      const due = last === null
        ? (anchor?.billing_start?.slice(0, 10) ?? cycleStart(today, day, plan.duration_days))
        : planNextDue(last, plan.duration_days, day);
      periods.push({
        due,
        label: periodLabel(due, plan.duration_days, day, plan.type),
        amount: Number(plan.price) || 0,
        invoiceId: null,
        invoiceNumber: null,
        overdue: false,
      });
      last = due;
    }
  }

  return {
    periods,
    total: periods.reduce((s, p) => s + p.amount, 0),
    openCount: open.length,
    coversThrough: periods.length && plan ? coverageEnd(periods[periods.length - 1].due, plan.duration_days, day) : null,
  };
}

// ---------------------------------------------------------------------------
// Resúmenes para la página
// ---------------------------------------------------------------------------

export interface BillingKpis {
  collectedThisMonth: number;
  paymentsThisMonth: number;
  openTotal: number;
  openCount: number;
  overdueTotal: number;
  overdueCount: number;
  debtorCount: number;
  dueSoonTotal: number;
  dueSoonCount: number;
}

export function billingKpis(
  invoices: InvoiceRow[],
  payments: { amount: number | string; date: string }[],
  today: DateStr,
  soonDays = 7,
): BillingKpis {
  const start = monthStart(today);
  const horizon = addDays(today, soonDays);
  const k: BillingKpis = {
    collectedThisMonth: 0, paymentsThisMonth: 0, openTotal: 0, openCount: 0,
    overdueTotal: 0, overdueCount: 0, debtorCount: 0, dueSoonTotal: 0, dueSoonCount: 0,
  };
  for (const p of payments) {
    const d = dateOnly(p.date);
    if (d >= start && d <= today) {
      k.collectedThisMonth += Number(p.amount) || 0;
      k.paymentsThisMonth += 1;
    }
  }
  const debtors = new Set<string>();
  for (const inv of invoices) {
    if (!isOpen(inv)) continue;
    const amount = Number(inv.amount) || 0;
    k.openTotal += amount;
    k.openCount += 1;
    if (effectiveStatus(inv, today) === 'Vencida') {
      k.overdueTotal += amount;
      k.overdueCount += 1;
      debtors.add(inv.user_id);
    } else if (dateOnly(inv.due_date) <= horizon) {
      k.dueSoonTotal += amount;
      k.dueSoonCount += 1;
    }
  }
  k.debtorCount = debtors.size;
  return k;
}

export interface MemberDebt {
  user_id: string;
  total: number;
  overdueTotal: number;
  count: number;
  oldestDue: DateStr;
  daysLate: number; // 0 si nada está vencido aún
}

/** Socios con facturas abiertas, los más atrasados primero. */
export function membersWithDebt(invoices: InvoiceRow[], today: DateStr): MemberDebt[] {
  const map = new Map<string, MemberDebt>();
  for (const inv of invoices) {
    if (!isOpen(inv)) continue;
    const due = dateOnly(inv.due_date);
    const amount = Number(inv.amount) || 0;
    const overdue = effectiveStatus(inv, today) === 'Vencida';
    const d = map.get(inv.user_id) ?? { user_id: inv.user_id, total: 0, overdueTotal: 0, count: 0, oldestDue: due, daysLate: 0 };
    d.total += amount;
    d.count += 1;
    if (overdue) d.overdueTotal += amount;
    if (due < d.oldestDue) d.oldestDue = due;
    map.set(inv.user_id, d);
  }
  return [...map.values()]
    .map((d) => ({ ...d, daysLate: d.overdueTotal > 0 ? Math.max(0, daysBetween(d.oldestDue, today)) : 0 }))
    .sort((a, b) => b.daysLate - a.daysLate || b.total - a.total);
}

/** Cantidad por estado (para los chips de filtro). */
export function statusCounts(invoices: InvoiceRow[], today: DateStr) {
  // 'all' = todas menos las anuladas (las anuladas tienen su propio filtro)
  const c = { all: 0, Pendiente: 0, Vencida: 0, Pagada: 0, Anulada: 0 };
  for (const inv of invoices) {
    const st = effectiveStatus(inv, today);
    c[st] += 1;
    if (st !== 'Anulada') c.all += 1;
  }
  return c;
}

/** Fecha en formato 01/10/2026 sin pasar por Date (evita corrimientos de zona horaria). */
export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  const [y, m, day] = dateOnly(d).split('-');
  return `${day}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// Próximos vencimientos y avisos (recepción)
// ---------------------------------------------------------------------------

/** Días de anticipación con que se avisa al socio que debe pagar. */
export const REMINDER_DAYS = 3;

export interface RenewalMember extends BillingAnchor {
  id: string;
  name: string;
  status: string;
  is_free_user?: boolean | null;
  plans?: PlanRow | null;
}

export interface NextDue {
  due: DateStr;
  amount: number;
  /** Factura existente; null = la factura se generará el día del vencimiento. */
  invoiceId: string | null;
  label: string;
}

/**
 * Próximo vencimiento del socio. La factura del período siguiente recién se
 * genera el día del vencimiento, así que si no hay facturas abiertas se calcula
 * con el plan a partir de la última factura (igual que plan_next_due en SQL).
 */
export function nextDueFor(member: RenewalMember, memberInvoices: InvoiceRow[], today: DateStr): NextDue | null {
  if (member.is_free_user || member.status !== 'Activo' || !member.plans) return null;
  const open = memberInvoices.filter(isOpen).sort((a, b) => (a.due_date < b.due_date ? -1 : 1));
  if (open.length) {
    const due = dateOnly(open[0].due_date);
    return { due, amount: Number(open[0].amount) || 0, invoiceId: open[0].id, label: periodLabel(due, member.plans.duration_days, billingDayOf(member), member.plans.type) };
  }
  const day = billingDayOf(member);
  const dues = memberInvoices.map((i) => dateOnly(i.due_date)).sort();
  const due = dues.length
    ? planNextDue(dues[dues.length - 1], member.plans.duration_days, day)
    : (member.billing_start?.slice(0, 10) ?? cycleStart(today, day, member.plans.duration_days));
  return { due, amount: Number(member.plans.price) || 0, invoiceId: null, label: periodLabel(due, member.plans.duration_days, day, member.plans.type) };
}

export interface UpcomingRenewal extends NextDue {
  user_id: string;
  daysLeft: number;
}

/** Socios activos cuyo próximo vencimiento cae entre hoy y hoy + `days`. */
export function upcomingRenewals(
  members: RenewalMember[],
  invoices: InvoiceRow[],
  today: DateStr,
  days = REMINDER_DAYS,
): UpcomingRenewal[] {
  const byUser = new Map<string, InvoiceRow[]>();
  for (const inv of invoices) {
    const list = byUser.get(inv.user_id);
    if (list) list.push(inv);
    else byUser.set(inv.user_id, [inv]);
  }
  const horizon = addDays(today, days);
  const out: UpcomingRenewal[] = [];
  for (const m of members) {
    const next = nextDueFor(m, byUser.get(m.id) ?? [], today);
    if (next && next.due >= today && next.due <= horizon) {
      out.push({ ...next, user_id: m.id, daysLeft: daysBetween(today, next.due) });
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft || a.amount - b.amount);
}

export function dueInWords(daysLeft: number): string {
  if (daysLeft <= 0) return 'Vence hoy';
  if (daysLeft === 1) return 'Vence mañana';
  return `Vence en ${daysLeft} días`;
}

/**
 * Teléfono en formato internacional para WhatsApp (Venezuela por defecto):
 * '0414-551.14.62' -> '584145511462'. null si no parece un número válido.
 */
export function whatsappNumber(phone?: string | null, countryCode = '58'): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith(countryCode) && digits.length >= 11) return digits;
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.length === 10 ? countryCode + digits : null;
}

const firstName = (name: string) => {
  const n = name.trim().split(/\s+/)[0] ?? name;
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
};

function longDate(d: DateStr): string {
  const [, m, day] = d.split('-').map(Number);
  return `${day} de ${MONTHS_ES[m - 1].toLowerCase()}`;
}

export function upcomingReminderText(name: string, r: Pick<NextDue, 'due' | 'amount'>, gymName: string, money: (n: number) => string) {
  return `Hola ${firstName(name)}, te recordamos que tu mensualidad de ${money(r.amount)} vence el ${longDate(r.due)}. Puedes pagar en recepción o por transferencia / pago móvil. ¡Te esperamos en ${gymName}!`;
}

export function overdueReminderText(name: string, d: Pick<MemberDebt, 'total' | 'count' | 'oldestDue'>, gymName: string, money: (n: number) => string) {
  const periodos = d.count === 1 ? 'una mensualidad pendiente' : `${d.count} mensualidades pendientes`;
  return `Hola ${firstName(name)}, tienes ${periodos} por ${money(d.total)} desde ${monthLabel(d.oldestDue).toLowerCase()}. Pasa por recepción para ponerte al día y seguir entrenando en ${gymName}.`;
}

export function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
