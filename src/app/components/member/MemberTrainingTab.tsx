/**
 * Pestaña "Entrenamientos" de la ficha del socio (para el entrenador):
 * nivel, racha, días entrenados y lo que hizo en cada sesión (con pesos).
 */
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Dumbbell, Flame, Loader2, Star, Timer, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '../../lib/supabase';
import { fmtDate } from '../../lib/billing';

interface SessionRow {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_completed: boolean;
  routine_templates: { name: string } | null;
  workout_exercise_logs: {
    id: string;
    exercise_name: string;
    is_completed: boolean;
    is_skipped: boolean | null;
    set_logs: { set_number: number; reps: number | null; weight: number | null }[];
  }[];
}

interface Stats {
  xp: number;
  level: number;
  total_sessions: number;
  current_streak: number;
  best_streak: number;
  last_session_date: string | null;
}

function useMemberTraining(userId: string) {
  return useQuery({
    queryKey: ['member-training', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [stats, sessions] = await Promise.all([
        supabase.from('user_stats').select('xp, level, total_sessions, current_streak, best_streak, last_session_date').eq('user_id', userId).maybeSingle(),
        supabase
          .from('workout_sessions')
          .select('id, date, start_time, end_time, is_completed, routine_templates(name), workout_exercise_logs(id, exercise_name, is_completed, is_skipped, set_logs(set_number, reps, weight))')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(20),
      ]);
      if (stats.error) throw new Error(stats.error.message);
      if (sessions.error) throw new Error(sessions.error.message);
      return { stats: stats.data as Stats | null, sessions: (sessions.data ?? []) as unknown as SessionRow[] };
    },
    staleTime: 60_000,
  });
}

const minutes = (a: string | null, b: string | null) => {
  if (!a || !b) return null;
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const m = toMin(b) - toMin(a);
  return m > 0 && m < 300 ? m : null;
};

export function MemberTrainingTab({ userId }: { userId: string }) {
  const { data, isLoading, error } = useMemberTraining(userId);

  if (isLoading) {
    return <div className="flex h-32 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…</div>;
  }
  if (error) return <p className="text-sm text-[#ff3b5c]">No se pudieron cargar los entrenamientos: {(error as Error).message}</p>;

  const s = data?.stats;
  const kpis: [typeof Star, string, string][] = [
    [Star, 'Nivel', s ? `${s.level} · ${s.xp} XP` : '—'],
    [Flame, 'Racha', s ? `${s.current_streak} sem. (mejor ${s.best_streak})` : '—'],
    [CheckCircle2, 'Días entrenados', s ? String(s.total_sessions) : '0'],
    [Timer, 'Último', s?.last_session_date ? fmtDate(s.last_session_date) : '—'],
  ];

  return (
    <div className="space-y-6" data-testid="member-training">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map(([Icon, label, value]) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Los días entrenados incluyen las entradas al gimnasio y los entrenamientos completados en la app.</p>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Dumbbell className="h-4 w-4 text-muted-foreground" /> Sesiones en la app</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.sessions.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Todavía no ha registrado entrenamientos en la app.</p>
          ) : (
            <ul className="space-y-3">
              {data.sessions.map((ses) => {
                const dur = minutes(ses.start_time, ses.end_time);
                return (
                  <li key={ses.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{fmtDate(ses.date)} · {ses.routine_templates?.name ?? 'Rutina'}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${ses.is_completed ? 'bg-[#10f94e]/15 text-[#10f94e]' : 'bg-muted text-muted-foreground'}`}>
                        {ses.is_completed ? `Completada${dur ? ` · ${dur} min` : ''}` : 'Sin terminar'}
                      </span>
                    </div>
                    {ses.workout_exercise_logs.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {ses.workout_exercise_logs.map((l) => (
                          <li key={l.id} className="flex flex-wrap items-baseline gap-2">
                            {l.is_skipped ? <XCircle className="h-3.5 w-3.5 text-muted-foreground" /> : <CheckCircle2 className="h-3.5 w-3.5 text-[#10f94e]" />}
                            <span className={l.is_skipped ? 'text-muted-foreground line-through' : ''}>{l.exercise_name}</span>
                            {l.set_logs.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {[...l.set_logs].sort((a, b) => a.set_number - b.set_number).map((x) => `${x.weight ?? '—'} kg × ${x.reps ?? '—'}`).join(' · ')}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
