/**
 * Hooks de React Query para Progreso Físico
 * Gestiona las operaciones CRUD del progreso físico
 */

import { useMutation, useQuery, useQueryClient } from '@tantml:invoke>
import { physicalProgress } from '../lib/api';
import { toast } from 'sonner';
import type { PhysicalDataFormData } from '../lib/validations';

// Keys para el caché
export const physicalProgressKeys = {
  all: ['physical-progress'] as const,
  byUser: (userId: string) => ['physical-progress', userId] as const,
};

/**
 * Hook para obtener el progreso físico de un usuario
 */
export function usePhysicalProgress(userId: string) {
  return useQuery({
    queryKey: physicalProgressKeys.byUser(userId),
    queryFn: () => physicalProgress.getByUser(userId),
    enabled: !!userId,
  });
}

/**
 * Hook para crear un nuevo registro de progreso
 */
export function useCreatePhysicalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: physicalProgress.create,
    onSuccess: (data) => {
      // Invalidar las queries del usuario específico
      queryClient.invalidateQueries({ queryKey: physicalProgressKeys.byUser(data.user_id) });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast.success('Progreso registrado correctamente');
    },
    onError: (error) => {
      console.error('Error al registrar progreso:', error);
      toast.error('Error al registrar progreso');
    },
  });
}

/**
 * Hook para eliminar un registro de progreso
 */
export function useDeletePhysicalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: physicalProgress.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: physicalProgressKeys.all });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast.success('Registro eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error al eliminar registro:', error);
      toast.error('Error al eliminar registro');
    },
  });
}
