# 🔐 Instrucciones para Crear Usuarios en Supabase

## ⚡ Pasos Rápidos

### 1️⃣ Abrir Supabase SQL Editor

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. En el menú lateral, click en **SQL Editor**
3. Click en **New Query** (nueva consulta)

### 2️⃣ Copiar y Ejecutar el SQL

1. Abre el archivo: **`CREAR_USUARIOS_PRUEBA.sql`**
2. Copia **TODO** el contenido del archivo
3. Pégalo en el editor SQL de Supabase
4. Click en el botón **RUN** (o presiona Ctrl+Enter)

### 3️⃣ Verificar Creación

Deberías ver un mensaje de éxito y una tabla con los 3 usuarios creados:

| Email | Nombre | Rol | Estado |
|-------|--------|-----|--------|
| admin@gymlagunetica.com | Carlos Administrador | administrador | Confirmado |
| entrenador@gymlagunetica.com | Pedro Entrenador | entrenador | Confirmado |
| usuario@gymlagunetica.com | María Usuario | usuario | Confirmado |

---

## 🔑 Credenciales de Acceso

### 👤 ADMINISTRADOR (Acceso Total)
```
Email: admin@gymlagunetica.com
Password: Admin123!
```
**Permisos:** 
- ✅ Ver y gestionar usuarios
- ✅ Gestionar pagos
- ✅ Gestionar personal
- ✅ Ver reportes
- ✅ Crear y asignar rutinas
- ✅ Ver asistencia

---

### 🏋️ ENTRENADOR
```
Email: entrenador@gymlagunetica.com
Password: Trainer123!
```
**Permisos:**
- ✅ Ver usuarios
- ✅ Crear y asignar rutinas
- ✅ Ver progreso físico de usuarios
- ✅ Ver asistencia
- ❌ No puede gestionar pagos
- ❌ No puede gestionar personal

---

### 💪 USUARIO (Cliente del Gym)
```
Email: usuario@gymlagunetica.com
Password: User123!
```
**Permisos:**
- ✅ Ver su rutina asignada
- ✅ Registrar ejercicios completados
- ✅ Ver su progreso físico
- ✅ Ver su historial de pagos
- ❌ No puede ver otros usuarios
- ❌ No puede crear rutinas

---

## 🧪 Probar el Sistema

### Paso 1: Login
1. Abre tu aplicación (normalmente en `http://localhost:5173`)
2. Deberías ver la pantalla de login
3. Usa las credenciales de arriba para probar cada rol

### Paso 2: Login Rápido (Desarrollo)
En la pantalla de login verás botones de **"Credenciales de Prueba"**:
- Click en **"Administrador"** para autocompletar el admin
- Click en **"Entrenador"** para autocompletar el entrenador
- Click en **"Usuario"** para autocompletar el usuario
- Luego click en **"Iniciar Sesión"**

### Paso 3: Verificar Permisos
Cada rol verá diferentes secciones en el menú lateral:

**Administrador ve:**
- 📊 Dashboard
- 👥 Usuarios
- 💰 Pagos
- 👔 Personal
- 📋 Rutinas
- 📈 Reportes
- ✅ Asistencia

**Entrenador ve:**
- 📊 Dashboard (limitado)
- 👥 Usuarios
- 📋 Rutinas
- ✅ Asistencia

**Usuario ve:**
- 🏋️ Mi Rutina
- 💰 Mis Pagos

---

## 🔍 Verificación Manual en Supabase

### Verificar usuarios en `auth.users`:

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data,
  created_at
FROM auth.users
WHERE email IN (
  'admin@gymlagunetica.com',
  'entrenador@gymlagunetica.com',
  'usuario@gymlagunetica.com'
)
ORDER BY email;
```

### Verificar perfiles en `user_profiles`:

```sql
SELECT 
  id,
  email,
  full_name,
  role,
  member_number,
  membership_status,
  membership_type
FROM public.user_profiles
WHERE email IN (
  'admin@gymlagunetica.com',
  'entrenador@gymlagunetica.com',
  'usuario@gymlagunetica.com'
)
ORDER BY 
  CASE role
    WHEN 'administrador' THEN 1
    WHEN 'entrenador' THEN 2
    WHEN 'usuario' THEN 3
  END;
```

---

## ❌ Solución de Problemas

### Problema: "Email already registered"
**Causa:** Los usuarios ya existen en la base de datos.

**Solución 1 - Borrar y recrear:**
```sql
-- Borrar usuarios existentes
DELETE FROM auth.users WHERE email IN (
  'admin@gymlagunetica.com',
  'entrenador@gymlagunetica.com', 
  'usuario@gymlagunetica.com'
);

-- Los perfiles se borrarán automáticamente por CASCADE
-- Ahora ejecuta de nuevo CREAR_USUARIOS_PRUEBA.sql
```

**Solución 2 - Solo actualizar perfiles:**
Si los usuarios existen pero no tienen perfil:
```sql
-- Ejecuta solo la parte de PASO 3 del archivo CREAR_USUARIOS_PRUEBA.sql
```

---

### Problema: "Invalid login credentials"
**Causas posibles:**

1. **Email no confirmado:**
   ```sql
   -- Verificar confirmación
   SELECT email, email_confirmed_at 
   FROM auth.users 
   WHERE email = 'admin@gymlagunetica.com';
   
   -- Si email_confirmed_at es NULL, ejecutar:
   UPDATE auth.users 
   SET email_confirmed_at = NOW()
   WHERE email = 'admin@gymlagunetica.com';
   ```

2. **Contraseña incorrecta:**
   - Asegúrate de usar exactamente: `Admin123!` (con mayúscula y símbolo)
   - La contraseña es case-sensitive

3. **Usuario no existe:**
   - Ejecuta el SQL de verificación de arriba
   - Si no aparece, ejecuta `CREAR_USUARIOS_PRUEBA.sql` completo

---

### Problema: "No se muestra el perfil" o "profile is null"
**Causa:** El perfil no se creó en `user_profiles`.

**Solución:**
```sql
-- Verificar si existe el perfil
SELECT * FROM public.user_profiles 
WHERE email = 'admin@gymlagunetica.com';

-- Si no existe, crear manualmente:
INSERT INTO public.user_profiles (
  id, email, full_name, role, member_number, membership_status
)
SELECT 
  au.id,
  'admin@gymlagunetica.com',
  'Carlos Administrador',
  'administrador',
  'ADMIN-001',
  'Activo'
FROM auth.users au
WHERE au.email = 'admin@gymlagunetica.com';
```

---

### Problema: "El usuario ve secciones incorrectas"
**Causa:** El rol en `user_profiles` es incorrecto.

**Solución:**
```sql
-- Verificar rol actual
SELECT email, role FROM public.user_profiles 
WHERE email = 'admin@gymlagunetica.com';

-- Corregir rol si es necesario
UPDATE public.user_profiles 
SET role = 'administrador'
WHERE email = 'admin@gymlagunetica.com';
```

---

## 🔄 Reset Completo (Borrar Todo y Empezar de Cero)

Si nada funciona, ejecuta esto para empezar desde cero:

```sql
-- ⚠️ CUIDADO: Esto borra TODOS los usuarios

-- 1. Borrar usuarios de prueba
DELETE FROM auth.users WHERE email LIKE '%gymlagunetica.com%';

-- 2. Verificar que se borraron
SELECT COUNT(*) FROM auth.users;

-- 3. Ejecutar de nuevo CREAR_USUARIOS_PRUEBA.sql completo
```

---

## 📋 Checklist de Verificación

Después de ejecutar el SQL, verifica:

- [ ] ✅ Los 3 usuarios aparecen en **Authentication > Users** en Supabase
- [ ] ✅ Los 3 usuarios tienen `email_confirmed_at` con fecha (no NULL)
- [ ] ✅ Los 3 perfiles aparecen en **Table Editor > user_profiles**
- [ ] ✅ Cada perfil tiene el `role` correcto
- [ ] ✅ Puedes hacer login con `admin@gymlagunetica.com` / `Admin123!`
- [ ] ✅ Puedes hacer login con `entrenador@gymlagunetica.com` / `Trainer123!`
- [ ] ✅ Puedes hacer login con `usuario@gymlagunetica.com` / `User123!`
- [ ] ✅ Cada rol ve las secciones correctas en el sidebar

---

## 🎯 Próximos Pasos

Una vez que los usuarios estén creados y funcionando:

1. **Crear más usuarios regulares:**
   - Ve a la página de **Usuarios** (como admin)
   - Click en "Nuevo Usuario"
   - Llena el formulario

2. **Asignar rutinas:**
   - Ve a **Rutinas** (como admin o entrenador)
   - Crea una rutina nueva
   - Asígnala a usuarios

3. **Probar flujo completo:**
   - Login como usuario
   - Ve a "Mi Rutina"
   - Registra ejercicios completados

---

## 📞 Soporte

Si después de todos estos pasos algo no funciona:

1. **Revisar console del navegador (F12)** - Busca errores
2. **Revisar logs de Supabase** - Dashboard > Logs
3. **Verificar RLS policies** - Asegúrate que están activas
4. **Limpiar localStorage** - Application > Local Storage > Clear

---

## ✅ ¡Listo!

Ahora tienes 3 usuarios de prueba funcionando y puedes empezar a usar el sistema completo.

**¡Disfruta tu sistema de gestión de gimnasio! 🏋️‍♂️💪**
