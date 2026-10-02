/**
 * Estado de cuenta de un socio, calculado igual en la cabecera del perfil y en
 * la pestaña Pagos: deuda vencida, próximo vencimiento, último pago y el texto
 * del aviso para WhatsApp.
 */
import { useMemo } from 'react';
import { useBillingMember } from './useInvoices';
import { useGymInfo } from '../components/billing/shared';
import {
  membersWithDebt, nextDueFor, overdueReminderText, REMINDER_DAYS, upcomingReminderText, type InvoiceRow,
} from '../lib/billing';
import { daysBetween, formatMoney, toDateOnly } from '../lib/dashboardHelpers';

export type AccountState = 'loading' | 'exempt' | 'no-plan' | 'overdue' | 'due-soon' | 'ok';

export function useMemberAccount(userId: string | undefined, invoices: InvoiceRow[]) {
  const today = toDateOnly(new Date());
  const { data: member, isLoading } = useBillingMember(userId);
  const gym = useGymInfo();

  return useMemo(() => {
    const debt = membersWithDebt(invoices, today)[0];
    const lastPaid = invoices
      .filter((i) => i.status === 'Pagada' && i.paid_at)
      .sort((a, b) => (a.paid_at! < b.paid_at! ? 1 : -1))[0];
    const next = member ? nextDueFor(member, invoices, today) : null;
    const daysLeft = next ? daysBetween(today, next.due) : null;
    const overdue = !!debt && debt.overdueTotal > 0;
    const plan = member?.plans ?? null;
    const exempt = member?.is_free_user === true;

    const state: AccountState = !member
      ? 'loading'
      : exempt
        ? 'exempt'
        : overdue
          ? 'overdue'
          : daysLeft !== null && daysLeft >= 0 && daysLeft <= REMINDER_DAYS
            ? 'due-soon'
            : !plan
              ? 'no-plan'
              : 'ok';

    const notice =
      member && state === 'overdue'
        ? overdueReminderText(member.name, debt!, gym.name, formatMoney)
        : member && state === 'due-soon' && next
          ? upcomingReminderText(member.name, next, gym.name, formatMoney)
          : null;

    const cannotCollect = exempt ? 'Socio exento de pago' : member && !plan ? 'Sin plan asignado' : null;

    return { member, isLoading, today, state, debt, lastPaid, next, daysLeft, plan, exempt, notice, cannotCollect };
  }, [member, isLoading, invoices, today, gym.name]);
}

export type MemberAccount = ReturnType<typeof useMemberAccount>;
