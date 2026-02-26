/**
 * React Query hooks para Rutinas
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routines, routineAssignments } from '../lib/api';
import { toast } from 'sonner';
import type { RoutineFormData, RoutineAssignmentFormData } from '../lib/validations';

// Keys para el caché
export const routineKeys = {
  all: ['routines'] as const,
  assignments: (userId?: string) => 
    userId ? ['routine-assignments', userId] as const : ['routine-assignments'] as const,
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
 * Hook para crear una rutina
 */
export function useCreateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RoutineFormData & { exercises: any[] }) => routines.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routineKeys.all });
      toast.success('Rutina creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear rutina');
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
