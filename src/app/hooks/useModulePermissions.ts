/**
 * React Query hooks para Permisos de Módulos
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modulePermissions } from '../lib/api';
import { toast } from 'sonner';
import type { ModulePermission, RoleModulePermissionInput, PermissionAction } from '../types';

// Keys para el caché
export const modulePermissionKeys = {
  all: ['modulePermissions'] as const,
  myPermissions: ['modulePermissions', 'my'] as const,
  byRole: (role: string) => ['modulePermissions', role] as const,
};

/**
 * Hook para obtener los permisos del usuario actual
 */
export function useMyModulePermissions() {
  return useQuery({
    queryKey: modulePermissionKeys.myPermissions,
    queryFn: modulePermissions.getMyPermissions,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para obtener todos los permisos (solo super admin)
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
      queryClient.invalidateQueries({ queryKey: modulePermissionKeys.myPermissions });
      toast.success('Permiso guardado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error guardando permiso:', error);
      toast.error('Error al guardar permiso', {
        description: error.message
      });
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
      queryClient.invalidateQueries({ queryKey: modulePermissionKeys.myPermissions });
      toast.success('Permiso eliminado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error eliminando permiso:', error);
      toast.error('Error al eliminar permiso', {
        description: error.message
      });
    },
  });
}

/**
 * Hook principal para verificar permisos en componentes
 * Usa los permisos cacheados del usuario actual
 */
export function useModulePermissions() {
  const { data: permissions, isLoading, error, refetch } = useMyModulePermissions();
  
  // Mapa de acceso rápido: module_path -> ModulePermission
  const permissionMap = new Map<string, ModulePermission>();
  if (permissions) {
    for (const p of permissions) {
      // Solo mantener el más específico (con gym_id) o el global si no hay específico
      const existing = permissionMap.get(p.module_path);
      if (!existing || (p.gym_id && !existing.gym_id)) {
        permissionMap.set(p.module_path, p);
      }
    }
  }

  /**
   * Verifica si el usuario actual tiene permiso para un módulo y acción
   * Busca match exacto primero, luego busca el path padre más específico
   */
  const canAccess = (modulePath: string, action: PermissionAction = 'view'): boolean => {
    // 1. Buscar match exacto
    let perm = permissionMap.get(modulePath);
    if (perm) {
      switch (action) {
        case 'view': return perm.can_view;
        case 'create': return perm.can_create;
        case 'edit': return perm.can_edit;
        case 'delete': return perm.can_delete;
        default: return false;
      }
    }
    
    // 2. Buscar path padre más específico (para rutas dinámicas como /usuarios/:id)
    // Ej: /usuarios/123 -> busca /usuarios
    const pathParts = modulePath.split('/').filter(Boolean);
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = '/' + pathParts.slice(0, i).join('/');
      perm = permissionMap.get(parentPath);
      if (perm) {
        switch (action) {
          case 'view': return perm.can_view;
          case 'create': return perm.can_create;
          case 'edit': return perm.can_edit;
          case 'delete': return perm.can_delete;
          default: return false;
        }
      }
    }
    
    return false;
  };

  /**
   * Obtiene el objeto de permiso completo para un módulo
   */
  const getPermission = (modulePath: string): ModulePermission | undefined => {
    return permissionMap.get(modulePath);
  };

  /**
   * Obtiene todos los módulos a los que el usuario tiene acceso (can_view = true)
   */
  const getAccessibleModules = (): ModulePermission[] => {
    return Array.from(permissionMap.values()).filter(p => p.can_view);
  };

  /**
   * Verifica si el usuario puede ver un módulo en el sidebar/navegación
   */
  const canViewModule = (modulePath: string): boolean => {
    return canAccess(modulePath, 'view');
  };

  return {
    permissions: permissions || [],
    permissionMap,
    isLoading,
    error,
    refetch,
    canAccess,
    getPermission,
    getAccessibleModules,
    canViewModule,
  };
}