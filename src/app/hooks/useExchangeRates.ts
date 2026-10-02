/**
 * Tasa BCV (Bs por 1 USD) cargada a mano cada día.
 * Recepción y Admin la cargan y corrigen (migración 43).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { rateStatus, type RateRow } from '../lib/currency';
import { addDays, toDateOnly } from '../lib/dashboardHelpers';

export const ratesKey = ['exchange_rates'] as const;

/** Últimas 30 tasas (para el historial y la tasa vigente). */
export function useExchangeRates() {
  return useQuery({
    queryKey: ratesKey,
    queryFn: async () => {
      const since = addDays(toDateOnly(new Date()), -60);
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate_date, rate, source, updated_at')
        .gte('rate_date', since)
        .order('rate_date', { ascending: false })
        .limit(30);
      if (error) throw new Error(error.message);
      return (data ?? []) as RateRow[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

/** Tasa vigente hoy (o la del viernes en fin de semana). */
export function useCurrentRate() {
  const q = useExchangeRates();
  const today = toDateOnly(new Date());
  return { ...rateStatus(q.data ?? [], today), isLoading: q.isLoading, rates: q.data ?? [], today };
}

/** Carga (o corrige) la tasa de un día. */
export function useSaveRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, rate, exists }: { date: string; rate: number; exists: boolean }) => {
      if (!(rate > 0)) throw new Error('La tasa debe ser mayor que 0');
      const q = exists
        ? supabase.from('exchange_rates').update({ rate }).eq('rate_date', date).select('rate_date')
        : supabase.from('exchange_rates').insert({ rate_date: date, rate, source: 'BCV' }).select('rate_date');
      const { data, error } = await q;
      if (error) {
        if (error.code === '23505') throw new Error('Ya hay una tasa para ese día. Ábrela de nuevo para corregirla.');
        if (error.code === '42501') throw new Error('No tienes permiso para guardar tasas.');
        throw new Error(error.message);
      }
      // Un UPDATE bloqueado por RLS no da error: simplemente no cambia filas
      if (!data || data.length === 0) throw new Error('No tienes permiso para corregir la tasa.');
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ratesKey });
      toast.success(v.exists ? 'Tasa corregida' : 'Tasa del día guardada');
    },
    onError: (e: Error) => toast.error('No se pudo guardar la tasa', { description: e.message }),
  });
}
