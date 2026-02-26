# 🚀 Guía de Integración Completa - Gimnasio Los Teques

## ✅ Implementaciones Completadas

### 1. **React Query para Caché y Sincronización** 
✨ **Implementado correctamente**

#### ¿Qué hace?
- Mantiene los datos en caché para evitar peticiones innecesarias
- Refresca automáticamente los datos cuando cambias de pestaña
- Sincroniza datos entre componentes sin prop drilling
- Maneja estados de loading y error automáticamente

#### Hooks Disponibles

**Usuarios:**
```typescript
import { useUsers, useUser, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers';

// Obtener todos los usuarios (con caché de 5 minutos)
const { data: users, isLoading, error } = useUsers();

// Obtener un usuario específico
const { data: user } = useUser(userId);

// Crear usuario
const createUser = useCreateUser();
createUser.mutate(userData); // Automáticamente invalida caché y muestra toast

// Actualizar usuario
const updateUser = useUpdateUser();
updateUser.mutate({ id: userId, data: updateData });

// Eliminar usuario
const deleteUser = useDeleteUser();
deleteUser.mutate(userId);
```

**Pagos:**
```typescript
import { usePayments, useCreatePayment } from '../hooks/usePayments';

const { data: payments, isLoading } = usePayments();
const createPayment = useCreatePayment();
```

**Rutinas:**
```typescript
import { useRoutines, useCreateRoutine, useRoutineAssignments, useAssignRoutine } from '../hooks/useRoutines';

const { data: routines } = useRoutines();
const { data: assignments } = useRoutineAssignments(userId);
```

**Estadísticas:**
```typescript
import { useDashboardStats } from '../hooks/useStats';

// Se refresca cada 5 minutos automáticamente
const { data: stats, isLoading, error } = useDashboardStats();
```

**Asistencia:**
```typescript
import { useAttendance, useCreateAttendance } from '../hooks/useAttendance';

const { data: attendance } = useAttendance(date);
const createAttendance = useCreateAttendance();
```

**Staff:**
```typescript
import { useStaff, useUpdateStaff } from '../hooks/useStaff';

const { data: staff } = useStaff();
const updateStaff = useUpdateStaff();
```

---

### 2. **Validación con Zod** 
🛡️ **Implementado correctamente**

#### Schemas Disponibles

Todos los schemas están en `/src/app/lib/validations.ts`:

- `userSchema` - Validación de usuarios
- `physicalDataSchema` - Validación de datos físicos
- `paymentSchema` - Validación de pagos
- `staffSchema` - Validación de personal (con password)
- `staffUpdateSchema` - Validación de personal (sin password obligatorio)
- `routineSchema` - Validación de rutinas
- `exerciseSchema` - Validación de ejercicios
- `routineAssignmentSchema` - Validación de asignaciones
- `attendanceSchema` - Validación de asistencia
- `loginSchema` - Validación de login

#### Ejemplo de Uso con React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '../lib/validations';

function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: UserFormData) => {
    // data está validado y tiene el tipo correcto
    await createUser.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <button type="submit" disabled={isSubmitting}>
        Guardar
      </button>
    </form>
  );
}
```

#### Validación Manual

```typescript
import { userSchema } from '../lib/validations';

try {
  const validData = userSchema.parse(formData);
  // validData está validado
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(error.errors);
  }
}
```

---

### 3. **Refresh Tokens Automáticos** 
🔐 **Implementado correctamente**

#### Configuración

El cliente de Supabase en `/src/app/lib/supabase.ts` está configurado con:

```typescript
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Guardar sesión en localStorage
    autoRefreshToken: true,       // ✅ Refresh automático de tokens
    detectSessionInUrl: true,     // Detectar tokens en URL
    storage: window.localStorage, // Donde guardar tokens
    flowType: 'pkce',             // Flujo seguro PKCE
  },
});
```

#### ¿Cómo funciona?

1. **Login inicial**: El usuario inicia sesión y recibe access_token y refresh_token
2. **Uso del token**: Cada request usa el access_token actual
3. **Refresh automático**: Cuando el access_token expira (antes de que sea inválido), Supabase automáticamente:
   - Usa el refresh_token para obtener un nuevo access_token
   - Actualiza la sesión en localStorage
   - Dispara el evento `TOKEN_REFRESHED`
   - Continúa funcionando sin interrupciones

#### Eventos de Autenticación

El `AuthContext` escucha todos los eventos:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  // SIGNED_IN - Usuario inició sesión
  // SIGNED_OUT - Usuario cerró sesión
  // TOKEN_REFRESHED - ✅ Token refrescado automáticamente
  // USER_UPDATED - Datos de usuario actualizados
});
```

**Ver en consola**: Los refresh tokens aparecerán como:
```
✅ Token refrescado automáticamente
🔐 Auth event: TOKEN_REFRESHED
```

#### Beneficios

- ✅ Los empleados no pierden sesión mientras trabajan
- ✅ No hay interrupciones en el flujo de trabajo
- ✅ Seguridad mejorada (tokens de corta duración)
- ✅ Totalmente transparente para el usuario

---

### 4. **Integración Total con Supabase**
🗄️ **Implementado correctamente**

#### Estructura

```
/src/app/
├── lib/
│   ├── supabase.ts          # Cliente de Supabase configurado
│   ├── api.ts               # API client que usa Supabase
│   └── validations.ts       # Schemas de Zod
├── hooks/
│   ├── useUsers.ts          # React Query hooks para usuarios
│   ├── usePayments.ts       # React Query hooks para pagos
│   ├── useRoutines.ts       # React Query hooks para rutinas
│   ├── useStats.ts          # React Query hooks para estadísticas
│   ├── useAttendance.ts     # React Query hooks para asistencia
│   └── useStaff.ts          # React Query hooks para staff
└── contexts/
    └── AuthContext.tsx      # Context de autenticación integrado
```

#### API Client Mejorado

El API client en `/src/app/lib/api.ts` ahora:

1. **Obtiene el token de Supabase** automáticamente (con refresh si es necesario)
2. **Incluye el token** en cada request
3. **Maneja errores** de forma consistente
4. **Guarda la sesión** tanto en Supabase como en localStorage

```typescript
// Antes de cada request:
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token || publicAnonKey;

// Si el token expiró, Supabase ya lo refrescó automáticamente
```

#### Helpers de Supabase

```typescript
import { supabase, getAccessToken, isAuthenticated, getCurrentUser } from '../lib/supabase';

// Obtener token actual
const token = await getAccessToken();

// Verificar si está autenticado
const isAuth = await isAuthenticated();

// Obtener usuario actual
const user = await getCurrentUser();
```

---

## 📋 Checklist de Verificación

### ✅ Autenticación
- [x] Login con validación de Zod
- [x] Refresh tokens automáticos configurados
- [x] onAuthStateChange escuchando eventos
- [x] Rutas protegidas con ProtectedRoute
- [x] Logout limpia sesión de Supabase

### ✅ React Query
- [x] QueryClientProvider en App.tsx
- [x] Hooks creados para todos los módulos
- [x] Caché configurado con staleTime apropiado
- [x] Invalidación automática de caché
- [x] Toast notifications en mutations
- [x] DevTools habilitados en desarrollo

### ✅ Validación
- [x] Schemas de Zod para todos los formularios
- [x] Integración con react-hook-form
- [x] Mensajes de error en español
- [x] Validación de tipos TypeScript

### ✅ UI/UX
- [x] Loading states
- [x] Error handling
- [x] Toast notifications (sonner)
- [x] Responsive design

---

## 🎯 Cómo Usar en Nuevos Componentes

### Ejemplo Completo: Formulario de Usuario

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '../lib/validations';
import { useCreateUser } from '../hooks/useUsers';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function CreateUserForm() {
  const createUser = useCreateUser();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      await createUser.mutateAsync(data);
      reset(); // Limpiar formulario
    } catch (error) {
      // El error ya se muestra en toast automáticamente
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          {...register('name')}
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          disabled={isSubmitting}
        />
        {errors.email && (
          <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          {...register('phone')}
          disabled={isSubmitting}
        />
        {errors.phone && (
          <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="membership_type">Tipo de Membresía</Label>
        <select {...register('membership_type')} disabled={isSubmitting}>
          <option value="Mensual">Mensual</option>
          <option value="Trimestral">Trimestral</option>
          <option value="Semestral">Semestral</option>
          <option value="Anual">Anual</option>
        </select>
        {errors.membership_type && (
          <p className="text-xs text-red-500 mt-1">{errors.membership_type.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : 'Crear Usuario'}
      </Button>
    </form>
  );
}
```

### Ejemplo: Lista de Usuarios

```typescript
import { useUsers, useDeleteUser } from '../hooks/useUsers';
import { Loader2, Trash2 } from 'lucide-react';

export function UsersList() {
  const { data: users, isLoading, error } = useUsers();
  const deleteUser = useDeleteUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
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

  return (
    <div className="space-y-2">
      {users?.map((user) => (
        <div key={user.id} className="flex items-center justify-between p-4 border rounded">
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <button
            onClick={() => deleteUser.mutate(user.id)}
            disabled={deleteUser.isPending}
            className="p-2 hover:bg-red-500/10 rounded"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔧 Configuración de Caché

### Tiempos de Caché Recomendados

```typescript
// Datos que cambian frecuentemente (1-2 minutos)
- Asistencia: 1 minuto
- Estadísticas: 1 minuto
- Pagos: 2 minutos

// Datos que cambian moderadamente (5 minutos)
- Usuarios: 5 minutos
- Asignaciones de rutinas: 5 minutos

// Datos que casi no cambian (10+ minutos)
- Rutinas: 10 minutos
- Staff: 10 minutos
```

### Refetch Automático

```typescript
// Refetch al volver a la pestaña
refetchOnWindowFocus: true

// Refetch cada X tiempo
refetchInterval: 1000 * 60 * 5 // 5 minutos

// No refetch automático
refetchOnWindowFocus: false
```

---

## 🚨 Manejo de Errores

### En Queries

```typescript
const { data, error, isError } = useUsers();

if (isError) {
  // error.message contiene el mensaje de error
  return <ErrorComponent message={error.message} />;
}
```

### En Mutations

```typescript
const createUser = useCreateUser();

createUser.mutate(data, {
  onSuccess: () => {
    console.log('Usuario creado'); // Toast automático
  },
  onError: (error) => {
    console.error(error); // Toast automático
  },
});
```

---

## 📊 DevTools

En desarrollo, React Query DevTools está habilitado:

- Presiona el icono de React Query en la esquina inferior
- Ver todas las queries y mutations
- Ver el estado del caché
- Ver los tiempos de refetch
- Invalidar caché manualmente

---

## 🎨 Próximos Pasos Sugeridos

1. **Implementar formularios en todas las páginas**
   - Usar schemas de Zod
   - Usar hooks de React Query
   - Validación en tiempo real

2. **Agregar optimistic updates**
   ```typescript
   const updateUser = useUpdateUser();
   
   updateUser.mutate(data, {
     onMutate: async (newData) => {
       // Actualizar UI inmediatamente
       await queryClient.cancelQueries({ queryKey: ['users'] });
       const previousData = queryClient.getQueryData(['users']);
       queryClient.setQueryData(['users'], (old) => [...old, newData]);
       return { previousData };
     },
     onError: (err, newData, context) => {
       // Revertir en caso de error
       queryClient.setQueryData(['users'], context.previousData);
     },
   });
   ```

3. **Implementar paginación**
   ```typescript
   const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
     queryKey: ['users'],
     queryFn: ({ pageParam = 0 }) => fetchUsers(pageParam),
     getNextPageParam: (lastPage) => lastPage.nextCursor,
   });
   ```

4. **Agregar filtros y búsqueda**
   ```typescript
   const [search, setSearch] = useState('');
   
   const { data } = useUsers();
   const filteredUsers = data?.filter(u => 
     u.name.toLowerCase().includes(search.toLowerCase())
   );
   ```

---

## 📚 Recursos

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Zod Docs](https://zod.dev/)
- [React Hook Form Docs](https://react-hook-form.com/)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

---

## ✨ Resumen

Tu sistema ahora tiene:

✅ **React Query** - Caché inteligente y sincronización automática
✅ **Zod** - Validación robusta de formularios
✅ **Refresh Tokens** - Sesiones que nunca expiran inesperadamente
✅ **Supabase Integration** - Conexión directa y segura con el backend
✅ **TypeScript** - Type safety completo
✅ **Toast Notifications** - Feedback visual automático
✅ **Error Handling** - Manejo consistente de errores
✅ **Loading States** - UX mejorada

🎉 **¡El sistema está listo para escalar y agregar más funcionalidades!**
