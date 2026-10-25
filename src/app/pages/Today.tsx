/**
 * Pantalla "Hoy": qué toca entrenar, meta semanal, racha y nivel.
 */
import { Link, Navigate } from 'react-router';
import { CheckCircle2, Clock, Dumbbell, Flame, Loader2, Play, Star, Trophy } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../components/ui/utils';
import { useAuth } from '../contexts/AuthContext';
import { todaysDay, useDayExercises, useMyStats } from '../hooks/useHomeWorkout';
import { greeting, percent, streakLabel, weekLabel } from '../lib/homeWorkout';
import { isMinor } from '../lib/minors';

export function Today() {
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useMyStats();
  const day = todaysDay(stats);
  const { data: exercises } = useDayExercises(stats?.routine?.id, day);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (error || !stats) {
    return <p className="p-4 text-sm text-destructive">No se pudo cargar tu resumen. Intenta de nuevo.</p>;
  }
  if (!stats.onboarded && user?.isIndependent) {
    return <Navigate to="/usuario/bienvenida" replace />;
  }

  const doneToday = stats.today_session?.completed === true;
  const checkedIn = stats.checked_in_today === true;
  const restDay = !!stats.routine && !!exercises && exercises.length === 0;
  const started = !!stats.today_session && !doneToday;

  return (
    <div className="mx-auto max-w-xl space-y-4" data-testid="today">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{greeting(user?.name)}</h2>
        <p className="text-sm text-muted-foreground">
          {doneToday ? 'Ya entrenaste hoy. ¡Bien hecho!' : restDay ? 'Hoy toca descansar.' : 'Esto es lo que toca hoy.'}
        </p>
      </div>

      {isMinor(user?.birth_date) === true && (
        <p className="rounded-xl border border-[#eab308]/40 bg-[#eab308]/10 px-4 py-3 text-sm text-[#eab308]" data-testid="minor-notice">
          {user?.isIndependent
            ? 'Eres menor de edad: entrena acompañado de un adulto y con permiso de tu representante.'
            : 'Eres menor de edad: entrena siempre con la supervisión de tu entrenador.'}
        </p>
      )}

      {checkedIn && (
        <p className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary" data-testid="checked-in">
          Marcaste entrada en el gimnasio hoy: ya cuenta para tu meta semanal.
        </p>
      )}

      {/* Entrenamiento de hoy */}
      {stats.routine ? (
        <Card className={cn('overflow-hidden', doneToday ? 'border-primary/40' : 'border-primary/20')}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-primary">
                  {stats.routine.schedule_mode === 'sequence' ? `Día ${day} de ${stats.routine.days}` : 'Rutina de hoy'}
                </p>
                <h3 className="mt-1 truncate text-lg font-semibold">{stats.routine.name}</h3>
                {stats.routine.source === 'trainer' && (
                  <p className="text-xs text-muted-foreground">
                    Asignada por {stats.routine.trainer_name ?? 'tu entrenador'}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {stats.routine.minutes && (
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{stats.routine.minutes} min</span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" /> {exercises ? `${exercises.length} ejercicios` : '…'}
                  </span>
                  {stats.routine.location === 'casa' && <span>Sin equipo · en casa</span>}
                </div>
              </div>
              {doneToday && <CheckCircle2 className="h-8 w-8 shrink-0 text-primary" aria-label="Completado" />}
            </div>

            {exercises && exercises.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {exercises.slice(0, 6).map((e) => (
                  <li key={e.id} className="flex justify-between gap-3">
                    <span className="truncate">{e.exercise_name}</span>
                    <span className="shrink-0 text-muted-foreground">{e.sets} × {e.reps}</span>
                  </li>
                ))}
              </ul>
            )}

            {restDay && (
              <p className="mt-4 text-sm text-muted-foreground" data-testid="rest-day">Tu rutina no tiene ejercicios hoy. Descansa y vuelve mañana.</p>
            )}

            {!doneToday && !restDay && (
              <Button asChild size="lg" className="mt-5 w-full" data-testid="start-workout">
                <Link to="/usuario/entrenar">
                  <Play className="mr-2 h-4 w-4" /> {started ? 'Continuar entrenamiento' : 'Empezar'}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 text-sm">
            <p className="font-medium">Todavía no tienes una rutina.</p>
            <p className="mt-1 text-muted-foreground">
              {stats.is_gym_member ? 'Tu entrenador puede asignarte una, o elige un plan para empezar ya.' : 'Responde unas preguntas y te armamos uno.'}
            </p>
            <Button asChild className="mt-3"><Link to="/usuario/bienvenida">Armar mi plan</Link></Button>
          </CardContent>
        </Card>
      )}

      {/* Meta semanal */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium">Meta de la semana</p>
          <div className="mt-3 flex gap-2" aria-hidden>
            {Array.from({ length: stats.weekly_goal }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex h-10 flex-1 items-center justify-center rounded-lg border',
                  i < stats.week_sessions ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground',
                )}
              >
                {i < stats.week_sessions ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs">{i + 1}</span>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground" data-testid="week-label">{weekLabel(stats.week_sessions, stats.weekly_goal)}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Racha */}
        <Card>
          <CardContent className="p-5">
            <Flame className={cn('h-6 w-6', stats.current_streak > 0 ? 'text-orange-400' : 'text-muted-foreground')} />
            <p className="mt-2 text-2xl font-semibold" data-testid="streak">{stats.current_streak}</p>
            <p className="text-xs text-muted-foreground">{streakLabel(stats.current_streak)}</p>
          </CardContent>
        </Card>
        {/* Nivel */}
        <Card>
          <CardContent className="p-5">
            <Star className="h-6 w-6 text-primary" />
            <p className="mt-2 text-2xl font-semibold" data-testid="level">Nivel {stats.level}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent(stats.level_xp, stats.level_size)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{stats.level_xp} / {stats.level_size} XP</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-sm">
          <Trophy className="h-5 w-5 text-primary" />
          <span>
            {stats.total_sessions === 0
              ? 'Cada día que entrenas (en la app o en el gym) suma 50 XP.'
              : `${stats.total_sessions} ${stats.total_sessions === 1 ? 'día entrenado' : 'días entrenados'} · ${stats.xp} XP`}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
