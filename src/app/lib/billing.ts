/**
 * Lógica pura de facturación (sin React ni Supabase), espejo de las funciones
 * SQL plan_next_due() y pay_periods() para mostrar vistas previas exactas.
 * Fechas como 'yyyy-MM-dd' en hora local del gimnasio.
 */
import { addDays, daysBetween, monthStart, shiftMonth, type DateStr } from './dashboardHelpers';

export type InvoiceStatus = 'Pendiente' | 'Vencida' | 'Pagada';

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
  /** Cómo se cobró (embebido desde payments vía payment_id) */
  payments?: { currency?: string | null; amount_original?: number | string | null; exchange_rate?: number | string | null } | null;
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

/** Mismo cálculo que plan_next_due() en SQL. */
export function planNextDue(last: DateStr, days: number): DateStr {
  if (days >= 28 && days <= 31) return shiftMonth(last, 1);
  if (days >= 60 && days <= 360 && days % 30 === 0) return shiftMonth(last, days / 30);
  if (days === 365 || days === 366) return shiftMonth(last, 12);
  return addDays(last, Math.max(days, 1));
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
  /** Último período cubierto tras el cobro. */
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
): PaymentPlan {
  const open = userInvoices
    .filter(isOpen)
    .sort((a, b) => (dateOnly(a.due_date) < dateOnly(b.due_date) ? -1 : 1));

  const periods: PlannedPeriod[] = [];
  for (const inv of open.slice(0, months)) {
    const due = dateOnly(inv.due_date);
    periods.push({
      due,
      label: monthLabel(due),
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
      const due = last === null ? monthStart(today) : planNextDue(last, plan.duration_days);
      periods.push({
        due,
        label: monthLabel(due),
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
    coversThrough: periods.length ? periods[periods.length - 1].due : null,
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
  const c = { all: invoices.length, Pendiente: 0, Vencida: 0, Pagada: 0 };
  for (const inv of invoices) c[effectiveStatus(inv, today)] += 1;
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

export interface RenewalMember {
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
    return { due, amount: Number(open[0].amount) || 0, invoiceId: open[0].id, label: monthLabel(due) };
  }
  const dues = memberInvoices.map((i) => dateOnly(i.due_date)).sort();
  const due = dues.length ? planNextDue(dues[dues.length - 1], member.plans.duration_days) : monthStart(today);
  return { due, amount: Number(member.plans.price) || 0, invoiceId: null, label: monthLabel(due) };
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
