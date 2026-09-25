/**
 * React Query hooks para Rutinas
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routines, routineAssignments, workoutSessions, exerciseLogs } from '../lib/api';
import { toast } from 'sonner';
import type { RoutineFormData, RoutineAssignmentFormData } from '../lib/validations';

// Keys para el caché
export const routineKeys = {
  all: ['routines'] as const,
  detail: (id: string) => ['routine', id] as const,
  assignments: (userId?: string) => 
    userId ? ['routine-assignments', userId] as const : ['routine-assignments'] as const,
  activeAssignment: (userId: string) => ['routine-assignments', 'active', userId] as const,
  workoutSessions: (userId: string) => ['workout-sessions', userId] as const,
};

/**
 * Hook para obtener todas las rutinas
 */
export function useRoutines() {
  return useQuery({
    queryKey: routineKeys.all,
    queryFn: routines.getAll,
    staleTime: 1000 * 60 * 10, // 10 minutos (rutinas no cambian frecuentemente)
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook para obtener una rutina por ID
 */
export function useRoutine(id: string) {
  return useQuery({
    queryKey: routineKeys.detail(id),
    queryFn: () => routines.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Hook para crear rutinas
 */
export function useCreateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RoutineFormData & { exercises?: any[] }) => routines.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routineKeys.all });
      toast.success('Rutina creada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error al crear rutina:', error);
      toast.error(error.message || 'Error al crear la rutina');
    },
  });
}

/**
 * Hook para actualizar rutinas
 */
export function useUpdateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RoutineFormData> & { exercises?: any[] } }) => 
      routines.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routineKeys.all });
      toast.success('Rutina actualizada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error al actualizar rutina:', error);
      toast.error(error.message || 'Error al actualizar la rutina');
    },
  });
}

/**
 * Hook para eliminar rutinas
 */
export function useDeleteRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => routines.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routineKeys.all });
      toast.success('Rutina eliminada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error al eliminar rutina:', error);
      toast.error(error.message || 'Error al eliminar la rutina');
    },
  });
}

/**
 * Hook para activar/desactivar rutinas
 */
export function useToggleRoutineActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      routines.toggleActive(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: routineKeys.all });
      toast.success(variables.isActive ? 'Rutina activada' : 'Rutina desactivada');
    },
    onError: (error: any) => {
      console.error('Error al cambiar estado de rutina:', error);
      toast.error(error.message || 'Error al cambiar el estado de la rutina');
    },
  });
}

/**
 * Hook para obtener asignaciones de rutinas
 */
export function useRoutineAssignments(userId?: string) {
  return useQuery({
    queryKey: routineKeys.assignments(userId),
    queryFn: () => routineAssignments.getAll(userId),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para obtener usuarios asignados a una rutina específica
 */
export function useRoutineAssignedUsers(routineId: string) {
  return useQuery({
    queryKey: ['routine-assignments', 'by-routine', routineId],
    queryFn: () => routineAssignments.getByRoutine(routineId),
    enabled: !!routineId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para asignar una rutina a un usuario
 */
export function useAssignRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RoutineAssignmentFormData) => routineAssignments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-assignments'] });
      toast.success('Rutina asignada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al asignar rutina');
    },
  });
}

/**
 * Hook para obtener la asignación activa de un usuario
 */
export function useActiveRoutineAssignment(userId: string) {
  return useQuery({
    queryKey: routineKeys.activeAssignment(userId),
    queryFn: () => routineAssignments.getActive(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para obtener sesiones de entrenamiento de un usuario
 */
export function useWorkoutSessions(userId: string) {
  return useQuery({
    queryKey: routineKeys.workoutSessions(userId),
    queryFn: () => workoutSessions.getByUser(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para crear sesión de entrenamiento
 */
export function useCreateWorkoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      user_id: string;
      assignment_id: string;
      date: string;
      day_number: number;
    }) => workoutSessions.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: routineKeys.workoutSessions(variables.user_id) });
      toast.success('Sesión de entrenamiento iniciada');
    },
    onError: (error: Error) => {
      console.error('Error al crear sesión:', error);
      toast.error(error.message || 'Error al iniciar sesión de entrenamiento');
    },
  });
}

/**
 * Hook para completar sesión de entrenamiento
 */
export function useCompleteWorkoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => workoutSessions.complete(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      toast.success('¡Sesión completada! Excelente trabajo 💪');
    },
    onError: (error: Error) => {
      console.error('Error al completar sesión:', error);
      toast.error(error.message || 'Error al completar sesión');
    },
  });
}

/**
 * Hook para registrar ejercicio completado
 */
export function useLogExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      session_id: string;
      exercise_name: string;
      sets_completed: number;
      reps_completed: string;
      weight_used?: number;
      notes?: string;
    }) => exerciseLogs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      toast.success('Ejercicio registrado');
    },
    onError: (error: Error) => {
      console.error('Error al registrar ejercicio:', error);
      toast.error(error.message || 'Error al registrar ejercicio');
    },
  });
}

/**
 * Hook para actualizar log de ejercicio
 */
export function useUpdateExerciseLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: {
      sets_completed?: number;
      reps_completed?: string;
      weight_used?: number;
      is_completed?: boolean;
      notes?: string;
    }}) => exerciseLogs.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
    },
    onError: (error: Error) => {
      console.error('Error al actualizar ejercicio:', error);
      toast.error(error.message || 'Error al actualizar ejercicio');
    },
  });
}