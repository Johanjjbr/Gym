import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGymsApi } from '../lib/api';
import { toast } from 'sonner';
import { gymKeys } from './useGyms';

export const adminGymKeys = {
  all: ['admin-gyms'] as const,
};

export function useAdminGyms() {
  return useQuery({
    queryKey: adminGymKeys.all,
    queryFn: adminGymsApi.getMyGyms,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export function useAssignGym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ staff_id, gym_id }: { staff_id: string; gym_id: string }) =>
      adminGymsApi.assign(staff_id, gym_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminGymKeys.all });
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      toast.success('Gimnasio asignado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al asignar gimnasio', { description: error.message });
    },
  });
}

export function useRemoveGym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ staff_id, gym_id }: { staff_id: string; gym_id: string }) =>
      adminGymsApi.remove(staff_id, gym_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminGymKeys.all });
      queryClient.invalidateQueries({ queryKey: gymKeys.all });
      toast.success('Gimnasio removido exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al remover gimnasio', { description: error.message });
    },
  });
}
