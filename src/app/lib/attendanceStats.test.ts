import { describe, expect, it } from 'vitest';
import { attendanceGrid, formatDuration, groupVisits, lastVisitInWords, summarizeAttendance, type AttendanceRecord } from './attendanceStats';

const rec = (date: string, time: string, type = 'Entrada', id = `${date}${time}${type}`): AttendanceRecord => ({ id, date, time, type });

describe('groupVisits', () => {
  it('una visita por día con primera entrada y última salida', () => {
    const v = groupVisits([
      rec('2026-10-01', '18:05:00'),
      rec('2026-10-01', '19:40:00', 'Salida'),
      rec('2026-10-01', '07:00:00'), // volvió más temprano: cuenta la primera entrada
      rec('2026-09-30', '08:00:00'),
    ]);
    expect(v).toEqual([
      { date: '2026-10-01', checkIn: '07:00', checkOut: '19:40', minutes: 760, source: null },
      { date: '2026-09-30', checkIn: '08:00', checkOut: null, minutes: null, source: null },
    ]);
  });

  it('un día con solo salida no cuenta como visita', () => {
    expect(groupVisits([rec('2026-10-01', '19:00:00', 'Salida')])).toEqual([]);
  });
});

describe('summarizeAttendance', () => {
  it('cuenta visitas del mes, del mes anterior, promedio semanal y última visita', () => {
    const visits = groupVisits([
      rec('2026-10-01', '18:00:00'), rec('2026-10-01', '19:30:00', 'Salida'),
      rec('2026-10-02', '18:00:00'), rec('2026-10-02', '19:00:00', 'Salida'),
      rec('2026-09-20', '18:00:00'),
      rec('2026-09-10', '18:00:00'),
      rec('2026-06-01', '18:00:00'), // fuera de las 8 semanas
    ]);
    expect(summarizeAttendance(visits, '2026-10-04')).toEqual({
      thisMonth: 2,
      lastMonth: 2,
      weeklyAvg: 0.5,
      lastVisit: '2026-10-02',
      daysSinceLast: 2,
      avgMinutes: 75,
      total: 5,
    });
  });

  it('sin visitas', () => {
    expect(summarizeAttendance([], '2026-10-04')).toMatchObject({ lastVisit: null, daysSinceLast: null, avgMinutes: null, total: 0 });
  });
});

describe('attendanceGrid', () => {
  it('13 semanas de lunes a domingo terminando en la semana de hoy', () => {
    const g = attendanceGrid(groupVisits([rec('2026-10-01', '18:00:00')]), '2026-10-01'); // jueves
    expect(g).toHaveLength(13);
    const last = g[12];
    expect(last[0].date).toBe('2026-09-28'); // lunes
    expect(last[3]).toEqual({ date: '2026-10-01', visited: true, future: false });
    expect(last[4].future).toBe(true);
  });
});

describe('textos', () => {
  it('última visita en palabras', () => {
    expect([null, 0, 1, 3, 10, 45].map(lastVisitInWords)).toEqual(['Nunca', 'Hoy', 'Ayer', 'Hace 3 días', 'Hace 1 semana', 'Hace 1 mes']);
  });
  it('duración', () => {
    expect([null, 45, 95].map(formatDuration)).toEqual(['—', '45 min', '1 h 35 min']);
  });
});
