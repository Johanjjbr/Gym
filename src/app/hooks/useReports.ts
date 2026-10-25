/**
 * Datos de los reportes mensuales. Respetan la sede activa (scopeToBranch) y
 * leen por páginas para no quedarse en el límite de 1000 filas de Supabase.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DayPayment } from '../lib/dailyPayments';
import { monthRange, type AttendanceEntry, type MonthStr, type ReportMember, type StatusChange } from '../lib/reports';
import { getBranchScope, scopeToBranch } from './useOrgContext';

const PAGE = 1000;

/** Lee todas las filas de una consulta por páginas (máx. 50.000). */
async function fetchAll<T>(build: () => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 50 * PAGE; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

const MEMBER_FIELDS = 'id, name, cedula, member_number, status, start_date, created_at, plan, plans(name)';

export function useReportMembers() {
  return useQuery({
    queryKey: ['reports', 'members', getBranchScope()],
    queryFn: () => fetchAll<ReportMember>(() => scopeToBranch(supabase.from('users').select(MEMBER_FIELDS)).not('organization_id', 'is', null).order('name')),
    staleTime: 60_000,
  });
}

export function useStatusHistory() {
  return useQuery({
    queryKey: ['reports', 'status-history', getBranchScope()],
    queryFn: () =>
      fetchAll<StatusChange>(() =>
        scopeToBranch(supabase.from('member_status_history').select('user_id, member_name, old_status, new_status, changed_at')).order('changed_at'),
      ),
    staleTime: 60_000,
  });
}

export function useMonthPayments(month: MonthStr) {
  return useQuery({
    queryKey: ['reports', 'payments', month, getBranchScope()],
    queryFn: () => {
      const r = monthRange(month);
      const select =
        'id, user_id, member_name, amount, date, created_at, method, status, currency, amount_original, exchange_rate, ' +
        'users(name, member_number, cedula), invoices(id, invoice_number, concept, reference, void_reason)';
      return fetchAll<DayPayment>(() =>
        scopeToBranch(supabase.from('payments').select(select))
          .in('status', ['Pagado', 'Anulado'])
          .gte('date', r.from)
          .lt('date', r.to)
          .order('date')
          .order('id'),
      );
    },
    staleTime: 60_000,
  });
}

export function useMonthAttendance(month: MonthStr) {
  return useQuery({
    queryKey: ['reports', 'attendance', month, getBranchScope()],
    queryFn: () => {
      const r = monthRange(month);
      return fetchAll<AttendanceEntry>(() =>
        scopeToBranch(supabase.from('attendance').select('user_id, date, time'))
          .eq('type', 'Entrada')
          .gte('date', r.from)
          .lt('date', r.to)
          .order('date')
          .order('id'),
      );
    },
    staleTime: 60_000,
  });
}
