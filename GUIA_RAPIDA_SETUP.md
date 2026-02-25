# 🚀 Guía Rápida de Configuración - GYM Lagunetica

## ✅ Lista de Verificación

### 1. Configurar Base de Datos en Supabase (15 min)

#### Paso 1.1: Ejecutar SQL
1. Ve a https://app.supabase.com
2. Abre tu proyecto
3. Click en **SQL Editor** (menú lateral)
4. Click en **New Query**
5. Abre el archivo `SQL_PARA_SUPABASE.sql` de este proyecto
6. **Copia TODO el contenido** y pégalo en el editor
7. Click en **Run** (o Cmd/Ctrl + Enter)
8. Espera a que termine (puede tardar 10-15 segundos)

#### Paso 1.2: Verificar Tablas Creadas
1. Ve a **Table Editor** en el menú lateral
2. Deberías ver 12 tablas:
   - ✅ user_profiles
   - ✅ payments
   - ✅ invoices
   - ✅ attendance
   - ✅ physical_progress
   - ✅ routine_templates
   - ✅ routine_exercises
   - ✅ user_routine_assignments
   - ✅ workout_sessions
   - ✅ workout_exercise_logs
   - ✅ workout_set_logs
   - ✅ staff_shifts

---

### 2. Configurar Autenticación (5 min)

#### Paso 2.1: Deshabilitar Confirmación de Email (Solo Desarrollo)
1. Ve a **Authentication** > **Providers**
2. Click en **Email**
3. **Desactiva** "Enable email confirmations"
4. Click en **Save**

⚠️ **IMPORTANTE:** En producción, vuelve a activar esto por seguridad.

#### Paso 2.2: Configurar URL de Redirección
1. Ve a **Authentication** > **URL Configuration**
2. Agrega tu URL local:
   ```
   http://localhost:5173
   ```
3. Click en **Save**

---

### 3. Crear Usuarios de Prueba (10 min)

#### Paso 3.1: Crear Administrador
1. Ve a **Authentication** > **Users**
2. Click en **Add user** > **Create new user**
3. Completa:
   ```
   Email: admin@gymlagunetica.com
   Password: Admin123!
   Auto Confirm User: ✓ (activado)
   ```
4. En **User Metadata** (abajo), agrega:
   ```json
   {
     "full_name": "Administrador Principal",
     "role": "administrador"
   }
   ```
5. Click en **Create user**

#### Paso 3.2: Crear Entrenador
1. Click en **Add user** > **Create new user**
2. Completa:
   ```
   Email: laura.perez@gymlagunetica.com
   Password: Trainer123!
   Auto Confirm User: ✓
   ```
3. User Metadata:
   ```json
   {
     "full_name": "Laura Pérez",
     "role": "entrenador"
   }
   ```
4. Click en **Create user**

#### Paso 3.3: Crear Usuario Normal
1. Click en **Add user** > **Create new user**
2. Completa:
   ```
   Email: carlos.mendoza@email.com
   Password: User123!
   Auto Confirm User: ✓
   ```
3. User Metadata:
   ```json
   {
     "full_name": "Carlos Mendoza",
     "role": "usuario"
   }
   ```
4. Click en **Create user**

#### Paso 3.4: Completar Perfil del Usuario
1. Ve a **SQL Editor**
2. Crea una nueva query
3. Pega y ejecuta:
   ```sql
   -- Actualizar usuario con datos completos
   UPDATE public.user_profiles 
   SET 
     member_number = 'USR-001',
     membership_type = 'Premium',
     membership_status = 'Activo',
     phone = '+58 424-1234567',
     join_date = CURRENT_DATE
   WHERE email = 'carlos.mendoza@email.com';
   ```

---

### 4. Actualizar Rutinas de Ejemplo (2 min)

1. Ve a **SQL Editor**
2. Ejecuta esta query para asignar las rutinas al entrenador:
   ```sql
   -- Actualizar created_by en rutinas con el ID del entrenador
   UPDATE public.routine_templates
   SET created_by = (
     SELECT id FROM public.user_profiles 
     WHERE role = 'entrenador' 
     LIMIT 1
   )
   WHERE created_by IS NULL;
   ```

---

### 5. Probar el Sistema (5 min)

#### Paso 5.1: Iniciar la Aplicación
1. Abre tu terminal en el proyecto
2. Si no está corriendo, ejecuta:
   ```bash
   npm run dev
   # o
   pnpm dev
   ```
3. Abre http://localhost:5173

#### Paso 5.2: Probar Login como Administrador
1. En la página de login, verás botones de acceso rápido
2. Click en **"Administrador"**
3. Click en **"Iniciar Sesión"**
4. Deberías ver el Dashboard completo
5. Verifica que ves TODAS las secciones en el sidebar:
   - ✅ Dashboard
   - ✅ Usuarios
   - ✅ Pagos
   - ✅ Personal
   - ✅ Asistencia
   - ✅ Rutinas
   - ✅ Reportes

#### Paso 5.3: Probar Login como Entrenador
1. Click en el botón de Logout (abajo en sidebar)
2. En login, click en **"Entrenador"**
3. Click en **"Iniciar Sesión"**
4. Deberías ver solo:
   - ✅ Dashboard
   - ✅ Usuarios (solo lectura)
   - ✅ Asistencia
   - ✅ Rutinas

#### Paso 5.4: Probar Login como Usuario
1. Logout nuevamente
2. Click en **"Usuario"**
3. Click en **"Iniciar Sesión"**
4. Deberías ver solo:
   - ✅ Dashboard
   - ✅ Mi Entrenamiento
   - ✅ Mi Perfil

---

## 🎯 Credenciales de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Administrador** | admin@gymlagunetica.com | Admin123! |
| **Entrenador** | laura.perez@gymlagunetica.com | Trainer123! |
| **Usuario** | carlos.mendoza@email.com | User123! |

---

## ❓ Troubleshooting

### Problema: "No se puede iniciar sesión"
**Solución:**
1. Verifica que deshabilitaste la confirmación de email
2. Verifica que el usuario tiene "Auto Confirm User" activado
3. Revisa la consola del navegador para ver errores

### Problema: "Acquiring lock timed out" (Error de Lock)
**Solución Rápida:**
1. Abre DevTools (F12)
2. Application > Local Storage > Clear
3. Recarga la página (Ctrl+Shift+R)
4. Intenta login nuevamente

**Si persiste:**
1. Cierra todas las pestañas de localhost excepto una
2. Limpia localStorage desde consola:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
3. Prueba en modo incógnito
4. **Ver documento completo:** `SOLUCION_ERRORES_LOCK.md`

### Problema: "El perfil no se crea automáticamente"
**Solución:**
1. Ve a **SQL Editor**
2. Ejecuta:
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

### Problema: "No veo las secciones correctas según mi rol"
**Solución:**
1. Ve a **Table Editor** > **user_profiles**
2. Busca tu usuario por email
3. Verifica que el campo `role` tiene el valor correcto
4. Si no, edítalo manualmente o ejecuta:
   ```sql
   UPDATE public.user_profiles 
   SET role = 'administrador' -- o 'entrenador' o 'usuario'
   WHERE email = 'tu@email.com';
   ```

### Problema: "Error: Cannot read properties of null"
**Solución:**
- Cierra sesión completamente
- Borra las cookies del navegador
- Limpia localStorage
- Vuelve a iniciar sesión

---

## 📚 Próximos Pasos

Una vez que todo funcione:

1. **Personalización:**
   - Cambiar colores en `/src/styles/theme.css`
   - Actualizar logo del gimnasio
   - Personalizar emails de Supabase

2. **Datos Reales:**
   - Crear usuarios reales desde el sistema
   - Registrar pagos de membresías
   - Crear rutinas personalizadas
   - Registrar asistencia diaria

3. **Configuración Adicional:**
   - Configurar backup automático en Supabase
   - Habilitar confirmación de email para producción
   - Configurar dominio personalizado
   - Implementar Storage para fotos de perfil

4. **Seguridad:**
   - Cambiar todas las contraseñas de prueba
   - Revisar políticas RLS
   - Configurar 2FA para administradores
   - Implementar rate limiting

---

## 📖 Documentación Adicional

- **CONFIGURACION_SUPABASE.md** - Configuración detallada de Supabase
- **SISTEMA_DE_ROLES.md** - Permisos y acceso por rol
- **SQL_PARA_SUPABASE.sql** - Schema completo de la base de datos

---

## ✅ Checklist Final

- [ ] Base de datos creada en Supabase
- [ ] 12 tablas verificadas
- [ ] RLS activado
- [ ] Confirmación de email deshabilitada (dev)
- [ ] 3 usuarios de prueba creados (admin, entrenador, usuario)
- [ ] Rutinas asignadas al entrenador
- [ ] Login probado con los 3 roles
- [ ] Sidebar muestra secciones correctas por rol
- [ ] Sistema funcionando correctamente

---

**¡Todo listo para usar! 🎉**

Si tienes problemas, revisa:
1. Consola del navegador (F12)
2. Supabase Logs (Project Settings > API)
3. Documentación de troubleshooting arriba