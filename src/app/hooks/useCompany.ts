/**
 * Mi empresa: datos de la empresa, sedes y suscripción al sistema.
 * RLS limita todo a la empresa de la sesión; el límite de sedes lo valida la base.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { orgContextKey } from './useOrgContext';

export interface BranchRow {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean | null;
  created_at: string;
}

export interface CompanyInput {
  name: string;
  legal_name: string | null;
  rif: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
}

export interface BranchInput {
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export interface SubscriptionPayment {
  id: string;
  amount_usd: number;
  method: string;
  reference: string | null;
  paid_at: string;
  months: number;
  period_start: string;
  period_end: string;
  notes: string | null;
}

const branchesKey = ['company', 'branches'] as const;

/** "Sede Los Teques" -> "SEDE-LOS-TEQUES" */
export function branchCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'SEDE';
}

const friendly = (msg: string) =>
  msg.includes('gyms_org_code_key') ? 'Ya existe una sede con ese código' : msg;

export function useCompanyBranches() {
  return useQuery({
    queryKey: branchesKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gyms')
        .select('id, name, code, address, phone, email, is_active, created_at')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as BranchRow[];
    },
    staleTime: 1000 * 60,
  });
}

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: branchesKey });
    qc.invalidateQueries({ queryKey: orgContextKey });
  };
}

export function useUpdateCompany() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CompanyInput }) => {
      const { data: rows, error } = await supabase
        .from('organizations')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (error) throw new Error(error.message);
      if (!rows?.length) throw new Error('No tienes permiso para editar los datos de la empresa');
    },
    onSuccess: () => {
      refresh();
      toast.success('Datos de la empresa guardados');
    },
    onError: (e: Error) => toast.error('No se pudieron guardar los datos', { description: e.message }),
  });
}

export function useSaveBranch() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: BranchInput }) => {
      const payload = { ...data, updated_at: new Date().toISOString() };
      const { data: rows, error } = id
        ? await supabase.from('gyms').update(payload).eq('id', id).select('id')
        : await supabase.from('gyms').insert({ ...payload, is_active: true }).select('id');
      if (error) throw new Error(friendly(error.message));
      if (!rows?.length) throw new Error('No tienes permiso para gestionar sedes');
    },
    onSuccess: (_, v) => {
      refresh();
      toast.success(v.id ? 'Sede actualizada' : 'Sede creada');
    },
    onError: (e: Error) => toast.error('No se pudo guardar la sede', { description: e.message }),
  });
}

export function useToggleBranch() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data: rows, error } = await supabase
        .from('gyms')
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (error) throw new Error(friendly(error.message));
      if (!rows?.length) throw new Error('No tienes permiso para gestionar sedes');
    },
    onSuccess: (_, v) => {
      refresh();
      toast.success(v.active ? 'Sede activada' : 'Sede desactivada');
    },
    onError: (e: Error) => toast.error('No se pudo cambiar la sede', { description: e.message }),
  });
}

/** Pagos que la empresa le ha hecho al proveedor del sistema. */
export function useSubscriptionPayments(orgId: string | undefined) {
  return useQuery({
    queryKey: ['company', 'subscription-payments', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_payments')
        .select('id, amount_usd, method, reference, paid_at, months, period_start, period_end, notes')
        .eq('organization_id', orgId!)
        .order('paid_at', { ascending: false })
        .limit(24);
      if (error) throw new Error(error.message);
      return (data ?? []) as SubscriptionPayment[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}
