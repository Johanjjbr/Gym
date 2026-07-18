import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { routines, routineAssignments, gymsApi } from '../lib/api';
import { toast } from 'sonner';

export function useGyms() {
  return useQuery({
    queryKey: ['gyms'],
    queryFn: gymsApi.getAll,
    staleTime: 1000 * 60 * 30,
  });
}

export function useGymByCode(code: string) {
  return useQuery({
    queryKey: ['gym', 'code', code],
    queryFn: () => gymsApi.getByCode(code),
    enabled: !!code,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePublicRoutines() {
  return useQuery({
    queryKey: ['routines', 'public'],
    queryFn: routines.getPublic,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSharedUserRoutines() {
  return useQuery({
    queryKey: ['routines', 'shared'],
    queryFn: routines.getSharedByUsers,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserOwnRoutines(userId: string | undefined) {
  return useQuery({
    queryKey: ['routines', 'own', userId],
    queryFn: () => routines.getOwn(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useSelfAssignRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, routineId }: { userId: string; routineId: string }) =>
      routineAssignments.selfAssign(userId, routineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routineAssignment'] });
      queryClient.invalidateQueries({ queryKey: ['routine-assignments'] });
      toast.success('Rutina asignada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al asignar rutina');
    },
  });
}

export function useDeactivateOwnAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      routineAssignments.deactivateOwn(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routineAssignment'] });
      queryClient.invalidateQueries({ queryKey: ['routine-assignments'] });
      toast.success('Rutina desactivada');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al desactivar rutina');
    },
  });
}

export function useCreateUserRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      level: string;
      category: string;
      duration_weeks: number;
      days_per_week: number;
      created_by_user: string;
      exercises: Array<{
        exercise_name: string;
        day_of_week: number;
        order_index: number;
        sets: number;
        reps: string;
        rest_seconds: number;
        notes?: string;
      }>;
    }) => {
      const { data: routine, error: routineError } = await supabase
        .from('routine_templates')
        .insert([{
          name: data.name,
          description: data.description,
          level: data.level,
          category: data.category,
          duration_weeks: data.duration_weeks,
          days_per_week: data.days_per_week,
          created_by_user: data.created_by_user,
          is_active: true,
          is_public: false,
          shared_publicly: false,
        }])
        .select()
        .single();

      if (routineError) throw routineError;

      if (data.exercises && data.exercises.length > 0) {
        const exercisesWithRoutineId = data.exercises.map(ex => ({
          ...ex,
          routine_id: routine.id,
        }));

        const { error: exercisesError } = await supabase
          .from('routine_exercises')
          .insert(exercisesWithRoutineId);

        if (exercisesError) throw exercisesError;
      }

      return routine;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines', 'own'] });
      toast.success('Rutina creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear rutina');
    },
  });
}

export function useToggleShareRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ routineId, shared }: { routineId: string; shared: boolean }) => {
      const { error } = await supabase
        .from('routine_templates')
        .update({ shared_publicly: shared, is_public: shared })
        .eq('id', routineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines', 'own'] });
      queryClient.invalidateQueries({ queryKey: ['routines', 'shared'] });
      toast.success('Estado de publicación actualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar');
    },
  });
}

export function useDeleteUserRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routineId: string) => {
      const { error } = await supabase
        .from('routine_templates')
        .delete()
        .eq('id', routineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines', 'own'] });
      toast.success('Rutina eliminada');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar rutina');
    },
  });
}

export function useUpdateOwnProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      phone?: string;
      address?: string;
      birth_date?: string;
      emergency_contact?: string;
      weight?: number;
      height?: number;
      photo?: string;
    }) => {
      const { userId, weight, height, ...updateFields } = data;

      let imc: number | undefined;
      const w = weight;
      const h = height;
      if (w !== undefined && h !== undefined && h > 0) {
        imc = parseFloat((w / ((h / 100) * (h / 100))).toFixed(1));
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          ...updateFields,
          ...(w !== undefined ? { weight: w } : {}),
          ...(h !== undefined ? { height: h } : {}),
          ...(imc !== undefined ? { imc } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      if (w !== undefined) {
        const { error: progressError } = await supabase
          .from('physical_progress')
          .insert([{
            user_id: userId,
            weight: w,
            date: new Date().toISOString(),
          }]);

        if (progressError) throw progressError;
      }

      return { weight: w, height: h, imc };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['physical-progress'] });
      toast.success('Perfil actualizado correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar perfil');
    },
  });
}
