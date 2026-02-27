/**
 * React Query hooks para Personal (Staff)
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staff } from '../lib/api';
import { toast } from 'sonner';

// Keys para el caché
export const staffKeys = {
  all: ['staff'] as const,
};

/**
 * Hook para obtener todo el personal
 */
export function useStaff() {
  return useQuery({
    queryKey: staffKeys.all,
    queryFn: staff.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para actualizar un miembro del personal
 */
export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => staff.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Personal actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error actualizando personal:', error);
      const message = error.message || 'Error al actualizar personal';
      
      if (message.includes('fetch') || message.includes('Failed to fetch')) {
        toast.error('No se pudo conectar con Supabase', {
          description: 'Verifica que tu backend esté funcionando.'
        });
      } else {
        toast.error('Error al actualizar personal', {
          description: message
        });
      }
    },
  });
}