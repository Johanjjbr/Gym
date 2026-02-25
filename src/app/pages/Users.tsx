import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Plus, Eye, Edit, Trash2 } from 'lucide-react';
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
import { mockUsers } from '../lib/mockData';
import { User } from '../types';

type UserFormData = Omit<User, 'id' | 'imc'> & { imc?: number };

export function Users() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { register: registerCreate, handleSubmit: handleSubmitCreate, reset: resetCreate, watch: watchCreate, setValue: setValueCreate, formState: { errors: errorsCreate } } = useForm<UserFormData>();
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, watch: watchEdit, setValue: setValueEdit, formState: { errors: errorsEdit } } = useForm<UserFormData>();

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.memberNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate IMC
  const calculateIMC = (weight: number, height: number) => {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };

  // Generate next member number
  const generateMemberNumber = () => {
    const numbers = users.map(u => parseInt(u.memberNumber.split('-')[1]));
    const maxNumber = Math.max(...numbers, 0);
    return `GYM-${String(maxNumber + 1).padStart(3, '0')}`;
  };

  // Create User
  const onCreateUser = (data: UserFormData) => {
    const imc = calculateIMC(data.weight, data.height);
    const newUser: User = {
      ...data,
      id: String(Date.now()),
      memberNumber: generateMemberNumber(),
      imc,
    };
    setUsers([...users, newUser]);
    toast.success('Usuario creado exitosamente', {
      description: `${newUser.name} ha sido registrado con el número ${newUser.memberNumber}`,
    });
    resetCreate();
    setIsCreateOpen(false);
  };

  // Edit User
  const onEditUser = (data: UserFormData) => {
    if (!editingUser) return;
    const imc = calculateIMC(data.weight, data.height);
    const updatedUser: User = {
      ...data,
      id: editingUser.id,
      memberNumber: editingUser.memberNumber,
      imc,
    };
    setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
    toast.success('Usuario actualizado', {
      description: `Los datos de ${updatedUser.name} han sido actualizados`,
    });
    resetEdit();
    setIsEditOpen(false);
    setEditingUser(null);
  };

  // Delete User
  const onDeleteUser = (user: User) => {
    setUsers(users.filter(u => u.id !== user.id));
    toast.success('Usuario eliminado', {
      description: `${user.name} ha sido eliminado del sistema`,
    });
  };

  // Open Edit Dialog
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    resetEdit(user);
    setIsEditOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Activo':
        return 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30';
      case 'Moroso':
        return 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const UserForm = ({ type }: { type: 'create' | 'edit' }) => {
    const register = type === 'create' ? registerCreate : registerEdit;
    const errors = type === 'create' ? errorsCreate : errorsEdit;
    const watch = type === 'create' ? watchCreate : watchEdit;
    const setValue = type === 'create' ? setValueCreate : setValueEdit;

    return (
      <form onSubmit={type === 'create' ? handleSubmitCreate(onCreateUser) : handleSubmitEdit(onEditUser)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor={`${type}-name`}>Nombre Completo *</Label>
            <Input
              id={`${type}-name`}
              {...register('name', { required: 'El nombre es requerido' })}
              className="bg-input border-border"
              placeholder="Ej: Carlos Mendoza"
            />
            {errors.name && <p className="text-xs text-[#ff3b5c] mt-1">{errors.name.message}</p>}
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
                  message: 'Email inválido'
                }
              })}
              className="bg-input border-border"
              placeholder="correo@email.com"
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

          <div>
            <Label htmlFor={`${type}-plan`}>Plan *</Label>
            <Select onValueChange={(value) => setValue('plan', value)} defaultValue={watch('plan')}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Seleccionar plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Básico Mensual">Básico Mensual</SelectItem>
                <SelectItem value="Premium Mensual">Premium Mensual</SelectItem>
                <SelectItem value="VIP Trimestral">VIP Trimestral</SelectItem>
                <SelectItem value="VIP Anual">VIP Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor={`${type}-status`}>Estado *</Label>
            <Select onValueChange={(value) => setValue('status', value as User['status'])} defaultValue={watch('status')}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
                <SelectItem value="Moroso">Moroso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor={`${type}-startDate`}>Fecha de Inicio *</Label>
            <Input
              id={`${type}-startDate`}
              type="date"
              {...register('startDate', { required: 'La fecha de inicio es requerida' })}
              className="bg-input border-border"
            />
            {errors.startDate && <p className="text-xs text-[#ff3b5c] mt-1">{errors.startDate.message}</p>}
          </div>

          <div>
            <Label htmlFor={`${type}-nextPayment`}>Próximo Pago *</Label>
            <Input
              id={`${type}-nextPayment`}
              type="date"
              {...register('nextPayment', { required: 'La fecha de próximo pago es requerida' })}
              className="bg-input border-border"
            />
            {errors.nextPayment && <p className="text-xs text-[#ff3b5c] mt-1">{errors.nextPayment.message}</p>}
          </div>

          <div className="col-span-2 pt-4 border-t border-border">
            <h3 className="mb-4 text-lg">Datos Físicos</h3>
          </div>

          <div>
            <Label htmlFor={`${type}-weight`}>Peso (kg) *</Label>
            <Input
              id={`${type}-weight`}
              type="number"
              step="0.1"
              {...register('weight', { 
                required: 'El peso es requerido',
                min: { value: 30, message: 'Peso mínimo 30 kg' },
                max: { value: 300, message: 'Peso máximo 300 kg' }
              })}
              className="bg-input border-border"
              placeholder="70.5"
            />
            {errors.weight && <p className="text-xs text-[#ff3b5c] mt-1">{errors.weight.message}</p>}
          </div>

          <div>
            <Label htmlFor={`${type}-height`}>Estatura (cm) *</Label>
            <Input
              id={`${type}-height`}
              type="number"
              {...register('height', { 
                required: 'La estatura es requerida',
                min: { value: 100, message: 'Estatura mínima 100 cm' },
                max: { value: 250, message: 'Estatura máxima 250 cm' }
              })}
              className="bg-input border-border"
              placeholder="175"
            />
            {errors.height && <p className="text-xs text-[#ff3b5c] mt-1">{errors.height.message}</p>}
          </div>

          {watch('weight') && watch('height') && (
            <div className="col-span-2">
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm text-muted-foreground">IMC Calculado</p>
                <p className="text-2xl text-primary">
                  {calculateIMC(Number(watch('weight')), Number(watch('height'))).toFixed(1)}
                </p>
              </div>
            </div>
          )}
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
            {type === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
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
          <h1 className="text-4xl mb-2">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra los miembros del gimnasio</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nombre o número de miembro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Lista de Usuarios ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground">Miembro</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Nombre</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Plan</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Estado</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">Próximo Pago</th>
                  <th className="text-left py-3 px-4 text-muted-foreground">IMC</th>
                  <th className="text-right py-3 px-4 text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="text-primary">{user.memberNumber}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p>{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">{user.plan}</td>
                    <td className="py-4 px-4">
                      <Badge variant="outline" className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">{new Date(user.nextPayment).toLocaleDateString('es-ES')}</td>
                    <td className="py-4 px-4">{user.imc.toFixed(1)}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/usuarios/${user.id}`)}
                          className="hover:bg-primary/10 hover:text-primary"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary" onClick={() => openEditDialog(user)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar Usuario</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que quieres eliminar a {user.name}? Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteUser(user)}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Usuario</DialogTitle>
            <DialogDescription>
              Ingresa los detalles del nuevo miembro del gimnasio
            </DialogDescription>
          </DialogHeader>
          <UserForm type="create" />
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Actualiza los detalles del miembro del gimnasio
            </DialogDescription>
          </DialogHeader>
          <UserForm type="edit" />
        </DialogContent>
      </Dialog>
    </div>
  );
}