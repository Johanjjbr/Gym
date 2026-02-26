/**
 * React Query hooks para Pagos
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payments } from '../lib/api';
import { toast } from 'sonner';
import type { PaymentFormData } from '../lib/validations';

// Keys para el caché
export const paymentKeys = {
  all: ['payments'] as const,
};

/**
 * Hook para obtener todos los pagos
 */
export function usePayments() {
  return useQuery({
    queryKey: paymentKeys.all,
    queryFn: payments.getAll,
    staleTime: 1000 * 60 * 2, // 2 minutos (pagos cambian frecuentemente)
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para crear un pago
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PaymentFormData) => payments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      // También invalidar usuarios porque el estado de pago puede cambiar
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Pago registrado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al registrar pago');
    },
  });
}
