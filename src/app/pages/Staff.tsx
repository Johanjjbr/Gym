import { useState } from 'react';
import { Search, Plus, Mail, Phone, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { mockStaff } from '../lib/mockData';
import { Staff, UserRole } from '../types';

type StaffFormData = Omit<Staff, 'id'>;

export function StaffPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState<Staff[]>(mockStaff);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { register: registerCreate, handleSubmit: handleSubmitCreate, reset: resetCreate, watch: watchCreate, setValue: setValueCreate, formState: { errors: errorsCreate } } = useForm<StaffFormData>();
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, watch: watchEdit, setValue: setValueEdit, formState: { errors: errorsEdit } } = useForm<StaffFormData>();

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create Staff
  const onCreateStaff = (data: StaffFormData) => {
    const newStaff: Staff = {
      ...data,
      id: String(Date.now()),
    };
    setStaff([...staff, newStaff]);
    toast.success('Empleado creado exitosamente', {
      description: `${newStaff.name} ha sido registrado como ${newStaff.role}`,
    });
    resetCreate();
    setIsCreateOpen(false);
  };

  // Edit Staff
  const onEditStaff = (data: StaffFormData) => {
    if (!editingStaff) return;
    const updatedStaff: Staff = {
      ...data,
      id: editingStaff.id,
    };
    setStaff(staff.map(s => s.id === editingStaff.id ? updatedStaff : s));
    toast.success('Empleado actualizado', {
      description: `Los datos de ${updatedStaff.name} han sido actualizados`,
    });
    resetEdit();
    setIsEditOpen(false);
    setEditingStaff(null);
  };

  // Delete Staff
  const onDeleteStaff = (staffMember: Staff) => {
    setStaff(staff.filter(s => s.id !== staffMember.id));
    toast.success('Empleado eliminado', {
      description: `${staffMember.name} ha sido eliminado del sistema`,
    });
  };

  // Open Edit Dialog
  const openEditDialog = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    resetEdit(staffMember);
    setIsEditOpen(true);
  };

  // Open Detail Dialog
  const openDetailDialog = (staffMember: Staff) => {
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

  const StaffForm = ({ type }: { type: 'create' | 'edit' }) => {
    const register = type === 'create' ? registerCreate : registerEdit;
    const errors = type === 'create' ? errorsCreate : errorsEdit;
    const watch = type === 'create' ? watchCreate : watchEdit;
    const setValue = type === 'create' ? setValueCreate : setValueEdit;

    return (
      <form onSubmit={type === 'create' ? handleSubmitCreate(onCreateStaff) : handleSubmitEdit(onEditStaff)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor={`${type}-name`}>Nombre Completo *</Label>
            <Input
              id={`${type}-name`}
              {...register('name', { required: 'El nombre es requerido' })}
              className="bg-input border-border"
              placeholder="Ej: Pedro Sánchez"
            />
            {errors.name && <p className="text-xs text-[#ff3b5c] mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor={`${type}-role`}>Rol *</Label>
            <Select onValueChange={(value) => setValue('role', value as UserRole)} defaultValue={watch('role')}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Administrador">Administrador</SelectItem>
                <SelectItem value="Entrenador">Entrenador</SelectItem>
                <SelectItem value="Recepción">Recepción</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-[#ff3b5c] mt-1">{errors.role.message}</p>}
          </div>

          <div>
            <Label htmlFor={`${type}-status`}>Estado *</Label>
            <Select onValueChange={(value) => setValue('status', value as Staff['status'])} defaultValue={watch('status')}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-xs text-[#ff3b5c] mt-1">{errors.status.message}</p>}
          </div>

          <div>
            <Label htmlFor={`${type}-email`}>Email *</Label>
            <Input
              id={`${type}-email`}
              type="email"
              {...register('email', { 
                required: 'El email es requerido',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email invlido'
                }
              })}
              className="bg-input border-border"
              placeholder="correo@gym.com"
            />
            {errors.email && <p className="text-xs text-[#ff3b5c] mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor={`${type}-phone`}>Teléfono *</Label>
            <Input
              id={`${type}-phone`}
              {...register('phone', { required: 'El teléfono es requerido' })}
              className="bg-input border-border"
              placeholder="0424-1234567"
            />
            {errors.phone && <p className="text-xs text-[#ff3b5c] mt-1">{errors.phone.message}</p>}
          </div>

          <div className="col-span-2">
            <Label htmlFor={`${type}-shift`}>Turno *</Label>
            <Select onValueChange={(value) => setValue('shift', value)} defaultValue={watch('shift')}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Seleccionar turno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mañana (6am - 2pm)">Mañana (6am - 2pm)</SelectItem>
                <SelectItem value="Tarde (2pm - 10pm)">Tarde (2pm - 10pm)</SelectItem>
                <SelectItem value="Completo (6am - 10pm)">Completo (6am - 10pm)</SelectItem>
              </SelectContent>
            </Select>
            {errors.shift && <p className="text-xs text-[#ff3b5c] mt-1">{errors.shift.message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => type === 'create' ? setIsCreateOpen(false) : setIsEditOpen(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            {type === 'create' ? 'Crear Empleado' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2">Gestión de Personal</h1>
          <p className="text-muted-foreground">Administra el equipo del gimnasio</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Empleado
        </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((staffMember) => (
          <Card key={staffMember.id} className="bg-card border-border hover:border-primary/50 transition-all duration-300">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-lg">{staffMember.name.split(' ').map(n => n[0]).join('')}</span>
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="outline" className="border-[#ff3b5c] text-[#ff3b5c] hover:bg-[#ff3b5c]/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Empleado</AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿Estás seguro de que quieres eliminar a {staffMember.name}? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteStaff(staffMember)} className="bg-[#ff3b5c] hover:bg-[#ff3b5c]/90">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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

      {/* Shifts Schedule */}
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
                  {mockStaff.filter(s => s.shift.includes('Mañana')).length}
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
                  {mockStaff.filter(s => s.shift.includes('Tarde')).length}
                </p>
                <p className="text-sm text-muted-foreground">Empleados</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Staff Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Empleado</DialogTitle>
            <DialogDescription>
              Ingresa los detalles del nuevo empleado.
            </DialogDescription>
          </DialogHeader>
          <StaffForm type="create" />
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
            <DialogDescription>
              Actualiza los detalles del empleado.
            </DialogDescription>
          </DialogHeader>
          <StaffForm type="edit" />
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
                  <span className="text-primary text-lg">{selectedStaff.name.split(' ').map(n => n[0]).join('')}</span>
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