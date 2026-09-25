import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  modulePath?: string; // Ruta del módulo para validar permisos dinámicos
}

export function ProtectedRoute({ children, allowedRoles, modulePath }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, user } = useAuth();
  const location = useLocation();
  const { canViewModule, isLoading: permissionsLoading, error: permissionsError } = useModulePermissions();

  // Usar modulePath prop o la ruta actual
  const pathToCheck = modulePath || location.pathname;

  // Mostrar loading mientras verifica la sesión o permisos
  // Si hay error en permisos, también mostramos loading y luego hacemos fallback
  if (isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si hay error cargando permisos dinámicos, usar fallback a allowedRoles
  if (permissionsError) {
    console.warn('[ProtectedRoute] Error cargando permisos dinámicos, usando fallback de roles:', permissionsError);
    
    // Si se especificaron roles permitidos, verificar con hasRole
    if (allowedRoles && !hasRole(allowedRoles)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="p-4 bg-[#ff3b5c]/10 rounded-full inline-block">
              <svg
                className="h-12 w-12 text-[#ff3b5c]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Acceso Denegado</h2>
            <p className="text-gray-400">
              No tienes permisos para acceder a esta sección.
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      );
    }
    
    // Si no hay allowedRoles o tiene el rol, permitir acceso
    return <>{children}</>;
  }

  // Verificar permisos por módulo (nueva lógica dinámica)
  // Solo verificar rutas que están en menuPathsToCheck (rutas reales de la app)
  const shouldCheckModulePermission = menuPathsToCheck.some(p => pathToCheck.startsWith(p));
  
  if (shouldCheckModulePermission && !canViewModule(pathToCheck)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="p-4 bg-[#ff3b5c]/10 rounded-full inline-block">
            <svg
              className="h-12 w-12 text-[#ff3b5c]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Acceso Denegado</h2>
          <p className="text-gray-400">
            No tienes permisos para acceder a esta sección.
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Fallback: verificación por roles (compatibilidad hacia atrás)
  // Solo se ejecuta si no se debe verificar por módulo O si el módulo no está en la lista
  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="p-4 bg-[#ff3b5c]/10 rounded-full inline-block">
            <svg
              className="h-12 w-12 text-[#ff3b5c]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Acceso Denegado</h2>
          <p className="text-gray-400">
            No tienes permisos para acceder a esta sección.
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Rutas reales de la aplicación que deben validarse con permisos dinámicos
// Basado en routes.ts actual
const menuPathsToCheck = [
  // Rutas staff (Layout principal)
  '/',
  '/usuarios',
  '/facturacion',
  '/personal',
  '/asistencia',
  '/rutinas',
  '/rutinas/crear',
  '/rutinas/:id/editar',
  '/mi-entrenamiento',
  '/reportes',
  '/admin/permisos',
  // Rutas usuario (UserLayout)
  '/usuario/mi-entrenamiento',
  '/usuario/rutinas',
  '/usuario/rutinas/crear',
  '/usuario/mi-perfil',
  '/usuario/progreso',
  '/usuario/asistencia',
  '/usuario/pagos',
  '/usuario/valorar-gimnasio',
  '/usuario/diagnostico-rutina',
  '/usuario/migrar-rutinas',
  '/usuario/debug-asignaciones',
];