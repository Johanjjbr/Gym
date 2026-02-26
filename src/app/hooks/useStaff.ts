/**
 * React Query hooks para Staff (Personal)
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staff } from '../lib/api';
import { toast } from 'sonner';
import type { StaffUpdateFormData } from '../lib/validations';

// Keys para el caché
export const staffKeys = {
  all: ['staff'] as const,
};

/**
 * Hook para obtener todo el staff
 */
export function useStaff() {
  return useQuery({
    queryKey: staffKeys.all,
    queryFn: staff.getAll,
    staleTime: 1000 * 60 * 10, // 10 minutos (staff no cambia frecuentemente)
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook para actualizar staff
 */
export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StaffUpdateFormData }) =>
      staff.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Personal actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar personal');
    },
  });
}
