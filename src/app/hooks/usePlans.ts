import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plans } from '../lib/api';
import type { Plan, PlanCreateInput, PlanUpdateInput } from '../types';
import { supabase } from '../lib/supabase';
import { planStats, type PlanRecord } from '../lib/plans';

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
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
// ---------------------------------------------------------------------------
// Página de Planes: planes + socios y facturas pendientes por plan
// ---------------------------------------------------------------------------

export const plansOverviewKey = ['plans', 'overview'] as const;

export function usePlansOverview() {
  return useQuery({
    queryKey: plansOverviewKey,
    queryFn: async () => {
      const [plansRes, usersRes, invRes] = await Promise.all([
        supabase.from('plans').select('*').order('price'),
        supabase.from('users').select('plan_id, status, is_free_user'),
        supabase.from('invoices').select('plan_id').eq('status', 'Pendiente'),
      ]);
      const failed = [plansRes, usersRes, invRes].find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
      const list = (plansRes.data ?? []) as PlanRecord[];
      return { plans: list, stats: planStats(list, usersRes.data ?? [], invRes.data ?? []) };
    },
    staleTime: 60 * 1000,
  });
}

/** Pasa las facturas PENDIENTES del plan al precio nuevo (las vencidas no se tocan). */
export function useRepricePendingInvoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, price }: { planId: string; price: number }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ amount: price })
        .eq('plan_id', planId)
        .eq('status', 'Pendiente')
        .select('id');
      if (error) throw new Error(error.message);
      return data?.length ?? 0;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
