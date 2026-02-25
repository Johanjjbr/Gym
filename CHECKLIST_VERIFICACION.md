# ✅ Checklist de Verificación - Sistema GYM Lagunetica

## 🎯 Guía Rápida para Verificar que Todo Funciona

---

## FASE 1: Base de Datos (Supabase)

### 📊 Verificar Schema Creado

- [ ] **Abrir Supabase Dashboard**
  ```
  https://supabase.com/dashboard/project/[tu-project-id]
  ```

- [ ] **Table Editor → Ver 12 tablas creadas:**
  - [ ] ✅ `user_profiles`
  - [ ] ✅ `payments`
  - [ ] ✅ `invoices`
  - [ ] ✅ `attendance`
  - [ ] ✅ `physical_progress`
  - [ ] ✅ `routine_templates`
  - [ ] ✅ `routine_exercises`
  - [ ] ✅ `user_routine_assignments`
  - [ ] ✅ `workout_sessions`
  - [ ] ✅ `workout_exercise_logs`
  - [ ] ✅ `workout_set_logs`
  - [ ] ✅ `staff_shifts`

- [ ] **SQL Editor → Ejecutar verificación:**
  ```sql
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name;
  ```
  **Resultado esperado:** 12 tablas listadas

---

## FASE 2: Usuarios Creados

### 👥 Verificar Usuarios en Authentication

- [ ] **Authentication → Users**
  - [ ] Ver 3 usuarios en la lista
  - [ ] Todos tienen ✓ confirmado (email_confirmed_at no es NULL)

- [ ] **Ejecutar query de verificación:**
  ```sql
  SELECT 
    email, 
    email_confirmed_at,
    created_at,
    (raw_user_meta_data->>'role') as metadata_role
  FROM auth.users
  WHERE email IN (
    'admin@gymlagunetica.com',
    'entrenador@gymlagunetica.com',
    'usuario@gymlagunetica.com'
  )
  ORDER BY email;
  ```
  
  **Resultado esperado:**
  | email | email_confirmed_at | metadata_role |
  |-------|-------------------|---------------|
  | admin@... | [fecha] | administrador |
  | entrenador@... | [fecha] | entrenador |
  | usuario@... | [fecha] | usuario |

---

### 📋 Verificar Perfiles en user_profiles

- [ ] **Table Editor → user_profiles**
  - [ ] Ver 3 perfiles
  - [ ] Cada uno con su `member_number` único
  - [ ] Cada uno con su `role` correcto

- [ ] **Ejecutar query de verificación:**
  ```sql
  SELECT 
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
  
  **Resultado esperado:**
  | email | full_name | role | member_number | status |
  |-------|-----------|------|---------------|--------|
  | admin@... | Carlos Administrador | administrador | ADMIN-001 | Activo |
  | entrenador@... | Pedro Entrenador | entrenador | TRAINER-001 | Activo |
  | usuario@... | María Usuario | usuario | MEMBER-001 | Activo |

---

## FASE 3: Autenticación Configurada

### 🔐 Verificar Configuración de Auth

- [ ] **Authentication → Settings → Auth Providers**
  - [ ] Email Provider está **ACTIVADO** (verde)
  
- [ ] **Authentication → Settings → Email Auth**
  - [ ] "Enable email confirmations" está **DESACTIVADO** ❌
  - [ ] "Enable email sign ups" está **ACTIVADO** ✅

- [ ] **Authentication → URL Configuration**
  - [ ] Site URL configurada (puede ser localhost para dev)

---

## FASE 4: Row Level Security (RLS)

### 🔒 Verificar RLS Activado

- [ ] **SQL Editor → Ejecutar:**
  ```sql
  SELECT 
    tablename,
    rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
  ```
  
  **Resultado esperado:** Todas las tablas con `rowsecurity = true`

- [ ] **Verificar policies existen:**
  ```sql
  SELECT 
    schemaname,
    tablename,
    policyname
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
  ```
  
  **Resultado esperado:** Múltiples policies listadas

---

## FASE 5: Testing de Login

### 🧪 Probar Login - ADMINISTRADOR

- [ ] **Ir a http://localhost:5173/login**
- [ ] **Ingresar credenciales:**
  - Email: `admin@gymlagunetica.com`
  - Password: `Admin123!`
- [ ] **Click "Iniciar Sesión"**
- [ ] **Verificar redirección a Dashboard**
- [ ] **Verificar en Sidebar que se muestran:**
  - [ ] ✅ Dashboard
  - [ ] ✅ Usuarios
  - [ ] ✅ Pagos
  - [ ] ✅ Personal
  - [ ] ✅ Rutinas
  - [ ] ✅ Reportes
  - [ ] ✅ Asistencia

---

### 🧪 Probar Login - ENTRENADOR

- [ ] **Cerrar sesión** (botón en sidebar)
- [ ] **Ingresar credenciales:**
  - Email: `entrenador@gymlagunetica.com`
  - Password: `Trainer123!`
- [ ] **Click "Iniciar Sesión"**
- [ ] **Verificar en Sidebar que se muestran:**
  - [ ] ✅ Dashboard (limitado)
  - [ ] ✅ Usuarios
  - [ ] ✅ Rutinas
  - [ ] ✅ Asistencia
  - [ ] ❌ NO Pagos
  - [ ] ❌ NO Personal
  - [ ] ❌ NO Reportes

---

### 🧪 Probar Login - USUARIO

- [ ] **Cerrar sesión**
- [ ] **Ingresar credenciales:**
  - Email: `usuario@gymlagunetica.com`
  - Password: `User123!`
- [ ] **Click "Iniciar Sesión"**
- [ ] **Verificar en Sidebar que se muestran SOLO:**
  - [ ] ✅ Mi Rutina
  - [ ] ✅ Mis Pagos
  - [ ] ❌ Nada más

---

## FASE 6: Funcionalidad Básica

### ✏️ Probar como ADMINISTRADOR

- [ ] **Login como admin**
- [ ] **Ir a Usuarios**
  - [ ] Ver lista de usuarios
  - [ ] Click en un usuario → Ver detalle
  - [ ] Volver a lista
- [ ] **Ir a Pagos**
  - [ ] Ver lista vacía o con datos
  - [ ] Verificar que carga sin errores
- [ ] **Ir a Rutinas**
  - [ ] Ver lista vacía o con datos
  - [ ] Verificar que carga sin errores

---

### ✏️ Probar como ENTRENADOR

- [ ] **Login como entrenador**
- [ ] **Ir a Usuarios**
  - [ ] Ver lista de usuarios
  - [ ] Verificar que puede ver usuarios
- [ ] **Ir a Rutinas**
  - [ ] Verificar que carga
  - [ ] Verificar que puede crear rutinas (si hay botón)
- [ ] **Intentar acceder a /pagos**
  - [ ] Debería redirigir o mostrar "No tienes permiso"

---

### ✏️ Probar como USUARIO

- [ ] **Login como usuario**
- [ ] **Ir a Mi Rutina**
  - [ ] Ver mensaje o rutina asignada
  - [ ] Verificar que carga sin errores
- [ ] **Intentar acceder manualmente a /usuarios**
  - [ ] Debería redirigir o mostrar "No tienes permiso"

---

## FASE 7: Consola del Navegador

### 🐛 Verificar No Hay Errores

- [ ] **Abrir DevTools (F12)**
- [ ] **Ir a Console**
- [ ] **Verificar que NO hay:**
  - [ ] ❌ Errores rojos
  - [ ] ❌ "this.lock is not a function"
  - [ ] ❌ "Acquiring lock timed out"
  - [ ] ❌ "Cannot read properties of null"
  - [ ] ❌ Errores de Supabase

**Si hay warnings (amarillo) está bien, pero NO debe haber errores (rojo)**

---

## FASE 8: LocalStorage

### 💾 Verificar Sesión Guardada

- [ ] **DevTools → Application → Local Storage**
- [ ] **Buscar items de Supabase:**
  - [ ] `sb-[project-id]-auth-token` existe
  - [ ] Tiene un valor (JSON con session)

- [ ] **Recargar página (F5)**
  - [ ] Sesión se mantiene
  - [ ] NO pide login de nuevo
  - [ ] Dashboard carga correctamente

---

## 🎯 CHECKLIST FINAL

### ✅ Sistema Completamente Funcional

- [ ] ✅ Base de datos creada (12 tablas)
- [ ] ✅ RLS activado y funcionando
- [ ] ✅ 3 usuarios creados
- [ ] ✅ Login funciona con los 3 roles
- [ ] ✅ Permisos correctos por rol
- [ ] ✅ Sidebar muestra secciones según rol
- [ ] ✅ No hay errores en consola
- [ ] ✅ Sesión persiste al recargar
- [ ] ✅ Logout funciona correctamente
- [ ] ✅ Re-login funciona sin problemas

---

## 🚨 Si Algo Falla

### ❌ Errores de Login

**Ver:** `INSTRUCCIONES_CREAR_USUARIOS.md` → Sección "Problemas Comunes"

**Solución rápida:**
```sql
-- Verificar email confirmado
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
```

---

### ❌ Errores de Lock

**Ver:** `SOLUCION_ERRORES_LOCK.md`

**Solución rápida:**
```javascript
// En consola del navegador:
localStorage.clear();
location.reload();
```

---

### ❌ Permisos Incorrectos

**Verificar rol:**
```sql
SELECT email, role FROM public.user_profiles;

-- Corregir si es necesario:
UPDATE public.user_profiles 
SET role = 'administrador'
WHERE email = 'admin@gymlagunetica.com';
```

---

### ❌ Perfil No Creado

**Crear manualmente:**
```sql
INSERT INTO public.user_profiles (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Usuario'),
  COALESCE(au.raw_user_meta_data->>'role', 'usuario')
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.user_profiles);
```

---

## 📊 Queries Útiles de Verificación

### Ver todo junto:
```sql
SELECT 
  au.email,
  up.full_name,
  up.role,
  up.member_number,
  up.membership_status,
  au.email_confirmed_at as confirmado,
  au.created_at as fecha_registro
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
ORDER BY up.role;
```

### Contar registros:
```sql
SELECT 
  (SELECT COUNT(*) FROM auth.users) as usuarios_auth,
  (SELECT COUNT(*) FROM public.user_profiles) as perfiles,
  (SELECT COUNT(*) FROM public.user_profiles WHERE role = 'administrador') as admins,
  (SELECT COUNT(*) FROM public.user_profiles WHERE role = 'entrenador') as entrenadores,
  (SELECT COUNT(*) FROM public.user_profiles WHERE role = 'usuario') as usuarios;
```

---

## ✅ TODO LISTO

Si completaste todos los checks de arriba, **¡el sistema está 100% funcional!** 🎉

### 🎓 Próximos Pasos:

1. **Crear más usuarios** desde el sistema (como admin)
2. **Crear rutinas** y asignarlas
3. **Registrar pagos** de membresías
4. **Ver reportes** y estadísticas
5. **Personalizar** el diseño según tus necesidades

---

**¡Disfruta tu sistema de gestión de gimnasio! 💪🏋️‍♂️**
