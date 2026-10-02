/**
 * Datos de la lista de Gestión de Usuarios: socios + facturas + última visita,
 * leídos directamente de Supabase y combinados en buildMemberRows().
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { buildMemberRows, type MemberListUser } from '../lib/members';
import { addDays, toDateOnly } from '../lib/dashboardHelpers';
import type { InvoiceRow } from '../lib/billing';

export const membersOverviewKey = ['users', 'overview'] as const;

const MEMBER_FIELDS =
  'id, name, email, phone, cedula, member_number, status, is_free_user, plan_id, plan, paid_until, next_payment, start_date, created_at, plans(id, name, price, duration_days, type)';

export function useMembersOverview() {
  return useQuery({
    queryKey: membersOverviewKey,
    queryFn: async () => {
      const today = toDateOnly(new Date());
      const [usersRes, invRes, attRes] = await Promise.all([
        supabase.from('users').select(MEMBER_FIELDS).order('name'),
        supabase.from('invoices').select('id, user_id, amount, due_date, status'),
        supabase.from('attendance').select('user_id, date').eq('type', 'Entrada').gte('date', addDays(today, -365)),
      ]);
      const failed = [usersRes, invRes, attRes].find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
      const users = (usersRes.data ?? []) as unknown as MemberListUser[];
      const invoices = (invRes.data ?? []) as InvoiceRow[];
      return {
        users,
        invoices,
        rows: buildMemberRows(users, invoices, (attRes.data ?? []) as { user_id: string; date: string }[], today),
      };
    },
    staleTime: 1000 * 60,
    enabled: !!localStorage.getItem('access_token'),
  });
}

/** Cambia el estado del socio (Dar de baja = Inactivo, Reactivar = Activo). */
export function useSetMemberStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Activo' | 'Inactivo' }) => {
      const { error } = await supabase.from('users').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(v.status === 'Inactivo' ? 'Socio dado de baja' : 'Socio reactivado', {
        description: v.status === 'Inactivo' ? 'Se conserva todo su historial.' : 'Se le factura desde el mes actual.',
      });
    },
    onError: (e: Error) => toast.error('No se pudo cambiar el estado', { description: e.message }),
  });
}

/** Cuántos pagos tiene registrados (si tiene, no se permite eliminarlo). */
export async function countMemberPayments(userId: string): Promise<number> {
  const { count, error } = await supabase.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * ¿Ya existe otro socio con esta cédula o email? Devuelve el campo en conflicto
 * para mostrar un error claro en el formulario.
 */
export async function findDuplicateMember(
  fields: { cedula?: string; email?: string },
  excludeId?: string,
): Promise<{ field: 'cedula' | 'email'; name: string } | null> {
  for (const field of ['cedula', 'email'] as const) {
    const value = fields[field]?.trim();
    if (!value) continue;
    const escaped = value.replace(/[%_\\]/g, (c) => `\\${c}`);
    let q = supabase.from('users').select('id, name').ilike(field, escaped).limit(1);
    if (excludeId) q = q.neq('id', excludeId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (data?.[0]) return { field, name: data[0].name };
  }
  return null;
}
