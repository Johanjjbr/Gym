# 🏋️ Configuración de Supabase - GYM Lagunetica

## 📋 Índice
1. [Configuración de Base de Datos](#1-configuración-de-base-de-datos)
2. [Configuración de Autenticación](#2-configuración-de-autenticación)
3. [Sistema de Roles](#3-sistema-de-roles)
4. [Crear Usuarios Iniciales](#4-crear-usuarios-iniciales)
5. [Permisos y Acceso por Rol](#5-permisos-y-acceso-por-rol)

---

## 1. Configuración de Base de Datos

### Paso 1: Ejecutar Migraciones

1. Ve a tu proyecto de Supabase: https://app.supabase.com
2. Navega a **SQL Editor** en el menú lateral
3. Crea una nueva query y pega el contenido completo del archivo:
   - `supabase/migrations/001_initial_schema.sql`
4. Ejecuta la query (Run)
5. Luego, crea otra query y pega el contenido de:
   - `supabase/migrations/002_seed_data.sql`
6. Ejecuta esta segunda query

### Verificación
- Ve a **Table Editor** y deberías ver todas las tablas creadas:
  - user_profiles
  - payments
  - invoices
  - attendance
  - physical_progress
  - routine_templates
  - routine_exercises
  - user_routine_assignments
  - workout_sessions
  - workout_exercise_logs
  - workout_set_logs
  - staff_shifts

---

## 2. Configuración de Autenticación

### Paso 1: Configurar Email Auth (Básico)

1. Ve a **Authentication** > **Providers** en Supabase
2. Asegúrate de que **Email** está habilitado
3. En **Email Templates**, puedes personalizar los emails:
   - Confirm signup
   - Invite user
   - Magic Link
   - Change Email Address
   - Reset Password

### Paso 2: Configurar URL de Redirección

1. Ve a **Authentication** > **URL Configuration**
2. Agrega tu URL de desarrollo y producción:
   - Development: `http://localhost:5173`
   - Production: `https://tu-dominio.com`

### Paso 3: Deshabilitar Confirmación de Email (Opcional para Testing)

⚠️ **Solo para desarrollo/testing**

1. Ve a **Authentication** > **Providers** > **Email**
2. Desactiva **"Enable email confirmations"**
3. Esto permite que los usuarios se registren sin confirmar email

**Para Producción:** Mantén la confirmación de email activada por seguridad.

---

## 3. Sistema de Roles

El sistema tiene 3 roles con diferentes permisos:

### 👨‍💼 Administrador (`administrador`)
**Acceso Completo** - Puede ver y gestionar todo el sistema:
- ✅ Dashboard (estadísticas completas)
- ✅ Gestión de Usuarios (crear, editar, eliminar)
- ✅ Control de Pagos (registrar, ver todos)
- ✅ Gestión de Personal (crear entrenadores, turnos)
- ✅ Registro de Asistencia
- ✅ Gestión de Rutinas (crear, asignar, editar)
- ✅ Reportes y Estadísticas
- ✅ Configuración del Sistema

### 🏃 Entrenador (`entrenador`)
**Gestión de Usuarios y Entrenamiento:**
- ✅ Dashboard (vista limitada)
- ✅ Ver Usuarios asignados
- ✅ Ver Pagos de sus usuarios
- ✅ Registro de Asistencia
- ✅ Gestión de Rutinas (crear, asignar)
- ✅ Mi Entrenamiento (opcional)
- ✅ Seguimiento de Progreso Físico
- ❌ Gestión de Personal
- ❌ Reportes Financieros Completos

### 💪 Usuario (`usuario`)
**Vista Personal:**
- ✅ Dashboard Personal (sus estadísticas)
- ✅ Mi Perfil
- ✅ Mis Pagos e Historial
- ✅ Mi Asistencia
- ✅ Mi Entrenamiento (rutinas asignadas)
- ✅ Mi Progreso Físico
- ❌ Gestión de otros usuarios
- ❌ Gestión de Personal
- ❌ Gestión de Pagos de otros
- ❌ Creación de Rutinas

---

## 4. Crear Usuarios Iniciales

### Opción A: Desde Supabase Dashboard (Recomendado)

1. Ve a **Authentication** > **Users**
2. Click en **"Add user"** > **"Create new user"**
3. Llena los campos:
   ```
   Email: admin@gymlagunetica.com
   Password: Admin123! (cámbialo después)
   Auto Confirm User: ✓ (activado)
   ```
4. En **User Metadata** agrega:
   ```json
   {
     "full_name": "Administrador Principal",
     "role": "administrador"
   }
   ```
5. Click en **"Create user"**

**Repite para crear:**

#### Entrenador 1:
```
Email: laura.perez@gymlagunetica.com
Password: Trainer123!
User Metadata:
{
  "full_name": "Laura Pérez",
  "role": "entrenador"
}
```

#### Entrenador 2:
```
Email: carmen.lopez@gymlagunetica.com
Password: Trainer123!
User Metadata:
{
  "full_name": "Carmen López",
  "role": "entrenador"
}
```

#### Usuario de Prueba:
```
Email: carlos.mendoza@email.com
Password: User123!
User Metadata:
{
  "full_name": "Carlos Mendoza",
  "role": "usuario"
}
```

### Opción B: Completar Perfiles Manualmente (Si los metadata no funcionan)

Si los perfiles no se crean automáticamente, ve a **SQL Editor** y ejecuta:

```sql
-- Actualizar rol del administrador
UPDATE public.user_profiles 
SET 
  role = 'administrador',
  full_name = 'Administrador Principal',
  membership_type = NULL,
  membership_status = NULL
WHERE email = 'admin@gymlagunetica.com';

-- Actualizar rol del entrenador
UPDATE public.user_profiles 
SET 
  role = 'entrenador',
  full_name = 'Laura Pérez',
  membership_type = NULL,
  membership_status = NULL
WHERE email = 'laura.perez@gymlagunetica.com';

-- Actualizar usuario normal
UPDATE public.user_profiles 
SET 
  role = 'usuario',
  full_name = 'Carlos Mendoza',
  member_number = 'USR-001',
  membership_type = 'Premium',
  membership_status = 'Activo',
  phone = '+58 424-1234567',
  join_date = CURRENT_DATE
WHERE email = 'carlos.mendoza@email.com';
```

### Actualizar created_by en Rutinas

Después de crear los entrenadores, actualiza las rutinas de ejemplo:

```sql
-- Obtener el ID del primer entrenador
-- Reemplaza 'entrenador-uuid' con el ID real del entrenador

UPDATE public.routine_templates
SET created_by = (SELECT id FROM public.user_profiles WHERE role = 'entrenador' LIMIT 1)
WHERE created_by IS NULL;
```

---

## 5. Permisos y Acceso por Rol

### Tabla de Permisos Detallada

| Sección | Administrador | Entrenador | Usuario |
|---------|---------------|------------|---------|
| **Dashboard** | ✅ Completo | ✅ Limitado | ✅ Personal |
| **Gestión Usuarios** | ✅ Crear/Editar/Eliminar | 👁️ Solo Ver | ❌ No |
| **Control de Pagos** | ✅ Todo | 👁️ Ver de sus usuarios | 👁️ Solo propios |
| **Gestión Personal** | ✅ Todo | ❌ No | ❌ No |
| **Asistencia** | ✅ Registrar/Ver Todo | ✅ Registrar/Ver | 👁️ Solo propia |
| **Rutinas** | ✅ Crear/Editar/Asignar | ✅ Crear/Editar/Asignar | 👁️ Solo asignadas |
| **Mi Entrenamiento** | ⚪ Opcional | ⚪ Opcional | ✅ Sí |
| **Progreso Físico** | ✅ Todo | ✅ Registrar/Ver | 👁️ Solo propio |
| **Reportes** | ✅ Completos | ⚪ Limitados | ❌ No |

**Leyenda:**
- ✅ Acceso Completo
- 👁️ Solo Lectura / Datos Propios
- ⚪ Opcional
- ❌ Sin Acceso

---

## 6. Seguridad - Row Level Security (RLS)

El sistema implementa RLS automáticamente. Las políticas aseguran que:

### Para Administradores:
- ✅ Acceso total a todos los registros
- ✅ Pueden crear, leer, actualizar y eliminar

### Para Entrenadores:
- ✅ Pueden ver todos los usuarios
- ✅ Pueden crear y gestionar rutinas
- ✅ Pueden registrar progreso físico de sus usuarios
- ❌ No pueden eliminar usuarios
- ❌ No pueden gestionar personal

### Para Usuarios:
- ✅ Solo ven sus propios datos
- ✅ Pueden actualizar su perfil
- ✅ Pueden gestionar sus sesiones de entrenamiento
- ❌ No pueden ver datos de otros usuarios
- ❌ No pueden modificar pagos

---

## 7. Testing del Sistema

### Probar Login con Cada Rol:

1. **Como Administrador:**
   - Email: `admin@gymlagunetica.com`
   - Deberías ver todas las secciones del sidebar

2. **Como Entrenador:**
   - Email: `laura.perez@gymlagunetica.com`
   - Deberías ver: Dashboard, Usuarios (solo lectura), Rutinas, Asistencia

3. **Como Usuario:**
   - Email: `carlos.mendoza@email.com`
   - Deberías ver: Mi Perfil, Mi Entrenamiento, Mi Progreso

### Verificar RLS:

Intenta acceder a datos de otros usuarios - el sistema debería bloquearlo automáticamente.

---

## 8. Configuración de Variables de Entorno

Ya están configuradas en el proyecto, pero verifica:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

Estas se obtienen de:
**Settings** > **API** en Supabase Dashboard

---

## 9. Próximos Pasos

1. ✅ Ejecutar migraciones SQL
2. ✅ Crear usuarios iniciales
3. ✅ Verificar RLS y permisos
4. ✅ Probar login con cada rol
5. ✅ Personalizar emails de autenticación
6. 🔄 Configurar Storage para fotos de perfil (opcional)
7. 🔄 Configurar backups automáticos

---

## 10. Troubleshooting

### Problema: Los perfiles no se crean automáticamente
**Solución:** Ejecuta manualmente los INSERTs en user_profiles (ver Opción B arriba)

### Problema: RLS bloquea todo
**Solución:** Verifica que el usuario tenga el rol correcto en user_profiles

### Problema: No puedo ver rutinas
**Solución:** Actualiza el campo `created_by` en routine_templates con un ID de entrenador válido

### Problema: Error de permisos en el frontend
**Solución:** Asegúrate de estar usando el `ANON_KEY` y no el `SERVICE_ROLE_KEY` en el frontend

---

## 📞 Soporte

Para más información sobre Supabase:
- [Documentación Oficial](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

---

**¡Sistema listo para usar! 🎉**
