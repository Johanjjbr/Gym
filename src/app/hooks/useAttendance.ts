/**
 * React Query hooks para Asistencia
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendance } from '../lib/api';
import { toast } from 'sonner';
import type { AttendanceFormData, CheckinFormData } from '../lib/validations';

// Keys para el caché
export const attendanceKeys = {
  all: (date?: string) => date ? ['attendance', date] as const : ['attendance'] as const,
  byUser: (userId: string) => ['attendance', 'user', userId] as const,
  status: (userId: string, date?: string) => ['attendance', 'status', userId, date] as const,
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
 * Hook para obtener asistencia de un usuario específico
 */
export function useUserAttendance(userId: string) {
  return useQuery({
    queryKey: attendanceKeys.byUser(userId),
    queryFn: async () => {
      const allAttendance = await attendance.getAll();
      return allAttendance.filter((a: any) => a.user_id === userId);
    },
    staleTime: 1000 * 60 * 1,
    enabled: !!userId, // Solo ejecutar si hay userId
  });
}

/**
 * Hook para obtener estado de asistencia de un usuario (dentro/fuera, última entrada, etc.)
 */
export function useAttendanceStatus(userId: string, date?: string) {
  return useQuery({
    queryKey: attendanceKeys.status(userId, date),
    queryFn: () => attendance.getStatus(userId, date),
    staleTime: 1000 * 30, // 30 segundos
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60, // Refrescar cada minuto
    enabled: !!userId,
  });
}

/**
 * Hook para registrar asistencia (manual - staff)
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

/**
 * Hook para check-in genérico (QR, huella, NFC, manual)
 * Incluye validación server-side de reglas de negocio
 */
export function useCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CheckinFormData) => attendance.checkin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Check-in registrado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al registrar check-in');
    },
  });
}