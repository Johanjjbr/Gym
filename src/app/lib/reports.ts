/**
 * Reportes mensuales (lógica pura, testeable): ingresos, socios y asistencia.
 * Un mes se identifica como "AAAA-MM"; las fechas son de Caracas (sin zona).
 */
import { addDays, daysBetween, shiftMonth, type DateStr } from './dashboardHelpers';
import { monthLabel } from './billing';
import { isVoided, originalAmount, summarizeDay, type DayPayment, type DaySummary } from './dailyPayments';

export type MonthStr = string; // "2026-10"

export interface MonthRange {
  month: MonthStr;
  /** Primer día del mes */
  from: DateStr;
  /** Primer día del mes siguiente (exclusivo) */
  to: DateStr;
  /** Último día del mes */
  last: DateStr;
  label: string;
  days: number;
}

export function monthRange(month: MonthStr): MonthRange {
  const from = `${month}-01`;
  const to = shiftMonth(from, 1);
  const last = addDays(to, -1);
  return { month, from, to, last, label: monthLabel(from), days: daysBetween(from, to) };
}

export const monthOf = (d: DateStr): MonthStr => d.slice(0, 7);

/** Últimos `n` meses, del más reciente al más antiguo. */
export function recentMonths(today: DateStr, n = 12): MonthStr[] {
  return Array.from({ length: n }, (_, i) => monthOf(shiftMonth(today, -i)));
}

const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Ingresos
// ---------------------------------------------------------------------------

export interface IncomeDay {
  day: DateStr;
  count: number;
  usd: number;
  ves: number;
  totalUsd: number;
}

export interface IncomeReport {
  range: MonthRange;
  summary: DaySummary;
  byDay: IncomeDay[];
  /** Pagos válidos (sin anulados), ordenados por fecha */
  payments: DayPayment[];
  voided: DayPayment[];
}

export function incomeReport(month: MonthStr, payments: DayPayment[]): IncomeReport {
  const range = monthRange(month);
  const inMonth = payments
    .filter((p) => String(p.date).slice(0, 10) >= range.from && String(p.date).slice(0, 10) < range.to)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const valid = inMonth.filter((p) => !isVoided(p));
  const days = new Map<DateStr, IncomeDay>();
  for (const p of valid) {
    const day = String(p.date).slice(0, 10);
    const d = days.get(day) ?? { day, count: 0, usd: 0, ves: 0, totalUsd: 0 };
    d.count++;
    d.totalUsd = r2(d.totalUsd + (Number(p.amount) || 0));
    if (p.currency === 'VES') d.ves = r2(d.ves + originalAmount(p));
    else d.usd = r2(d.usd + (Number(p.amount) || 0));
    days.set(day, d);
  }
  return {
    range,
    summary: summarizeDay(inMonth),
    byDay: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
    payments: valid,
    voided: inMonth.filter(isVoided),
  };
}

// ---------------------------------------------------------------------------
// Socios
// ---------------------------------------------------------------------------

export interface ReportMember {
  id: string;
  name: string;
  cedula?: string | null;
  member_number?: string | null;
  status: string;
  start_date?: string | null;
  created_at?: string | null;
  plan?: string | null;
  plans?: { name?: string | null } | null;
}

export interface StatusChange {
  user_id: string | null;
  member_name?: string | null;
  old_status: string | null;
  new_status: string;
  changed_at: string; // timestamptz
}

/** Fecha de Caracas (UTC-4) de un timestamptz. */
export function caracasDate(ts: string): DateStr {
  if (/^\d{4}-\d{2}-\d{2}$/.test(ts)) return ts;
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return ts.slice(0, 10);
  return new Date(t - 4 * 3600_000).toISOString().slice(0, 10);
}

const joinedOn = (u: ReportMember): DateStr | null => (u.start_date ?? u.created_at ?? '').slice(0, 10) || null;
const planName = (u: ReportMember) => u.plans?.name ?? u.plan ?? 'Sin plan';

/**
 * Estado de un socio al final del día `day`: el estado anterior al primer cambio
 * posterior a esa fecha; si no hubo cambios después, el estado actual.
 */
export function statusOn(u: ReportMember, history: StatusChange[], day: DateStr): string | null {
  const joined = joinedOn(u);
  if (joined && joined > day) return null; // todavía no era socio
  const after = history
    .filter((h) => h.user_id === u.id && caracasDate(h.changed_at) > day)
    .sort((a, b) => a.changed_at.localeCompare(b.changed_at));
  if (after.length === 0) return u.status;
  return after[0].old_status; // null = se inscribió después
}

export interface MemberMovement {
  name: string;
  date: DateStr;
  detail: string;
}

export interface MembersReport {
  range: MonthRange;
  /** Activos al cierre del mes (o hoy, si es el mes en curso) */
  activeAtClose: number;
  inactiveAtClose: number;
  suspendedAtClose: number;
  closeDay: DateStr;
  newMembers: MemberMovement[];
  dropped: MemberMovement[];
  suspended: MemberMovement[];
  reactivated: MemberMovement[];
  byPlan: { plan: string; active: number }[];
  /** Desde cuándo hay historial de bajas/suspensiones (null = todavía no hay) */
  historySince: DateStr | null;
}

export function membersReport(month: MonthStr, members: ReportMember[], history: StatusChange[], today: DateStr): MembersReport {
  const range = monthRange(month);
  const closeDay = range.last < today ? range.last : today;
  const counts = { Activo: 0, Inactivo: 0, Suspendido: 0 } as Record<string, number>;
  const plans = new Map<string, number>();
  for (const u of members) {
    const s = statusOn(u, history, closeDay);
    if (!s) continue;
    counts[s] = (counts[s] ?? 0) + 1;
    if (s === 'Activo') plans.set(planName(u), (plans.get(planName(u)) ?? 0) + 1);
  }

  const inMonth = (d: DateStr | null) => !!d && d >= range.from && d < range.to;
  const byDate = (a: MemberMovement, b: MemberMovement) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name);
  const names = new Map(members.map((u) => [u.id, u.name]));
  const nameOf = (h: StatusChange) => (h.user_id && names.get(h.user_id)) || h.member_name || 'Socio eliminado';
  const monthChanges = history.filter((h) => h.old_status !== null && inMonth(caracasDate(h.changed_at)));
  const movement = (h: StatusChange): MemberMovement => ({ name: nameOf(h), date: caracasDate(h.changed_at), detail: `${h.old_status} → ${h.new_status}` });

  const since = history.length ? history.map((h) => caracasDate(h.changed_at)).sort()[0] : null;

  return {
    range,
    closeDay,
    activeAtClose: counts.Activo ?? 0,
    inactiveAtClose: counts.Inactivo ?? 0,
    suspendedAtClose: counts.Suspendido ?? 0,
    newMembers: members
      .filter((u) => inMonth(joinedOn(u)))
      .map((u) => ({ name: u.name, date: joinedOn(u)!, detail: planName(u) }))
      .sort(byDate),
    dropped: monthChanges.filter((h) => h.new_status === 'Inactivo').map(movement).sort(byDate),
    suspended: monthChanges.filter((h) => h.new_status === 'Suspendido').map(movement).sort(byDate),
    reactivated: monthChanges.filter((h) => h.new_status === 'Activo').map(movement).sort(byDate),
    byPlan: [...plans.entries()].map(([plan, active]) => ({ plan, active })).sort((a, b) => b.active - a.active || a.plan.localeCompare(b.plan)),
    historySince: since,
  };
}

// ---------------------------------------------------------------------------
// Asistencia
// ---------------------------------------------------------------------------

export interface AttendanceEntry {
  user_id: string;
  date: DateStr;
  time?: string | null;
}

export interface AttendanceReport {
  range: MonthRange;
  visits: number;
  uniqueMembers: number;
  /** Días del mes transcurridos (hasta hoy) */
  daysElapsed: number;
  avgPerDay: number;
  byDay: { day: DateStr; visits: number }[];
  byHour: { hour: number; visits: number }[];
  peakHour: number | null;
  busiestDay: { day: DateStr; visits: number } | null;
  byMember: { id: string; name: string; visits: number; lastVisit: DateStr }[];
  /** Socios activos que no vinieron en el mes */
  absent: { id: string; name: string }[];
}

export function attendanceReport(
  month: MonthStr,
  entries: AttendanceEntry[],
  members: ReportMember[],
  history: StatusChange[],
  today: DateStr,
): AttendanceReport {
  const range = monthRange(month);
  const rows = entries.filter((e) => e.date >= range.from && e.date < range.to);
  const end = range.last < today ? range.last : today;
  const daysElapsed = end < range.from ? 0 : daysBetween(range.from, end) + 1;

  const byDay = new Map<DateStr, number>();
  const byHour = new Map<number, number>();
  const byMember = new Map<string, { visits: number; lastVisit: DateStr }>();
  for (const e of rows) {
    byDay.set(e.date, (byDay.get(e.date) ?? 0) + 1);
    const h = Number(String(e.time ?? '').slice(0, 2));
    if (e.time && Number.isInteger(h)) byHour.set(h, (byHour.get(h) ?? 0) + 1);
    const m = byMember.get(e.user_id) ?? { visits: 0, lastVisit: e.date };
    m.visits++;
    if (e.date > m.lastVisit) m.lastVisit = e.date;
    byMember.set(e.user_id, m);
  }

  const names = new Map(members.map((u) => [u.id, u.name]));
  const days = [...byDay.entries()].map(([day, visits]) => ({ day, visits })).sort((a, b) => a.day.localeCompare(b.day));
  const hours = [...byHour.entries()].map(([hour, visits]) => ({ hour, visits })).sort((a, b) => a.hour - b.hour);
  const peak = hours.reduce<{ hour: number; visits: number } | null>((best, h) => (!best || h.visits > best.visits ? h : best), null);
  const busiest = days.reduce<{ day: DateStr; visits: number } | null>((best, d) => (!best || d.visits > best.visits ? d : best), null);

  return {
    range,
    visits: rows.length,
    uniqueMembers: byMember.size,
    daysElapsed,
    avgPerDay: daysElapsed > 0 ? r2(rows.length / daysElapsed) : 0,
    byDay: days,
    byHour: hours,
    peakHour: peak?.hour ?? null,
    busiestDay: busiest,
    byMember: [...byMember.entries()]
      .map(([id, m]) => ({ id, name: names.get(id) ?? 'Socio', ...m }))
      .sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name)),
    absent: members
      .filter((u) => statusOn(u, history, end) === 'Activo' && !byMember.has(u.id))
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** 6 -> "6 am", 18 -> "6 pm" */
export function hourLabel(h: number): string {
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'am' : 'pm'}`;
}

// ---------------------------------------------------------------------------
// CSV (";" para Excel en español)
// ---------------------------------------------------------------------------

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const num = (n: number) => n.toFixed(2).replace('.', ',');

export function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
}

export function incomeCsv(r: IncomeReport, nameOf: (p: DayPayment) => string): string {
  const rows: unknown[][] = [['Fecha', 'Socio', 'Cédula', 'Factura', 'Motivo', 'Método', 'Referencia', 'Moneda', 'Monto', 'Tasa', 'Equivalente USD', 'Estado']];
  for (const p of [...r.payments, ...r.voided]) {
    const inv = p.invoices?.[0];
    rows.push([
      String(p.date).slice(0, 10), nameOf(p), p.users?.cedula ?? '', inv?.invoice_number ?? '', inv?.concept ?? '',
      p.method ?? '', inv?.reference ?? '', p.currency === 'VES' ? 'Bs' : 'USD', num(originalAmount(p)),
      p.exchange_rate != null ? num(Number(p.exchange_rate)) : '', num(Number(p.amount) || 0), p.status,
    ]);
  }
  return toCsv(rows);
}

export function membersCsv(r: MembersReport): string {
  const rows: unknown[][] = [['Movimiento', 'Fecha', 'Socio', 'Detalle']];
  for (const m of r.newMembers) rows.push(['Alta', m.date, m.name, m.detail]);
  for (const m of r.reactivated) rows.push(['Reactivación', m.date, m.name, m.detail]);
  for (const m of r.dropped) rows.push(['Baja', m.date, m.name, m.detail]);
  for (const m of r.suspended) rows.push(['Suspensión', m.date, m.name, m.detail]);
  rows.push([]);
  rows.push(['Plan', 'Activos al cierre']);
  for (const p of r.byPlan) rows.push([p.plan, p.active]);
  return toCsv(rows);
}

export function attendanceCsv(r: AttendanceReport): string {
  const rows: unknown[][] = [['Socio', 'Visitas en el mes', 'Última visita']];
  for (const m of r.byMember) rows.push([m.name, m.visits, m.lastVisit]);
  for (const m of r.absent) rows.push([m.name, 0, '']);
  return toCsv(rows);
}
