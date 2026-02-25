import { Outlet } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { Toaster } from '../components/ui/sonner';
import { ProtectedRoute } from '../components/ProtectedRoute';

export function Layout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 p-8">
          <Outlet />
        </main>
        <Toaster position="bottom-right" richColors />
      </div>
    </ProtectedRoute>
  );
}