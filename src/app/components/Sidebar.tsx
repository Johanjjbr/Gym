import { Link, useLocation, useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  UserCog, 
  QrCode, 
  FileText,
  Dumbbell,
  ClipboardList,
  LogOut,
  Database
} from 'lucide-react';
import { cn } from './ui/utils';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Usuarios', path: '/usuarios' },
  { icon: CreditCard, label: 'Pagos', path: '/pagos' },
  { icon: UserCog, label: 'Personal', path: '/personal' },
  { icon: QrCode, label: 'Asistencia', path: '/asistencia' },
  { icon: ClipboardList, label: 'Rutinas', path: '/rutinas' },
  { icon: Dumbbell, label: 'Mi Entrenamiento', path: '/mi-entrenamiento' },
  { icon: FileText, label: 'Reportes', path: '/reportes' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

  return (
    <div className="w-64 h-screen bg-[#0f0f16] border-r border-border flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl tracking-tight">GYM Lagunetica</h1>
            <p className="text-xs text-muted-foreground">Los Teques</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        
        {/* Sección de Ayuda */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider px-4 mb-2">
            Desarrollo
          </p>
          <Link
            to="/test-supabase"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground transition-all duration-200"
          >
            <Database className="w-5 h-5" />
            <span className="text-sm">Test Supabase</span>
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm">
              {user ? getInitials(user.name) : 'U'}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">{user?.role || 'Sin rol'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}