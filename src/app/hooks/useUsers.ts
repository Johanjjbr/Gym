/**
 * React Query hooks para Usuarios
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { users } from '../lib/api';
import { toast } from 'sonner';
import type { UserFormData } from '../lib/validations';

// Keys para el caché
export const userKeys = {
  all: ['users'] as const,
  detail: (id: string) => ['users', id] as const,
};

/**
 * Hook para obtener todos los usuarios
 */
export function useUsers() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: users.getAll,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para obtener un usuario por ID
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => users.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para crear un usuario
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserFormData) => users.create(data),
    onSuccess: () => {
      // Invalidar caché para refrescar la lista
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Usuario creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear usuario');
    },
  });
}

/**
 * Hook para actualizar un usuario
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) =>
      users.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidar caché del usuario específico y la lista
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Usuario actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar usuario');
    },
  });
}

/**
 * Hook para eliminar un usuario
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success('Usuario eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar usuario');
    },
  });
}
