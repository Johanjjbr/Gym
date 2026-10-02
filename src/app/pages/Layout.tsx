import { Outlet } from 'react-router';
import { Sidebar, menuItems } from '../components/Sidebar';
import { Toaster } from '../components/ui/sonner';
import { ModuleGuard, ProtectedRoute } from '../components/ProtectedRoute';

const STAFF_PATHS = menuItems.map((m) => m.path);

export function Layout() {
  return (
    <ProtectedRoute allowedRoles={['Administrador', 'Entrenador', 'Recepción']} checkModule={false}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 p-8">
          <ModuleGuard fallbackPaths={STAFF_PATHS}>
            <Outlet />
          </ModuleGuard>
        </main>
        <Toaster position="bottom-right" richColors />
      </div>
    </ProtectedRoute>
  );
}
