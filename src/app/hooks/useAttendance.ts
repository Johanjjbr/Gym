/**
 * React Query hooks para Asistencia
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendance } from '../lib/api';
import { toast } from 'sonner';
import type { AttendanceFormData } from '../lib/validations';

// Keys para el caché
export const attendanceKeys = {
  all: (date?: string) => date ? ['attendance', date] as const : ['attendance'] as const,
};

/**
 * Hook para obtener asistencia
 */
export function useAttendance(date?: string) {
  return useQuery({
    queryKey: attendanceKeys.all(date),
    queryFn: () => attendance.getAll(date),
    staleTime: 1000 * 60 * 1, // 1 minuto (asistencias son datos en tiempo real)
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 2, // Refrescar cada 2 minutos
  });
}

/**
 * Hook para registrar asistencia
 */
export function useCreateAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AttendanceFormData) => attendance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Asistencia registrada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al registrar asistencia');
    },
  });
}
