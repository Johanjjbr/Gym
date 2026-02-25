# 🚀 Guía Rápida de Configuración - GYM Lagunetica

## ⚡ Setup en 5 Minutos

### Paso 1: Conectar Supabase (1 minuto)
1. Abre tu aplicación
2. Conecta tu proyecto de Supabase cuando se solicite
3. Copia el Project ID y API Key

### Paso 2: Crear Schema de Base de Datos (2 minutos)
1. Ve a Supabase Dashboard > **SQL Editor**
2. Abre el archivo **`SQL_PARA_SUPABASE.sql`** de este proyecto
3. Copia TODO el contenido
4. Pégalo en el SQL Editor
5. Click en **RUN** (o Ctrl+Enter)
6. Espera a que termine (verás "Success")

### Paso 3: Crear Usuarios de Prueba (2 minutos)
1. En el mismo SQL Editor, crea una **New Query**
2. Abre el archivo **`CREAR_USUARIOS_PRUEBA.sql`** de este proyecto
3. Copia TODO el contenido
4. Pégalo en el SQL Editor
5. Click en **RUN**
6. Verás una tabla con los 3 usuarios creados

📖 **Guía detallada:** Ver `INSTRUCCIONES_CREAR_USUARIOS.md`

### Paso 4: Configurar Autenticación (30 segundos)
1. Ve a **Authentication** > **Providers**
2. Click en **Email**
3. **Desactiva** "Enable email confirmations"
4. Click en **Save**

⚠️ **IMPORTANTE:** En producción, vuelve a activar esto por seguridad.

---

## 🎯 Credenciales de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Administrador** | admin@gymlagunetica.com | Admin123! |
| **Entrenador** | entrenador@gymlagunetica.com | Trainer123! |
| **Usuario** | usuario@gymlagunetica.com | User123! |

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