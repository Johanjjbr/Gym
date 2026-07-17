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
  Database,
  Package
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from './ui/sidebar';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Usuarios', path: '/usuarios' },
  { icon: CreditCard, label: 'Facturas', path: '/facturas' },
  { icon: Package, label: 'Planes', path: '/planes' },
  { icon: UserCog, label: 'Personal', path: '/personal' },
  { icon: QrCode, label: 'Asistencia', path: '/asistencia' },
  { icon: ClipboardList, label: 'Rutinas', path: '/rutinas' },
  { icon: Dumbbell, label: 'Ejercicios', path: '/ejercicios' },
  { icon: Dumbbell, label: 'Mi Entrenamiento', path: '/mi-entrenamiento' },
  { icon: FileText, label: 'Reportes', path: '/reportes' },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const restrictedPathsForTrainer = ['/', '/facturas', '/planes', '/personal', '/reportes'];
  const filteredMenuItems = user?.role === 'Entrenador'
    ? menuItems.filter(item => !restrictedPathsForTrainer.includes(item.path))
    : menuItems;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary flex items-center justify-center">
            <Dumbbell className="size-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl tracking-tight">GYM Lagunetica</h1>
            <p className="text-xs text-sidebar-foreground/60">Los Teques</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarMenu>
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                    <Link to={item.path}>
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Desarrollo</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === '/test-supabase'}>
                <Link to="/test-supabase">
                  <Database className="size-5" />
                  <span>Test Supabase</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
          <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-sm">
              {user ? getInitials(user.name) : 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'Usuario'}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.role || 'Sin rol'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sidebar-foreground/60 hover:text-destructive transition-colors flex-shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
