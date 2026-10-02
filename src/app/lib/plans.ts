/**
 * Lógica pura de planes: duraciones, tipo derivado, cómo se factura y
 * resumen por plan (socios e ingreso mensual estimado).
 */
import { formatMoney } from './dashboardHelpers';

export type PlanType = 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual' | 'Visita' | 'Promoción';

export interface PlanRecord {
  id: string;
  name: string;
  description?: string | null;
  duration_days: number;
  price: number | string;
  type: PlanType | string;
  is_active: boolean;
}

export type DurationPreset = 'visita' | 'mensual' | 'trimestral' | 'semestral' | 'anual' | 'custom';

export const DURATION_PRESETS: { key: DurationPreset; label: string; days: number | null; hint: string }[] = [
  { key: 'mensual', label: 'Mensual', days: 30, hint: '1 mes' },
  { key: 'trimestral', label: 'Trimestral', days: 90, hint: '3 meses' },
  { key: 'semestral', label: 'Semestral', days: 180, hint: '6 meses' },
  { key: 'anual', label: 'Anual', days: 365, hint: '1 año' },
  { key: 'visita', label: 'Visita', days: 1, hint: 'Pago único' },
  { key: 'custom', label: 'Personalizada', days: null, hint: 'N días' },
];

/** Preset que corresponde a un plan existente. */
export function presetFor(days: number, type?: string): DurationPreset {
  if (type === 'Visita') return 'visita';
  const p = DURATION_PRESETS.find((d) => d.days === days && d.key !== 'visita');
  return p?.key ?? 'custom';
}

/**
 * Tipo que se guarda en la base (CHECK: Mensual/Trimestral/Semestral/Anual/Visita/Promoción).
 * 'Visita' es un pago único (no se renueva); duraciones no estándar se guardan como 'Promoción'.
 */
export function deriveType(preset: DurationPreset, days: number, isPromo: boolean): PlanType {
  if (preset === 'visita') return 'Visita';
  if (isPromo) return 'Promoción';
  if (days >= 28 && days <= 31) return 'Mensual';
  if (days === 90) return 'Trimestral';
  if (days === 180) return 'Semestral';
  if (days === 365 || days === 366) return 'Anual';
  return 'Promoción';
}

/** Cada cuánto se factura, igual que plan_next_due() en SQL. */
export function billingPeriod(days: number, type?: string): { months: number | null; days: number | null; once: boolean } {
  if (type === 'Visita') return { months: null, days: null, once: true };
  if (days >= 28 && days <= 31) return { months: 1, days: null, once: false };
  if (days >= 60 && days <= 360 && days % 30 === 0) return { months: days / 30, days: null, once: false };
  if (days === 365 || days === 366) return { months: 12, days: null, once: false };
  return { months: null, days: Math.max(days, 1), once: false };
}

/** "$20 / mes", "$55 / 3 meses", "$5 · pago único" */
export function priceLabel(price: number, days: number, type?: string): string {
  const p = billingPeriod(days, type);
  const money = formatMoney(price);
  if (p.once) return `${money} · pago único`;
  if (p.months === 1) return `${money} / mes`;
  if (p.months === 12) return `${money} / año`;
  if (p.months) return `${money} / ${p.months} meses`;
  return `${money} / ${p.days} días`;
}

/** Explicación en palabras de cómo se le factura al socio. */
export function billingDescription(price: number, days: number, type?: string): string {
  const p = billingPeriod(days, type);
  const money = formatMoney(price);
  if (p.once) return `Se cobra una sola vez ${money}; no se renueva.`;
  if (p.months === 1) return `Se factura ${money} el día 1 de cada mes.`;
  if (p.months === 12) return `Se factura ${money} una vez al año, el día 1 del mes de inicio.`;
  if (p.months) return `Se factura ${money} cada ${p.months} meses, el día 1.`;
  return `Se factura ${money} cada ${p.days} días.`;
}

/** Equivalente mensual del precio (para estimar ingreso). Visitas: 0. */
export function monthlyEquivalent(price: number, days: number, type?: string): number {
  const p = billingPeriod(days, type);
  if (p.once) return 0;
  if (p.months) return price / p.months;
  return (price * 30) / (p.days ?? 30);
}

export interface PlanMemberRow {
  plan_id: string | null;
  status: string;
  is_free_user?: boolean | null;
}

export interface PlanStats {
  members: number;
  /** Activos que pagan (no exentos) */
  paying: number;
  suspended: number;
  monthlyRevenue: number;
  pendingInvoices: number;
}

export function planStats(
  plans: PlanRecord[],
  users: PlanMemberRow[],
  pendingInvoices: { plan_id: string | null }[],
): Map<string, PlanStats> {
  const out = new Map<string, PlanStats>(
    plans.map((p) => [p.id, { members: 0, paying: 0, suspended: 0, monthlyRevenue: 0, pendingInvoices: 0 }]),
  );
  const planById = new Map(plans.map((p) => [p.id, p]));
  for (const u of users) {
    const s = u.plan_id ? out.get(u.plan_id) : undefined;
    if (!s) continue;
    s.members++;
    if (u.status === 'Suspendido') s.suspended++;
    if (u.status === 'Activo' && !u.is_free_user) {
      s.paying++;
      const p = planById.get(u.plan_id!)!;
      s.monthlyRevenue += monthlyEquivalent(Number(p.price), p.duration_days, p.type);
    }
  }
  for (const i of pendingInvoices) {
    const s = i.plan_id ? out.get(i.plan_id) : undefined;
    if (s) s.pendingInvoices++;
  }
  return out;
}
