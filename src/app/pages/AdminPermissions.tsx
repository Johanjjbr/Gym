import { useState, useEffect } from 'react';
import { Search, Plus, Save, RefreshCw, Shield, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { useAllModulePermissions, useUpsertModulePermission, useDeleteModulePermission } from '../hooks/useModulePermissions';
import type { UserRole, ModulePermission, RoleModulePermissionInput } from '../types';
import { toast } from 'sonner';

const MODULES = [
  { path: '/', label: 'Dashboard' },
  { path: '/usuarios', label: 'Usuarios' },
  { path: '/facturacion', label: 'Facturación' },
  { path: '/planes', label: 'Planes' },
  { path: '/personal', label: 'Personal' },
  { path: '/gimnasios', label: 'Gimnasios' },
  { path: '/asistencia', label: 'Asistencia' },
  { path: '/rutinas', label: 'Rutinas' },
  { path: '/ejercicios', label: 'Ejercicios' },
  { path: '/mi-entrenamiento', label: 'Mi Entrenamiento' },
  { path: '/reportes', label: 'Reportes' },
  { path: '/admin/permisos', label: 'Admin Permisos' },
];

const ROLES: UserRole[] = ['Administrador', 'Entrenador', 'Recepción', 'Usuario'];

const PERMISSION_ACTIONS: { key: 'can_view' | 'can_create' | 'can_edit' | 'can_delete'; label: string }[] = [
  { key: 'can_view', label: 'Ver' },
  { key: 'can_create', label: 'Crear' },
  { key: 'can_edit', label: 'Editar' },
  { key: 'can_delete', label: 'Eliminar' },
];

export function AdminPermissions() {
  const { user, is_super_admin } = useAuth();
  const isSuperAdmin = is_super_admin === true;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [gyms, setGyms] = useState<Array<{ id: string; name: string }>>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, RoleModulePermissionInput>>(new Map());

  const { data: allPermissions, isLoading, error, refetch } = useAllModulePermissions();
  const upsertMutation = useUpsertModulePermission();
  const deleteMutation = useDeleteModulePermission();

  // Cargar gyms disponibles para super admin
  useEffect(() => {
    if (isSuperAdmin) {
      // En un caso real, esto vendría de un hook useGyms
      // Por ahora simulamos con un fetch directo
      fetch('/api/gyms') // Esto necesitaría un endpoint real
        .then(res => res.json())
        .then(data => setGyms(data))
        .catch(() => setGyms([]));
    }
  }, [isSuperAdmin]);

  // Construir matriz de permisos: role -> module_path -> ModulePermission
  const permissionMatrix = new Map<string, Map<string, ModulePermission>>();
  if (allPermissions) {
    for (const perm of allPermissions) {
      if (!permissionMatrix.has(perm.role)) {
        permissionMatrix.set(perm.role, new Map());
      }
      permissionMatrix.get(perm.role)!.set(perm.module_path, perm);
    }
  }

  const getPermission = (role: UserRole, modulePath: string, gymId?: string | null): ModulePermission | undefined => {
    const roleMap = permissionMatrix.get(role);
    if (!roleMap) return undefined;
    
    // Buscar específico por gym primero, luego global
    if (gymId) {
      const gymSpecific = roleMap.get(`${modulePath}::${gymId}`);
      if (gymSpecific) return gymSpecific;
    }
    return roleMap.get(modulePath);
  };

  const handlePermissionChange = (
    role: UserRole, 
    modulePath: string, 
    actionKey: 'can_view' | 'can_create' | 'can_edit' | 'can_delete', 
    value: boolean
  ) => {
    const existing = getPermission(role, modulePath, selectedGymId);
    const newPerm: RoleModulePermissionInput = {
      role,
      module_path: modulePath,
      can_view: existing?.can_view ?? false,
      can_create: existing?.can_create ?? false,
      can_edit: existing?.can_edit ?? false,
      can_delete: existing?.can_delete ?? false,
      gym_id: selectedGymId,
      ...(actionKey === 'can_view' && { can_view: value }),
      ...(actionKey === 'can_create' && { can_create: value }),
      ...(actionKey === 'can_edit' && { can_edit: value }),
      ...(actionKey === 'can_delete' && { can_delete: value }),
    };

    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(`${role}::${modulePath}::${selectedGymId || 'global'}`, newPerm);
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveAll = async () => {
    try {
      for (const [, perm] of pendingChanges) {
        await upsertMutation.mutateAsync(perm);
      }
      setPendingChanges(new Map());
      setHasUnsavedChanges(false);
      toast.success('Permisos guardados exitosamente');
      refetch();
    } catch (error) {
      console.error('Error guardando permisos:', error);
      toast.error('Error al guardar permisos');
    }
  };

  const handleReset = () => {
    setPendingChanges(new Map());
    setHasUnsavedChanges(false);
  };

  const filteredModules = MODULES.filter(m => 
    m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl">Error al cargar permisos</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Ocurrió un error al cargar los datos. Intenta recargar la página.
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2 flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Gestión de Permisos de Módulos
          </h1>
          <p className="text-muted-foreground">
            Configura qué módulos puede ver y gestionar cada rol. 
            {isSuperAdmin ? 'Como Super Admin, puedes gestionar permisos globales y por gimnasio.' : 'Como Administrador, gestionas permisos de tu gimnasio asignado.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={upsertMutation.isPending}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recargar
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={!hasUnsavedChanges}>
            <X className="w-4 h-4 mr-2" />
            Descartar cambios
          </Button>
          <Button onClick={handleSaveAll} disabled={!hasUnsavedChanges || upsertMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {upsertMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      {/* Selector de Gimnasio (solo Super Admin) */}
      {isSuperAdmin && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Label className="text-sm font-medium">Gimnasio:</Label>
              <Select value={selectedGymId || 'global'} onValueChange={v => setSelectedGymId(v === 'global' ? null : v)}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Seleccionar gimnasio (Global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (todos los gimnasios)</SelectItem>
                  {gyms.map(gym => (
                    <SelectItem key={gym.id} value={gym.id}>{gym.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground ml-auto">
                {selectedGymId ? `Editando permisos para gimnasio específico` : 'Editando permisos globales (aplican a todos los gimnasios sin override)'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matriz de Permisos */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader>
          <CardTitle>Matriz de Permisos por Rol</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="sticky left-0 w-48 px-4 py-3 text-left text-sm font-medium text-muted-foreground border-r border-border">
                    Módulo / Acción
                  </th>
                  {ROLES.map(role => (
                    <th key={role} className="px-4 py-3 text-center text-sm font-medium text-muted-foreground border-r border-border min-w-[140px]">
                      <Badge variant="outline" className={getRoleBadgeColor(role)}>
                        {role}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredModules.map((module, moduleIndex) => (
                  <React.Fragment key={module.path}>
                    <tr className={moduleIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="sticky left-0 w-48 px-4 py-3 text-sm font-medium border-r border-border border-b border-border">
                        {module.label}
                      </td>
                      {ROLES.map(role => {
                        const perm = getPermission(role, module.path, selectedGymId);
                        const canView = perm?.can_view ?? false;
                        return (
                          <td key={role} className="px-2 py-2 text-center border-r border-border border-b border-border">
                            <Badge variant={canView ? 'default' : 'outline'} className="w-full">
                              {canView ? '✓ Acceso' : '✗ Sin acceso'}
                            </Badge>
                          </td>
                        );
                      })}
                    </tr>
                    {/* Fila de acciones detalladas */}
                    <tr className={moduleIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="sticky left-0 w-48 px-4 py-2 text-xs text-muted-foreground border-r border-border">
                        Acciones detalladas
                      </td>
                      {ROLES.map(role => {
                        const perm = getPermission(role, module.path, selectedGymId);
                        const canView = perm?.can_view ?? false;
                        return (
                          <td key={role} className="px-2 py-1 border-r border-border border-b border-border">
                            <div className="flex justify-center gap-1">
                              {PERMISSION_ACTIONS.map(action => {
                                const isEnabled = perm?.[action.key] ?? false;
                                // Solo mostrar Crear/Editar/Eliminar si tiene Ver
                                const showAction = action.key === 'can_view' || canView;
                                if (!showAction) return null;
                                
                                const pendingKey = `${role}::${module.path}::${selectedGymId || 'global'}`;
                                const pending = pendingChanges.get(pendingKey);
                                const value = pending?.[action.key] ?? isEnabled;
                                
                                return (
                                  <label 
                                    key={action.key} 
                                    className="flex items-center justify-center w-8 h-8 rounded border transition-colors cursor-pointer hover:bg-accent"
                                    title={`${action.label} para ${role} en ${module.label}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={value}
                                      onChange={e => handlePermissionChange(role, module.path, action.key, e.target.checked)}
                                      className="sr-only"
                                    />
                                    <span className={value ? 'text-primary font-bold' : 'text-muted-foreground'}>
                                      {action.label.charAt(0)}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Leyenda */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded border border-primary bg-primary/10 flex items-center justify-center text-primary text-xs">V</span>
              <span>Ver</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded border border-primary bg-primary/10 flex items-center justify-center text-primary text-xs">C</span>
              <span>Crear</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded border border-primary bg-primary/10 flex items-center justify-center text-primary text-xs">E</span>
              <span>Editar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded border border-primary bg-primary/10 flex items-center justify-center text-primary text-xs">D</span>
              <span>Eliminar</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30">✓ Acceso</Badge>
              <Badge variant="outline" className="bg-muted text-muted-foreground">✗ Sin acceso</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case 'Administrador': return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'Entrenador': return 'bg-primary/20 text-primary border-primary/30';
    case 'Recepción': return 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30';
    case 'Usuario': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}