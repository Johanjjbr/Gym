import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import type { UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  shift: string;
  status: string;
  memberNumber?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar sesión al cargar
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // Primero verificar si hay sesión de Supabase Auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session && !sessionError) {
        // Hay sesión de Supabase Auth
        const userRole = session.user.user_metadata?.role;
        
        if (userRole === 'Usuario') {
          // Usuario regular
          const { data: regularUser, error: userError } = await supabase
            .from('users')
            .select('id, name, email, phone, member_number, status')
            .eq('auth_user_id', session.user.id)
            .single();

          if (regularUser && !userError) {
            const userData = {
              id: regularUser.id,
              name: regularUser.name,
              email: regularUser.email,
              phone: regularUser.phone || '',
              role: 'Usuario' as UserRole,
              shift: '',
              status: regularUser.status || 'Activo',
              memberNumber: regularUser.member_number,
            };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('access_token', session.access_token);
            setIsLoading(false);
            return;
          }
        } else {
          // Staff con sesión de Supabase
          const { data: staffUser, error: staffError } = await supabase
            .from('staff')
            .select('*')
            .eq('email', session.user.email)
            .single();

          if (staffUser && !staffError) {
            setUser(staffUser);
            localStorage.setItem('user', JSON.stringify(staffUser));
            localStorage.setItem('access_token', session.access_token);
            setIsLoading(false);
            return;
          }
        }
      }

      // Si no hay sesión de Supabase, verificar localStorage para staff
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('access_token');
      
      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Solo para staff, verificar la sesión con la API
          if (parsedUser.role !== 'Usuario') {
            setUser(parsedUser);
            setIsLoading(false);
            return;
          }
        } catch (parseError) {
          // Error al parsear, limpiar localStorage
          console.warn('Error al parsear usuario almacenado');
        }
      }

      // No hay sesión válida, limpiar todo
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setUser(null);
    } catch (error: any) {
      console.warn('Error al verificar sesión:', error.message);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Primero intentar login con Supabase Auth (para usuarios regulares)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!authError && authData.session) {
        // Login exitoso con Supabase Auth
        localStorage.setItem('access_token', authData.session.access_token);
        
        // Determinar el tipo de usuario
        const userRole = authData.user.user_metadata?.role;
        
        if (userRole === 'Usuario') {
          // Obtener datos del usuario regular
          const { data: regularUser } = await supabase
            .from('users')
            .select('id, name, email, phone, member_number, status')
            .eq('auth_user_id', authData.user.id)
            .single();

          if (regularUser) {
            const userData = {
              id: regularUser.id,
              name: regularUser.name,
              email: regularUser.email,
              phone: regularUser.phone || '',
              role: 'Usuario' as UserRole,
              shift: '',
              status: regularUser.status || 'Activo',
              memberNumber: regularUser.member_number,
            };
            
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            return;
          }
        }
      }

      // Si falla o no es usuario regular, intentar con la API (staff)
      try {
        const response = await api.auth.login(email, password);
        const userData = response.staff;
        setUser(userData);
      } catch (apiError: any) {
        // Si ambos métodos fallan, lanzar error
        throw new Error(authError?.message || apiError.message || 'Error al iniciar sesión');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  };

  const logout = async () => {
    try {
      // Cerrar sesión en Supabase Auth (para usuarios regulares)
      await supabase.auth.signOut();
      
      // Intentar cerrar sesión en la API (para staff)
      try {
        await api.auth.logout();
      } catch (apiError) {
        // Si falla la API, no importa, ya limpiamos Supabase
        console.warn('No se pudo cerrar sesión en la API, pero continuando...');
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
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