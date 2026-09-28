import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plans } from '../lib/api';
import type { Plan, PlanCreateInput, PlanUpdateInput } from '../types';

export function usePlans(params?: { is_active?: boolean; type?: string }) {
  return useQuery({
    queryKey: ['plans', params],
    queryFn: () => plans.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: ['plans', id],
    queryFn: () => plans.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: PlanCreateInput) => plans.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlanUpdateInput }) => plans.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plans', variables.id] });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => plans.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}