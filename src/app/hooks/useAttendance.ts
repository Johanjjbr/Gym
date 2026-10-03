/**
 * React Query hooks para Asistencia
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendance } from '../lib/api';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import type { AttendanceRecord } from '../lib/attendanceStats';
import { localTime, type DayRecord } from '../lib/attendanceDay';
import { addDays, toDateOnly } from '../lib/dashboardHelpers';
import type { AttendanceFormData, CheckinFormData } from '../lib/validations';
import { getBranchScope, scopeToBranch } from './useOrgContext';

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
/**
 * Asistencia de UN socio leída directamente de Supabase (filtrada en la base).
 * useUserAttendance descargaba la asistencia de todo el gimnasio y filtraba en el navegador.
 */
export function useMemberAttendance(userId: string | undefined, sinceDays = 400) {
  return useQuery({
    queryKey: [...attendanceKeys.byUser(userId ?? ''), 'direct', sinceDays],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - sinceDays);
      const pad = (n: number) => String(n).padStart(2, '0');
      const sinceStr = `${since.getFullYear()}-${pad(since.getMonth() + 1)}-${pad(since.getDate())}`;
      const { data, error } = await supabase
        .from('attendance')
        .select('id, date, time, type, source')
        .eq('user_id', userId!)
        .gte('date', sinceStr)
        .order('date', { ascending: false })
        .order('time', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AttendanceRecord[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
}

/**
 * Registros de UN día (con nombre del socio), leídos directo de Supabase.
 * Reemplaza la descarga de toda la tabla + N llamadas de estado por socio.
 */
export function useAttendanceDay(date: string) {
  return useQuery({
    queryKey: ['attendance', 'day', date, getBranchScope()],
    queryFn: async () => {
      const { data, error } = await scopeToBranch(supabase
        .from('attendance')
        .select('id, user_id, date, time, type, source, users(name, member_number)'))
        .eq('date', date)
        .order('time', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DayRecord[];
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true,
  });
}

/** Entradas de los últimos `days` días (sin hoy) para el promedio diario. */
export function useAttendanceTrend(today: string, days = 28) {
  return useQuery({
    queryKey: ['attendance', 'trend', today, days, getBranchScope()],
    queryFn: async () => {
      const { data, error } = await scopeToBranch(supabase
        .from('attendance')
        .select('user_id, date'))
        .eq('type', 'Entrada')
        .gte('date', addDays(today, -days))
        .lt('date', today);
      if (error) throw new Error(error.message);
      return (data ?? []) as { user_id: string; date: string }[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Registra Entrada o Salida con register_attendance_atomic (valida que el socio
 * esté Activo, que no tenga ya una entrada abierta, y evita dobles clics).
 * Fecha y hora se envían en hora local del gimnasio, no UTC.
 */
export function useRegisterAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, type, source = 'manual' }: { userId: string; type: 'Entrada' | 'Salida'; source?: string; name?: string }) => {
      const now = new Date();
      const { data, error } = await supabase.rpc('register_attendance_atomic', {
        p_user_id: userId,
        p_type: type,
        p_date: toDateOnly(now),
        p_time: localTime(now),
        p_source: source,
      });
      if (error) throw new Error(error.message);
      const res = data as { allowed: boolean; reason?: string };
      if (!res?.allowed) throw new Error(res?.reason || 'No se pudo registrar');
      return res;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['users', 'overview'] });
      toast.success(`${v.type} registrada`, { description: v.name });
    },
    onError: (e: Error) => toast.error('No se pudo registrar', { description: e.message }),
  });
}
