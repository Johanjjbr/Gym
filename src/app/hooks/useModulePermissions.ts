/**
 * React Query hooks para Permisos de Módulos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modulePermissions } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { buildPermissionMap, canAccessPath, findPermission } from '../lib/permissions';
import type { ModulePermission, RoleModulePermissionInput, PermissionAction } from '../types';

// Keys para el caché
export const modulePermissionKeys = {
  all: ['modulePermissions'] as const,
  myPermissions: ['modulePermissions', 'my'] as const,
  /** Los permisos propios van ligados a la cuenta: otra cuenta = otra entrada de caché. */
  mine: (authUserId: string | undefined) => ['modulePermissions', 'my', authUserId ?? 'anon'] as const,
  byRole: (role: string) => ['modulePermissions', role] as const,
};

/**
 * Permisos del usuario actual. Solo se consultan con sesión iniciada: antes,
 * si se pedían sin sesión (p. ej. al abrir la app con la sesión vencida) se
 * guardaba una lista vacía y, al iniciar sesión, se seguía usando esa lista
 * vacía durante 5 minutos -> "Acceso denegado" hasta recargar.
 */
export function useMyModulePermissions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: modulePermissionKeys.mine(user?.authUserId),
    queryFn: () => modulePermissions.getMyPermissions() as Promise<ModulePermission[]>,
    enabled: !!user?.authUserId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para obtener todos los permisos (pantalla Admin Permisos)
 */
export function useAllModulePermissions() {
  return useQuery({
    queryKey: modulePermissionKeys.all,
    queryFn: modulePermissions.getAll,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para crear/actualizar permiso
 */
export function useUpsertModulePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permission: RoleModulePermissionInput) => modulePermissions.upsert(permission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modulePermissionKeys.all });
    },
    onError: (error: Error) => {
      console.error('Error guardando permiso:', error);
      toast.error('Error al guardar permiso', { description: error.message });
    },
  });
}

/**
 * Hook para eliminar permiso
 */
export function useDeleteModulePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => modulePermissions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modulePermissionKeys.all });
      toast.success('Permiso eliminado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error eliminando permiso:', error);
      toast.error('Error al eliminar permiso', { description: error.message });
    },
  });
}

/**
 * Hook principal para verificar permisos en componentes.
 */
export function useModulePermissions() {
  const { user, isSuperAdmin } = useAuth();
  const { data: permissions, isPending, isFetching, error, refetch } = useMyModulePermissions();

  const permissionMap = buildPermissionMap(permissions ?? [], user?.role);
  // "Cargando" = hay sesión y todavía no hay respuesta (ni datos ni error)
  const isLoading = !!user && !isSuperAdmin && isPending && !error;

  const canAccess = (modulePath: string, action: PermissionAction = 'view'): boolean =>
    canAccessPath(permissionMap, modulePath, action, isSuperAdmin);

  const getPermission = (modulePath: string): ModulePermission | undefined => findPermission(permissionMap, modulePath);

  const getAccessibleModules = (): ModulePermission[] =>
    Array.from(permissionMap.values()).filter((p) => isSuperAdmin || p.can_view);

  const canViewModule = (modulePath: string): boolean => canAccess(modulePath, 'view');

  return {
    permissions: permissions || [],
    permissionMap,
    isLoading,
    isFetching,
    error,
    refetch,
    canAccess,
    getPermission,
    getAccessibleModules,
    canViewModule,
  };
}
