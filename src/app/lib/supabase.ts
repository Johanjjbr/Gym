/**
 * Cliente de Supabase configurado con refresh tokens automáticos
 */

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// Cliente de Supabase con configuración de auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistir sesión en localStorage
    persistSession: true,
    // Auto refresh de tokens
    autoRefreshToken: true,
    // Detectar cambios de sesión
    detectSessionInUrl: true,
    // Storage para tokens
    storage: window.localStorage,
    // Flow de auth
    flowType: 'pkce',
  },
});

// Helper para obtener el token actual
export const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

// Helper para verificar si está autenticado
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Helper para obtener el usuario actual
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Interceptor para manejar errores de autenticación
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Limpiar cualquier dato en caché
    localStorage.removeItem('user');
  }
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('✅ Token refrescado automáticamente');
  }
  
  if (event === 'SIGNED_IN' && session) {
    console.log('✅ Usuario autenticado');
  }
});

export default supabase;
