import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export const invoiceKeys = {
  all: ['invoices'] as const,
  byUser: (userId: string) => ['invoices', 'user', userId] as const,
};

interface InvoiceParams {
  user_id?: string;
  status?: string;
  gym_id?: string;
}

export function useInvoices(params?: InvoiceParams) {
  return useQuery({
    queryKey: [...invoiceKeys.all, params],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, plans(name)')
        .order('created_at', { ascending: false });

      if (params?.user_id) query = query.eq('user_id', params.user_id);
      if (params?.status) query = query.eq('status', params.status);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
    enabled: !!localStorage.getItem('access_token'),
  });
}

export function useUserInvoices(userId: string) {
  return useQuery({
    queryKey: invoiceKeys.byUser(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, plans(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!userId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      user_id: string;
      source: 'plan' | 'other';
      plan_id?: string;
      concept?: string;
      amount?: number;
      due_date?: string;
      notes?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('invoices')
        .insert([{
          user_id: data.user_id,
          source: data.source,
          plan_id: data.plan_id || null,
          concept: data.concept || null,
          amount: data.amount || null,
          due_date: data.due_date || null,
          notes: data.notes || null,
          status: 'Pendiente',
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Factura generada exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al generar factura', { description: error.message });
    },
  });
}

export function usePayInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { method: string; reference?: string; notes?: string } }) => {
      const { data: result, error } = await supabase
        .from('invoices')
        .update({
          status: 'Pagada',
          method: data.method,
          reference: data.reference || null,
          notes: data.notes || null,
          paid_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Pago registrado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al registrar pago', { description: error.message });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Factura eliminada exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar factura', { description: error.message });
    },
  });
}