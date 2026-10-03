/**
 * Empresa / sede / suscripción de la sesión (my_context) y cambio de sede.
 *
 * La sede por la que se filtra (branch scope) se guarda también en un valor de
 * módulo para que las consultas de pagos y asistencia la apliquen sin tener que
 * recibirla por props (ver scopeToBranch).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { branchScopeFor, type OrgContext } from '../lib/orgContext';

export const orgContextKey = ['my_context'] as const;

let currentScope: string | null = null;

/** Sede activa para filtrar (null = toda la empresa). */
export const getBranchScope = () => currentScope;

/** Aplica el filtro de sede a una consulta de payments/attendance. */
export function scopeToBranch<T>(query: T): T {
  return currentScope ? (query as any).eq('gym_id', currentScope) : query;
}

export function useOrgContext() {
  return useQuery({
    queryKey: orgContextKey,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_context');
      if (error) throw new Error(error.message);
      const ctx = (data ?? null) as OrgContext | null;
      currentScope = branchScopeFor(ctx);
      return ctx;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/** Dueño/Admin: elegir sede (null = todas). Refresca todos los datos. */
export function useSetActiveBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (gymId: string | null) => {
      const { error } = await supabase.rpc('set_active_branch', { p_gym_id: gymId });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: orgContextKey });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== orgContextKey[0] });
    },
    onError: (e: Error) => toast.error('No se pudo cambiar de sede', { description: e.message }),
  });
}

/** Súper admin: entrar / salir del modo soporte de un cliente. */
export function useSupportMode() {
  const qc = useQueryClient();
  const reset = async () => {
    // Todo lo cacheado es de otra empresa
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== orgContextKey[0] });
    await qc.refetchQueries({ queryKey: orgContextKey });
  };
  const enter = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase.rpc('platform_enter_support', { p_org: orgId });
      if (error) throw new Error(error.message);
    },
    onSuccess: reset,
    onError: (e: Error) => toast.error('No se pudo entrar como soporte', { description: e.message }),
  });
  const exit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('platform_exit_support');
      if (error) throw new Error(error.message);
    },
    onSuccess: reset,
    onError: (e: Error) => toast.error('No se pudo salir del modo soporte', { description: e.message }),
  });
  return { enter, exit };
}
