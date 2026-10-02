/**
 * Estadísticas de asistencia de un socio (lógica pura, testeable).
 * Una "visita" = un día con al menos una Entrada.
 */
import { addDays, daysBetween, monthStart, shiftMonth, type DateStr } from './dashboardHelpers';

export interface AttendanceRecord {
  id: string;
  date: string; // yyyy-MM-dd
  time?: string | null; // HH:mm:ss
  type: string; // 'Entrada' | 'Salida'
  source?: string | null;
}

export interface Visit {
  date: DateStr;
  checkIn: string | null; // HH:mm
  checkOut: string | null;
  minutes: number | null;
  source: string | null;
}

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : null);
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Agrupa registros en visitas por día: primera entrada y última salida. */
export function groupVisits(records: AttendanceRecord[]): Visit[] {
  const byDay = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const d = r.date.slice(0, 10);
    (byDay.get(d) ?? byDay.set(d, []).get(d)!).push(r);
  }
  const visits: Visit[] = [];
  for (const [date, recs] of byDay) {
    const ins = recs.filter((r) => r.type === 'Entrada' && r.time).map((r) => r.time!).sort();
    const outs = recs.filter((r) => r.type === 'Salida' && r.time).map((r) => r.time!).sort();
    if (!recs.some((r) => r.type === 'Entrada')) continue;
    const checkIn = hhmm(ins[0]);
    const checkOut = hhmm(outs[outs.length - 1]);
    const minutes = checkIn && checkOut && toMin(checkOut) > toMin(checkIn) ? toMin(checkOut) - toMin(checkIn) : null;
    visits.push({ date, checkIn, checkOut, minutes, source: recs.find((r) => r.type === 'Entrada')?.source ?? null });
  }
  return visits.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface AttendanceSummary {
  thisMonth: number;
  lastMonth: number;
  /** Visitas por semana, promedio de las últimas 8 semanas completas + la actual. */
  weeklyAvg: number;
  lastVisit: DateStr | null;
  daysSinceLast: number | null;
  avgMinutes: number | null;
  total: number;
}

export function summarizeAttendance(visits: Visit[], today: DateStr): AttendanceSummary {
  const start = monthStart(today);
  const prevStart = shiftMonth(today, -1);
  const since8w = addDays(today, -55);
  let thisMonth = 0;
  let lastMonth = 0;
  let last8w = 0;
  const durations: number[] = [];
  for (const v of visits) {
    if (v.date > today) continue;
    if (v.date >= start) thisMonth++;
    else if (v.date >= prevStart) lastMonth++;
    if (v.date >= since8w) last8w++;
    if (v.minutes) durations.push(v.minutes);
  }
  const lastVisit = visits.find((v) => v.date <= today)?.date ?? null;
  return {
    thisMonth,
    lastMonth,
    weeklyAvg: Math.round((last8w / 8) * 10) / 10,
    lastVisit,
    daysSinceLast: lastVisit ? daysBetween(lastVisit, today) : null,
    avgMinutes: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    total: visits.length,
  };
}

export interface HeatCell {
  date: DateStr;
  visited: boolean;
  future: boolean;
}

/**
 * Cuadrícula de las últimas `weeks` semanas (columnas = semanas, filas = lun..dom),
 * terminando en la semana de hoy.
 */
export function attendanceGrid(visits: Visit[], today: DateStr, weeks = 13): HeatCell[][] {
  const visited = new Set(visits.map((v) => v.date));
  const [y, m, d] = today.split('-').map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = lunes
  const firstMonday = addDays(today, -dow - (weeks - 1) * 7);
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(firstMonday, w * 7 + i);
      col.push({ date, visited: visited.has(date), future: date > today });
    }
    cols.push(col);
  }
  return cols;
}

export function lastVisitInWords(daysSince: number | null): string {
  if (daysSince === null) return 'Nunca';
  if (daysSince === 0) return 'Hoy';
  if (daysSince === 1) return 'Ayer';
  if (daysSince < 7) return `Hace ${daysSince} días`;
  const weeks = Math.floor(daysSince / 7);
  if (daysSince < 30) return `Hace ${weeks} semana${weeks === 1 ? '' : 's'}`;
  const months = Math.floor(daysSince / 30);
  return `Hace ${months} mes${months === 1 ? '' : 'es'}`;
}

export function formatDuration(min: number | null): string {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}
