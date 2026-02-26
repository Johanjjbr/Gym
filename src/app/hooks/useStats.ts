/**
 * React Query hooks para Estadísticas
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery } from '@tanstack/react-query';
import { stats } from '../lib/api';

// Keys para el caché
export const statsKeys = {
  dashboard: ['stats', 'dashboard'] as const,
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
  });
}
