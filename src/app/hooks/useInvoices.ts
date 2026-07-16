import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoices } from '../lib/api';
import { toast } from 'sonner';

export const invoiceKeys = {
  all: ['invoices'] as const,
  byUser: (userId: string) => ['invoices', 'user', userId] as const,
};

export function useInvoices(params?: { user_id?: string; status?: string }) {
  return useQuery({
    queryKey: [...invoiceKeys.all, params],
    queryFn: () => invoices.getAll(params),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
    enabled: !!localStorage.getItem('access_token'),
  });
}

export function useUserInvoices(userId: string) {
  return useQuery({
    queryKey: invoiceKeys.byUser(userId),
    queryFn: () => invoices.getByUser(userId),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    enabled: !!userId,
  });
}

export function usePayInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { method: string; reference?: string; notes?: string } }) =>
      invoices.pay(id, data),
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
