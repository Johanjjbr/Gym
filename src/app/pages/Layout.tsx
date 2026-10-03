import { Navigate, Outlet, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import { Sidebar, menuItems } from '../components/Sidebar';
import { Toaster } from '../components/ui/sonner';
import { ModuleGuard, ProtectedRoute } from '../components/ProtectedRoute';
import { AppBanners } from '../components/layout/AppBanners';
import { useOrgContext } from '../hooks/useOrgContext';
import { isPlatformHome, PLATFORM_PATHS } from '../lib/orgContext';

const STAFF_PATHS = menuItems.map((m) => m.path);

/** Espera a saber empresa y sede antes de cargar datos (así se filtran bien desde el inicio). */
function OrgGate({ children }: { children: React.ReactNode }) {
  const { data: ctx, isLoading } = useOrgContext();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
      </div>
    );
  }
  // La empresa proveedora no es un gimnasio: va directo al panel de plataforma
  if (isPlatformHome(ctx) && !PLATFORM_PATHS.some((p) => location.pathname.startsWith(p))) {
    return <Navigate to="/plataforma" replace />;
  }
  return <>{children}</>;
}

export function Layout() {
  return (
    <ProtectedRoute allowedRoles={['Dueño', 'Administrador', 'Entrenador', 'Recepción']} checkModule={false}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 p-8">
          <OrgGate>
            <AppBanners />
            <ModuleGuard fallbackPaths={STAFF_PATHS}>
              <Outlet />
            </ModuleGuard>
          </OrgGate>
        </main>
        <Toaster position="bottom-right" richColors />
      </div>
    </ProtectedRoute>
  );
}
