import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { caracasDayUtcRange, type DayPayment } from '../lib/dailyPayments';
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
        .select('*, plans(name), payments(currency, amount_original, exchange_rate, created_at, staff:staff!payments_created_by_fkey(name))')
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
        .select('*, plans(name), payments(currency, amount_original, exchange_rate, created_at, staff:staff!payments_created_by_fkey(name))')
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

/** yyyy-MM-dd en hora LOCAL (toISOString() usa UTC y puede cambiar el día/mes). */
export function toDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function invalidateBilling(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
  queryClient.invalidateQueries({ queryKey: ['users'] });
  queryClient.invalidateQueries({ queryKey: ['payments'] });
  queryClient.invalidateQueries({ queryKey: statsKeys.dashboard });
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

/** Límites [inicio, fin) del mes de una fecha yyyy-MM-dd (sin pasar por Date/UTC). */
export function monthBounds(dateStr: string): { start: string; end: string } {
  const [y, m] = dateStr.slice(0, 10).split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return { start: `${y}-${pad(m)}-01`, end: `${ny}-${pad(nm)}-01` };
}

/**
 * Crea una factura. El número lo asigna la base de datos (secuencia), no el cliente.
 *
 * Si se pide como 'Pagada':
 *  - si el usuario ya tiene una factura impaga de ese mes, se SALDA esa (no se duplica);
 *  - si no, se crea Pendiente y se paga.
 * El pago usa la función transaccional pay_invoice(); next_payment / paid_until
 * los recalcula la base de datos.
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateInvoiceInput) => {
      if (!data.user_id) throw new Error('Usuario requerido');
      if (data.amount == null || Number.isNaN(data.amount)) throw new Error('Monto requerido');

      const wantsPaid = data.status === 'Pagada';
      const dueDate = data.due_date || toDateOnly(new Date());
      const payArgs = (invoiceId: string) => ({
        p_invoice_id: invoiceId,
        p_method: data.method || 'Efectivo $',
        p_reference: data.reference ?? null,
        p_notes: data.notes ?? null,
        p_paid_at: data.paid_at ?? null,
      });

      // ¿Ya existe una factura impaga de ese mes? -> se salda en lugar de crear otra
      if (wantsPaid) {
        const { start, end } = monthBounds(dueDate);
        const { data: existing, error: findError } = await supabase
          .from('invoices')
          .select('id, amount')
          .eq('user_id', data.user_id)
          .gte('due_date', start)
          .lt('due_date', end)
          .in('status', ['Pendiente', 'Vencida'])
          .order('due_date', { ascending: true })
          .limit(1);
        if (findError) throw new Error(findError.message);

        const found = existing?.[0];
        if (found) {
          if (Number(found.amount) !== Number(data.amount)) {
            const { error: amountError } = await supabase
              .from('invoices').update({ amount: data.amount }).eq('id', found.id);
            if (amountError) throw new Error(amountError.message);
          }
          const { data: paid, error: payError } = await supabase.rpc('pay_invoice', payArgs(found.id));
          if (payError) throw new Error(payError.message);
          return paid;
        }
      }

      const { data: created, error } = await supabase
        .from('invoices')
        .insert([{
          user_id: data.user_id,
          plan_id: data.plan_id || null,
          concept: data.concept || null,
          amount: data.amount,
          due_date: dueDate,
          status: wantsPaid ? 'Pendiente' : (data.status || 'Pendiente'),
          notes: data.notes || null,
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (!wantsPaid) return created;

      const { data: paid, error: payError } = await supabase.rpc('pay_invoice', payArgs(created.id));
      if (payError) {
        // No dejar una factura a medias si el cobro falló
        await supabase.from('invoices').delete().eq('id', created.id);
        throw new Error(payError.message);
      }
      return paid;
    },
    onSuccess: () => {
      invalidateBilling(queryClient);
      toast.success('Factura generada exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al generar factura', { description: error.message });
    },
  });
}

/** Paga una factura vía RPC transaccional (factura + pago + fechas del usuario). */
export function usePayInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: { method: string; reference?: string; notes?: string; paid_at?: string };
    }) => {
      const { data: result, error } = await supabase.rpc('pay_invoice', {
        p_invoice_id: id,
        p_method: data.method,
        p_reference: data.reference ?? null,
        p_notes: data.notes ?? null,
        p_paid_at: data.paid_at ?? null,
      });
      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      invalidateBilling(queryClient);
      toast.success('Pago registrado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al registrar pago', { description: error.message });
    },
  });
}

export interface AdvancePaymentResult {
  paid: number;
  created: number;
  paid_until: string | null;
}

/** Pago adelantado de N periodos: paga las pendientes y crea las que falten. */
export function usePayAdvanceMonths() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; months: number; method: string; reference?: string }) => {
      const { data, error } = await supabase.rpc('pay_advance_months', {
        p_user_id: input.user_id,
        p_months: input.months,
        p_method: input.method,
        p_reference: input.reference ?? null,
      });
      if (error) throw new Error(error.message);
      return data as AdvancePaymentResult;
    },
    onSuccess: (result) => {
      invalidateBilling(queryClient);
      toast.success(`${result.paid} mes(es) pagado(s) por adelantado`);
    },
    onError: (error: Error) => {
      toast.error('Error en pago adelantado', { description: error.message });
    },
  });
}

/** Borrar una factura pagada elimina también su pago y recalcula las fechas (trigger en la base). */
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
      invalidateBilling(queryClient);
      toast.success('Factura eliminada exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar factura', { description: error.message });
    },
  });
}

export interface DailyBillingResult {
  overdue_invoices: number;
  suspended_users: number;
  generated_invoices: number;
}

/** Ejecuta manualmente el mismo proceso que corre pg_cron cada noche. */
export function useProcessRecurringPayments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('run_daily_billing');
      if (error) throw new Error(error.message);
      return data as DailyBillingResult;
    },
    onSuccess: (data) => {
      invalidateBilling(queryClient);
      const parts: string[] = [];
      if (data.generated_invoices > 0) parts.push(`${data.generated_invoices} factura(s) generada(s)`);
      if (data.overdue_invoices > 0) parts.push(`${data.overdue_invoices} marcada(s) como vencida(s)`);
      if (data.suspended_users > 0) parts.push(`${data.suspended_users} usuario(s) suspendido(s)`);
      if (parts.length > 0) {
        toast.success(`Facturación automática: ${parts.join(', ')}`);
      } else {
        toast.info('No hay pagos pendientes para procesar');
      }
    },
    onError: (error: Error) => {
      toast.error('Error al procesar facturación automática', { description: error.message });
    },
  });
}

// ---------------------------------------------------------------------------
// Facturación: datos y cobro unificado
// ---------------------------------------------------------------------------

export interface BillingMember {
  id: string;
  name: string;
  cedula: string | null;
  phone: string | null;
  member_number: string | null;
  status: string;
  is_free_user: boolean | null;
  plan_id: string | null;
  paid_until: string | null;
  next_payment: string | null;
  start_date?: string | null;
  billing_day?: number | null;
  billing_start?: string | null;
  plans: { id: string; name: string; price: number; duration_days: number; type: string | null } | null;
}

/** Socios con lo necesario para cobrar (lectura directa, sin la edge function). */
export function useBillingMembers() {
  return useQuery({
    queryKey: ['users', 'billing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, cedula, phone, member_number, status, is_free_user, plan_id, paid_until, next_payment, start_date, billing_day, billing_start, plans(id, name, price, duration_days, type)')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as BillingMember[];
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!localStorage.getItem('access_token'),
  });
}

const BILLING_MEMBER_FIELDS =
  'id, name, cedula, phone, member_number, status, is_free_user, plan_id, paid_until, next_payment, start_date, billing_day, billing_start, plans(id, name, price, duration_days, type)';

/** Un socio con lo necesario para cobrar (ficha del socio). */
export function useBillingMember(id: string | undefined) {
  return useQuery({
    queryKey: ['users', 'billing', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select(BILLING_MEMBER_FIELDS).eq('id', id!).maybeSingle();
      if (error) throw new Error(error.message);
      return data as unknown as (BillingMember & { start_date: string | null }) | null;
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  });
}

/** Pagos recibidos desde una fecha (yyyy-MM-dd). */
export function usePaymentsSince(since: string) {
  return useQuery({
    queryKey: ['payments', since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, user_id, amount, date, method, currency, amount_original')
        .eq('status', 'Pagado')
        .gte('date', since)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!localStorage.getItem('access_token'),
  });
}

export interface PayPeriodsInput {
  user_id: string;
  months: number;
  method: string;
  reference?: string;
  notes?: string;
  /** yyyy-MM-dd; vacío = ahora. */
  paid_on?: string;
}

export interface PayPeriodsResult {
  paid: number;
  created: number;
  total: number;
  paid_until: string | null;
}

/**
 * Cobro unificado: salda las facturas abiertas más antiguas y adelanta
 * períodos si se pagan más. Una sola transacción en la base (pay_periods).
 */
export function usePayPeriods() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PayPeriodsInput) => {
      const isToday = !input.paid_on || input.paid_on === toDateOnly(new Date());
      const { data, error } = await supabase.rpc('pay_periods', {
        p_user_id: input.user_id,
        p_months: input.months,
        p_method: input.method,
        p_reference: input.reference?.trim() || null,
        p_notes: input.notes?.trim() || null,
        p_paid_at: isToday ? null : `${input.paid_on}T12:00:00`,
      });
      if (error) throw new Error(error.message);
      return data as PayPeriodsResult;
    },
    onSuccess: () => invalidateBilling(queryClient),
  });
}

/**
 * Anula una factura con motivo (void_invoice). No se borra: queda en el
 * historial como 'Anulada', deja de contar como deuda/ingreso y el proceso
 * nocturno no la vuelve a generar. Si estaba pagada, su pago queda 'Anulado'.
 */
export function useVoidInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase.rpc('void_invoice', { p_invoice_id: id, p_reason: reason.trim() });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      invalidateBilling(queryClient);
      toast.success('Factura anulada', { description: 'Queda en el historial con el motivo.' });
    },
    onError: (error: Error) => toast.error('No se pudo anular la factura', { description: error.message }),
  });
}

/** Pagos de un día (por fecha de pago) + los registrados ese día con fecha anterior. */
export function useDailyPayments(day: string) {
  return useQuery({
    queryKey: ['payments', 'day', day],
    queryFn: async () => {
      const select =
        'id, user_id, member_name, amount, date, created_at, method, status, currency, amount_original, exchange_rate, ' +
        'users(name, member_number, cedula), staff:staff!payments_created_by_fkey(name), ' +
        'invoices(id, invoice_number, concept, reference, notes, void_reason)';
      const next = addDaysIso(day, 1);
      const { from, to } = caracasDayUtcRange(day);
      const [byDate, late] = await Promise.all([
        supabase.from('payments').select(select).in('status', ['Pagado', 'Anulado'])
          .gte('date', day).lt('date', next).order('date', { ascending: true }),
        supabase.from('payments').select(select).in('status', ['Pagado', 'Anulado'])
          .gte('created_at', from).lt('created_at', to).lt('date', day).order('date', { ascending: true }),
      ]);
      const failed = [byDate, late].find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
      const byTime = (a: DayPayment, b: DayPayment) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
      return {
        payments: ((byDate.data ?? []) as unknown as DayPayment[]).sort(byTime),
        /** Registrados este día pero con fecha de pago anterior (no suman en este día). */
        backdated: (late.data ?? []) as unknown as DayPayment[],
      };
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
}

function addDaysIso(day: string, n: number) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
