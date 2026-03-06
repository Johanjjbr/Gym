import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface RoutineAssignment {
  id: string;
  user_id: string;
  routine_id: string;
  start_date: string;
  assigned_by: string | null;
  is_active: boolean;
  created_at: string;
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
  muscle_group: string; // Agregado: grupo muscular
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
  start_time: string;
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
      if (!userId) {
        console.log('⚠️ [useRoutineAssignment] No userId provided');
        return null;
      }

      console.log('🔍 [useRoutineAssignment] Buscando asignación para userId:', userId);

      // Buscar la rutina activa del usuario en user_routine_assignments
      const { data, error } = await supabase
        .from('user_routine_assignments')
        .select(`
          id,
          user_id,
          routine_id,
          start_date,
          assigned_by,
          is_active,
          created_at,
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
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ [useRoutineAssignment] Error:', error.message, error.code);
        throw error;
      }
      
      console.log('✅ [useRoutineAssignment] Resultado:', data ? `Encontrada: ${data.routine_templates?.name}` : 'No encontrada');
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

      // Convert JS day (0=Sunday,1=Monday,...,6=Saturday) to DB day (1=Monday,...,7=Sunday)
      const dbDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

      const { data, error } = await supabase
        .from('routine_exercises')
        .select('*')
        .eq('routine_id', routineId)
        .eq('day_of_week', dbDayOfWeek)
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
      if (!userId || !routineId || !date) {
        console.log('⚠️ [useWorkoutSession] Faltan parámetros:', { userId, routineId, date });
        return null;
      }

      console.log('🔍 [useWorkoutSession] Buscando sesión:', { userId, date });

      // Buscar sesión existente
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ [useWorkoutSession] Error:', error);
        throw error;
      }
      
      console.log('✅ [useWorkoutSession] Resultado:', data ? `Sesión ${data.id}` : 'No encontrada');
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
      console.log('🏗️ [useCreateSession] Creando sesión:', session);
      
      // start_time is required NOT NULL in the schema
      const now = new Date();
      const start_time = now.toTimeString().slice(0, 8); // "HH:MM:SS"

      const { data, error } = await supabase
        .from('workout_sessions')
        .insert([{
          ...session,
          start_time,
          is_completed: false,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [useCreateSession] Error:', error);
        throw error;
      }
      
      console.log('✅ [useCreateSession] Sesión creada:', data);
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
      muscle_group: string;
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
            muscle_group: log.muscle_group,
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
      // También invalidar el historial para que se actualice
      queryClient.invalidateQueries({ 
        queryKey: ['workoutHistory'] 
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
      muscle_group: string;
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
            muscle_group: params.muscle_group,
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

// Hook para obtener historial de sesiones con ejercicios
export function useWorkoutHistory(userId: string, limit: number = 10) {
  return useQuery({
    queryKey: ['workoutHistory', userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      // Obtener las últimas sesiones
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return [];

      // Para cada sesión, obtener sus ejercicios con sets
      const sessionsWithExercises = await Promise.all(
        sessions.map(async (session) => {
          const { data: exerciseLogs, error: logsError } = await supabase
            .from('workout_exercise_logs')
            .select(`
              *,
              set_logs (*)
            `)
            .eq('session_id', session.id)
            .order('created_at', { ascending: true });

          if (logsError) {
            console.error('Error loading exercise logs:', logsError);
            return { ...session, exercises: [] };
          }

          return {
            ...session,
            exercises: exerciseLogs || [],
          };
        })
      );

      return sessionsWithExercises;
    },
    enabled: !!userId,
  });
}