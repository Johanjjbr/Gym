import { Link, useLocation } from 'react-router';
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
  User as UserIcon
} from 'lucide-react';
import { cn } from './ui/utils';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['administrador', 'entrenador', 'usuario'] },
  { icon: Users, label: 'Usuarios', path: '/usuarios', roles: ['administrador', 'entrenador'] },
  { icon: CreditCard, label: 'Pagos', path: '/pagos', roles: ['administrador'] },
  { icon: UserCog, label: 'Personal', path: '/personal', roles: ['administrador'] },
  { icon: QrCode, label: 'Asistencia', path: '/asistencia', roles: ['administrador', 'entrenador'] },
  { icon: ClipboardList, label: 'Rutinas', path: '/rutinas', roles: ['administrador', 'entrenador'] },
  { icon: Dumbbell, label: 'Mi Entrenamiento', path: '/mi-entrenamiento', roles: ['usuario'] },
  { icon: UserIcon, label: 'Mi Perfil', path: '/mi-perfil', roles: ['usuario'] },
  { icon: FileText, label: 'Reportes', path: '/reportes', roles: ['administrador'] },
];

export function Sidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  // Filtrar items del menú según el rol del usuario
  const filteredMenuItems = menuItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  const getRoleLabel = (role: string) => {
    const labels = {
      administrador: 'Administrador',
      entrenador: 'Entrenador',
      usuario: 'Usuario',
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => {
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
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm">
              {profile ? getRoleInitials(profile.full_name) : 'US'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{profile?.full_name || 'Usuario'}</p>
            <p className="text-xs text-muted-foreground">
              {profile ? getRoleLabel(profile.role) : 'Cargando...'}
            </p>
          </div>
          <button 
            className="text-muted-foreground hover:text-destructive transition-colors"
            onClick={signOut}
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}