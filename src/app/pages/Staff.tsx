import { useState } from 'react';
import { Search, Mail, Phone, Edit, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useForm } from 'react-hook-form';
import { useStaff, useUpdateStaff } from '../hooks/useStaff';
import { UserRole } from '../types';

type StaffFormData = {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  shift: string;
  status: 'Activo' | 'Inactivo' | 'Vacaciones';
};

export function StaffPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Usar React Query para obtener el personal
  const { data: staff, isLoading, error } = useStaff();
  const updateStaffMutation = useUpdateStaff();

  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, watch: watchEdit, setValue: setValueEdit, formState: { errors: errorsEdit } } = useForm<StaffFormData>();

  const filteredStaff = staff && staff.length > 0 ? staff.filter((s: any) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Edit Staff
  const onEditStaff = (data: StaffFormData) => {
    if (!editingStaff) return;
    
    updateStaffMutation.mutate({
      id: editingStaff.id,
      data: data
    }, {
      onSuccess: () => {
        resetEdit();
        setIsEditOpen(false);
        setEditingStaff(null);
      }
    });
  };

  // Open Edit Dialog
  const openEditDialog = (staffMember: any) => {
    setEditingStaff(staffMember);
    resetEdit(staffMember);
    setIsEditOpen(true);
  };

  // Open Detail Dialog
  const openDetailDialog = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setIsDetailOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrador':
        return 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30';
      case 'Entrenador':
        return 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30';
      case 'Recepción':
        return 'bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'Activo' 
      ? 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30'
      : 'bg-muted text-muted-foreground';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-gray-400">Cargando personal...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-16 w-16 text-[#ff3b5c]" />
        <h2 className="text-2xl">Error al cargar personal</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Ocurrió un error al cargar los datos del personal. Verifica tu conexión a Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2">Gestión de Personal</h1>
          <p className="text-muted-foreground">Administra el equipo del gimnasio</p>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nombre o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff Grid */}
      {filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((staffMember: any) => (
            <Card key={staffMember.id} className="bg-card border-border hover:border-primary/50 transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary text-lg">{staffMember.name.split(' ').map((n: string) => n[0]).join('')}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{staffMember.name}</CardTitle>
                      <Badge variant="outline" className={`mt-1 ${getRoleColor(staffMember.role)}`}>
                        {staffMember.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => openEditDialog(staffMember)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{staffMember.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{staffMember.phone}</span>
                </div>
                <div className="pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-1">Turno</p>
                  <p className="text-sm">{staffMember.shift}</p>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Badge variant="outline" className={getStatusColor(staffMember.status)}>
                    {staffMember.status}
                  </Badge>
                  <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={() => openDetailDialog(staffMember)}>
                    Ver Más
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No se encontró personal</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shifts Schedule */}
      {staff && staff.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Horarios de Turnos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Turno Mañana</p>
                  <p className="text-sm text-muted-foreground">6:00 AM - 2:00 PM</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-primary">
                    {staff.filter((s: any) => s.shift.includes('Mañana')).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Empleados</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Turno Tarde</p>
                  <p className="text-sm text-muted-foreground">2:00 PM - 10:00 PM</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-primary">
                    {staff.filter((s: any) => s.shift.includes('Tarde')).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Empleados</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Staff Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
            <DialogDescription>
              Actualiza los detalles del empleado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(onEditStaff)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="edit-name">Nombre Completo *</Label>
                <Input
                  id="edit-name"
                  {...registerEdit('name', { required: 'El nombre es requerido' })}
                  className="bg-input border-border"
                  placeholder="Ej: Pedro Sánchez"
                />
                {errorsEdit.name && <p className="text-xs text-[#ff3b5c] mt-1">{errorsEdit.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="edit-role">Rol *</Label>
                <Select onValueChange={(value) => setValueEdit('role', value as UserRole)} defaultValue={watchEdit('role')}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                    <SelectItem value="Entrenador">Entrenador</SelectItem>
                    <SelectItem value="Recepción">Recepción</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-status">Estado *</Label>
                <Select onValueChange={(value) => setValueEdit('status', value as any)} defaultValue={watchEdit('status')}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                    <SelectItem value="Vacaciones">Vacaciones</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  {...registerEdit('email', { 
                    required: 'El email es requerido',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido'
                    }
                  })}
                  className="bg-input border-border"
                  placeholder="correo@gym.com"
                />
                {errorsEdit.email && <p className="text-xs text-[#ff3b5c] mt-1">{errorsEdit.email.message}</p>}
              </div>

              <div>
                <Label htmlFor="edit-phone">Teléfono *</Label>
                <Input
                  id="edit-phone"
                  {...registerEdit('phone', { required: 'El teléfono es requerido' })}
                  className="bg-input border-border"
                  placeholder="0424-1234567"
                />
                {errorsEdit.phone && <p className="text-xs text-[#ff3b5c] mt-1">{errorsEdit.phone.message}</p>}
              </div>

              <div className="col-span-2">
                <Label htmlFor="edit-shift">Turno *</Label>
                <Select onValueChange={(value) => setValueEdit('shift', value)} defaultValue={watchEdit('shift')}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Seleccionar turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mañana (6am - 2pm)">Mañana (6am - 2pm)</SelectItem>
                    <SelectItem value="Tarde (2pm - 10pm)">Tarde (2pm - 10pm)</SelectItem>
                    <SelectItem value="Completo (6am - 10pm)">Completo (6am - 10pm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Staff Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Detalles del Empleado</DialogTitle>
            <DialogDescription>
              Información detallada del empleado.
            </DialogDescription>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary text-lg">{selectedStaff.name.split(' ').map((n: string) => n[0]).join('')}</span>
                </div>
                <div>
                  <CardTitle className="text-lg">{selectedStaff.name}</CardTitle>
                  <Badge variant="outline" className={`mt-1 ${getRoleColor(selectedStaff.role)}`}>
                    {selectedStaff.role}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{selectedStaff.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{selectedStaff.phone}</span>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Turno</p>
                <p className="text-sm">{selectedStaff.shift}</p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Badge variant="outline" className={getStatusColor(selectedStaff.status)}>
                  {selectedStaff.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
