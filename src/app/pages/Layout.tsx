import { Outlet } from 'react-router';
import { SidebarProvider, SidebarTrigger } from '../components/ui/sidebar';
import { AppSidebar } from '../components/Sidebar';
import { Toaster } from '../components/ui/sonner';
import { ProtectedRoute } from '../components/ProtectedRoute';

export function Layout() {
  return (
    <ProtectedRoute allowedRoles={['Administrador', 'Entrenador', 'Recepción']}>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <main className="min-h-screen bg-background w-full">
          <div className="sticky top-0 z-30 flex items-center gap-2 p-4 border-b border-border bg-background lg:hidden">
            <SidebarTrigger />
            <span className="font-semibold">GYM Lagunetica</span>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
        <Toaster position="bottom-right" richColors />
      </SidebarProvider>
    </ProtectedRoute>
  );
}
