/**
 * React Query hooks para Usuarios
 * Proporciona caché automático y sincronización de datos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { users, staff } from '../lib/api';
import { supabase } from '../lib/supabase';
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
    enabled: !!localStorage.getItem('access_token'), // Solo ejecutar si hay token
    retry: false, // No reintentar si falla
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
    mutationFn: async (data: UserFormData) => {
      // Generar token de activación único
      const activationToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Crear el usuario directamente en Supabase con el token
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          ...data,
          activation_token: activationToken,
          is_activated: false,
          member_number: `GYM${Date.now().toString().slice(-6)}`, // Generar número de miembro
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Error al crear usuario');
      }

      return {
        user: newUser,
        activationToken,
      };
    },
    onSuccess: () => {
      // Invalidar caché para refrescar la lista
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      // No mostrar toast aquí, lo mostrará el modal de activación
    },
    onError: (error: Error) => {
      console.error('Error creando usuario:', error);
      const message = error.message || 'Error al crear usuario';
      
      if (message.includes('fetch') || message.includes('Failed to fetch')) {
        toast.error('No se pudo conectar con Supabase', {
          description: 'Verifica que tu backend esté funcionando. Ve a /test-supabase para más detalles.'
        });
      } else {
        toast.error('Error al crear usuario', {
          description: message
        });
      }
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
      console.error('Error actualizando usuario:', error);
      const message = error.message || 'Error al actualizar usuario';
      
      if (message.includes('fetch') || message.includes('Failed to fetch')) {
        toast.error('No se pudo conectar con Supabase', {
          description: 'Verifica que tu backend esté funcionando. Ve a /test-supabase para más detalles.'
        });
      } else {
        toast.error('Error al actualizar usuario', {
          description: message
        });
      }
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
      console.error('Error eliminando usuario:', error);
      const message = error.message || 'Error al eliminar usuario';
      
      if (message.includes('fetch') || message.includes('Failed to fetch')) {
        toast.error('No se pudo conectar con Supabase', {
          description: 'Verifica que tu backend esté funcionando. Ve a /test-supabase para más detalles.'
        });
      } else {
        toast.error('Error al eliminar usuario', {
          description: message
        });
      }
    },
  });
}

/**
 * Hook para asignar entrenador a un usuario
 */
export function useAssignTrainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, trainerId }: { userId: string; trainerId: string | null }) =>
      users.assignTrainer(userId, trainerId),
    onSuccess: (_, variables) => {
      console.log('🔄 Invalidando caché después de asignar entrenador para userId:', variables.userId);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      
      // Forzar refetch inmediato
      queryClient.refetchQueries({ queryKey: userKeys.detail(variables.userId) });
      
      // Mensaje diferente si se asigna o se remueve el entrenador
      const message = variables.trainerId 
        ? 'Entrenador asignado exitosamente' 
        : 'Cambiado a entrenamiento libre exitosamente';
      toast.success(message);
    },
    onError: (error: Error) => {
      console.error('Error asignando entrenador:', error);
      const message = error.message || 'Error al asignar entrenador';
      
      toast.error('Error al asignar entrenador', {
        description: message
      });
    },
  });
}

/**
 * Hook para obtener usuarios sin entrenador
 */
export function useUsersWithoutTrainer() {
  return useQuery({
    queryKey: ['users', 'without-trainer'],
    queryFn: users.getWithoutTrainer,
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para obtener entrenadores activos
 */
export function useTrainers() {
  return useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      console.log('🏋️ Consultando entrenadores...');
      const data = await staff.getTrainers();
      console.log('✅ Entrenadores recibidos:', data);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  });
}