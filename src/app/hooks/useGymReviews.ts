import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gymReviews } from '../lib/api';
import { toast } from 'sonner';

export const reviewKeys = {
  byGym: (gymId: string) => ['gym-reviews', gymId] as const,
  myReview: (gymId: string) => ['gym-reviews', 'my', gymId] as const,
};

export function useGymReviews(gymId: string) {
  return useQuery({
    queryKey: reviewKeys.byGym(gymId),
    queryFn: () => gymReviews.getByGym(gymId),
    enabled: !!gymId,
  });
}

export function useMyReview(gymId: string) {
  return useQuery({
    queryKey: reviewKeys.myReview(gymId),
    queryFn: () => gymReviews.getMyReview(gymId),
    enabled: !!gymId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { gym_id: string; rating: number; comment?: string }) =>
      gymReviews.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.byGym(data.gym_id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(data.gym_id) });
      toast.success('Reseña creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear reseña', { description: error.message });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, gymId }: { id: string; data: { rating: number; comment?: string }; gymId: string }) =>
      gymReviews.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.byGym(variables.gymId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(variables.gymId) });
      toast.success('Reseña actualizada exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar reseña', { description: error.message });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, gymId }: { id: string; gymId: string }) =>
      gymReviews.delete(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.byGym(variables.gymId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.myReview(variables.gymId) });
      toast.success('Reseña eliminada exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar reseña', { description: error.message });
    },
  });
}
