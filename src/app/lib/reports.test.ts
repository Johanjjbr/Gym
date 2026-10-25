import { describe, expect, it } from 'vitest';
import {
  attendanceReport, caracasDate, hourLabel, incomeCsv, incomeReport, membersReport, monthRange, recentMonths, statusOn,
  type ReportMember, type StatusChange,
} from './reports';
import type { DayPayment } from './dailyPayments';

describe('monthRange', () => {
  it('febrero bisiesto', () => {
    expect(monthRange('2028-02')).toMatchObject({ from: '2028-02-01', to: '2028-03-01', last: '2028-02-29', days: 29 });
  });
  it('diciembre pasa al año siguiente', () => {
    expect(monthRange('2026-12')).toMatchObject({ to: '2027-01-01', last: '2026-12-31' });
  });
  it('últimos meses', () => expect(recentMonths('2026-01-15', 3)).toEqual(['2026-01', '2025-12', '2025-11']));
});

describe('caracasDate', () => {
  it('convierte UTC a Caracas (UTC-4)', () => {
    expect(caracasDate('2026-11-01T02:30:00+00:00')).toBe('2026-10-31');
    expect(caracasDate('2026-11-01T05:00:00Z')).toBe('2026-11-01');
  });
});

const pay = (p: Partial<DayPayment>): DayPayment => ({ id: Math.random().toString(), user_id: 'u1', amount: 10, date: '2026-10-05T10:00:00', status: 'Pagado', ...p });

describe('incomeReport', () => {
  const payments = [
    pay({ amount: 20, method: 'Efectivo $', currency: 'USD' }),
    pay({ amount: 10, method: 'Pago Móvil', currency: 'VES', amount_original: 400, exchange_rate: 40, date: '2026-10-05T12:00:00' }),
    pay({ amount: 15, method: 'Zelle', currency: 'USD', date: '2026-10-20T09:00:00' }),
    pay({ amount: 99, status: 'Anulado', date: '2026-10-21T09:00:00' }),
    pay({ amount: 50, date: '2026-11-01T08:00:00' }), // otro mes
  ];
  const r = incomeReport('2026-10', payments);
  it('separa dólares y bolívares, total equivalente sin anulados', () => {
    expect(r.summary).toMatchObject({ count: 3, voidedCount: 1, totalUsd: 45, usdReceived: 35, vesReceived: 400 });
  });
  it('totales por día', () => {
    expect(r.byDay).toEqual([
      { day: '2026-10-05', count: 2, usd: 20, ves: 400, totalUsd: 30 },
      { day: '2026-10-20', count: 1, usd: 15, ves: 0, totalUsd: 15 },
    ]);
  });
  it('CSV con montos en coma decimal y anulados al final', () => {
    const csv = incomeCsv(r, () => 'Ana');
    const lines = csv.replace('﻿', '').split('\r\n');
    expect(lines).toHaveLength(5);
    expect(lines[2]).toContain('Bs;400,00;40,00;10,00;Pagado');
    expect(lines[4]).toContain('Anulado');
  });
});

const member = (m: Partial<ReportMember>): ReportMember => ({ id: 'x', name: 'X', status: 'Activo', start_date: '2025-01-01', ...m });

describe('statusOn', () => {
  const u = member({ id: 'a', status: 'Activo' });
  const h: StatusChange[] = [
    { user_id: 'a', old_status: 'Activo', new_status: 'Suspendido', changed_at: '2026-09-10T15:00:00Z' },
    { user_id: 'a', old_status: 'Suspendido', new_status: 'Activo', changed_at: '2026-10-03T15:00:00Z' },
  ];
  it('reconstruye el estado en una fecha pasada', () => {
    expect(statusOn(u, h, '2026-09-01')).toBe('Activo');
    expect(statusOn(u, h, '2026-09-30')).toBe('Suspendido');
    expect(statusOn(u, h, '2026-10-16')).toBe('Activo');
  });
  it('no era socio antes de inscribirse', () => {
    expect(statusOn(member({ start_date: '2026-10-10' }), [], '2026-09-30')).toBeNull();
  });
});

describe('membersReport', () => {
  const members = [
    member({ id: 'a', name: 'Ana', status: 'Activo', start_date: '2026-10-02', plans: { name: 'Mensual' } }),
    member({ id: 'b', name: 'Beto', status: 'Inactivo', plans: { name: 'Mensual' } }),
    member({ id: 'c', name: 'Carla', status: 'Suspendido', plan: 'Trimestral' }),
    member({ id: 'd', name: 'Dani', status: 'Activo', plan: 'Trimestral' }),
  ];
  const history: StatusChange[] = [
    { user_id: 'a', old_status: null, new_status: 'Activo', changed_at: '2026-10-02T14:00:00Z' },
    { user_id: 'b', old_status: 'Activo', new_status: 'Inactivo', changed_at: '2026-10-12T14:00:00Z' },
    { user_id: 'c', old_status: 'Activo', new_status: 'Suspendido', changed_at: '2026-10-15T14:00:00Z' },
  ];
  const r = membersReport('2026-10', members, history, '2026-10-16');
  it('cuenta al cierre (hoy en el mes en curso)', () => {
    expect(r).toMatchObject({ closeDay: '2026-10-16', activeAtClose: 2, inactiveAtClose: 1, suspendedAtClose: 1 });
  });
  it('altas, bajas y suspensiones del mes', () => {
    expect(r.newMembers.map((m) => m.name)).toEqual(['Ana']);
    expect(r.dropped.map((m) => m.name)).toEqual(['Beto']);
    expect(r.suspended.map((m) => m.name)).toEqual(['Carla']);
    expect(r.historySince).toBe('2026-10-02');
  });
  it('activos por plan', () => {
    expect(r.byPlan).toEqual([{ plan: 'Mensual', active: 1 }, { plan: 'Trimestral', active: 1 }]);
  });
  it('mes anterior: Ana aún no era socia, Beto y Carla estaban activos', () => {
    const sep = membersReport('2026-09', members, history, '2026-10-16');
    expect(sep).toMatchObject({ closeDay: '2026-09-30', activeAtClose: 3, inactiveAtClose: 0, suspendedAtClose: 0 });
    expect(sep.newMembers).toEqual([]);
  });
});

describe('attendanceReport', () => {
  const members = [member({ id: 'a', name: 'Ana' }), member({ id: 'b', name: 'Beto' }), member({ id: 'c', name: 'Carla' })];
  const entries = [
    { user_id: 'a', date: '2026-10-01', time: '07:10:00' },
    { user_id: 'a', date: '2026-10-03', time: '18:05:00' },
    { user_id: 'b', date: '2026-10-03', time: '18:40:00' },
    { user_id: 'b', date: '2026-09-30', time: '18:40:00' }, // otro mes
  ];
  const r = attendanceReport('2026-10', entries, members, [], '2026-10-04');
  it('visitas, socios distintos y promedio por día transcurrido', () => {
    expect(r).toMatchObject({ visits: 3, uniqueMembers: 2, daysElapsed: 4, avgPerDay: 0.75, peakHour: 18 });
    expect(r.busiestDay).toEqual({ day: '2026-10-03', visits: 2 });
  });
  it('ranking por socio y ausentes', () => {
    expect(r.byMember[0]).toMatchObject({ name: 'Ana', visits: 2, lastVisit: '2026-10-03' });
    expect(r.absent.map((m) => m.name)).toEqual(['Carla']);
  });
  it('etiqueta de hora', () => {
    expect(hourLabel(0)).toBe('12 am');
    expect(hourLabel(18)).toBe('6 pm');
  });
});
