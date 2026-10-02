/**
 * Datos del Dashboard leídos directamente de Supabase.
 *
 * Antes dependía de la edge function `server` (/stats/*), pero solo existía
 * /stats: las tendencias de ingresos, asistencia y estados devolvían 404 y los
 * gráficos quedaban vacíos.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { statsKeys } from './useStats';
import {
  addDays,
  attachInvoiceDetails,
  attendanceByDay,
  monthStart,
  memberSummary,
  receivables,
  revenueByMonth,
  revenueMonthToDate,
  shiftMonth,
  toDateOnly,
  type AttendanceRow,
  type MemberRow,
  type OpenInvoiceRow,
  type PaymentRow,
} from '../lib/dashboardHelpers';
import { cashBreakdown } from '../lib/currency';
import { upcomingRenewals, type InvoiceRow, type RenewalMember } from '../lib/billing';

// Cuelga de statsKeys.dashboard: cualquier pago/factura que invalide las
// estadísticas (invalidateBilling) también refresca el dashboard.
export const dashboardKey = [...statsKeys.dashboard, 'overview'] as const;

const REVENUE_MONTHS = 6;
const ATTENDANCE_DAYS = 7;

export async function fetchDashboard(now: Date = new Date()) {
  const today = toDateOnly(now);
  const revenueSince = shiftMonth(today, -(REVENUE_MONTHS - 1));
  const attendanceSince = addDays(today, -(ATTENDANCE_DAYS - 1));

  const [usersRes, invoicesRes, paymentsRes, attendanceRes] = await Promise.all([
    supabase.from('users').select('id, name, status, created_at, is_free_user, plans(id, name, price, duration_days)'),
    supabase
      .from('invoices')
      // Todas: las pagadas hacen falta para calcular el próximo vencimiento
      .select('id, user_id, amount, due_date, status, concept, invoice_number, reference, notes, payment_id'),
    supabase
      .from('payments')
      .select('id, user_id, amount, date, method, currency, amount_original')
      .eq('status', 'Pagado')
      .gte('date', revenueSince)
      .order('date', { ascending: false }),
    supabase
      .from('attendance')
      .select('date, user_id')
      .eq('type', 'Entrada')
      .gte('date', attendanceSince)
      .lte('date', today),
  ]);

  const failed = [usersRes, invoicesRes, paymentsRes, attendanceRes].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  const users = (usersRes.data ?? []) as MemberRow[];
  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const attendance = attendanceByDay((attendanceRes.data ?? []) as AttendanceRow[], today, ATTENDANCE_DAYS);
  const names = new Map(users.map((u) => [u.id, u.name]));
  const invoices = (invoicesRes.data ?? []) as OpenInvoiceRow[];

  return {
    today,
    members: memberSummary(users, today),
    revenue: revenueMonthToDate(payments, today),
    // Caja del mes: lo que entró en $ y en Bs
    cash: cashBreakdown(payments.filter((p) => p.date.slice(0, 10) >= monthStart(today) && p.date.slice(0, 10) <= today)),
    revenueTrend: revenueByMonth(payments, today, REVENUE_MONTHS),
    receivables: receivables(invoices, today),
    // Próximos vencimientos (aunque la factura todavía no exista)
    renewals: upcomingRenewals((usersRes.data ?? []) as unknown as RenewalMember[], invoices as InvoiceRow[], today),
    attendance,
    todayAttendance: attendance[attendance.length - 1]?.count ?? 0,
    recentPayments: attachInvoiceDetails(payments.slice(0, 6), invoices as InvoiceRow[]),
    nameOf: (id: string) => names.get(id) ?? 'Socio eliminado',
  };
}

export type DashboardData = Awaited<ReturnType<typeof fetchDashboard>>;

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKey,
    queryFn: () => fetchDashboard(),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    enabled: !!localStorage.getItem('access_token'),
  });
}
