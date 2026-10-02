import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useModulePermissions } from '../hooks/useModulePermissions';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Roles que pueden entrar a este layout (personal vs. socios). */
  allowedRoles?: UserRole[];
  /** Ruta del módulo a validar; por defecto, la ruta actual. */
  modulePath?: string;
  /** false = validar solo sesión y rol (el módulo lo valida <ModuleGuard> dentro del layout). */
  checkModule?: boolean;
}

/**
 * Orden de las comprobaciones:
 *  1. sesión  -> si no hay, a /login
 *  2. rol     -> un socio no entra al panel de personal (y viceversa)
 *  3. módulo  -> tabla role_module_permissions (el super admin pasa siempre)
 * Si los permisos no se pudieron cargar, se usa solo el rol (paso 2).
 */
export function ProtectedRoute({ children, allowedRoles, modulePath, checkModule = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, user } = useAuth();
  const location = useLocation();
  const { canViewModule, isLoading: permissionsLoading, error: permissionsError } = useModulePermissions();

  if (isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    // Está logueado pero en el área equivocada: llevarlo a la suya
    return <Navigate to={user?.role === 'Usuario' ? '/usuario/mi-entrenamiento' : '/'} replace />;
  }

  if (!checkModule) return <>{children}</>;

  if (permissionsError) {
    console.warn('[ProtectedRoute] No se pudieron cargar los permisos; se usa solo el rol.', permissionsError);
    return <>{children}</>;
  }

  if (!canViewModule(modulePath || location.pathname)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

/**
 * Valida el permiso del módulo de la ruta actual DENTRO del layout, para que el
 * menú lateral siga visible si una sección está denegada.
 */
export function ModuleGuard({ children, fallbackPaths = [] }: { children: ReactNode; fallbackPaths?: string[] }) {
  const location = useLocation();
  const { canViewModule, error } = useModulePermissions();

  if (error) return <>{children}</>;
  if (canViewModule(location.pathname)) return <>{children}</>;

  // Si el inicio no está permitido para el rol, ir a la primera sección que sí lo esté
  if (location.pathname === '/') {
    const first = fallbackPaths.find((p) => p !== '/' && canViewModule(p));
    if (first) return <Navigate to={first} replace />;
  }
  return <AccessDenied />;
}

function AccessDenied() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const home = user?.role === 'Usuario' ? '/usuario/mi-entrenamiento' : '/';
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="p-4 bg-[#ff3b5c]/10 rounded-full inline-block">
          <ShieldAlert className="h-12 w-12 text-[#ff3b5c]" aria-hidden />
        </div>
        <h2 className="text-2xl font-bold">Acceso denegado</h2>
        <p className="text-muted-foreground">
          Tu rol ({user?.role}) no tiene permiso para ver esta sección. Si crees que es un error, pide a un administrador que lo
          revise en Admin Permisos.
        </p>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            Volver
          </button>
          <button
            onClick={() => navigate(home)}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-lg transition-colors"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
