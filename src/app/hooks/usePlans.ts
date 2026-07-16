import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plans } from '../lib/api';
import { toast } from 'sonner';

export const planKeys = {
  all: ['plans'] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: planKeys.all,
    queryFn: plans.getAll,
    staleTime: 1000 * 60 * 5,
    enabled: !!localStorage.getItem('access_token'),
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; duration_days: number; price: number }) => plans.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      toast.success('Plan creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear plan', { description: error.message });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => plans.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      toast.success('Plan actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar plan', { description: error.message });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plans.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      toast.success('Plan eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar plan', { description: error.message });
    },
  });
}
