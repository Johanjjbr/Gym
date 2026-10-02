import { describe, expect, it } from 'vitest';
import {
  addDays,
  attendanceByDay,
  daysBetween,
  memberSummary,
  receivables,
  revenueByMonth,
  revenueMonthToDate,
  shiftMonth,
} from './dashboardHelpers';

const pay = (date: string, amount: number) => ({ id: date + amount, user_id: 'u1', amount, date });

describe('fechas', () => {
  it('suma días cruzando meses y años', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
  it('desplaza meses al día 1', () => {
    expect(shiftMonth('2026-10-15', -5)).toBe('2026-05-01');
    expect(shiftMonth('2026-01-31', -1)).toBe('2025-12-01');
  });
  it('cuenta días entre fechas', () => {
    expect(daysBetween('2026-09-25', '2026-10-01')).toBe(6);
  });
});

describe('revenueByMonth', () => {
  it('agrupa los últimos 6 meses e ignora lo anterior', () => {
    const r = revenueByMonth(
      [pay('2026-10-01T10:00:00', 50), pay('2026-09-12', 30), pay('2026-09-30', 20), pay('2026-04-30', 999)],
      '2026-10-01',
    );
    expect(r.map((m) => m.label)).toEqual(['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct']);
    expect(r[4].total).toBe(50);
    expect(r[5]).toMatchObject({ total: 50, isCurrent: true });
  });
});

describe('revenueMonthToDate', () => {
  it('compara contra el mismo tramo del mes anterior, no el mes completo', () => {
    const r = revenueMonthToDate([pay('2026-10-01', 40), pay('2026-09-01', 20), pay('2026-09-15', 500)], '2026-10-01');
    expect(r).toEqual({ current: 40, previous: 20, pct: 100 });
  });
  it('no inventa porcentaje si el mes anterior fue 0', () => {
    expect(revenueMonthToDate([pay('2026-10-01', 40)], '2026-10-01').pct).toBeNull();
  });
  it('recorta al largo del mes anterior (31 mar vs febrero)', () => {
    const r = revenueMonthToDate([pay('2026-02-28', 10), pay('2026-03-01', 5)], '2026-03-31');
    expect(r.previous).toBe(10);
  });
});

describe('receivables', () => {
  const inv = (id: string, user_id: string, due_date: string, amount: number, status = 'Pendiente') => ({
    id, user_id, due_date, amount, status,
  });

  it('separa vencidas (incluye pendientes con fecha pasada) de próximas', () => {
    const r = receivables(
      [
        inv('a', 'u1', '2026-09-01', 30, 'Vencida'),
        inv('b', 'u1', '2026-09-20', 30),
        inv('c', 'u2', '2026-10-03', 25),
        inv('d', 'u3', '2026-11-01', 25),
      ],
      '2026-10-01',
    );
    expect(r.totalOpen).toBe(110);
    expect(r.openCount).toBe(4);
    expect(r.overdueTotal).toBe(60);
    expect(r.overdueCount).toBe(2);
    expect(r.debtors).toEqual([{ user_id: 'u1', total: 60, count: 2, oldestDue: '2026-09-01', daysLate: 30 }]);
    expect(r.upcoming.map((u) => [u.id, u.daysLeft])).toEqual([['c', 2]]);
  });

  it('ignora facturas pagadas', () => {
    expect(receivables([inv('x', 'u1', '2026-09-01', 30, 'Pagada')], '2026-10-01').totalOpen).toBe(0);
  });
});

describe('attendanceByDay', () => {
  it('cuenta socios distintos por día y rellena días vacíos', () => {
    const r = attendanceByDay(
      [
        { date: '2026-10-01', user_id: 'a' },
        { date: '2026-10-01', user_id: 'a' },
        { date: '2026-10-01', user_id: 'b' },
        { date: '2026-09-28', user_id: 'a' },
      ],
      '2026-10-01',
    );
    expect(r).toHaveLength(7);
    expect(r[6]).toMatchObject({ date: '2026-10-01', label: 'Jue 1', count: 2, isToday: true });
    expect(r[3]).toMatchObject({ date: '2026-09-28', label: 'Lun 28', count: 1 });
    expect(r[0].count).toBe(0);
  });
});

describe('memberSummary', () => {
  it('cuenta por estado y altas del mes', () => {
    const s = memberSummary(
      [
        { id: '1', name: 'A', status: 'Activo', created_at: '2026-10-01T08:00:00' },
        { id: '2', name: 'B', status: 'Suspendido', created_at: '2026-09-30T23:00:00' },
        { id: '3', name: 'C', status: 'Inactivo', created_at: null },
      ],
      '2026-10-01',
    );
    expect(s).toEqual({ total: 3, active: 1, suspended: 1, inactive: 1, newThisMonth: 1 });
  });
});
