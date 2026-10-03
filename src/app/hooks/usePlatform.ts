/**
 * Panel de plataforma (solo súper admin): clientes, pagos de suscripción, planes.
 * Todas las funciones de la base validan is_super_admin().
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { SubscriptionState } from '../lib/orgContext';

const projectUrl = import.meta.env.VITE_SUPABASE_URL;

export interface PlatformClient {
  id: string;
  name: string;
  legal_name: string | null;
  rif: string | null;
  email: string | null;
  phone: string | null;
  status: 'Activa' | 'Suspendida' | 'Cancelada';
  notes: string | null;
  plan_id: string | null;
  plan_name: string | null;
  monthly_price: number | null;
  price: number | null;
  max_branches: number;
  next_due_date: string | null;
  days_left: number | null;
  state: SubscriptionState;
  branches: number;
  members: number;
  active_members: number;
  staff: number;
  last_payment: string | null;
  created_at: string;
  owner: { name: string; email: string } | null;
}

export interface PlatformPlan {
  id: string;
  name: string;
  price_usd: number;
  max_branches: number;
  description: string | null;
  is_active: boolean;
}

export interface PlatformSummary {
  by_month: { month: string; total: number; count: number }[];
  this_month: number;
  expected_monthly: number;
  clients: Record<SubscriptionState | 'total', number>;
}

export interface PlatformPaymentRow {
  id: string;
  organization_id: string;
  amount_usd: number;
  method: string;
  reference: string | null;
  paid_at: string;
  months: number;
  period_start: string;
  period_end: string;
  notes: string | null;
  organizations: { name: string } | null;
}

const keys = {
  clients: ['platform', 'clients'] as const,
  summary: ['platform', 'summary'] as const,
  plans: ['platform', 'plans'] as const,
  payments: ['platform', 'payments'] as const,
};

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function usePlatformClients() {
  return useQuery({ queryKey: keys.clients, queryFn: () => rpc<PlatformClient[]>('platform_clients'), staleTime: 1000 * 30 });
}

export function usePlatformSummary() {
  return useQuery({ queryKey: keys.summary, queryFn: () => rpc<PlatformSummary>('platform_summary', { p_months: 6 }), staleTime: 1000 * 30 });
}

export function usePlatformPlans() {
  return useQuery({
    queryKey: keys.plans,
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_plans').select('*').order('price_usd');
      if (error) throw new Error(error.message);
      return (data ?? []) as PlatformPlan[];
    },
    staleTime: 1000 * 60,
  });
}

export function usePlatformPayments() {
  return useQuery({
    queryKey: keys.payments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_payments')
        .select('id, organization_id, amount_usd, method, reference, paid_at, months, period_start, period_end, notes, organizations(name)')
        .order('paid_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PlatformPaymentRow[];
    },
    staleTime: 1000 * 30,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['platform'] });
    qc.invalidateQueries({ queryKey: ['my_context'] });
  };
}

export interface RegisterPaymentInput {
  orgId: string;
  amount: number;
  method: string;
  reference?: string;
  paidAt?: string;
  months: number;
  notes?: string;
}

export function useRegisterPlatformPayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: RegisterPaymentInput) =>
      rpc<{ next_due_date: string }>('platform_register_payment', {
        p_org: v.orgId, p_amount: v.amount, p_method: v.method, p_reference: v.reference || null,
        p_paid_at: v.paidAt || null, p_months: v.months, p_notes: v.notes || null,
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Pago registrado');
    },
    onError: (e: Error) => toast.error('No se pudo registrar el pago', { description: e.message }),
  });
}

export interface ClientUpdate {
  name?: string;
  rif?: string | null;
  email?: string | null;
  phone?: string | null;
  plan_id?: string | null;
  monthly_price?: number | null;
  max_branches?: number;
  next_due_date?: string | null;
  status?: PlatformClient['status'];
  notes?: string | null;
}

export function useUpdateClient() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, data, quiet }: { id: string; data: ClientUpdate; quiet?: boolean }) => {
      const { data: rows, error } = await supabase
        .from('organizations')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (error) throw new Error(error.message);
      if (!rows?.length) throw new Error('Sin permiso para modificar este cliente');
      return quiet;
    },
    onSuccess: (quiet) => {
      invalidate();
      if (!quiet) toast.success('Cliente actualizado');
    },
    onError: (e: Error) => toast.error('No se pudo actualizar el cliente', { description: e.message }),
  });
}

export function useSavePlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Omit<PlatformPlan, 'id'> }) => {
      const { error } = id
        ? await supabase.from('platform_plans').update(data).eq('id', id)
        : await supabase.from('platform_plans').insert(data);
      if (error) throw new Error(error.code === '23505' ? 'Ya existe un plan con ese nombre' : error.message);
    },
    onSuccess: (_, v) => {
      invalidate();
      toast.success(v.id ? 'Plan actualizado' : 'Plan creado');
    },
    onError: (e: Error) => toast.error('No se pudo guardar el plan', { description: e.message }),
  });
}

export interface NewClientInput {
  company: { name: string; rif: string | null; email: string | null; phone: string | null };
  branch: { name: string; address: string | null };
  owner: { name: string; email: string; password: string; phone: string | null };
  plan_id: string | null;
  monthly_price: number | null;
  next_due_date: string | null;
}

/** Crea empresa + primera sede + usuario Dueño (edge function: necesita crear la cuenta de acceso). */
export function useCreateClient() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: NewClientInput) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
      const res = await fetch(`${projectUrl}/functions/v1/server/platform/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      return body as { organization_id: string };
    },
    onSuccess: () => {
      invalidate();
      toast.success('Cliente creado', { description: 'El Dueño ya puede iniciar sesión con su correo y contraseña.' });
    },
    onError: (e: Error) => toast.error('No se pudo crear el cliente', { description: e.message }),
  });
}
