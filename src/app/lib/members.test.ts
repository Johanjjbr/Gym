import { describe, expect, it } from 'vitest';
import { buildMemberRows, matchesSearch, quickCounts, sortRows, type MemberListUser } from './members';
import type { InvoiceRow } from './billing';

const plan = { id: 'pl', name: 'Premium Plus', price: 20, duration_days: 30 };
const u = (id: string, name: string, extra: Partial<MemberListUser> = {}): MemberListUser => ({
  id, name, status: 'Activo', is_free_user: false, plans: plan, cedula: `1000${id}`, phone: `0414-555${id}`, email: `${id}@mail.com`, member_number: `GM-${id}`, ...extra,
});
const inv = (user_id: string, due: string, status: string, amount = 20): InvoiceRow => ({ id: `${user_id}${due}`, user_id, due_date: `${due}T00:00:00`, status, amount });
const today = '2026-10-29';

const users = [
  u('1', 'Ana Pérez'),                                   // debe septiembre
  u('2', 'Bruno Díaz'),                                  // al día (oct pagado) -> vence 1-nov (en 3 días)
  u('3', 'Carla Ruiz', { status: 'Suspendido' }),        // suspendida con deuda
  u('4', 'Dario López', { is_free_user: true }),         // exento
  u('5', 'Elena Soto', { status: 'Inactivo' }),          // inactiva
  u('6', 'Félix Mora', { plans: null }),                 // sin plan
  u('7', 'Gabriela Ñáñez'),                               // pagó adelantado hasta diciembre
];
const invoices = [
  inv('1', '2026-09-01', 'Vencida'), inv('1', '2026-10-01', 'Vencida'),
  inv('2', '2026-10-01', 'Pagada'),
  inv('3', '2026-08-01', 'Vencida'),
  inv('7', '2026-11-01', 'Pagada'), inv('7', '2026-12-01', 'Pagada'),
];
const visits = [
  { user_id: '1', date: '2026-10-20' }, { user_id: '1', date: '2026-10-27' },
  { user_id: '2', date: '2026-10-29' },
  { user_id: '3', date: '2026-07-15' },
];

describe('buildMemberRows', () => {
  const rows = buildMemberRows(users, invoices, visits, today);
  const byId = Object.fromEntries(rows.map((r) => [r.user.id, r]));

  it('calcula el estado de pago de cada socio', () => {
    expect(Object.fromEntries(rows.map((r) => [r.user.name, r.payment]))).toEqual({
      'Ana Pérez': 'overdue',
      'Bruno Díaz': 'due-soon',
      'Carla Ruiz': 'overdue',
      'Dario López': 'exempt',
      'Elena Soto': 'inactive',
      'Félix Mora': 'no-plan',
      'Gabriela Ñáñez': 'ok',
    });
  });

  it('deuda, atraso, próximo vencimiento y última visita', () => {
    expect(byId['1']).toMatchObject({ debt: 40, daysLate: 58, lastVisit: '2026-10-27', daysSinceVisit: 2 });
    expect(byId['2']).toMatchObject({ debt: 0, nextDue: '2026-11-01', daysLeft: 3, nextAmount: 20, daysSinceVisit: 0 });
    expect(byId['7']).toMatchObject({ nextDue: '2027-01-01' });
    expect(byId['5'].lastVisit).toBeNull();
  });

  it('cuenta los filtros rápidos', () => {
    expect(quickCounts(rows)).toEqual({ todos: 7, activos: 5, deuda: 2, vencen: 1, suspendidos: 1, inactivos: 1 });
  });

  it('ordena por estado de pago (deudores primero, el más atrasado arriba)', () => {
    expect(sortRows(rows, 'payment', 'asc').map((r) => r.user.id).slice(0, 3)).toEqual(['3', '1', '2']);
  });

  it('ordena por última visita (sin visitas al final)', () => {
    expect(sortRows(rows, 'lastVisit', 'asc').map((r) => r.user.id).slice(0, 3)).toEqual(['2', '1', '3']);
  });
});

describe('matchesSearch', () => {
  const [row] = buildMemberRows([u('9', 'Gabriela Ñáñez', { cedula: '19234567', phone: '0414-551.07.31' })], [], [], today);
  it('nombre sin acentos, cédula, teléfono, N° de socio y email', () => {
    expect(['nanez', 'GABRIELA', '19234', '5510731', 'gm-9', '9@mail'].map((q) => matchesSearch(row, q))).toEqual([true, true, true, true, true, true]);
    expect(matchesSearch(row, 'pedro')).toBe(false);
    expect(matchesSearch(row, '  ')).toBe(true);
  });
});
