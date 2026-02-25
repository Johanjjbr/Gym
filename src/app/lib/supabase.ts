import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// Configurar cliente de Supabase
export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// Tipos para el perfil de usuario
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'administrador' | 'entrenador' | 'usuario';
  member_number?: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  birth_date?: string;
  gender?: 'Masculino' | 'Femenino' | 'Otro';
  height?: number;
  membership_type?: 'Básica' | 'Premium' | 'VIP';
  membership_status?: 'Activo' | 'Inactivo' | 'Moroso';
  join_date?: string;
  avatar_url?: string;
  assigned_trainer_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper para obtener el perfil del usuario actual
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

// Helper para verificar el rol del usuario
export async function checkUserRole(): Promise<'administrador' | 'entrenador' | 'usuario' | null> {
  const profile = await getCurrentUserProfile();
  return profile?.role || null;
}

// Helper para login
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Helper para signup
export async function signUp(email: string, password: string, full_name: string, role: 'administrador' | 'entrenador' | 'usuario' = 'usuario') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role,
      },
    },
  });

  if (error) throw error;
  return data;
}

// Helper para logout
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Helper para obtener la sesión actual
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}