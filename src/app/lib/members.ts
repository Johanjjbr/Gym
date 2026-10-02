/**
 * Lista de socios para Gestión de Usuarios (lógica pura, testeable):
 * estado de pago, última visita, filtros rápidos, búsqueda y orden.
 */
import { membersWithDebt, nextDueFor, REMINDER_DAYS, type InvoiceRow, type PlanRow } from './billing';
import { daysBetween, type DateStr } from './dashboardHelpers';

export interface MemberListUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  cedula?: string | null;
  member_number?: string | null;
  status: string;
  is_free_user?: boolean | null;
  plan_id?: string | null;
  plan?: string | null;
  paid_until?: string | null;
  next_payment?: string | null;
  start_date?: string | null;
  created_at?: string | null;
  plans?: PlanRow | null;
}

export type PaymentState = 'overdue' | 'due-soon' | 'ok' | 'exempt' | 'no-plan' | 'inactive';

export interface MemberRow {
  user: MemberListUser;
  payment: PaymentState;
  /** Deuda total (vencida + pendiente) */
  debt: number;
  daysLate: number;
  /** Próximo vencimiento y días que faltan */
  nextDue: DateStr | null;
  daysLeft: number | null;
  nextAmount: number | null;
  lastVisit: DateStr | null;
  daysSinceVisit: number | null;
}

export function buildMemberRows(
  users: MemberListUser[],
  invoices: InvoiceRow[],
  visits: { user_id: string; date: string }[],
  today: DateStr,
): MemberRow[] {
  const invByUser = new Map<string, InvoiceRow[]>();
  for (const inv of invoices) (invByUser.get(inv.user_id) ?? invByUser.set(inv.user_id, []).get(inv.user_id)!).push(inv);

  const lastVisit = new Map<string, string>();
  for (const v of visits) {
    const d = v.date.slice(0, 10);
    if (d <= today && (!lastVisit.has(v.user_id) || lastVisit.get(v.user_id)! < d)) lastVisit.set(v.user_id, d);
  }

  return users.map((user) => {
    const own = invByUser.get(user.id) ?? [];
    const debt = membersWithDebt(own, today)[0];
    const next = nextDueFor(user as any, own, today);
    const daysLeft = next ? daysBetween(today, next.due) : null;
    const lv = lastVisit.get(user.id) ?? null;

    let payment: PaymentState;
    if (user.is_free_user) payment = 'exempt';
    else if (debt && debt.overdueTotal > 0) payment = 'overdue';
    else if (user.status === 'Inactivo') payment = 'inactive';
    else if (!user.plans) payment = 'no-plan';
    else if (daysLeft !== null && daysLeft >= 0 && daysLeft <= REMINDER_DAYS) payment = 'due-soon';
    else payment = 'ok';

    return {
      user,
      payment,
      debt: debt?.total ?? 0,
      daysLate: debt?.daysLate ?? 0,
      nextDue: next?.due ?? null,
      daysLeft,
      nextAmount: next?.amount ?? null,
      lastVisit: lv,
      daysSinceVisit: lv ? daysBetween(lv, today) : null,
    };
  });
}

export type QuickFilter = 'todos' | 'activos' | 'deuda' | 'vencen' | 'suspendidos' | 'inactivos';

export const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'activos', label: 'Activos' },
  { key: 'deuda', label: 'Con deuda' },
  { key: 'vencen', label: 'Vencen pronto' },
  { key: 'suspendidos', label: 'Suspendidos' },
  { key: 'inactivos', label: 'Inactivos' },
];

export function matchesQuick(r: MemberRow, f: QuickFilter): boolean {
  switch (f) {
    case 'activos': return r.user.status === 'Activo';
    case 'deuda': return r.payment === 'overdue';
    case 'vencen': return r.payment === 'due-soon';
    case 'suspendidos': return r.user.status === 'Suspendido';
    case 'inactivos': return r.user.status === 'Inactivo';
    default: return true;
  }
}

export function quickCounts(rows: MemberRow[]): Record<QuickFilter, number> {
  const c = { todos: 0, activos: 0, deuda: 0, vencen: 0, suspendidos: 0, inactivos: 0 } as Record<QuickFilter, number>;
  for (const r of rows) for (const f of QUICK_FILTERS) if (matchesQuick(r, f.key)) c[f.key]++;
  return c;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca por nombre (sin acentos), cédula, N° de socio, teléfono o email. */
export function matchesSearch(r: MemberRow, q: string): boolean {
  const term = norm(q.trim());
  if (!term) return true;
  const u = r.user;
  const digits = term.replace(/\D/g, '');
  return (
    norm(u.name).includes(term) ||
    (!!u.email && norm(u.email).includes(term)) ||
    (!!u.member_number && norm(u.member_number).includes(term)) ||
    (!!digits && digits.length >= 3 && (!!u.cedula?.includes(digits) || !!u.phone?.replace(/\D/g, '').includes(digits)))
  );
}

export type SortKey = 'name' | 'payment' | 'lastVisit' | 'status';

const PAYMENT_RANK: Record<PaymentState, number> = { overdue: 0, 'due-soon': 1, 'no-plan': 2, ok: 3, exempt: 4, inactive: 5 };
const STATUS_RANK: Record<string, number> = { Suspendido: 0, Activo: 1, Inactivo: 2 };

export function sortRows(rows: MemberRow[], key: SortKey, dir: 'asc' | 'desc'): MemberRow[] {
  const s = dir === 'asc' ? 1 : -1;
  const byName = (a: MemberRow, b: MemberRow) => a.user.name.localeCompare(b.user.name, 'es');
  const cmp = (a: MemberRow, b: MemberRow): number => {
    switch (key) {
      case 'payment':
        return PAYMENT_RANK[a.payment] - PAYMENT_RANK[b.payment] || b.daysLate - a.daysLate || (a.daysLeft ?? 99) - (b.daysLeft ?? 99);
      case 'lastVisit':
        // Más reciente primero en orden ascendente; sin visitas al final
        return (a.daysSinceVisit ?? 1e9) - (b.daysSinceVisit ?? 1e9);
      case 'status':
        return (STATUS_RANK[a.user.status] ?? 9) - (STATUS_RANK[b.user.status] ?? 9);
      default:
        return 0;
    }
  };
  return [...rows].sort((a, b) => s * cmp(a, b) || s * byName(a, b));
}
