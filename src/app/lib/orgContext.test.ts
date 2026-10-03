import { describe, expect, it } from 'vitest';
import { addMonthsIso, branchScopeFor, coveredPeriod, scopeLabel, subscriptionNotice, type OrgContext } from './orgContext';

const ctx = (over: Partial<OrgContext> = {}): OrgContext => ({
  organization: { id: 'o', name: 'Gym', legal_name: null, rif: null, email: null, phone: null, logo_url: null, status: 'Activa', max_branches: 3 },
  branches: [{ id: 'a', name: 'Centro' }, { id: 'b', name: 'Norte' }],
  home_gym_id: 'a',
  active_gym_id: null,
  current_gym_id: 'a',
  can_choose_branch: false,
  is_super_admin: false,
  support_mode: false,
  subscription: null,
  ...over,
});

describe('branchScopeFor', () => {
  it('recepción queda fija en su sede', () => {
    expect(branchScopeFor(ctx({ home_gym_id: 'b' }))).toBe('b');
  });
  it('dueño/admin: todas por defecto o la elegida', () => {
    expect(branchScopeFor(ctx({ can_choose_branch: true }))).toBeNull();
    expect(branchScopeFor(ctx({ can_choose_branch: true, active_gym_id: 'b' }))).toBe('b');
  });
  it('ignora una sede elegida que ya no existe', () => {
    expect(branchScopeFor(ctx({ can_choose_branch: true, active_gym_id: 'zz' }))).toBeNull();
  });
  it('con una sola sede no filtra', () => {
    expect(branchScopeFor(ctx({ branches: [{ id: 'a', name: 'Centro' }] }))).toBeNull();
    expect(branchScopeFor(null)).toBeNull();
  });
  it('etiqueta de lo que se ve', () => {
    expect(scopeLabel(ctx({ can_choose_branch: true }))).toBe('Todas las sedes');
    expect(scopeLabel(ctx())).toBe('Centro');
    expect(scopeLabel(ctx({ branches: [{ id: 'a', name: 'Centro' }] }))).toBe('Centro');
  });
});

describe('subscriptionNotice', () => {
  const sub = (state: any, days_left: number | null, next_due_date = '2026-10-05') =>
    ({ plan: 'Básico', price: 30, next_due_date, days_left, state });
  it('sin aviso si está al día o sin fecha', () => {
    expect(subscriptionNotice(sub('al_dia', 10))).toBeNull();
    expect(subscriptionNotice(sub('sin_fecha', null))).toBeNull();
    expect(subscriptionNotice(null)).toBeNull();
  });
  it('amarillo 3 días antes', () => {
    const n = subscriptionNotice(sub('por_vencer', 3))!;
    expect(n.tone).toBe('warning');
    expect(n.title).toContain('en 3 días');
    expect(n.message).toContain('05/10/2026');
    expect(n.message).toContain('$30.00');
    expect(subscriptionNotice(sub('por_vencer', 1))!.title).toContain('mañana');
    expect(subscriptionNotice(sub('por_vencer', 0))!.title).toContain('hoy');
  });
  it('rojo vencida y suspendida', () => {
    const n = subscriptionNotice(sub('vencida', -4))!;
    expect(n.tone).toBe('danger');
    expect(n.title).toContain('hace 4 días');
    expect(subscriptionNotice(sub('suspendida', 5))!.tone).toBe('danger');
  });
});

describe('meses de suscripción', () => {
  it('suma meses ajustando fin de mes', () => {
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsIso('2026-11-15', 2)).toBe('2027-01-15');
    expect(addMonthsIso('2026-10-05', 12)).toBe('2027-10-05');
  });
  it('periodo cubierto desde el vencimiento pendiente', () => {
    expect(coveredPeriod('2026-10-05', '2026-10-03', 2)).toEqual({ start: '2026-10-05', end: '2026-12-04', next: '2026-12-05' });
    expect(coveredPeriod(null, '2026-10-03', 1)).toEqual({ start: '2026-10-03', end: '2026-11-02', next: '2026-11-03' });
  });
});

describe('empresa proveedora', () => {
  it('solo es "casa de plataforma" fuera del modo soporte', async () => {
    const { isPlatformHome } = await import('./orgContext');
    expect(isPlatformHome(ctx({ is_platform: true }))).toBe(true);
    expect(isPlatformHome(ctx({ is_platform: true, support_mode: true }))).toBe(false);
    expect(isPlatformHome(ctx())).toBe(false);
    expect(isPlatformHome(null)).toBe(false);
  });
});
