import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gymsApi } from '../lib/api';
import { toast } from 'sonner';

export const gymKeys = {
  all: ['gyms'] as const,
  detail: (id: string) => ['gyms', id] as const,
};

export function useGyms(includeInactive = false) {
  return useQuery({
    queryKey: [...gymKeys.all, { includeInactive }],
    queryFn: () => gymsApi.getAll(includeInactive),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export function useGymById(id: string | undefined) {
  return useQuery({
    queryKey: gymKeys.detail(id!),
    queryFn: () => gymsApi.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateGym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gymsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      toast.success('Gimnasio creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear gimnasio', {
        description: error.message,
      });
    },
  });
}

export function useUpdateGym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => gymsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      toast.success('Gimnasio actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar gimnasio', {
        description: error.message,
      });
    },
  });
}

export function useDeleteGym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gymsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      toast.success('Gimnasio desactivado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al desactivar gimnasio', {
        description: error.message,
      });
    },
  });
}
