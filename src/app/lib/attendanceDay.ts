/**
 * Asistencia de un día (recepción): sesiones entrada→salida, quién está dentro,
 * afluencia por hora y qué acción corresponde al buscar a un socio.
 * Lógica pura, testeable.
 */
import type { MemberRow } from './members';

export interface DayRecord {
  id: string;
  user_id: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm:ss
  type: 'Entrada' | 'Salida' | string;
  source?: string | null;
  users?: { name?: string | null; member_number?: string | null } | null;
}

export interface Session {
  key: string;
  userId: string;
  name: string;
  memberNumber: string | null;
  checkIn: string; // HH:mm
  checkOut: string | null;
  /** Minutos dentro (si ya salió) */
  minutes: number | null;
  source: string | null;
}

export const SOURCE_LABELS: Record<string, string> = {
  manual: 'Recepción',
  qr: 'QR',
  fingerprint: 'Huella',
  nfc: 'Tarjeta NFC',
};

export const sourceLabel = (s?: string | null) => SOURCE_LABELS[s ?? 'manual'] ?? s ?? 'Recepción';

const hhmm = (t: string) => t.slice(0, 5);
export const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * Empareja cada Entrada con la Salida siguiente del mismo socio.
 * Devuelve las sesiones del día, la más reciente primero.
 */
export function pairSessions(records: DayRecord[]): Session[] {
  const byUser = new Map<string, DayRecord[]>();
  for (const r of records) (byUser.get(r.user_id) ?? byUser.set(r.user_id, []).get(r.user_id)!).push(r);
  const out: Session[] = [];
  for (const [userId, recs] of byUser) {
    recs.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
    let open: Session | null = null;
    for (const r of recs) {
      if (r.type === 'Entrada') {
        if (open) out.push(open); // entrada sin salida antes de otra entrada
        open = {
          key: r.id,
          userId,
          name: r.users?.name ?? 'Socio',
          memberNumber: r.users?.member_number ?? null,
          checkIn: hhmm(r.time),
          checkOut: null,
          minutes: null,
          source: r.source ?? null,
        };
      } else if (r.type === 'Salida' && open) {
        open.checkOut = hhmm(r.time);
        const d = toMinutes(open.checkOut) - toMinutes(open.checkIn);
        open.minutes = d >= 0 ? d : null;
        out.push(open);
        open = null;
      }
    }
    if (open) out.push(open);
  }
  return out.sort((a, b) => (a.checkIn < b.checkIn ? 1 : a.checkIn > b.checkIn ? -1 : 0));
}

/** Socios con una sesión abierta (entraron y no han salido), por id → hora de entrada. */
export function insideMap(sessions: Session[]): Map<string, Session> {
  const m = new Map<string, Session>();
  for (const s of sessions) if (!s.checkOut && !m.has(s.userId)) m.set(s.userId, s);
  return m;
}

/** Entradas por hora (0..23). */
export function hourlyEntries(records: DayRecord[]): number[] {
  const h = Array<number>(24).fill(0);
  for (const r of records) if (r.type === 'Entrada' && r.time) h[Number(r.time.slice(0, 2))]++;
  return h;
}

/** Hora con más entradas, o null si no hubo. */
export function peakHour(hours: number[]): { hour: number; count: number } | null {
  let best = -1;
  for (let i = 0; i < hours.length; i++) if (hours[i] > 0 && (best < 0 || hours[i] > hours[best])) best = i;
  return best < 0 ? null : { hour: best, count: hours[best] };
}

export const hourLabel = (h: number) => {
  const suffix = h < 12 ? 'am' : 'pm';
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n} ${suffix}`;
};

/** "1 h 20 min" desde la hora de entrada hasta ahora (HH:mm). */
export function elapsedSince(checkIn: string, nowHHmm: string): number {
  return Math.max(0, toMinutes(nowHHmm) - toMinutes(checkIn));
}

/** Visitas únicas (socios distintos con al menos una entrada). */
export function uniqueVisitors(records: DayRecord[]): number {
  return new Set(records.filter((r) => r.type === 'Entrada').map((r) => r.user_id)).size;
}

/** Promedio diario de socios únicos en un rango de días (para comparar con hoy). */
export function dailyAverage(entries: { user_id: string; date: string }[], days: number): number {
  if (days <= 0) return 0;
  const perDay = new Map<string, Set<string>>();
  for (const e of entries) (perDay.get(e.date) ?? perDay.set(e.date, new Set()).get(e.date)!).add(e.user_id);
  let total = 0;
  for (const s of perDay.values()) total += s.size;
  return Math.round((total / days) * 10) / 10;
}

export type CheckinTone = 'ok' | 'warn' | 'blocked';

export interface CheckinDecision {
  /** Acción del botón principal; null si no se puede registrar. */
  action: 'Entrada' | 'Salida' | null;
  tone: CheckinTone;
  /** Mensaje corto para recepción. */
  message: string | null;
  /** Ofrecer "Cobrar" (tiene deuda / está suspendido). */
  offerCollect: boolean;
}

/**
 * Qué puede hacer recepción con este socio ahora.
 * - Dentro → Salida (siempre se permite salir).
 * - Suspendido / Inactivo → bloqueado (la base de datos también lo rechaza).
 * - Activo con deuda vencida → Entrada con aviso y botón Cobrar.
 */
export function checkinDecision(row: MemberRow, inside: boolean): CheckinDecision {
  const u = row.user;
  if (inside) return { action: 'Salida', tone: 'ok', message: null, offerCollect: false };
  if (u.status === 'Suspendido') {
    return {
      action: null,
      tone: 'blocked',
      message: row.debt > 0 ? 'Suspendido por falta de pago. Cobra para habilitar la entrada.' : 'Socio suspendido.',
      offerCollect: row.debt > 0,
    };
  }
  if (u.status === 'Inactivo') {
    return { action: null, tone: 'blocked', message: 'Dado de baja. Reactívalo desde su perfil.', offerCollect: false };
  }
  if (row.payment === 'overdue') {
    return { action: 'Entrada', tone: 'warn', message: 'Tiene pagos vencidos.', offerCollect: true };
  }
  if (row.payment === 'due-soon' && row.daysLeft !== null) {
    const msg = row.daysLeft === 0 ? 'Su mensualidad vence hoy.' : `Su mensualidad vence en ${row.daysLeft} día${row.daysLeft === 1 ? '' : 's'}.`;
    return { action: 'Entrada', tone: 'warn', message: msg, offerCollect: true };
  }
  if (row.payment === 'no-plan') {
    return { action: 'Entrada', tone: 'warn', message: 'No tiene plan asignado.', offerCollect: false };
  }
  return { action: 'Entrada', tone: 'ok', message: null, offerCollect: false };
}

/** Hora local HH:mm:ss (no UTC). */
export function localTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** "18:05" → "6:05 pm" */
export function time12(t: string | null | undefined): string {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

const QR_RE = /^GYM-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Si el texto es un código de carnet ("GYM-<uuid>", lo que escribe un lector QR USB), devuelve el id. */
export function parseMemberCode(text: string): string | null {
  return QR_RE.exec(text.trim())?.[1]?.toLowerCase() ?? null;
}

export const memberCode = (userId: string) => `GYM-${userId}`;
