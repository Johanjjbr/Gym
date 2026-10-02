/**
 * Cálculos puros del Dashboard (sin React ni Supabase) para poder testearlos.
 * Todas las fechas se manejan como strings 'yyyy-MM-dd' en hora local del gimnasio,
 * igual que el resto del sistema de facturación.
 */

export type DateStr = string;

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const pad = (n: number) => String(n).padStart(2, '0');

/** yyyy-MM-dd en hora LOCAL. */
export function toDateOnly(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parts(d: DateStr): [number, number, number] {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return [y, m, day];
}

function fromUTC(t: number): DateStr {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(d: DateStr, n: number): DateStr {
  const [y, m, day] = parts(d);
  return fromUTC(Date.UTC(y, m - 1, day + n));
}

/** Primer día del mes de `d`, desplazado `n` meses. */
export function shiftMonth(d: DateStr, n: number): DateStr {
  const [y, m] = parts(d);
  return fromUTC(Date.UTC(y, m - 1 + n, 1));
}

export function monthStart(d: DateStr): DateStr {
  return shiftMonth(d, 0);
}

/** Días desde `a` hasta `b` (b - a). */
export function daysBetween(a: DateStr, b: DateStr): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

function daysInMonth(d: DateStr): number {
  return daysBetween(monthStart(d), shiftMonth(d, 1));
}

// ---------------------------------------------------------------------------
// Ingresos
// ---------------------------------------------------------------------------

export interface PaymentRow {
  id: string;
  user_id: string;
  amount: number | string;
  date: string;
  method?: string | null;
}

export interface MonthRevenue {
  key: string; // yyyy-MM
  label: string; // 'Oct'
  total: number;
  isCurrent: boolean;
}

/** Total cobrado por mes, últimos `months` meses (incluye el actual). */
export function revenueByMonth(payments: PaymentRow[], today: DateStr, months = 6): MonthRevenue[] {
  const buckets: MonthRevenue[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = shiftMonth(today, -i);
    const [, m] = parts(start);
    buckets.push({ key: start.slice(0, 7), label: MONTHS_SHORT[m - 1], total: 0, isCurrent: i === 0 });
  }
  const index = new Map(buckets.map((b) => [b.key, b]));
  for (const p of payments) {
    const bucket = index.get(p.date.slice(0, 7));
    if (bucket) bucket.total += Number(p.amount) || 0;
  }
  return buckets;
}

export interface PeriodComparison {
  current: number;
  previous: number;
  /** % de cambio; null si el periodo anterior es 0 (no hay base para comparar). */
  pct: number | null;
}

/**
 * Ingresos del mes en curso (hasta hoy) vs el MISMO tramo del mes anterior.
 * Comparar el mes parcial contra el mes anterior completo haría que el día 1
 * siempre se vea como una caída del ~100 %.
 */
export function revenueMonthToDate(payments: PaymentRow[], today: DateStr): PeriodComparison {
  const curStart = monthStart(today);
  const curEnd = addDays(today, 1);
  const prevStart = shiftMonth(today, -1);
  const elapsed = daysBetween(curStart, curEnd);
  const prevEnd = addDays(prevStart, Math.min(elapsed, daysInMonth(prevStart)));

  let current = 0;
  let previous = 0;
  for (const p of payments) {
    const d = p.date.slice(0, 10);
    const amount = Number(p.amount) || 0;
    if (d >= curStart && d < curEnd) current += amount;
    else if (d >= prevStart && d < prevEnd) previous += amount;
  }
  return { current, previous, pct: previous > 0 ? ((current - previous) / previous) * 100 : null };
}

// ---------------------------------------------------------------------------
// Cobranza
// ---------------------------------------------------------------------------

export interface OpenInvoiceRow {
  id: string;
  user_id: string;
  amount: number | string;
  due_date: string;
  status: string; // 'Pendiente' | 'Vencida'
  concept?: string | null;
}

export interface Debtor {
  user_id: string;
  total: number;
  count: number;
  oldestDue: DateStr;
  daysLate: number;
}

export interface UpcomingInvoice {
  id: string;
  user_id: string;
  amount: number;
  due: DateStr;
  daysLeft: number;
  concept: string | null;
}

export interface Receivables {
  totalOpen: number;
  openCount: number;
  overdueTotal: number;
  overdueCount: number;
  debtors: Debtor[];
  upcoming: UpcomingInvoice[];
}

/**
 * Resume las facturas abiertas. Una factura cuenta como vencida si su estado es
 * 'Vencida' o si es 'Pendiente' con fecha pasada (el cron corre de madrugada,
 * así que durante el día puede haber pendientes ya vencidas).
 */
export function receivables(invoices: OpenInvoiceRow[], today: DateStr, upcomingDays = 7): Receivables {
  const horizon = addDays(today, upcomingDays);
  const byUser = new Map<string, Debtor>();
  const upcoming: UpcomingInvoice[] = [];
  let totalOpen = 0;
  let openCount = 0;
  let overdueTotal = 0;
  let overdueCount = 0;

  for (const inv of invoices) {
    if (inv.status !== 'Pendiente' && inv.status !== 'Vencida') continue;
    const amount = Number(inv.amount) || 0;
    const due = inv.due_date.slice(0, 10);
    totalOpen += amount;
    openCount += 1;

    if (inv.status === 'Vencida' || due < today) {
      overdueTotal += amount;
      overdueCount += 1;
      const d = byUser.get(inv.user_id);
      if (d) {
        d.total += amount;
        d.count += 1;
        if (due < d.oldestDue) d.oldestDue = due;
      } else {
        byUser.set(inv.user_id, { user_id: inv.user_id, total: amount, count: 1, oldestDue: due, daysLate: 0 });
      }
    } else if (due <= horizon) {
      upcoming.push({
        id: inv.id,
        user_id: inv.user_id,
        amount,
        due,
        daysLeft: daysBetween(today, due),
        concept: inv.concept ?? null,
      });
    }
  }

  const debtors = [...byUser.values()]
    .map((d) => ({ ...d, daysLate: daysBetween(d.oldestDue, today) }))
    .sort((a, b) => b.daysLate - a.daysLate || b.total - a.total);
  upcoming.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : b.amount - a.amount));

  return { totalOpen, openCount, overdueTotal, overdueCount, debtors, upcoming };
}

// ---------------------------------------------------------------------------
// Asistencia y socios
// ---------------------------------------------------------------------------

export interface AttendanceRow {
  date: string;
  user_id: string;
}

export interface DayAttendance {
  date: DateStr;
  label: string; // 'Lun 28'
  count: number;
  isToday: boolean;
}

/** Socios distintos que entraron cada día, últimos `days` días (incluye hoy). */
export function attendanceByDay(rows: AttendanceRow[], today: DateStr, days = 7): DayAttendance[] {
  const seen = new Map<string, Set<string>>();
  for (const r of rows) {
    const d = r.date.slice(0, 10);
    if (!seen.has(d)) seen.set(d, new Set());
    seen.get(d)!.add(r.user_id);
  }
  const out: DayAttendance[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const [y, m, d] = parts(date);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    out.push({ date, label: `${DAYS_SHORT[dow]} ${d}`, count: seen.get(date)?.size ?? 0, isToday: i === 0 });
  }
  return out;
}

export interface MemberRow {
  id: string;
  name: string;
  status: string;
  created_at?: string | null;
}

export interface MemberSummary {
  total: number;
  active: number;
  suspended: number;
  inactive: number;
  newThisMonth: number;
}

export function memberSummary(users: MemberRow[], today: DateStr): MemberSummary {
  const start = monthStart(today);
  const s: MemberSummary = { total: users.length, active: 0, suspended: 0, inactive: 0, newThisMonth: 0 };
  for (const u of users) {
    if (u.status === 'Activo') s.active += 1;
    else if (u.status === 'Suspendido') s.suspended += 1;
    else s.inactive += 1;
    if (u.created_at && u.created_at.slice(0, 10) >= start) s.newThisMonth += 1;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

export function formatMoney(n: number): string {
  return `Bs ${n.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatCompact(n: number): string {
  return n.toLocaleString('es-VE', { notation: 'compact', maximumFractionDigits: 1 });
}

export function formatShortDate(d: DateStr): string {
  const [, m, day] = parts(d);
  return `${day} ${MONTHS_SHORT[m - 1]}`;
}
