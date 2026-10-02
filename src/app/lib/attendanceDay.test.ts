import { describe, expect, it } from 'vitest';
import {
  checkinDecision, dailyAverage, elapsedSince, hourlyEntries, insideMap, pairSessions, parseMemberCode, peakHour, sourceLabel, time12, uniqueVisitors,
} from './attendanceDay';
import type { MemberRow } from './members';

const rec = (id: string, user_id: string, time: string, type: string, source = 'manual') => ({
  id, user_id, date: '2026-10-01', time, type, source, users: { name: user_id.toUpperCase(), member_number: 'GM-' + user_id },
});

describe('pairSessions / insideMap', () => {
  const records = [
    rec('1', 'a', '06:00:00', 'Entrada'),
    rec('2', 'a', '07:15:00', 'Salida'),
    rec('3', 'a', '18:00:00', 'Entrada', 'qr'),
    rec('4', 'b', '17:30:00', 'Entrada'),
    rec('5', 'c', '09:00:00', 'Salida'), // salida huérfana: se ignora
  ];
  const sessions = pairSessions(records);

  it('empareja entradas con la salida siguiente, más reciente primero', () => {
    expect(sessions.map((s) => [s.userId, s.checkIn, s.checkOut, s.minutes])).toEqual([
      ['a', '18:00', null, null],
      ['b', '17:30', null, null],
      ['a', '06:00', '07:15', 75],
    ]);
    expect(sessions[0].source).toBe('qr');
  });

  it('quién está dentro', () => {
    const m = insideMap(sessions);
    expect([...m.keys()].sort()).toEqual(['a', 'b']);
    expect(m.get('a')!.checkIn).toBe('18:00');
  });

  it('visitas únicas y entradas por hora', () => {
    expect(uniqueVisitors(records)).toBe(2);
    const h = hourlyEntries(records);
    expect(h[6]).toBe(1);
    expect(h[17]).toBe(1);
    expect(h[18]).toBe(1);
    expect(peakHour(h)).toEqual({ hour: 6, count: 1 });
    expect(peakHour(Array(24).fill(0))).toBeNull();
  });
});

describe('formatos', () => {
  it('hora 12h y origen', () => {
    expect(time12('18:05')).toBe('6:05 pm');
    expect(time12('00:10:00')).toBe('12:10 am');
    expect(time12('12:00')).toBe('12:00 pm');
    expect(sourceLabel('manual')).toBe('Recepción');
    expect(sourceLabel(null)).toBe('Recepción');
    expect(sourceLabel('qr')).toBe('QR');
  });
  it('tiempo transcurrido', () => {
    expect(elapsedSince('18:00', '19:25')).toBe(85);
  });
  it('promedio diario de socios únicos', () => {
    const e = [
      { user_id: 'a', date: '2026-09-01' }, { user_id: 'a', date: '2026-09-01' }, { user_id: 'b', date: '2026-09-01' },
      { user_id: 'a', date: '2026-09-02' },
    ];
    expect(dailyAverage(e, 2)).toBe(1.5);
  });
  it('código de carnet (lector QR)', () => {
    const id = '3f2b8a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
    expect(parseMemberCode(`GYM-${id}`)).toBe(id);
    expect(parseMemberCode(` gym-${id.toUpperCase()} `)).toBe(id);
    expect(parseMemberCode('Juan')).toBeNull();
    expect(parseMemberCode('GYM-123')).toBeNull();
  });
});

describe('checkinDecision', () => {
  const row = (over: Partial<MemberRow> & { status?: string }): MemberRow => ({
    user: { id: 'u', name: 'Ana', status: over.status ?? 'Activo', plans: { id: 'p' } as any },
    payment: 'ok', debt: 0, daysLate: 0, nextDue: null, daysLeft: null, nextAmount: null, lastVisit: null, daysSinceVisit: null,
    ...over,
  });

  it('dentro → Salida siempre (aunque esté suspendido)', () => {
    expect(checkinDecision(row({ status: 'Suspendido' }), true).action).toBe('Salida');
  });
  it('al día → Entrada sin aviso', () => {
    expect(checkinDecision(row({}), false)).toEqual({ action: 'Entrada', tone: 'ok', message: null, offerCollect: false });
  });
  it('con deuda vencida pero activo → Entrada con aviso y Cobrar', () => {
    const d = checkinDecision(row({ payment: 'overdue', debt: 20 }), false);
    expect(d).toMatchObject({ action: 'Entrada', tone: 'warn', offerCollect: true });
  });
  it('vence pronto → aviso', () => {
    expect(checkinDecision(row({ payment: 'due-soon', daysLeft: 0 }), false).message).toBe('Su mensualidad vence hoy.');
    expect(checkinDecision(row({ payment: 'due-soon', daysLeft: 1 }), false).message).toBe('Su mensualidad vence en 1 día.');
  });
  it('suspendido con deuda → bloqueado, ofrece Cobrar', () => {
    expect(checkinDecision(row({ status: 'Suspendido', payment: 'overdue', debt: 40 }), false)).toMatchObject({ action: null, tone: 'blocked', offerCollect: true });
  });
  it('dado de baja → bloqueado sin Cobrar', () => {
    expect(checkinDecision(row({ status: 'Inactivo', payment: 'inactive' }), false)).toMatchObject({ action: null, tone: 'blocked', offerCollect: false });
  });
});
