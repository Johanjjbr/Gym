/**
 * React Query hooks para Estadísticas
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery } from '@tanstack/react-query';
import { stats } from '../lib/api';

// Keys para el caché
export const statsKeys = {
  dashboard: ['stats', 'dashboard'] as const,
  revenueTrend: ['stats', 'revenue-trend'] as const,
  attendanceTrend: ['stats', 'attendance-trend'] as const,
  userStatusBreakdown: ['stats', 'user-status-breakdown'] as const,
};

/**
 * Hook para obtener estadísticas del dashboard
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: statsKeys.dashboard,
    queryFn: stats.getDashboard,
    staleTime: 1000 * 60 * 1, // 1 minuto (estadísticas deben estar actualizadas)
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 5, // Refrescar cada 5 minutos automáticamente
    enabled: !!localStorage.getItem('access_token'), // Solo ejecutar si hay token
    retry: false, // No reintentar si falla
  });
}

/**
 * Hook para obtener tendencia de ingresos últimos 6 meses
 */
export function useRevenueTrend() {
  return useQuery({
    queryKey: statsKeys.revenueTrend,
    queryFn: stats.getRevenueTrend,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
    enabled: !!localStorage.getItem('access_token'),
    retry: false,
  });
}

/**
 * Hook para obtener tendencia de asistencia últimos 7 días
 */
export function useAttendanceTrend() {
  return useQuery({
    queryKey: statsKeys.attendanceTrend,
    queryFn: stats.getAttendanceTrend,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
    enabled: !!localStorage.getItem('access_token'),
    retry: false,
  });
}

/**
 * Hook para obtener desglose de estados de usuarios
 */
export function useUserStatusBreakdown() {
  return useQuery({
    queryKey: statsKeys.userStatusBreakdown,
    queryFn: stats.getUserStatusBreakdown,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
    enabled: !!localStorage.getItem('access_token'),
    retry: false,
  });
}