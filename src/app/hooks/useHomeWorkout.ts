/**
 * Datos de "Hoy" y del entrenamiento en casa (Fase 0).
 * Los puntos y la racha los calcula el servidor (my_stats / finish_workout).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { localTime } from '../lib/homeWorkout';

export interface MyStats {
  today: string;
  xp: number;
  level: number;
  level_xp: number;
  level_size: number;
  total_sessions: number;
  current_streak: number;
  best_streak: number;
  weekly_goal: number;
  week_sessions: number;
  onboarded: boolean;
  routine: {
    id: string;
    name: string;
    schedule_mode: 'weekday' | 'sequence';
    minutes: number | null;
    location: string;
    days: number;
    next_day: number;
  } | null;
  today_session: { id: string; completed: boolean; routine_day: number | null } | null;
}

export interface DayExercise {
  id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
  exercise: { id: string; name: string; gif_url: string | null; image_url: string | null; instructions_es: string | null } | null;
}

export interface ExerciseLog {
  id: string;
  exercise_id: string;
  is_completed: boolean;
  is_skipped: boolean;
}

export interface FinishResult {
  completed: boolean;
  done: number;
  planned: number;
  ratio: number;
  xp_gained: number;
  stats: { xp: number; level: number; current_streak: number; total_sessions: number };
}

export const homeKeys = {
  stats: ['home', 'stats'] as const,
  day: (routineId: string, day: number) => ['home', 'day', routineId, day] as const,
  logs: (sessionId: string) => ['home', 'logs', sessionId] as const,
};

export function useMyStats(enabled = true) {
  return useQuery({
    queryKey: homeKeys.stats,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_stats');
      if (error) throw error;
      return data as MyStats;
    },
    staleTime: 30_000,
  });
}

/** Día a entrenar hoy: el de la sesión ya empezada, o el siguiente de la secuencia. */
export function todaysDay(stats: MyStats | undefined): number | null {
  if (!stats?.routine) return null;
  return stats.today_session?.routine_day ?? stats.routine.next_day;
}

export function useDayExercises(routineId: string | undefined, day: number | null) {
  return useQuery({
    queryKey: homeKeys.day(routineId ?? '', day ?? 0),
    enabled: !!routineId && !!day,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routine_exercises')
        .select('id, exercise_name, sets, reps, rest_seconds, notes, order_index, exercise:exercises(id, name, gif_url, image_url, instructions_es)')
        .eq('routine_id', routineId!)
        .eq('day_of_week', day!)
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as unknown as DayExercise[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useSessionLogs(sessionId: string | undefined) {
  return useQuery({
    queryKey: homeKeys.logs(sessionId ?? ''),
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_exercise_logs')
        .select('id, exercise_id, is_completed, is_skipped')
        .eq('session_id', sessionId!);
      if (error) throw error;
      return (data ?? []) as ExerciseLog[];
    },
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { profile: Record<string, unknown>; weeklyGoal: number }) => {
      const { data, error } = await supabase.rpc('complete_onboarding', {
        p_profile: input.profile,
        p_weekly_goal: input.weeklyGoal,
      });
      if (error) throw error;
      return data as { routine_id: string | null; kept_trainer_routine: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home'] }),
    onError: (e: Error) => toast.error('No se pudo guardar', { description: e.message }),
  });
}

/** Crea (o recupera) la sesión de hoy. */
export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; routineId: string; date: string; day: number }) => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: input.userId,
          routine_id: input.routineId,
          date: input.date,
          start_time: localTime(),
          routine_day: input.day,
        })
        .select('id')
        .single();
      if (!error) return data.id as string;
      // Ya existe una sesión hoy (UNIQUE user_id, date): usar esa
      if (error.code === '23505') {
        const { data: existing, error: e2 } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('user_id', input.userId)
          .eq('date', input.date)
          .single();
        if (e2) throw e2;
        return existing.id as string;
      }
      throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.stats }),
    onError: (e: Error) => toast.error('No se pudo empezar', { description: e.message }),
  });
}

/** Marca un ejercicio como hecho u omitido (sin duplicar el registro). */
export function useLogExercise(sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { exercise: DayExercise; day: number; skipped: boolean; existingId?: string }) => {
      const row = {
        is_completed: !input.skipped,
        is_skipped: input.skipped,
      };
      if (input.existingId) {
        const { error } = await supabase.from('workout_exercise_logs').update(row).eq('id', input.existingId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from('workout_exercise_logs').insert({
        ...row,
        session_id: sessionId!,
        exercise_id: input.exercise.id,
        exercise_name: input.exercise.exercise_name,
        assigned_day_of_week: input.day,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: homeKeys.logs(sessionId ?? '') }),
    onError: (e: Error) => toast.error('No se pudo guardar el ejercicio', { description: e.message }),
  });
}

export function useFinishWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.rpc('finish_workout', { p_session_id: sessionId });
      if (error) throw error;
      return data as FinishResult;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home'] }),
    onError: (e: Error) => toast.error('No se pudo terminar', { description: e.message }),
  });
}
