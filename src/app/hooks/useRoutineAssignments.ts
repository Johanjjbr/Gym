import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface RoutineAssignment {
  id: string;
  user_id: string;
  routine_id: string;
  assigned_date: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  routine_templates: {
    id: string;
    name: string;
    description: string;
    days_per_week: number;
    created_by: string;
    staff: {
      name: string;
    };
  };
}

interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_name: string;
  day_of_week: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
}

interface WorkoutSession {
  id: string;
  user_id: string;
  date: string;
  routine_id: string;
  is_completed: boolean;
}

interface WorkoutExerciseLog {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  is_completed: boolean;
  notes: string | null;
}

interface SetLog {
  id: string;
  exercise_log_id: string;
  set_number: number;
  reps: number;
  weight: number;
  is_completed: boolean;
}

export function useRoutineAssignment(userId: string) {
  return useQuery<RoutineAssignment | null>({
    queryKey: ['routineAssignment', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_routine_assignments')
        .select(`
          *,
          routine_templates (
            id,
            name,
            description,
            days_per_week,
            created_by,
            staff (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useRoutineExercises(routineId: string, dayOfWeek: number) {
  return useQuery<RoutineExercise[]>({
    queryKey: ['routineExercises', routineId, dayOfWeek],
    queryFn: async () => {
      if (!routineId) return [];

      const { data, error } = await supabase
        .from('routine_exercises')
        .select('*')
        .eq('routine_id', routineId)
        .eq('day_of_week', dayOfWeek)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!routineId,
  });
}

// Hook para obtener o crear la sesión del día
export function useWorkoutSession(userId: string, routineId: string, date: string) {
  return useQuery<WorkoutSession | null>({
    queryKey: ['workoutSession', userId, date],
    queryFn: async () => {
      if (!userId || !routineId || !date) return null;

      // Buscar sesión existente
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data;
    },
    enabled: !!userId && !!routineId && !!date,
  });
}

// Hook para obtener los logs de ejercicios de una sesión
export function useExerciseLogs(sessionId: string) {
  return useQuery<(WorkoutExerciseLog & { set_logs: SetLog[] })[]>({
    queryKey: ['exerciseLogs', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('workout_exercise_logs')
        .select(`
          *,
          set_logs (*)
        `)
        .eq('session_id', sessionId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!sessionId,
  });
}

// Mutation para crear sesión
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: {
      user_id: string;
      routine_id: string;
      date: string;
    }) => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert([{
          ...session,
          is_completed: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['workoutSession', variables.user_id, variables.date] 
      });
    },
  });
}

// Mutation para guardar ejercicio
export function useSaveExerciseLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: {
      session_id: string;
      exercise_id: string;
      exercise_name: string;
      weight: number;
      reps: number;
      notes: string | null;
    }) => {
      // 1. Buscar si ya existe el log del ejercicio
      const { data: existingLog, error: checkError } = await supabase
        .from('workout_exercise_logs')
        .select('id')
        .eq('session_id', log.session_id)
        .eq('exercise_id', log.exercise_id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      let exerciseLogId: string;

      if (existingLog) {
        // Actualizar log existente
        const { data: updated, error: updateError } = await supabase
          .from('workout_exercise_logs')
          .update({
            notes: log.notes,
            is_completed: true,
          })
          .eq('id', existingLog.id)
          .select()
          .single();

        if (updateError) throw updateError;
        exerciseLogId = updated.id;
      } else {
        // Crear nuevo log
        const { data: created, error: createError } = await supabase
          .from('workout_exercise_logs')
          .insert([{
            session_id: log.session_id,
            exercise_id: log.exercise_id,
            exercise_name: log.exercise_name,
            is_completed: true,
            notes: log.notes,
          }])
          .select()
          .single();

        if (createError) throw createError;
        exerciseLogId = created.id;
      }

      // 2. Crear o actualizar set_log (solo guardamos 1 set con el peso promedio)
      const { data: existingSet, error: setCheckError } = await supabase
        .from('set_logs')
        .select('id')
        .eq('exercise_log_id', exerciseLogId)
        .eq('set_number', 1)
        .maybeSingle();

      if (setCheckError && setCheckError.code !== 'PGRST116') throw setCheckError;

      if (existingSet) {
        // Actualizar set existente
        const { error: setUpdateError } = await supabase
          .from('set_logs')
          .update({
            weight: log.weight,
            reps: log.reps,
            is_completed: true,
          })
          .eq('id', existingSet.id);

        if (setUpdateError) throw setUpdateError;
      } else {
        // Crear nuevo set
        const { error: setCreateError } = await supabase
          .from('set_logs')
          .insert([{
            exercise_log_id: exerciseLogId,
            set_number: 1,
            reps: log.reps,
            weight: log.weight,
            is_completed: true,
          }]);

        if (setCreateError) throw setCreateError;
      }

      return { exerciseLogId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['exerciseLogs', variables.session_id] 
      });
    },
  });
}

// Mutation para marcar ejercicio como completado/no completado
export function useToggleExerciseComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      session_id: string;
      exercise_id: string;
      exercise_name: string;
      is_completed: boolean;
    }) => {
      // Buscar el log existente
      const { data: existingLog, error: checkError } = await supabase
        .from('workout_exercise_logs')
        .select('id')
        .eq('session_id', params.session_id)
        .eq('exercise_id', params.exercise_id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingLog) {
        // Actualizar
        const { error: updateError } = await supabase
          .from('workout_exercise_logs')
          .update({ is_completed: params.is_completed })
          .eq('id', existingLog.id);

        if (updateError) throw updateError;
      } else {
        // Crear nuevo
        const { error: createError } = await supabase
          .from('workout_exercise_logs')
          .insert([{
            session_id: params.session_id,
            exercise_id: params.exercise_id,
            exercise_name: params.exercise_name,
            is_completed: params.is_completed,
          }]);

        if (createError) throw createError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['exerciseLogs', variables.session_id] 
      });
    },
  });
}
