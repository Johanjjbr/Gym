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
  detail: (id: string) => ['staff', id] as const,
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
 * Hook para obtener un miembro del personal por ID
 */
export function useStaffById(id: string) {
  return useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: () => staff.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para crear un nuevo empleado
 */
export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: staff.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Empleado creado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error creando empleado:', error);
      const message = error.message || 'Error al crear empleado';
      
      if (message.includes('fetch') || message.includes('Failed to fetch')) {
        toast.error('No se pudo conectar con Supabase', {
          description: 'Verifica que tu backend esté funcionando.'
        });
      } else {
        toast.error('Error al crear empleado', {
          description: message
        });
      }
    },
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

/**
 * Hook para eliminar un empleado
 */
export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: staff.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Empleado eliminado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error eliminando empleado:', error);
      const message = error.message || 'Error al eliminar empleado';
      
      if (message.includes('fetch') || message.includes('Failed to fetch')) {
        toast.error('No se pudo conectar con Supabase', {
          description: 'Verifica que tu backend esté funcionando.'
        });
      } else {
        toast.error('Error al eliminar empleado', {
          description: message
        });
      }
    },
  });
}