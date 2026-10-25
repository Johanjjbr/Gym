/**
 * Modo entrenamiento (pensado para el teléfono): un ejercicio a la vez, con GIF,
 * series, temporizador de descanso y cronómetro para ejercicios por tiempo.
 * Al terminar, el servidor decide si la sesión cuenta (60 %) y da los puntos.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, ChevronLeft, Dumbbell, Flame, Loader2, Pause, Play, SkipForward, Star, Timer, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../components/ui/utils';
import { useAuth } from '../contexts/AuthContext';
import {
  todaysDay, useDayExercises, useFinishWorkout, useLastSets, useLogExercise, useMyStats, useSessionLogs, useStartSession,
  type DayExercise, type FinishResult, type SetEntry,
} from '../hooks/useHomeWorkout';
import {
  formatClock, isWeighted, minExercisesToComplete, parseWeight, percent, prescription, suggestedSet, timedSeconds,
} from '../lib/homeWorkout';

/** Cuenta regresiva basada en la hora real (sigue bien si el teléfono se bloquea un momento). */
function useCountdown(onDone: () => void) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const s = Math.max(0, (endsAt - Date.now()) / 1000);
      setLeft(s);
      if (s <= 0) {
        setEndsAt(null);
        try { navigator.vibrate?.(250); } catch { /* sin vibración */ }
        doneRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return {
    left: pausedLeft ?? left,
    running: endsAt !== null,
    paused: pausedLeft !== null,
    start: (seconds: number) => { setPausedLeft(null); setLeft(seconds); setEndsAt(Date.now() + seconds * 1000); },
    pause: () => { if (endsAt !== null) { setPausedLeft(Math.max(0, (endsAt - Date.now()) / 1000)); setEndsAt(null); } },
    resume: () => { if (pausedLeft !== null) { setEndsAt(Date.now() + pausedLeft * 1000); setPausedLeft(null); } },
    stop: () => { setEndsAt(null); setPausedLeft(null); setLeft(0); },
  };
}

function ExerciseMedia({ exercise }: { exercise: DayExercise }) {
  const [failed, setFailed] = useState(false);
  const src = exercise.exercise?.gif_url || exercise.exercise?.image_url;
  return (
    <div className="flex h-[34dvh] max-h-80 min-h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-white">
      {src && !failed ? (
        <img src={src} alt={exercise.exercise_name} className="h-full w-full object-contain" onError={() => setFailed(true)} />
      ) : (
        <Dumbbell className="h-16 w-16 text-neutral-400" />
      )}
    </div>
  );
}

export function HomeWorkout() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useMyStats();
  const day = todaysDay(stats);
  const routineId = stats?.routine?.id;
  const { data: exercises, isLoading: loadingEx } = useDayExercises(routineId, day);

  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const activeSessionId = sessionId ?? stats?.today_session?.id;
  const { data: logs } = useSessionLogs(activeSessionId);
  const start = useStartSession();
  const logExercise = useLogExercise(activeSessionId);
  const finish = useFinishWorkout();

  const [result, setResult] = useState<FinishResult | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [setsDone, setSetsDone] = useState(0);
  const [phase, setPhase] = useState<'work' | 'rest'>('work');
  // Series registradas del ejercicio actual (con peso) y lo que está escribiendo
  const [doneSets, setDoneSets] = useState<SetEntry[]>([]);
  const [setInput, setSetInput] = useState({ reps: '', weight: '' });

  const logByExercise = useMemo(() => new Map((logs ?? []).map((l) => [l.exercise_id, l])), [logs]);
  const list = exercises ?? [];
  const loggedCount = list.filter((e) => logByExercise.has(e.id)).length;
  const completedCount = list.filter((e) => logByExercise.get(e.id)?.is_completed).length;
  const firstPending = list.findIndex((e) => !logByExercise.has(e.id));
  const current = index !== null ? list[index] : undefined;
  const timed = timedSeconds(current?.reps);
  const weighted = !!current && isWeighted(current.exercise?.equipment, current.reps);
  const exerciseIds = useMemo(() => list.map((e) => e.id), [list]);
  const { data: lastSets } = useLastSets(exerciseIds, activeSessionId);

  // Proponer peso y repeticiones de la serie que sigue
  useEffect(() => {
    if (!current || !weighted) return;
    const n = setsDone + 1;
    const fromThisSession = logByExercise.get(current.id)?.set_logs;
    const v = suggestedSet(n, doneSets.length ? doneSets : fromThisSession?.length ? fromThisSession : lastSets?.[current.id], current.reps);
    setSetInput({ reps: v.reps != null ? String(v.reps) : '', weight: v.weight != null ? String(v.weight) : '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, setsDone, weighted, lastSets]);

  const timer = useCountdown(() => {
    if (phase === 'rest') {
      setPhase('work');
    } else {
      completeSet();
    }
  });

  // Al cargar los registros, ir al primer ejercicio pendiente
  useEffect(() => {
    if (activeSessionId && index === null && logs && list.length > 0) {
      setIndex(firstPending === -1 ? list.length : firstPending);
    }
  }, [activeSessionId, index, logs, list.length, firstPending]);

  const goTo = (i: number) => {
    timer.stop();
    setIndex(i);
    setSetsDone(0);
    setDoneSets([]);
    setPhase('work');
  };

  const nextPendingAfter = (i: number) => {
    for (let k = i + 1; k < list.length; k++) if (!logByExercise.has(list[k].id)) return k;
    for (let k = 0; k < i; k++) if (!logByExercise.has(list[k].id)) return k;
    return list.length;
  };

  const saveExercise = async (skipped: boolean, sets?: SetEntry[]) => {
    if (!current || day === null) return;
    const i = index!;
    await logExercise.mutateAsync({ exercise: current, day, skipped, existingId: logByExercise.get(current.id)?.id, sets });
    goTo(nextPendingAfter(i));
  };

  function completeSet() {
    if (!current) return;
    const n = setsDone + 1;
    let sets = doneSets;
    if (weighted) {
      const reps = Number.parseInt(setInput.reps, 10);
      sets = [...doneSets, { set_number: n, reps: Number.isFinite(reps) && reps > 0 ? reps : null, weight: parseWeight(setInput.weight) }];
      setDoneSets(sets);
    }
    setSetsDone(n);
    if (n >= current.sets) {
      void saveExercise(false, weighted ? sets : undefined);
    } else {
      setPhase('rest');
      timer.start(current.rest_seconds || 30);
    }
  }

  const begin = async () => {
    if (!user || !routineId || !stats || day === null) return;
    const id = await start.mutateAsync({ userId: user.id, routineId, date: stats.today, day });
    setSessionId(id);
  };

  const end = async () => {
    if (!activeSessionId) return;
    timer.stop();
    const r = await finish.mutateAsync(activeSessionId);
    setResult(r);
  };

  // ---------------------------------------------------------------- estados
  if (isLoading || loadingEx) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (stats?.routine && day !== null && list.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-3 text-center" data-testid="rest-day">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h2 className="text-xl font-semibold">Hoy es día de descanso</h2>
        <p className="text-sm text-muted-foreground">Tu rutina {stats.routine.name} no tiene ejercicios para hoy.</p>
        <Button asChild><Link to="/usuario/hoy">Volver a Hoy</Link></Button>
      </div>
    );
  }

  if (!stats?.routine || day === null) {
    return (
      <div className="mx-auto max-w-md space-y-3 text-center">
        <p className="font-medium">No tienes una rutina asignada.</p>
        <Button asChild><Link to="/usuario/bienvenida">Armar mi plan</Link></Button>
      </div>
    );
  }

  if (result) {
    const min = minExercisesToComplete(result.planned);
    return (
      <div className="mx-auto max-w-md space-y-4 text-center" data-testid="workout-result">
        <div className={cn('mx-auto flex h-20 w-20 items-center justify-center rounded-full', result.completed ? 'bg-primary/15' : 'bg-card')}>
          {result.completed ? <CheckCircle2 className="h-10 w-10 text-primary" /> : <Timer className="h-10 w-10 text-muted-foreground" />}
        </div>
        <h2 className="text-2xl font-semibold">{result.completed ? '¡Entrenamiento completado!' : 'Casi lo logras'}</h2>
        <p className="text-sm text-muted-foreground">
          {result.completed
            ? `Hiciste ${result.done} de ${result.planned} ejercicios.`
            : `Hiciste ${result.done} de ${result.planned}. Completa al menos ${min} para que cuente.`}
        </p>
        {result.xp_gained > 0 && (
          <p className="text-3xl font-bold text-primary" data-testid="xp-gained">+{result.xp_gained} XP</p>
        )}
        <div className="grid grid-cols-2 gap-3 text-left">
          <Card><CardContent className="p-4"><Star className="h-5 w-5 text-primary" /><p className="mt-1 font-semibold">Nivel {result.stats.level}</p><p className="text-xs text-muted-foreground">{result.stats.xp} XP</p></CardContent></Card>
          <Card><CardContent className="p-4"><Flame className="h-5 w-5 text-orange-400" /><p className="mt-1 font-semibold">{result.stats.current_streak} sem.</p><p className="text-xs text-muted-foreground">Racha</p></CardContent></Card>
        </div>
        <div className="flex flex-col gap-2">
          {!result.completed && <Button variant="outline" onClick={() => { setResult(null); goTo(firstPending === -1 ? 0 : firstPending); }}>Seguir entrenando</Button>}
          <Button asChild><Link to="/usuario/hoy">Volver a Hoy</Link></Button>
        </div>
      </div>
    );
  }

  if (stats.today_session?.completed && !sessionId) {
    return (
      <div className="mx-auto max-w-md space-y-3 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h2 className="text-xl font-semibold">Ya completaste el entrenamiento de hoy</h2>
        <p className="text-sm text-muted-foreground">Descansa: el músculo también crece mientras te recuperas.</p>
        <Button asChild><Link to="/usuario/hoy">Volver a Hoy</Link></Button>
      </div>
    );
  }

  // Antes de empezar
  if (!activeSessionId) {
    return (
      <div className="mx-auto max-w-md space-y-4" data-testid="workout-preview">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary">
            {stats.routine.schedule_mode === 'sequence' ? `Día ${day} de ${stats.routine.days}` : 'Rutina de hoy'}
          </p>
          <h2 className="text-2xl font-semibold">{stats.routine.name}</h2>
          {stats.routine.minutes && <p className="text-sm text-muted-foreground">Unos {stats.routine.minutes} minutos</p>}
        </div>
        <ol className="space-y-2">
          {list.map((e, i) => (
            <li key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">{i + 1}</span>
              <span className="flex-1 truncate text-sm">{e.exercise_name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{prescription(e.sets, e.reps)}</span>
            </li>
          ))}
        </ol>
        <Button size="lg" className="w-full" onClick={begin} disabled={start.isPending || list.length === 0} data-testid="begin">
          {start.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Empezar
        </Button>
      </div>
    );
  }

  const allLogged = index !== null && index >= list.length;
  const progressBar = (
    <div className="flex items-center gap-3">
      <Link to="/usuario/hoy" className="rounded-lg p-1.5 text-muted-foreground hover:bg-card" aria-label="Salir">
        <X className="h-5 w-5" />
      </Link>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent(loggedCount, list.length)}%` }} />
      </div>
      <span className="text-xs text-muted-foreground" data-testid="progress-count">{loggedCount}/{list.length}</span>
    </div>
  );

  // Todo registrado
  if (allLogged || !current) {
    return (
      <div className="mx-auto max-w-md space-y-6" data-testid="workout-done">
        {progressBar}
        <div className="space-y-2 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h2 className="text-xl font-semibold">¡Terminaste los ejercicios!</h2>
          <p className="text-sm text-muted-foreground">{completedCount} hechos de {list.length}.</p>
        </div>
        <Button size="lg" className="w-full" onClick={end} disabled={finish.isPending} data-testid="finish">
          {finish.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Terminar entrenamiento
        </Button>
      </div>
    );
  }

  // Ejercicio actual
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3" data-testid="workout-active">
      {progressBar}

      <ExerciseMedia exercise={current} />

      <div>
        <p className="text-xs text-muted-foreground">Ejercicio {index! + 1} de {list.length}</p>
        <h2 className="text-xl font-semibold leading-tight" data-testid="exercise-name">{current.exercise_name}</h2>
        <p className="mt-1 text-sm text-primary">{prescription(current.sets, current.reps)}</p>
        {current.notes && <p className="mt-1 text-sm text-muted-foreground">{current.notes}</p>}
      </div>

      {/* Series */}
      <div className="flex gap-2" aria-label="Series">
        {Array.from({ length: current.sets }).map((_, i) => (
          <div key={i} className={cn('h-2 flex-1 rounded-full', i < setsDone ? 'bg-primary' : 'bg-border')} />
        ))}
      </div>

      {phase === 'rest' ? (
        <Card className="border-primary/30">
          <CardContent className="space-y-2 p-4 text-center">
            <p className="text-sm text-muted-foreground">Descanso</p>
            <p className="text-4xl font-semibold tabular-nums" data-testid="rest-clock">{formatClock(timer.left)}</p>
            <Button variant="outline" className="w-full" onClick={() => { timer.stop(); setPhase('work'); }}>
              <SkipForward className="mr-2 h-4 w-4" /> Saltar descanso
            </Button>
          </CardContent>
        </Card>
      ) : timed ? (
        <Card>
          <CardContent className="space-y-2 p-4 text-center">
            <p className="text-sm text-muted-foreground">Serie {setsDone + 1} de {current.sets}</p>
            <p className="text-4xl font-semibold tabular-nums">{formatClock(timer.running || timer.paused ? timer.left : timed)}</p>
            {timer.running ? (
              <Button variant="outline" className="w-full" onClick={timer.pause}><Pause className="mr-2 h-4 w-4" /> Pausar</Button>
            ) : timer.paused ? (
              <Button className="w-full" onClick={timer.resume}><Play className="mr-2 h-4 w-4" /> Seguir</Button>
            ) : (
              <Button size="lg" className="w-full" onClick={() => timer.start(timed)} data-testid="start-timer">
                <Play className="mr-2 h-4 w-4" /> Iniciar {formatClock(timed)}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
        {weighted && (
          <div className="grid grid-cols-2 gap-3" data-testid="set-inputs">
            <label className="space-y-1 text-xs text-muted-foreground">
              Peso (kg)
              <Input
                inputMode="decimal"
                value={setInput.weight}
                onChange={(e) => setSetInput((v) => ({ ...v, weight: e.target.value }))}
                placeholder="—"
                className="h-12 text-center text-lg"
                data-testid="input-weight"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Repeticiones
              <Input
                inputMode="numeric"
                value={setInput.reps}
                onChange={(e) => setSetInput((v) => ({ ...v, reps: e.target.value.replace(/\D/g, '') }))}
                placeholder="—"
                className="h-12 text-center text-lg"
                data-testid="input-reps"
              />
            </label>
            {lastSets?.[current.id]?.length ? (
              <p className="col-span-2 text-xs text-muted-foreground">
                La vez anterior: {lastSets[current.id].map((x) => `${x.weight ?? '—'} kg × ${x.reps ?? '—'}`).join(' · ')}
              </p>
            ) : null}
          </div>
        )}
        <Button size="lg" className="h-14 w-full text-base" onClick={completeSet} disabled={logExercise.isPending} data-testid="set-done">
          {logExercise.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
          Serie {Math.min(setsDone + 1, current.sets)} de {current.sets} hecha
        </Button>
        </>
      )}

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-muted-foreground disabled:opacity-40"
          onClick={() => goTo(Math.max(0, index! - 1))}
          disabled={index === 0}
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => void saveExercise(true)}
          disabled={logExercise.isPending}
          data-testid="skip-exercise"
        >
          Saltar ejercicio
        </button>
        <button type="button" className="text-muted-foreground hover:text-foreground" onClick={end} disabled={finish.isPending}>
          Terminar
        </button>
      </div>
    </div>
  );
}
