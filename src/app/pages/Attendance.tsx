/**
 * Asistencia — pensada para recepción:
 *  1. Registrar entrada/salida buscando al socio (un clic, Enter o lector QR).
 *  2. Quién está dentro ahora, con salida en un clic.
 *  3. Historial por día: sesiones entrada→salida y afluencia por hora.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock, Flame, LogOut, QrCode, RefreshCw, Search, Timer, UserCheck, Users as UsersIcon } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { StatCard } from '../components/StatCard';
import { CheckInPanel } from '../components/attendance/CheckInPanel';
import { MemberQrDialog } from '../components/attendance/MemberQrDialog';
import { CollectPaymentDialog } from '../components/billing/CollectPaymentDialog';
import { useGymInfo } from '../components/billing/shared';
import { useAttendanceDay, useAttendanceTrend, useRegisterAttendance } from '../hooks/useAttendance';
import { useMembersOverview } from '../hooks/useMembers';
import {
  dailyAverage, elapsedSince, hourLabel, hourlyEntries, insideMap, pairSessions, peakHour, sourceLabel, time12, uniqueVisitors, type Session,
} from '../lib/attendanceDay';
import { formatDuration } from '../lib/attendanceStats';
import { addDays, toDateOnly } from '../lib/dashboardHelpers';

const LONG_STAY_MIN = 4 * 60;

const longDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const nowHHmm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function Attendance() {
  const navigate = useNavigate();
  const gym = useGymInfo();
  const today = toDateOnly(new Date());

  const members = useMembersOverview();
  const todayQ = useAttendanceDay(today);
  const trend = useAttendanceTrend(today, 28);
  const register = useRegisterAttendance();

  const [qrOpen, setQrOpen] = useState(false);
  const [collectFor, setCollectFor] = useState<string | null>(null);

  const todayRecords = todayQ.data ?? [];
  const todaySessions = useMemo(() => pairSessions(todayRecords), [todayRecords]);
  const inside = useMemo(() => insideMap(todaySessions), [todaySessions]);
  const insideList = useMemo(() => [...inside.values()].sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1)), [inside]);

  const visitsToday = uniqueVisitors(todayRecords);
  const avg = trend.data ? dailyAverage(trend.data, 28) : null;
  const peak = peakHour(hourlyEntries(todayRecords));
  const closed = todaySessions.filter((s) => s.minutes);
  const avgStay = closed.length ? Math.round(closed.reduce((a, s) => a + (s.minutes ?? 0), 0) / closed.length) : null;
  const now = nowHHmm();

  if (todayQ.error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-[#ff3b5c]" />
        <div>
          <h2 className="text-xl">No se pudo cargar la asistencia</h2>
          <p className="text-sm text-muted-foreground">{(todayQ.error as Error).message}</p>
        </div>
        <Button onClick={() => todayQ.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="attendance-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl">Asistencia</h1>
          <p className="text-muted-foreground">{capital(longDate(today))}</p>
        </div>
        <Button variant="outline" onClick={() => setQrOpen(true)}>
          <QrCode className="mr-2 h-4 w-4" /> Carnet QR
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Dentro ahora" value={inside.size} icon={UserCheck} color="green" />
        <StatCard
          title="Visitas hoy"
          value={visitsToday}
          icon={UsersIcon}
          color="blue"
          subtitle={avg !== null ? `Promedio: ${avg.toLocaleString('es-VE')} por día` : undefined}
        />
        <StatCard
          title="Hora pico"
          value={peak ? hourLabel(peak.hour) : '—'}
          icon={Flame}
          color="amber"
          subtitle={peak ? `${peak.count} entrada${peak.count === 1 ? '' : 's'}` : 'Sin entradas aún'}
        />
        <StatCard title="Permanencia promedio" value={formatDuration(avgStay)} icon={Timer} color="purple" subtitle={closed.length ? `${closed.length} salida${closed.length === 1 ? '' : 's'} registradas` : 'Sin salidas aún'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckInPanel rows={members.data?.rows ?? []} inside={inside} recent={todayRecords} loading={members.isLoading} onCollect={setCollectFor} />
        </div>

        <Card className="bg-card border-border" data-testid="inside-now">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <span className="relative flex h-2.5 w-2.5">
                  {inside.size > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10f94e] opacity-60" />}
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${inside.size > 0 ? 'bg-[#10f94e]' : 'bg-muted-foreground/40'}`} />
                </span>
                Dentro ahora
              </h2>
              <span className="text-sm tabular-nums text-muted-foreground">{inside.size}</span>
            </div>
            {todayQ.isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted/60" />)}</div>
            ) : insideList.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No hay nadie dentro.</p>
            ) : (
              <ul className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
                {insideList.map((s) => {
                  const mins = elapsedSince(s.checkIn, now);
                  const long = mins >= LONG_STAY_MIN;
                  return (
                    <li key={s.key} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
                      <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => navigate(`/usuarios/${s.userId}`)}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#10f94e]/15 text-xs font-semibold text-[#10f94e]">{initials(s.name)}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{s.name}</span>
                          <span className={`block text-xs ${long ? 'text-[#eab308]' : 'text-muted-foreground'}`}>
                            {time12(s.checkIn)} · {formatDuration(mins) === '—' ? 'recién' : formatDuration(mins)}
                            {long && ' · ¿olvidó marcar salida?'}
                          </span>
                        </span>
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 shrink-0 text-[#ff3b5c] hover:bg-[#ff3b5c]/10 hover:text-[#ff3b5c]"
                        disabled={register.isPending}
                        onClick={() => register.mutate({ userId: s.userId, type: 'Salida', name: s.name })}
                        aria-label={`Registrar salida de ${s.name}`}
                      >
                        <LogOut className="mr-1 h-3.5 w-3.5" /> Salida
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <DayHistory today={today} todaySessions={todaySessions} todayRecords={todayRecords} />

      <MemberQrDialog open={qrOpen} onOpenChange={setQrOpen} rows={members.data?.rows ?? []} gymName={gym.name} />
      {members.data && collectFor && (
        <CollectPaymentDialog
          open
          onOpenChange={(o) => !o && setCollectFor(null)}
          members={members.data.users as any}
          invoices={members.data.invoices}
          initialUserId={collectFor}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Historial por día ───────────────────────── */

function DayHistory({ today, todaySessions, todayRecords }: { today: string; todaySessions: Session[]; todayRecords: ReturnType<typeof useAttendanceDay>['data'] }) {
  const navigate = useNavigate();
  const [date, setDate] = useState(today);
  const [term, setTerm] = useState('');
  const isToday = date === today;
  const dayQ = useAttendanceDay(date);

  const records = isToday ? todayRecords ?? [] : dayQ.data ?? [];
  const sessions = isToday ? todaySessions : pairSessions(records);
  const hours = hourlyEntries(records);
  const loading = isToday ? false : dayQ.isLoading;

  const q = term.trim().toLowerCase();
  const shown = q ? sessions.filter((s) => s.name.toLowerCase().includes(q) || (s.memberNumber ?? '').toLowerCase().includes(q)) : sessions;

  // Rango de horas a mostrar: 5am–10pm, ampliado si hubo entradas fuera de él
  const used = hours.map((n, h) => (n ? h : -1)).filter((h) => h >= 0);
  const from = Math.min(5, ...used);
  const to = Math.max(22, ...used);
  const max = Math.max(1, ...hours);

  return (
    <Card className="bg-card border-border" data-testid="day-history">
      <CardContent className="p-5 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Historial</h2>
            <p className="text-sm text-muted-foreground">
              {capital(longDate(date))} · {uniqueVisitors(records)} visita{uniqueVisitors(records) === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border border-border">
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-r-none" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <label className="relative flex h-9 items-center gap-2 border-x border-border px-3 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="bg-transparent text-sm outline-none [color-scheme:dark]"
                  aria-label="Elegir fecha"
                />
              </label>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-l-none" disabled={isToday} onClick={() => setDate(addDays(date, 1))} aria-label="Día siguiente">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {!isToday && <Button size="sm" variant="outline" className="h-9" onClick={() => setDate(today)}>Hoy</Button>}
          </div>
        </div>

        {/* Afluencia por hora */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Entradas por hora</p>
          <div className="flex items-end gap-1" role="img" aria-label="Entradas por hora">
            {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((h) => (
              <div key={h} className="flex flex-1 flex-col items-center gap-1" title={`${hourLabel(h)}: ${hours[h]} entrada${hours[h] === 1 ? '' : 's'}`}>
                <div className="flex h-20 w-full items-end">
                  <div className={`w-full rounded-t ${hours[h] ? 'bg-[#10f94e]/70' : 'bg-muted/50'}`} style={{ height: hours[h] ? Math.max(6, Math.round((hours[h] / max) * 80)) : 3 }} />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">{h % 3 === 0 ? hourLabel(h).replace(' ', '') : ' '}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Filtrar por socio…" className="pl-9 bg-input border-border" />
        </div>

        {loading ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded bg-muted/60" />)}</div>
        ) : shown.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <UserCheck className="mx-auto mb-2 h-10 w-10 opacity-40" />
            <p>{sessions.length === 0 ? 'No hubo asistencias este día.' : 'Ningún socio coincide.'}</p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm" data-testid="attendance-table">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Socio</th>
                  <th className="px-3 py-2 font-medium">Entrada</th>
                  <th className="px-3 py-2 font-medium">Salida</th>
                  <th className="px-3 py-2 font-medium">Permanencia</th>
                  <th className="px-3 py-2 font-medium">Registro</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.key} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40" onClick={() => navigate(`/usuarios/${s.userId}`)}>
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{s.name}</span>
                      {s.memberNumber && <span className="ml-2 text-xs text-muted-foreground">{s.memberNumber}</span>}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{time12(s.checkIn)}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {s.checkOut ? time12(s.checkOut) : isToday ? (
                        <span className="rounded-full bg-[#10f94e]/15 px-2 py-0.5 text-xs text-[#10f94e]">Dentro</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin salida</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{formatDuration(s.minutes)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{sourceLabel(s.source)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
