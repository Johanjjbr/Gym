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
  byUser: (userId: string) => ['payments', 'user', userId] as const,
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
 * Hook para obtener pagos de un usuario específico
 */
export function useUserPayments(userId: string) {
  return useQuery({
    queryKey: paymentKeys.byUser(userId),
    queryFn: async () => {
      console.log('🔍 Fetching payments for user:', userId);
      const result = await payments.getByUser(userId);
      console.log('✅ Payments received for user:', userId, result);
      return result;
    },
    staleTime: 0, // No usar caché, siempre refetch
    gcTime: 0, // No guardar en caché (cacheTime es ahora gcTime en v5)
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!userId, // Solo ejecutar si hay userId
  });
}

/**
 * Hook para crear un pago
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PaymentFormData) => payments.create(data),
    onSuccess: (_, variables) => {
      // Invalidar todos los pagos
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      // Invalidar pagos específicos del usuario
      queryClient.invalidateQueries({ queryKey: paymentKeys.byUser(variables.user_id) });
      // También invalidar usuarios porque el estado de pago puede cambiar
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Pago registrado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error creando pago:', error);
      const message = error.message || 'Error al registrar pago';
      
      if (message.includes('fetch') || message.includes('Failed to fetch')) {
        toast.error('No se pudo conectar con Supabase', {
          description: 'Verifica que tu backend esté funcionando. Ve a /test-supabase para más detalles.'
        });
      } else {
        toast.error('Error al registrar pago', {
          description: message
        });
      }
    },
  });
}
