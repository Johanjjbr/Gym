import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('administrador' | 'entrenador' | 'usuario')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  // Mostrar loader mientras carga
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Redirigir a login si no está autenticado
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  // Verificar roles permitidos
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <span className="text-4xl">🚫</span>
          </div>
          <h2 className="text-2xl">Acceso Denegado</h2>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a esta sección.
          </p>
          <p className="text-sm text-muted-foreground">
            Tu rol actual: <span className="text-primary">{profile.role}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
