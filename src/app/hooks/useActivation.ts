import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/**
 * Hook para verificar si un token de activación es válido
 */
export function useVerifyActivationToken(token: string) {
  return useQuery({
    queryKey: ['activation-token', token],
    queryFn: async () => {
      if (!token) {
        throw new Error('Token no proporcionado');
      }

      // Buscar el usuario con este token de activación
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, is_activated, activation_token')
        .eq('activation_token', token)
        .maybeSingle();

      if (error) {
        console.error('Error verificando token:', error);
        throw new Error('Error al verificar el token de activación');
      }

      if (!data) {
        throw new Error('Token de activación inválido');
      }

      if (data.is_activated) {
        throw new Error('Esta cuenta ya ha sido activada');
      }

      return {
        userId: data.id,
        userName: data.name,
        userEmail: data.email,
      };
    },
    enabled: !!token,
    retry: false,
  });
}

/**
 * Hook para activar una cuenta de usuario
 */
export function useActivateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      // 1. Verificar que el token existe y obtener el usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, name, is_activated')
        .eq('activation_token', token)
        .maybeSingle();

      if (userError || !userData) {
        throw new Error('Token de activación inválido');
      }

      if (userData.is_activated) {
        throw new Error('Esta cuenta ya ha sido activada');
      }

      // 2. Crear la cuenta de autenticación en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: password,
        options: {
          data: {
            name: userData.name,
            user_id: userData.id,
            role: 'Usuario',
          },
        },
      });

      if (authError) {
        console.error('Error creando cuenta de autenticación:', authError);
        throw new Error('Error al crear la cuenta: ' + authError.message);
      }

      // 3. Actualizar el usuario en la tabla users
      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_activated: true,
          activation_token: null, // Limpiar el token después de usarlo
          auth_user_id: authData.user?.id, // Guardar referencia al user de Auth
          updated_at: new Date().toISOString(),
        })
        .eq('id', userData.id);

      if (updateError) {
        console.error('Error actualizando usuario:', updateError);
        throw new Error('Error al activar la cuenta');
      }

      return {
        userId: userData.id,
        authUserId: authData.user?.id,
      };
    },
    onSuccess: () => {
      toast.success('¡Cuenta activada exitosamente!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al activar la cuenta');
    },
  });
}

/**
 * Hook para generar un token de activación para un usuario
 */
export function useGenerateActivationToken() {
  return useMutation({
    mutationFn: async (userId: string) => {
      // Generar token único
      const token = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

      // Actualizar el usuario con el token
      const { data, error } = await supabase
        .from('users')
        .update({
          activation_token: token,
          is_activated: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error('Error al generar token de activación');
      }

      return {
        token,
        userId: data.id,
        userName: data.name,
        userEmail: data.email,
      };
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al generar token de activación');
    },
  });
}
