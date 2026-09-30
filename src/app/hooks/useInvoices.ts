import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { statsKeys } from './useStats';

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

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `FAC-${year}-${String(sequence).padStart(4, '0')}`;
}

async function fetchNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `FAC-${year}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const latest = data?.[0]?.invoice_number as string | undefined;
  const lastSeq = latest ? parseInt(latest.split('-')[2], 10) : 0;
  const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return formatInvoiceNumber(year, next);
}

export interface CreateInvoiceInput {
  user_id: string;
  plan_id?: string;
  concept?: string;
  amount: number;
  due_date?: string;
  paid_at?: string;
  status?: 'Pagada' | 'Pendiente' | 'Vencida';
  method?: string;
  reference?: string;
  notes?: string;
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateInvoiceInput) => {
      if (!data.user_id) throw new Error('Usuario requerido');
      if (data.amount == null || Number.isNaN(data.amount)) throw new Error('Monto requerido');

      const invoiceNumber = await fetchNextInvoiceNumber();
      const dueDate = data.due_date || new Date().toISOString();
      const status = data.status || 'Pendiente';
      const paidAt = data.paid_at || (status === 'Pagada' ? dueDate : null);

      const { data: result, error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          user_id: data.user_id,
          plan_id: data.plan_id || null,
          concept: data.concept || null,
          amount: data.amount,
          due_date: dueDate,
          paid_at: paidAt,
          status,
          method: data.method || null,
          reference: data.reference || null,
          notes: data.notes || null,
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Si la factura se crea como 'Pagada', crear registro en payments para estadísticas
      if (status === 'Pagada') {
        // Obtener duración del plan para calcular next_payment correctamente
        let durationDays = 30; // fallback default
        if (data.plan_id) {
          const { data: plan } = await supabase
            .from('plans')
            .select('duration_days')
            .eq('id', data.plan_id)
            .single();
          if (plan) durationDays = plan.duration_days;
        } else {
          // Fallback: buscar plan del usuario
          const { data: user } = await supabase
            .from('users')
            .select('plan_id')
            .eq('id', data.user_id)
            .single();
          if (user?.plan_id) {
            const { data: plan } = await supabase
              .from('plans')
              .select('duration_days')
              .eq('id', user.plan_id)
              .single();
            if (plan) durationDays = plan.duration_days;
          }
        }

        const nextPaymentDate = new Date(dueDate);
        nextPaymentDate.setDate(nextPaymentDate.getDate() + durationDays);

        const { error: paymentError } = await supabase
          .from('payments')
          .insert([{
            user_id: data.user_id,
            amount: data.amount,
            date: dueDate,
            next_payment: nextPaymentDate.toISOString(),
            status: 'Pagado',
            method: data.method || 'Efectivo',
          }]);

        if (paymentError) {
          console.error('Error creating payment record:', paymentError);
        }

        // Actualizar usuario
        const { error: userError } = await supabase
          .from('users')
          .update({ 
            next_payment: nextPaymentDate.toISOString(),
            status: 'Activo'
          })
          .eq('id', data.user_id);

        if (userError) {
          console.error('Error updating user:', userError);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: statsKeys.dashboard });
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
      // Primero obtener la factura para tener los datos necesarios
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('user_id, amount, due_date, plan_id')
        .eq('id', id)
        .single();

      if (invoiceError) throw new Error(invoiceError.message);

      // Actualizar la factura a 'Pagada'
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

      // Obtener duración del plan para calcular next_payment correctamente
      let durationDays = 30; // fallback default
      if (invoice.plan_id) {
        const { data: plan } = await supabase
          .from('plans')
          .select('duration_days')
          .eq('id', invoice.plan_id)
          .single();
        if (plan) durationDays = plan.duration_days;
      } else if (invoice.user_id) {
        // Fallback: buscar plan del usuario
        const { data: user } = await supabase
          .from('users')
          .select('plan_id')
          .eq('id', invoice.user_id)
          .single();
        if (user?.plan_id) {
          const { data: plan } = await supabase
            .from('plans')
            .select('duration_days')
            .eq('id', user.plan_id)
            .single();
          if (plan) durationDays = plan.duration_days;
        }
      }

      // Crear registro en tabla payments para que se refleje en estadísticas
      const nextPaymentDate = new Date(invoice.due_date);
      nextPaymentDate.setDate(nextPaymentDate.getDate() + durationDays);

      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          user_id: invoice.user_id,
          amount: invoice.amount,
          date: new Date().toISOString(),
          next_payment: nextPaymentDate.toISOString(),
          status: 'Pagado',
          method: data.method,
        }]);

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        // No lanzar error para no revertir el pago de la factura
      }

      // Actualizar next_payment del usuario
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          next_payment: nextPaymentDate.toISOString(),
          status: 'Activo'
        })
        .eq('id', invoice.user_id);

      if (userError) {
        console.error('Error updating user next_payment:', userError);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: statsKeys.dashboard });
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

export function useProcessRecurringPayments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cronSecret?: string) => {
      const { api } = await import('../lib/api');
      return api.payments.processRecurring(cronSecret);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (data.processed > 0) {
        toast.success(`Facturación automática: ${data.processed} facturas generadas`);
      } else {
        toast.info('No hay pagos pendientes para procesar');
      }
      if (data.errors > 0) {
        toast.warning(`${data.errors} errores durante el procesamiento`);
      }
    },
    onError: (error: Error) => {
      toast.error('Error al procesar facturación automática', { description: error.message });
    },
  });
}