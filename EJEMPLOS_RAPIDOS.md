# 🚀 Ejemplos Rápidos - Copy & Paste

## 📋 Índice Rápido

1. [Formulario Básico](#formulario-básico)
2. [Lista con Loading](#lista-con-loading)
3. [Eliminar con Confirmación](#eliminar-con-confirmación)
4. [Búsqueda y Filtrado](#búsqueda-y-filtrado)
5. [Modal de Edición](#modal-de-edición)
6. [Registro de Pago](#registro-de-pago)
7. [Asignar Rutina](#asignar-rutina)
8. [Registrar Asistencia](#registrar-asistencia)

---

## Formulario Básico

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '../lib/validations';
import { useCreateUser } from '../hooks/useUsers';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function QuickUserForm() {
  const createUser = useCreateUser();
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = 
    useForm<UserFormData>({
      resolver: zodResolver(userSchema),
    });

  const onSubmit = async (data: UserFormData) => {
    await createUser.mutateAsync(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Nombre *</Label>
        <Input {...register('name')} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <Label>Email *</Label>
        <Input type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <Label>Membresía *</Label>
        <select {...register('membership_type')} className="w-full p-2 rounded border">
          <option value="Mensual">Mensual</option>
          <option value="Trimestral">Trimestral</option>
          <option value="Semestral">Semestral</option>
          <option value="Anual">Anual</option>
        </select>
      </div>

      <div>
        <Label>Estado *</Label>
        <select {...register('status')} className="w-full p-2 rounded border">
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
          <option value="Suspendido">Suspendido</option>
        </select>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : 'Crear Usuario'}
      </Button>
    </form>
  );
}
```

---

## Lista con Loading

```typescript
import { useUsers, useDeleteUser } from '../hooks/useUsers';
import { Loader2, Trash2, Edit } from 'lucide-react';
import { Button } from '../components/ui/button';

export function UsersList() {
  const { data: users, isLoading, error } = useUsers();
  const deleteUser = useDeleteUser();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500 rounded">
        Error: {error.message}
      </div>
    );
  }

  if (!users?.length) {
    return (
      <div className="text-center p-8 text-gray-500">
        No hay usuarios registrados
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div key={user.id} className="flex items-center justify-between p-4 border rounded hover:bg-gray-50">
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
            <p className="text-xs text-gray-500">{user.membership_type}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteUser.mutate(user.id)}
              disabled={deleteUser.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Eliminar con Confirmación

```typescript
import { useState } from 'react';
import { useDeleteUser } from '../hooks/useUsers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Trash2 } from 'lucide-react';

export function DeleteUserButton({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const deleteUser = useDeleteUser();

  const handleDelete = async () => {
    await deleteUser.mutateAsync(user.id);
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar al usuario <strong>{user.name}</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

## Búsqueda y Filtrado

```typescript
import { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { Input } from '../components/ui/input';
import { Search } from 'lucide-react';

export function SearchableUsersList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const { data: users, isLoading } = useUsers();

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
                         user.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="Todos">Todos</option>
          <option value="Activo">Activos</option>
          <option value="Inactivo">Inactivos</option>
          <option value="Suspendido">Suspendidos</option>
        </select>
      </div>

      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <div className="space-y-2">
          {filteredUsers?.map((user) => (
            <div key={user.id} className="p-4 border rounded">
              {user.name} - {user.status}
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500">
        Mostrando {filteredUsers?.length} de {users?.length} usuarios
      </p>
    </div>
  );
}
```

---

## Modal de Edición

```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '../lib/validations';
import { useUpdateUser } from '../hooks/useUsers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Edit } from 'lucide-react';

export function EditUserModal({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const updateUser = useUpdateUser();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = 
    useForm<UserFormData>({
      resolver: zodResolver(userSchema),
      defaultValues: user,
    });

  const onSubmit = async (data: UserFormData) => {
    await updateUser.mutateAsync({ id: user.id, data });
    setOpen(false);
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Edit className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input {...register('name')} placeholder="Nombre" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <Input type="email" {...register('email')} placeholder="Email" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## Registro de Pago

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentSchema, type PaymentFormData } from '../lib/validations';
import { useCreatePayment } from '../hooks/usePayments';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function PaymentForm({ userId }: { userId: string }) {
  const createPayment = useCreatePayment();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = 
    useForm<PaymentFormData>({
      resolver: zodResolver(paymentSchema),
      defaultValues: {
        user_id: userId,
        date: new Date().toISOString().split('T')[0],
        status: 'Pagado',
        method: 'Efectivo',
      },
    });

  const onSubmit = async (data: PaymentFormData) => {
    await createPayment.mutateAsync(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Monto (Bs) *</Label>
        <Input
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
      </div>

      <div>
        <Label>Método de Pago *</Label>
        <select {...register('method')} className="w-full p-2 border rounded">
          <option value="Efectivo">Efectivo</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Tarjeta">Tarjeta</option>
          <option value="Pago Móvil">Pago Móvil</option>
        </select>
      </div>

      <div>
        <Label>Fecha de Pago *</Label>
        <Input type="date" {...register('date')} />
        {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
      </div>

      <div>
        <Label>Próximo Pago *</Label>
        <Input type="date" {...register('next_payment')} />
        {errors.next_payment && <p className="text-xs text-red-500">{errors.next_payment.message}</p>}
      </div>

      <div>
        <Label>Referencia</Label>
        <Input {...register('reference')} placeholder="Nro. de referencia" />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
      </Button>
    </form>
  );
}
```

---

## Asignar Rutina

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { routineAssignmentSchema, type RoutineAssignmentFormData } from '../lib/validations';
import { useRoutines } from '../hooks/useRoutines';
import { useAssignRoutine } from '../hooks/useRoutines';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function AssignRoutineForm({ userId }: { userId: string }) {
  const { user } = useAuth();
  const { data: routines } = useRoutines();
  const assignRoutine = useAssignRoutine();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = 
    useForm<RoutineAssignmentFormData>({
      resolver: zodResolver(routineAssignmentSchema),
      defaultValues: {
        user_id: userId,
        assigned_by: user?.id || '',
        start_date: new Date().toISOString().split('T')[0],
        status: 'Activa',
      },
    });

  const onSubmit = async (data: RoutineAssignmentFormData) => {
    await assignRoutine.mutateAsync(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Rutina *</Label>
        <select {...register('routine_id')} className="w-full p-2 border rounded">
          <option value="">Seleccionar rutina...</option>
          {routines?.map((routine) => (
            <option key={routine.id} value={routine.id}>
              {routine.name} - {routine.level}
            </option>
          ))}
        </select>
        {errors.routine_id && <p className="text-xs text-red-500">{errors.routine_id.message}</p>}
      </div>

      <div>
        <Label>Fecha de Inicio *</Label>
        <Input type="date" {...register('start_date')} />
        {errors.start_date && <p className="text-xs text-red-500">{errors.start_date.message}</p>}
      </div>

      <div>
        <Label>Fecha de Fin</Label>
        <Input type="date" {...register('end_date')} />
      </div>

      <div>
        <Label>Notas</Label>
        <textarea
          {...register('notes')}
          className="w-full p-2 border rounded"
          rows={3}
          placeholder="Observaciones..."
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Asignando...' : 'Asignar Rutina'}
      </Button>
    </form>
  );
}
```

---

## Registrar Asistencia

```typescript
import { useState } from 'react';
import { useCreateAttendance } from '../hooks/useAttendance';
import { Button } from '../components/ui/button';
import { LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export function AttendanceQuickRegister({ userId, userName }: { userId: string; userName: string }) {
  const createAttendance = useCreateAttendance();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAttendance = async (type: 'Entrada' | 'Salida') => {
    setIsProcessing(true);
    try {
      await createAttendance.mutateAsync({
        user_id: userId,
        type,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0],
      });
      toast.success(`${type} registrada para ${userName}`);
    } catch (error) {
      toast.error('Error al registrar asistencia');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => handleAttendance('Entrada')}
        disabled={isProcessing}
        className="bg-green-500 hover:bg-green-600"
      >
        <LogIn className="h-4 w-4 mr-2" />
        Entrada
      </Button>
      <Button
        onClick={() => handleAttendance('Salida')}
        disabled={isProcessing}
        className="bg-blue-500 hover:bg-blue-600"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Salida
      </Button>
    </div>
  );
}
```

---

## 💡 Tips Rápidos

### Invalidar Caché Manualmente
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidar usuarios
queryClient.invalidateQueries({ queryKey: ['users'] });

// Invalidar todo el caché
queryClient.invalidateQueries();
```

### Obtener Datos del Caché sin Hacer Request
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
const cachedUsers = queryClient.getQueryData(['users']);
```

### Usar Loading State de Mutation
```typescript
const createUser = useCreateUser();

return (
  <Button disabled={createUser.isPending}>
    {createUser.isPending ? 'Guardando...' : 'Guardar'}
  </Button>
);
```

### Validar Antes de Enviar (sin formulario)
```typescript
import { userSchema } from '../lib/validations';

const validateUser = (data: any) => {
  try {
    userSchema.parse(data);
    return { valid: true, errors: null };
  } catch (error) {
    return { valid: false, errors: error.errors };
  }
};
```

---

## 🎯 Resumen de Imports Comunes

```typescript
// React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Hooks personalizados
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers';
import { usePayments, useCreatePayment } from '../hooks/usePayments';
import { useRoutines, useAssignRoutine } from '../hooks/useRoutines';
import { useDashboardStats } from '../hooks/useStats';
import { useAttendance, useCreateAttendance } from '../hooks/useAttendance';

// Validación
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, paymentSchema, type UserFormData } from '../lib/validations';

// UI
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { toast } from 'sonner';

// Auth
import { useAuth } from '../contexts/AuthContext';
```

---

**🚀 ¡Copia estos ejemplos y adapta según necesites!**
