import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import type { UserRole } from '../types';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  shift: string;
  status: string;
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
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Intentar obtener la sesión
      try {
        const { staff } = await api.auth.getSession();
        
        // Si no hay staff, limpiar la sesión
        if (!staff) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        setUser(staff);
      } catch (sessionError: any) {
        // Si la API falla, intentar usar el usuario guardado en localStorage
        const savedUser = localStorage.getItem('user');
        
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            // Si no se puede parsear, limpiar
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            setUser(null);
          }
        } else {
          // No hay usuario guardado, limpiar
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    } catch (error: any) {
      console.warn('Error al verificar sesión, limpiando datos locales');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.auth.login(email, password);
      setUser(response.staff);
    } catch (error: any) {
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
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