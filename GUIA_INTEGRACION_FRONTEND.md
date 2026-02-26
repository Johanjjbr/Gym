# 🎯 Guía de Integración Frontend - Backend

## Sistema de Gestión Gimnasio Los Teques

Esta guía te ayudará a verificar que el frontend esté correctamente integrado con el backend de Supabase.

---

## ✅ Estado Actual del Sistema

### Frontend Completado ✓

- ✅ **Sistema de rutas** con React Router configurado
- ✅ **AuthContext** para gestión de autenticación
- ✅ **ProtectedRoute** para proteger rutas privadas
- ✅ **Login** con interfaz completa y credenciales de prueba
- ✅ **Layout** con Sidebar y navegación
- ✅ **Dashboard** con estadísticas y gráficos
- ✅ **Cliente API** completo (`/src/app/lib/api.ts`)
- ✅ **Componentes UI** de shadcn/ui configurados
- ✅ **Tema fitness** con colores neón (#10f94e y #ff3b5c)

### Backend Completado ✓

- ✅ **Schema SQL** completo con 12 tablas
- ✅ **Sistema de autenticación** con Supabase Auth
- ✅ **Row Level Security (RLS)** implementado
- ✅ **Edge Function** con todos los endpoints CRUD
- ✅ **Seed de datos** de prueba

---

## 🚀 Pasos para Completar la Integración

### Paso 1: Verificar Configuración de Supabase

1. **Confirma que tienes tu proyecto Supabase activo**
   - Proyecto ID está en: `/utils/supabase/info.tsx`
   - Actual: `jhzgcfvshnjgktajspqo`

2. **Verifica que el schema SQL esté ejecutado**
   - Ve a: Supabase Dashboard → SQL Editor
   - Debes tener 12 tablas creadas

3. **Confirma que los usuarios de prueba existen**
   - Ve a: Supabase Dashboard → Authentication → Users
   - Deben existir 3 usuarios:
     - `admin@gymteques.com`
     - `trainer@gymteques.com`
     - `recepcion@gymteques.com`

### Paso 2: Probar el Login

1. **Ejecuta la aplicación**
   ```bash
   npm run dev
   ```

2. **Abre el navegador**
   - URL: `http://localhost:5173`
   - Deberías ver la pantalla de Login

3. **Prueba el login con credenciales**
   
   **Opción A: Usar botones de credenciales rápidas**
   - Haz clic en "+ Mostrar credenciales de prueba"
   - Selecciona cualquiera de los 3 roles (Administrador, Entrenador, Recepción)
   - Haz clic en "Iniciar Sesión"

   **Opción B: Ingresar manualmente**
   ```
   Email:    admin@gymteques.com
   Password: Admin123!
   ```

4. **Verificar el resultado**
   - ✅ **Éxito**: Te redirige al Dashboard
   - ❌ **Error**: Ve al Paso 3 para diagnosticar

### Paso 3: Verificar Conexión con Supabase

1. **Accede a la página de pruebas**
   - URL: `http://localhost:5173/test-supabase`
   - O desde Login: Click en "Test de Conexión Supabase →"

2. **Ejecuta los tests**
   - Deja las credenciales por defecto (admin@gymteques.com)
   - Haz clic en "Ejecutar Todos los Tests"

3. **Verifica los resultados**
   
   **Todos los tests deben estar en verde ✅:**
   - ✅ Health Check
   - ✅ Login
   - ✅ Obtener Usuarios
   - ✅ Obtener Pagos
   - ✅ Obtener Staff
   - ✅ Obtener Asistencia
   - ✅ Obtener Rutinas
   - ✅ Estadísticas

4. **Si algún test falla ❌**
   
   **Error: "Failed to fetch" o "Network error"**
   - Verifica que tu Edge Function esté desplegada
   - Confirma el PROJECT_ID en `/utils/supabase/info.tsx`
   - Revisa la consola del navegador para más detalles

   **Error: "Invalid credentials"**
   - Ejecuta el seed de datos: Ver `CHECKLIST_SETUP.md` Fase 4
   - Verifica que los usuarios existan en Authentication

   **Error: "Permission denied" o RLS**
   - Confirma que el schema SQL se ejecutó completo
   - Verifica las políticas RLS en Supabase Dashboard

### Paso 4: Explorar el Dashboard

1. **Navega por el Dashboard**
   - Deberías ver:
     - Tarjetas de estadísticas
     - Gráfico de ingresos mensuales
     - Gráfico de asistencia semanal
     - Estado de usuarios (pie chart)
     - Lista de asistencia reciente

2. **Observa la alerta verde en la parte superior**
   - Te indica que estás viendo datos de demostración
   - Contiene enlaces a la página de pruebas
   - Muestra tu nombre de usuario

3. **Verifica la información del usuario**
   - En la sidebar (panel izquierdo):
     - Debes ver tus iniciales
     - Tu nombre completo
     - Tu rol (Administrador, Entrenador, o Recepción)

### Paso 5: Probar el Logout

1. **Haz clic en el ícono de "Salir"**
   - Ubicado en la parte inferior del Sidebar
   - Es el ícono con forma de "LogOut"

2. **Verifica la redirección**
   - ✅ Deberías regresar a la pantalla de Login
   - ✅ El token se elimina del localStorage
   - ✅ No puedes acceder a rutas protegidas sin login

---

## 🔧 Arquitectura del Sistema

### Flujo de Autenticación

```
Usuario → Login Form
    ↓
AuthContext.login()
    ↓
api.auth.login(email, password)
    ↓
Edge Function /auth/login
    ↓
Supabase Auth
    ↓
Retorna: { session, user, staff }
    ↓
Guarda access_token en localStorage
    ↓
Actualiza estado global (user)
    ↓
Redirige a Dashboard (/)
```

### Flujo de Protección de Rutas

```
Usuario intenta acceder a /usuarios
    ↓
Router verifica Layout
    ↓
Layout contiene <ProtectedRoute>
    ↓
ProtectedRoute verifica isAuthenticated
    ↓
✅ SI: Renderiza contenido
❌ NO: Redirige a /login
```

### Estructura de Archivos Clave

```
/src/app/
  ├── App.tsx                      # Punto de entrada con AuthProvider
  ├── routes.ts                    # Definición de rutas
  ├── contexts/
  │   └── AuthContext.tsx          # Estado global de autenticación
  ├── components/
  │   ├── ProtectedRoute.tsx       # HOC para rutas protegidas
  │   └── Sidebar.tsx              # Navegación principal
  ├── pages/
  │   ├── Login.tsx                # Pantalla de login
  │   ├── Layout.tsx               # Layout con Sidebar
  │   ├── Dashboard.tsx            # Dashboard principal
  │   └── TestSupabase.tsx         # Página de pruebas
  └── lib/
      └── api.ts                   # Cliente API de Supabase

/utils/supabase/
  └── info.tsx                     # Credenciales del proyecto

/supabase/
  ├── migrations/
  │   └── schema.sql               # Schema completo de la DB
  └── functions/
      └── server/
          ├── index.tsx            # Edge Function principal
          └── seed.tsx             # Seed de datos de prueba
```

---

## 📊 Endpoints Disponibles

Todos los endpoints están definidos en `/src/app/lib/api.ts`:

### Autenticación
- `api.auth.login(email, password)` - Iniciar sesión
- `api.auth.logout()` - Cerrar sesión
- `api.auth.getSession()` - Obtener sesión actual
- `api.auth.signup(data)` - Crear nuevo usuario de staff

### Usuarios (Miembros)
- `api.users.getAll()` - Listar todos los usuarios
- `api.users.getById(id)` - Obtener usuario específico
- `api.users.create(userData)` - Crear nuevo usuario
- `api.users.update(id, userData)` - Actualizar usuario
- `api.users.delete(id)` - Eliminar usuario

### Pagos
- `api.payments.getAll()` - Listar todos los pagos
- `api.payments.create(paymentData)` - Registrar nuevo pago

### Staff (Personal)
- `api.staff.getAll()` - Listar todo el staff
- `api.staff.update(id, staffData)` - Actualizar staff

### Asistencia
- `api.attendance.getAll(date?)` - Obtener asistencia (opcional: filtrada por fecha)
- `api.attendance.create(attendanceData)` - Registrar asistencia

### Rutinas
- `api.routines.getAll()` - Listar todas las rutinas
- `api.routines.create(routineData)` - Crear nueva rutina

### Asignaciones de Rutinas
- `api.routineAssignments.getAll(userId?)` - Obtener asignaciones
- `api.routineAssignments.create(assignmentData)` - Asignar rutina a usuario

### Estadísticas
- `api.stats.getDashboard()` - Obtener estadísticas del dashboard

### Utilidades
- `api.utils.runSeed()` - Ejecutar seed de datos
- `api.utils.healthCheck()` - Verificar estado del servidor

---

## 🎨 Sistema de Roles

### Rol: Administrador
- **Permisos**: Acceso completo a todas las funcionalidades
- **Email de prueba**: `admin@gymteques.com`
- **Password**: `Admin123!`

### Rol: Entrenador
- **Permisos**: Gestión de rutinas, usuarios y asistencia
- **Email de prueba**: `trainer@gymteques.com`
- **Password**: `Trainer123!`

### Rol: Recepción
- **Permisos**: Registro de asistencia y pagos
- **Email de prueba**: `recepcion@gymteques.com`
- **Password**: `Recepcion123!`

*Nota: La implementación de restricciones por rol está lista en el backend (RLS) y puede ser aplicada en el frontend usando `useAuth().hasRole(['Administrador'])`*

---

## 🔍 Debugging

### Verificar Token en localStorage

1. **Abre DevTools** (F12)
2. **Application → Local Storage → http://localhost:5173**
3. **Busca estas claves:**
   - `access_token` - Token JWT de Supabase
   - `user` - Datos del usuario autenticado

### Verificar Requests en Network

1. **Abre DevTools → Network**
2. **Inicia sesión**
3. **Busca el request a:** `.../make-server-104060a1/auth/login`
4. **Verifica:**
   - Status: 200 OK
   - Response: JSON con session, user, staff

### Logs de Errores

**Console del Navegador:**
```javascript
// Verificar si el usuario está autenticado
console.log(localStorage.getItem('access_token'))
console.log(localStorage.getItem('user'))
```

**Supabase Dashboard:**
- Edge Functions → Logs
- Authentication → Logs
- Database → Query Performance

---

## 📝 Próximos Pasos

Una vez que todo esté funcionando:

1. **Conectar páginas con datos reales**
   - `Users.tsx` → Usar `api.users.getAll()`
   - `Payments.tsx` → Usar `api.payments.getAll()`
   - `Staff.tsx` → Usar `api.staff.getAll()`
   - `Attendance.tsx` → Usar `api.attendance.getAll()`

2. **Implementar creación de usuarios**
   - Formulario para nuevo usuario
   - Validación de datos
   - Llamada a `api.users.create()`

3. **Implementar sistema de pagos**
   - Formulario de registro de pago
   - Historial de pagos por usuario
   - Alertas de pagos vencidos

4. **Implementar sistema de rutinas**
   - Creación de rutinas
   - Asignación a usuarios
   - Seguimiento de progreso

5. **Implementar QR para asistencia**
   - Generación de códigos QR únicos
   - Escaneo y registro automático
   - Reportes de asistencia

---

## 🆘 Solución de Problemas Comunes

### Problema: "Cannot read property 'name' of null"

**Causa:** El usuario no está autenticado pero intentas acceder a `user.name`

**Solución:** 
```tsx
const { user } = useAuth();
// Siempre verifica antes de usar
{user && <p>{user.name}</p>}
// O usa optional chaining
<p>{user?.name}</p>
```

### Problema: Login no redirige al Dashboard

**Causa:** El token no se está guardando o la navegación falla

**Solución:**
1. Verifica que `api.auth.login()` esté retornando el token
2. Confirma que `localStorage.setItem()` se ejecute
3. Revisa que no haya errores en la consola
4. Verifica que `navigate('/')` se llame después del login exitoso

### Problema: ProtectedRoute redirige a Login constantemente

**Causa:** `isLoading` se queda en `true` o `isAuthenticated` es `false`

**Solución:**
1. Verifica que `checkSession()` en AuthContext se ejecute
2. Confirma que `setIsLoading(false)` se llame en el finally
3. Revisa que el token exista en localStorage
4. Prueba limpiar localStorage y volver a hacer login

### Problema: 401 Unauthorized en requests

**Causa:** Token inválido o expirado

**Solución:**
1. Haz logout y vuelve a hacer login
2. Verifica que el token se esté enviando en headers
3. Confirma que el token sea válido (no expirado)
4. Revisa las políticas RLS en Supabase

---

## ✅ Checklist de Integración Completa

```
[ ] 1. Schema SQL ejecutado en Supabase
[ ] 2. Seed de datos completado (3 usuarios de staff creados)
[ ] 3. Login funciona con las 3 cuentas de prueba
[ ] 4. Token se guarda en localStorage al login
[ ] 5. Dashboard se muestra después del login
[ ] 6. Sidebar muestra información del usuario autenticado
[ ] 7. Logout funciona y limpia localStorage
[ ] 8. ProtectedRoute redirige a Login si no autenticado
[ ] 9. Página de pruebas (/test-supabase) pasa todos los tests
[ ] 10. No hay errores en la consola del navegador
```

---

## 🎉 ¡Sistema Integrado!

Cuando todos los checkpoints estén ✅, tu sistema está completamente integrado y listo para continuar el desarrollo.

**Siguiente paso:** Comenzar a conectar las demás páginas con datos reales de Supabase.

**Documentación adicional:**
- `CHECKLIST_SETUP.md` - Setup completo paso a paso
- `CRUD_DOCUMENTATION.md` - Ejemplos de uso del API
- `SUPABASE_STRUCTURE.md` - Detalles de las tablas
- `ARQUITECTURA_SISTEMA.md` - Arquitectura completa

---

**Creado para:** Gimnasio Los Teques, Sector Lagunetica  
**Versión:** 1.0  
**Fecha:** Febrero 2026
