/**
 * Pestaña "Asistencia" del perfil: indicadores, mapa de las últimas 13 semanas
 * y la lista de visitas (una por día, con entrada, salida y duración).
 */
import { Fragment, useMemo, useState } from 'react';
import { CalendarX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { attendanceGrid, formatDuration, lastVisitInWords, type AttendanceSummary, type Visit } from '../../lib/attendanceStats';
import { fmtDate, MONTHS_ES } from '../../lib/billing';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SOURCE: Record<string, string> = { manual: 'Recepción', qr: 'QR', fingerprint: 'Huella', nfc: 'NFC' };
const PAGE = 15;

function weekday(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return DAYS_LONG[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
}

export function MemberAttendanceTab({ visits, summary, loading, today }: { visits: Visit[]; summary: AttendanceSummary; loading: boolean; today: string }) {
  const [limit, setLimit] = useState(PAGE);
  const grid = useMemo(() => attendanceGrid(visits, today), [visits, today]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted/50" />;
  }

  if (visits.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-16 text-center text-muted-foreground">
          <CalendarX className="mx-auto mb-3 h-10 w-10 opacity-50" />
          Este socio todavía no registra visitas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="attendance-kpis">
        <Stat
          label="Este mes"
          value={String(summary.thisMonth)}
          hint={`El mes pasado: ${summary.lastMonth}`}
        />
        <Stat label="Por semana" value={summary.weeklyAvg.toLocaleString('es-VE')} hint="Promedio últimas 8 semanas" />
        <Stat label="Última visita" value={lastVisitInWords(summary.daysSinceLast)} hint={summary.lastVisit ? fmtDate(summary.lastVisit) : ''} />
        <Stat label="Duración promedio" value={formatDuration(summary.avgMinutes)} hint="Cuando registra salida" />
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Últimas 13 semanas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-1">
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `2rem repeat(${grid.length}, minmax(14px, 36px))` }}
              role="img"
              aria-label={`${summary.total} visitas registradas; ${grid.flat().filter((c) => c.visited).length} en las últimas 13 semanas`}
            >
              {/* fila de meses */}
              <span />
              {grid.map((week, w) => {
                const m = week[0].date.slice(5, 7);
                const show = w === 0 || m !== grid[w - 1][0].date.slice(5, 7);
                return (
                  <span key={`m${w}`} className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {show ? MONTHS_ES[Number(m) - 1].slice(0, 3) : ''}
                  </span>
                );
              })}
              {/* 7 filas: lunes a domingo */}
              {DAYS.map((label, row) => (
                <Fragment key={label}>
                  <span className="flex items-center text-[10px] text-muted-foreground">{row % 2 === 0 ? label : ''}</span>
                  {grid.map((week) => {
                    const c = week[row];
                    return (
                      <span
                        key={c.date}
                        title={`${weekday(c.date)} ${fmtDate(c.date)}${c.visited ? ' · asistió' : ''}`}
                        className={`aspect-square w-full rounded-[4px] ${
                          c.future ? 'bg-transparent' : c.visited ? 'bg-[#10f94e]' : 'bg-muted'
                        } ${c.date === today ? 'ring-1 ring-foreground/50' : ''}`}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          <p className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#10f94e]" /> Asistió</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted" /> No asistió</span>
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Visitas ({summary.total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm" data-testid="visits-table">
              <thead>
                <tr className="border-y border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Entrada</th>
                  <th className="px-4 py-2.5 font-medium">Salida</th>
                  <th className="px-4 py-2.5 font-medium">Duración</th>
                  <th className="px-4 py-2.5 font-medium">Registro</th>
                </tr>
              </thead>
              <tbody>
                {visits.slice(0, limit).map((v) => (
                  <tr key={v.date} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="block tabular-nums">{fmtDate(v.date)}</span>
                      <span className="block text-xs text-muted-foreground">{weekday(v.date)}</span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{v.checkIn ?? '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums">{v.checkOut ?? <span className="text-muted-foreground">Sin salida</span>}</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatDuration(v.minutes)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{v.source ? SOURCE[v.source] ?? v.source : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visits.length > limit && (
            <div className="border-t border-border p-2 text-center">
              <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE * 2)}>
                Ver más ({visits.length - limit} restantes)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
