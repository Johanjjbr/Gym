import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gyms } from '../lib/api';
import { toast } from 'sonner';
import type { Gym, GymCreateInput, GymUpdateInput } from '../types';

export const gymKeys = {
  all: ['gyms'] as const,
  main: ['gyms', 'main'] as const,
  branches: (parentId: string) => ['gyms', 'branches', parentId] as const,
  detail: (id: string) => ['gyms', id] as const,
};

export function useGyms() {
  return useQuery({
    queryKey: gymKeys.all,
    queryFn: gyms.getAll,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export function useMainGyms() {
  return useQuery({
    queryKey: gymKeys.main,
    queryFn: gyms.getMainGyms,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export function useGym(id: string) {
  return useQuery({
    queryKey: gymKeys.detail(id),
    queryFn: () => gyms.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBranches(parentGymId: string) {
  return useQuery({
    queryKey: gymKeys.branches(parentGymId),
    queryFn: () => gyms.getBranches(parentGymId),
    enabled: !!parentGymId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export function useCreateGym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GymCreateInput) => gyms.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      queryClient.invalidateQueries({ queryKey: gymKeys.main });
      toast.success('Gimnasio creado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error creando gimnasio:', error);
      const message = error.message || 'Error al crear gimnasio';
      
      if (message.includes('fetch') || message.includes('Failed to fetch')) {
        toast.error('No se pudo conectar con el servidor', {
          description: 'Verifica tu conexión o la configuración de Supabase.',
        });
      } else {
        toast.error('Error al crear gimnasio', {
          description: message,
        });
      }
    },
  });
}

export function useUpdateGym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GymUpdateInput }) => gyms.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gymKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      queryClient.invalidateQueries({ queryKey: gymKeys.main });
      // Invalidar también las branches del padre si existe
      queryClient.invalidateQueries({ queryKey: ['gyms', 'branches'] });
      toast.success('Gimnasio actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error actualizando gimnasio:', error);
      const message = error.message || 'Error al actualizar gimnasio';
      
      if (message.includes('fetch') || message.includes('Failed to fetch')) {
        toast.error('No se pudo conectar con el servidor', {
          description: 'Verifica tu conexión o la configuración de Supabase.',
        });
      } else {
        toast.error('Error al actualizar gimnasio', {
          description: message,
        });
      }
    },
  });
}

export function useDeleteGym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => gyms.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      queryClient.invalidateQueries({ queryKey: gymKeys.main });
      queryClient.invalidateQueries({ queryKey: ['gyms', 'branches'] });
      toast.success('Gimnasio eliminado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error eliminando gimnasio:', error);
      const message = error.message || 'Error al eliminar gimnasio';
      
      if (message.includes('fetch') || message.includes('Failed to fetch')) {
        toast.error('No se pudo conectar con el servidor', {
          description: 'Verifica tu conexión o la configuración de Supabase.',
        });
      } else {
        toast.error('Error al eliminar gimnasio', {
          description: message,
        });
      }
    },
  });
}