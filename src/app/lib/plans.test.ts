import { describe, expect, it } from 'vitest';
import { billingDescription, deriveType, monthlyEquivalent, planStats, presetFor, priceLabel } from './plans';

describe('tipo derivado de la duración', () => {
  it('presets estándar', () => {
    expect(deriveType('mensual', 30, false)).toBe('Mensual');
    expect(deriveType('trimestral', 90, false)).toBe('Trimestral');
    expect(deriveType('semestral', 180, false)).toBe('Semestral');
    expect(deriveType('anual', 365, false)).toBe('Anual');
    expect(deriveType('visita', 1, false)).toBe('Visita');
  });
  it('promoción y duraciones no estándar', () => {
    expect(deriveType('mensual', 30, true)).toBe('Promoción');
    expect(deriveType('custom', 15, false)).toBe('Promoción');
    expect(deriveType('visita', 1, true)).toBe('Visita'); // la visita sigue siendo pago único
  });
  it('preset de un plan existente', () => {
    expect(presetFor(30, 'Mensual')).toBe('mensual');
    expect(presetFor(30, 'Promoción')).toBe('mensual');
    expect(presetFor(1, 'Visita')).toBe('visita');
    expect(presetFor(45, 'Promoción')).toBe('custom');
  });
});

describe('cómo se factura (igual que plan_next_due)', () => {
  it('etiquetas de precio', () => {
    expect(priceLabel(20, 30, 'Mensual')).toBe('Bs 20 / mes');
    expect(priceLabel(55, 90, 'Trimestral')).toBe('Bs 55 / 3 meses');
    expect(priceLabel(200, 365, 'Anual')).toBe('Bs 200 / año');
    expect(priceLabel(5, 1, 'Visita')).toBe('Bs 5 · pago único');
    expect(priceLabel(12, 15, 'Promoción')).toBe('Bs 12 / 15 días');
  });
  it('descripción', () => {
    expect(billingDescription(20, 30, 'Mensual')).toBe('Se factura Bs 20 el día 1 de cada mes.');
    expect(billingDescription(5, 1, 'Visita')).toBe('Se cobra una sola vez Bs 5; no se renueva.');
  });
  it('equivalente mensual', () => {
    expect(monthlyEquivalent(60, 90, 'Trimestral')).toBe(20);
    expect(monthlyEquivalent(5, 1, 'Visita')).toBe(0);
    expect(monthlyEquivalent(15, 15, 'Promoción')).toBe(30);
  });
});

describe('planStats', () => {
  it('socios, pagantes, suspendidos, ingreso mensual y facturas pendientes por plan', () => {
    const plans = [
      { id: 'm', name: 'Mensual', duration_days: 30, price: 20, type: 'Mensual', is_active: true },
      { id: 't', name: 'Trimestral', duration_days: 90, price: 54, type: 'Trimestral', is_active: true },
    ];
    const users = [
      { plan_id: 'm', status: 'Activo' },
      { plan_id: 'm', status: 'Activo', is_free_user: true },
      { plan_id: 'm', status: 'Suspendido' },
      { plan_id: 't', status: 'Activo' },
      { plan_id: null, status: 'Activo' },
    ];
    const s = planStats(plans, users, [{ plan_id: 'm' }, { plan_id: 'm' }, { plan_id: null }]);
    expect(s.get('m')).toEqual({ members: 3, paying: 1, suspended: 1, monthlyRevenue: 20, pendingInvoices: 2 });
    expect(s.get('t')).toEqual({ members: 1, paying: 1, suspended: 0, monthlyRevenue: 18, pendingInvoices: 0 });
  });
});
