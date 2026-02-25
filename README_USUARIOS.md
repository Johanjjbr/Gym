# 👥 Sistema de Usuarios - GYM Lagunetica

## 🚀 Creación Rápida de Usuarios

### ✅ Ya está todo listo para ejecutar

Solo necesitas seguir 3 pasos simples:

---

## 📋 Paso a Paso

### 1️⃣ Abrir SQL Editor en Supabase
```
Supabase Dashboard → SQL Editor → New Query
```

### 2️⃣ Copiar y ejecutar el archivo SQL
```
Archivo: CREAR_USUARIOS_PRUEBA.sql
Acción: Copiar TODO → Pegar → RUN
```

### 3️⃣ ¡Listo! Ya puedes hacer login
```
Ve a tu app y usa las credenciales de abajo
```

---

## 🔑 CREDENCIALES CREADAS

### 👤 ADMINISTRADOR (Acceso Total)
```
📧 Email:    admin@gymlagunetica.com
🔒 Password: Admin123!
👔 Rol:      Administrador
```

**Puede ver y hacer TODO:**
- ✅ Gestionar usuarios
- ✅ Gestionar pagos  
- ✅ Gestionar personal
- ✅ Ver reportes
- ✅ Crear rutinas
- ✅ Ver asistencia

---

### 🏋️ ENTRENADOR
```
📧 Email:    entrenador@gymlagunetica.com
🔒 Password: Trainer123!
👔 Rol:      Entrenador
```

**Puede:**
- ✅ Ver usuarios
- ✅ Crear y asignar rutinas
- ✅ Ver progreso físico
- ✅ Ver asistencia
- ❌ NO puede gestionar pagos
- ❌ NO puede gestionar personal

---

### 💪 USUARIO (Cliente)
```
📧 Email:    usuario@gymlagunetica.com
🔒 Password: User123!
👔 Rol:      Usuario
```

**Puede:**
- ✅ Ver su rutina
- ✅ Registrar ejercicios
- ✅ Ver su progreso
- ✅ Ver sus pagos
- ❌ NO puede ver otros usuarios
- ❌ NO puede crear rutinas

---

## 🎯 Login Rápido (en la App)

En la pantalla de login verás **botones de acceso rápido**:

```
┌─────────────────────────────────────┐
│  🔧 Credenciales de Prueba          │
├─────────────────────────────────────┤
│  [Administrador] admin@gym...       │ ← Click aquí
│  [Entrenador]    entrenador@gym...  │ ← o aquí
│  [Usuario]       usuario@gym...     │ ← o aquí
└─────────────────────────────────────┘
```

1. Click en el botón del rol que quieres probar
2. Los campos se autocompletarán
3. Click en "Iniciar Sesión"
4. ¡Listo! Ya estás dentro

---

## 🔍 Verificar que Todo Funciona

### ✅ Checklist Rápido:

Después de ejecutar el SQL, verifica:

- [ ] En Supabase Dashboard → **Authentication** → Users
  - Debes ver 3 usuarios
  - Todos deben estar confirmados (✓)

- [ ] En Supabase Dashboard → **Table Editor** → user_profiles
  - Debes ver 3 perfiles
  - Cada uno con su rol correcto

- [ ] En tu App → Login
  - Probar login con admin → Ver todas las secciones
  - Probar login con entrenador → Ver menos secciones
  - Probar login con usuario → Ver solo "Mi Rutina" y "Mis Pagos"

---

## ❓ Problemas Comunes

### 🔴 "Email already registered"

**Solución:** Los usuarios ya existen. Puedes:

**Opción A - Borrarlos primero:**
```sql
DELETE FROM auth.users WHERE email LIKE '%gymlagunetica.com%';
```
Luego ejecuta de nuevo `CREAR_USUARIOS_PRUEBA.sql`

**Opción B - Usarlos directamente:**
Si ya existen, solo intenta hacer login con las credenciales

---

### 🔴 "Invalid login credentials"

**Causa 1:** Email no confirmado
```sql
-- Verificar:
SELECT email, email_confirmed_at FROM auth.users;

-- Si es NULL, ejecutar:
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'admin@gymlagunetica.com';
```

**Causa 2:** Confirmación de email está activada
```
Supabase → Authentication → Providers → Email
→ Desactivar "Enable email confirmations"
```

**Causa 3:** Contraseña incorrecta
- Asegúrate de usar EXACTAMENTE: `Admin123!`
- Case-sensitive (A mayúscula, símbolo !)

---

### 🔴 "No se muestra el perfil" 

**Causa:** Perfil no creado en `user_profiles`

**Solución:**
```sql
-- Crear perfil manualmente
INSERT INTO public.user_profiles (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  'Administrador',
  'administrador'
FROM auth.users au
WHERE au.email = 'admin@gymlagunetica.com'
ON CONFLICT (id) DO NOTHING;
```

---

### 🔴 "Veo secciones incorrectas en el menú"

**Causa:** Rol incorrecto en `user_profiles`

**Solución:**
```sql
-- Ver rol actual
SELECT email, role FROM public.user_profiles;

-- Corregir rol
UPDATE public.user_profiles 
SET role = 'administrador'  -- o 'entrenador' o 'usuario'
WHERE email = 'admin@gymlagunetica.com';
```

---

## 🔄 Reset Total (Si nada funciona)

```sql
-- 1. Borrar todo
DELETE FROM auth.users WHERE email IN (
  'admin@gymlagunetica.com',
  'entrenador@gymlagunetica.com',
  'usuario@gymlagunetica.com'
);

-- 2. Limpiar localStorage en el navegador
-- DevTools (F12) → Application → Local Storage → Clear

-- 3. Ejecutar de nuevo CREAR_USUARIOS_PRUEBA.sql
```

---

## 📚 Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `CREAR_USUARIOS_PRUEBA.sql` | ⭐ **Ejecuta este** para crear usuarios |
| `INSTRUCCIONES_CREAR_USUARIOS.md` | Guía completa paso a paso |
| `SQL_PARA_SUPABASE.sql` | Schema de la base de datos |
| `GUIA_RAPIDA_SETUP.md` | Setup completo del sistema |

---

## 🎓 Cómo Funciona (Explicación Técnica)

El SQL hace 3 cosas:

### 1. Crea usuarios en `auth.users` (tabla de Supabase Auth)
```sql
INSERT INTO auth.users (...)
VALUES (
  email = 'admin@gymlagunetica.com',
  encrypted_password = crypt('Admin123!', gen_salt('bf')),
  ...
)
```

### 2. Crea perfiles en `user_profiles` (tu tabla personalizada)
```sql
INSERT INTO public.user_profiles (id, email, full_name, role)
VALUES (user_id, 'admin@...', 'Carlos', 'administrador')
```

### 3. Vincula ambas tablas por `id`
```
auth.users.id = user_profiles.id
```

De esta forma:
- Supabase Auth maneja la autenticación (login/logout)
- Tu tabla maneja el perfil y permisos (rol, datos personales, etc.)

---

## ✅ Resumen

1. ✅ Ejecuta `CREAR_USUARIOS_PRUEBA.sql` en Supabase
2. ✅ Ve a tu app y prueba login con las 3 credenciales
3. ✅ Cada rol verá diferentes secciones en el menú
4. ✅ Si hay errores, revisa la sección "Problemas Comunes"

---

## 🆘 ¿Necesitas más ayuda?

- 📖 Ver `INSTRUCCIONES_CREAR_USUARIOS.md` (guía completa)
- 🔧 Ver `SOLUCION_ERRORES_LOCK.md` (si hay errores de lock)
- 💬 Revisar consola del navegador (F12) para ver errores
- 📊 Revisar logs de Supabase (Dashboard → Logs)

---

**¡Listo para usar! 🎉**

Una vez que los usuarios funcionen, puedes empezar a:
- Crear más usuarios desde el sistema
- Asignar rutinas
- Registrar pagos
- Ver reportes
- Y mucho más...

**¡Disfruta tu sistema de gestión de gimnasio! 💪🏋️‍♂️**
