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
  Building2,
  Package,
  Shield,
  Globe,
} from 'lucide-react';
import { BranchSwitcher } from './layout/BranchSwitcher';
import { useOrgContext } from '../hooks/useOrgContext';
import { isPlatformHome, PLATFORM_PATHS } from '../lib/orgContext';
import { cn } from './ui/utils';
import { useAuth } from '../contexts/AuthContext';
import { useModulePermissions } from '../hooks/useModulePermissions';

export const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Usuarios', path: '/usuarios' },
  { icon: CreditCard, label: 'Facturación', path: '/facturacion' },
  { icon: Package, label: 'Planes', path: '/planes' },
  { icon: UserCog, label: 'Personal', path: '/personal' },
  { icon: Building2, label: 'Mi empresa', path: '/gimnasios' },
  { icon: QrCode, label: 'Asistencia', path: '/asistencia' },
  { icon: ClipboardList, label: 'Rutinas', path: '/rutinas' },
  { icon: Dumbbell, label: 'Ejercicios', path: '/ejercicios' },
  { icon: FileText, label: 'Reportes', path: '/reportes' },
  { icon: Shield, label: 'Admin Permisos', path: '/admin/permisos' },
  // Solo súper admin (no está en role_module_permissions)
  { icon: Globe, label: 'Plataforma', path: '/plataforma' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { canViewModule, isLoading } = useModulePermissions();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Mientras cargan los permisos no se muestra ningún item (evita mostrar y luego ocultar)
  const { data: orgCtx } = useOrgContext();
  const platformHome = isPlatformHome(orgCtx);
  const filteredMenuItems = isLoading
    ? []
    : menuItems.filter((item) => canViewModule(item.path) && (!platformHome || PLATFORM_PATHS.includes(item.path)));

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
        <BranchSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            
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