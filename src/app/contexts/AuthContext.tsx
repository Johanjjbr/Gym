import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import api from '../lib/api';
import type { UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface AuthUser {
  /** id en `staff` (personal) o en `users` (socios). */
  id: string;
  /** id en auth.users: identifica la sesión. */
  authUserId: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  shift: string;
  status: string;
  memberNumber?: string;
  gym_id?: string | null;
  is_super_admin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Carga el perfil (personal o socio) de una sesión de Supabase.
 * El rol sale de las tablas `staff` / `users`, NO de user_metadata: el usuario
 * puede modificar su propio metadata desde el navegador.
 */
async function loadProfile(session: Session): Promise<AuthUser | null> {
  const authUserId = session.user.id;

  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, email, role, phone, shift, status, gym_id, is_super_admin')
    .eq('auth_user_id', authUserId)
    .eq('status', 'Activo')
    .maybeSingle();

  if (staff) {
    return {
      id: staff.id,
      authUserId,
      name: staff.name,
      email: staff.email,
      role: staff.role as UserRole,
      phone: staff.phone || '',
      shift: staff.shift || '',
      status: staff.status,
      gym_id: staff.gym_id,
      is_super_admin: staff.is_super_admin === true,
    };
  }

  const { data: member } = await supabase
    .from('users')
    .select('id, name, email, phone, member_number, status, gym_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (member) {
    return {
      id: member.id,
      authUserId,
      name: member.name,
      email: member.email,
      role: 'Usuario',
      phone: member.phone || '',
      shift: '',
      status: member.status || 'Activo',
      memberNumber: member.member_number,
      gym_id: member.gym_id,
      is_super_admin: false,
    };
  }

  return null;
}

function persist(user: AuthUser | null, session: Session | null) {
  if (user && session) {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('access_token', session.access_token);
  } else {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentAuthId = useRef<string | null>(null);

  const applySession = useCallback(
    async (session: Session | null) => {
      if (!session) {
        currentAuthId.current = null;
        persist(null, null);
        setUser(null);
        return null;
      }
      const profile = await loadProfile(session);
      // Si cambió de cuenta, nada de lo cacheado (permisos, datos) es válido
      if (currentAuthId.current && currentAuthId.current !== session.user.id) {
        queryClient.clear();
      }
      currentAuthId.current = profile ? session.user.id : null;
      persist(profile, profile ? session : null);
      setUser(profile);
      return profile;
    },
    [queryClient],
  );

  useEffect(() => {
    let cancelled = false;

    // La única fuente de verdad es la sesión de Supabase (ya no se confía en
    // un 'user' guardado en localStorage sin sesión válida).
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => (cancelled ? null : applySession(session)))
      .catch((error) => {
        console.warn('Error al verificar sesión:', error?.message);
        if (!cancelled) {
          persist(null, null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        currentAuthId.current = null;
        persist(null, null);
        setUser(null);
        queryClient.clear();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Mantener sincronizado el token que usan algunos hooks
        localStorage.setItem('access_token', session.access_token);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [applySession, queryClient]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    let session = data?.session ?? null;

    if (error || !session) {
      // Respaldo: login a través de la edge function (cuentas antiguas de personal)
      try {
        await api.auth.login(email, password);
        session = (await supabase.auth.getSession()).data.session;
      } catch (apiError: any) {
        throw new Error(error?.message || apiError?.message || 'Error al iniciar sesión');
      }
    }

    // Antes de mostrar la interfaz: descartar cualquier caché de una sesión anterior
    queryClient.clear();
    const profile = await applySession(session);
    if (!profile) {
      await supabase.auth.signOut();
      throw new Error('Tu cuenta no tiene un perfil activo de personal ni de socio.');
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      currentAuthId.current = null;
      persist(null, null);
      setUser(null);
      queryClient.clear();
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isSuperAdmin: user?.is_super_admin === true,
    login,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
