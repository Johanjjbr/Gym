import { Outlet, Link, Navigate, useLocation, useNavigate } from 'react-router';
import { User, Dumbbell, LogOut, CreditCard, Calendar, TrendingUp, Menu, X, Home, Play } from 'lucide-react';
import { cn } from '../components/ui/utils';
import { useAuth } from '../contexts/AuthContext';
import { ModuleGuard, ProtectedRoute } from '../components/ProtectedRoute';
import { useState } from 'react';

type MenuItem = { icon: typeof User; label: string; path: string; gymOnly?: boolean };

const menuItems: MenuItem[] = [
  { icon: Home, label: 'Hoy', path: '/usuario/hoy' },
  { icon: Play, label: 'Entrenar', path: '/usuario/entrenar' },
  { icon: User, label: 'Mi Perfil', path: '/usuario/mi-perfil' },
  { icon: TrendingUp, label: 'Progreso Físico', path: '/usuario/progreso' },
  { icon: Calendar, label: 'Asistencia', path: '/usuario/asistencia', gymOnly: true },
  { icon: CreditCard, label: 'Mis Pagos', path: '/usuario/pagos', gymOnly: true },
];

/** Barra inferior en el teléfono. */
const bottomItems: MenuItem[] = [
  { icon: Home, label: 'Hoy', path: '/usuario/hoy' },
  { icon: Play, label: 'Entrenar', path: '/usuario/entrenar' },
  { icon: TrendingUp, label: 'Progreso', path: '/usuario/progreso' },
  { icon: User, label: 'Perfil', path: '/usuario/mi-perfil' },
];

/** /usuario -> la pantalla de inicio que corresponde. */
export function UserHome() {
  const { user } = useAuth();
  return <Navigate to="/usuario/hoy" replace />;
}

export function UserLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Usuario independiente (sin gimnasio): sin asistencia ni pagos
  const isIndependent = user?.isIndependent === true;
  const visibleItems = menuItems.filter((item) => !(isIndependent && item.gymOnly));
  // En el entrenamiento y el cuestionario la barra inferior estorba
  const showBottomNav = !['/usuario/entrenar', '/usuario/bienvenida'].includes(location.pathname);
  const brandName = 'GymStars';
  const brandSubtitle = isIndependent ? 'Entrena en casa' : 'Socio del gimnasio';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Función para obtener las iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <ProtectedRoute allowedRoles={['Usuario']} checkModule={false}>
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0f0f16] border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">{brandName}</h1>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-card rounded-lg transition-colors"
            >
              {isSidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Overlay para cerrar el menú en móvil */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          "fixed top-0 left-0 h-screen bg-[#0f0f16] border-r border-border flex flex-col z-50 transition-transform duration-300",
          "w-64 lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Logo - Solo visible en desktop */}
          <div className="hidden lg:block p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl tracking-tight">{brandName}</h1>
                <p className="text-xs text-muted-foreground">{brandSubtitle}</p>
              </div>
            </div>
          </div>

          {/* Mobile padding for header */}
          <div className="lg:hidden h-16" />

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={closeSidebar}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                        isActive 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          : "text-muted-foreground hover:bg-card hover:text-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-sm">
                  {user ? getInitials(user.name) : 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Usuario'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.memberNumber || (isIndependent ? 'Entrena en casa' : 'Miembro')}
                </p>
              </div>
              <button 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className={cn(
          "transition-all duration-300",
          "p-4 sm:p-6 lg:p-8",
          "pt-20 lg:pt-8", // Espacio para el encabezado del teléfono
          "lg:ml-64", // Margin left para desktop (sidebar width)
          showBottomNav && "pb-24 lg:pb-8"
        )}>
          {/* /usuario no es un módulo con permiso: solo redirige al inicio que corresponde */}
          {location.pathname.replace(/\/+$/, '') === '/usuario' ? (
            <UserHome />
          ) : (
            <ModuleGuard>
              <Outlet />
            </ModuleGuard>
          )}
        </main>

        {showBottomNav && (
          <nav
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-[#0f0f16]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
            data-testid="bottom-nav"
          >
            <ul className="grid grid-cols-4">
              {bottomItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </ProtectedRoute>
  );
}