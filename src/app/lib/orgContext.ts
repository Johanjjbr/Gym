/**
 * Empresa, sedes y suscripción de la sesión (lógica pura, testeable).
 * Los datos vienen de la función my_context() de la base (migración 50).
 */

export type SubscriptionState = 'al_dia' | 'por_vencer' | 'vencida' | 'suspendida' | 'cancelada' | 'sin_fecha';

export interface Branch {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
}

export interface OrgContext {
  organization: {
    id: string;
    name: string;
    legal_name: string | null;
    rif: string | null;
    email: string | null;
    phone: string | null;
    logo_url: string | null;
    status: string;
    max_branches: number;
  };
  branches: Branch[];
  home_gym_id: string | null;
  /** Sede elegida por Dueño/Admin; null = todas. */
  active_gym_id: string | null;
  /** Sede con la que se registran pagos y asistencias. */
  current_gym_id: string | null;
  can_choose_branch: boolean;
  is_super_admin: boolean;
  support_mode: boolean;
  /** Empresa proveedora del sistema (SeeStars): no es un gimnasio. */
  is_platform?: boolean;
  subscription: {
    plan: string | null;
    price: number | null;
    next_due_date: string | null;
    days_left: number | null;
    state: SubscriptionState;
  } | null;
}

/**
 * Sede por la que se filtran caja, pagos, asistencia y dashboard.
 * null = toda la empresa.
 *  - Dueño/Admin: la que eligieron (o todas).
 *  - Recepción/Entrenador: siempre su sede.
 *  - Con una sola sede no hace falta filtrar.
 */
export function branchScopeFor(ctx: OrgContext | null | undefined): string | null {
  if (!ctx || ctx.branches.length <= 1) return null;
  if (ctx.can_choose_branch) {
    return ctx.active_gym_id && ctx.branches.some((b) => b.id === ctx.active_gym_id) ? ctx.active_gym_id : null;
  }
  return ctx.home_gym_id ?? ctx.current_gym_id ?? null;
}

/** Nombre de la sede que se está viendo. */
export function scopeLabel(ctx: OrgContext | null | undefined): string {
  if (!ctx) return '';
  const scope = branchScopeFor(ctx);
  if (scope) return ctx.branches.find((b) => b.id === scope)?.name ?? '';
  if (ctx.branches.length === 1) return ctx.branches[0].name;
  return 'Todas las sedes';
}

/** El súper admin en su propia empresa proveedora (no en modo soporte). */
export const isPlatformHome = (ctx: OrgContext | null | undefined) => !!ctx?.is_platform && !ctx.support_mode;

/** Menú visible en la empresa proveedora: solo herramientas de plataforma. */
export const PLATFORM_PATHS = ['/plataforma', '/admin/permisos'];

export const STATE_LABEL: Record<SubscriptionState, string> = {
  al_dia: 'Al día',
  por_vencer: 'Por vencer',
  vencida: 'Vencida',
  suspendida: 'Suspendida',
  cancelada: 'Cancelada',
  sin_fecha: 'Sin fecha',
};

export const STATE_TONE: Record<SubscriptionState, string> = {
  al_dia: 'bg-[#10f94e]/15 text-[#10f94e] border-[#10f94e]/30',
  por_vencer: 'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30',
  vencida: 'bg-[#ff3b5c]/15 text-[#ff3b5c] border-[#ff3b5c]/30',
  suspendida: 'bg-[#ff3b5c]/15 text-[#ff3b5c] border-[#ff3b5c]/30',
  cancelada: 'bg-muted text-muted-foreground border-border',
  sin_fecha: 'bg-muted text-muted-foreground border-border',
};

const fmtDue = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export interface SubscriptionNotice {
  tone: 'warning' | 'danger';
  title: string;
  message: string;
}

/**
 * Aviso de pago del sistema para Dueño/Admin: desde 3 días antes del
 * vencimiento (amarillo) y después de vencido (rojo). Nunca bloquea.
 */
export function subscriptionNotice(sub: OrgContext['subscription']): SubscriptionNotice | null {
  if (!sub) return null;
  const due = sub.next_due_date ? fmtDue(sub.next_due_date) : '';
  const price = sub.price ? ` ($${Number(sub.price).toFixed(2)})` : '';
  switch (sub.state) {
    case 'por_vencer': {
      const d = sub.days_left ?? 0;
      const when = d <= 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`;
      return {
        tone: 'warning',
        title: `Tu mensualidad del sistema vence ${when}`,
        message: `Fecha de pago: ${due}${price}. Realiza el pago para mantener tu suscripción al día.`,
      };
    }
    case 'vencida': {
      const d = Math.abs(sub.days_left ?? 0);
      return {
        tone: 'danger',
        title: `Tu mensualidad del sistema está vencida${d ? ` hace ${d} día${d === 1 ? '' : 's'}` : ''}`,
        message: `Venció el ${due}${price}. Por favor regulariza el pago con tu proveedor.`,
      };
    }
    case 'suspendida':
      return {
        tone: 'danger',
        title: 'Tu suscripción al sistema está suspendida',
        message: 'Comunícate con tu proveedor para reactivarla.',
      };
    default:
      return null;
  }
}

/** yyyy-MM-dd + n meses, ajustando a fin de mes (31 ene + 1 = 28/29 feb). */
export function addMonthsIso(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const total = m - 1 + n;
  const ty = y + Math.floor(total / 12);
  const tm = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return `${ty}-${String(tm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/** Periodo que cubre un pago de la suscripción (igual que platform_register_payment). */
export function coveredPeriod(nextDue: string | null, paidOn: string, months: number) {
  const start = (nextDue ?? paidOn).slice(0, 10);
  const next = addMonthsIso(start, months);
  const [y, m, d] = next.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  return { start, end, next };
}
