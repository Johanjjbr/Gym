# ✅ CHECKLIST DE CONFIGURACIÓN SUPABASE

## Sistema de Gestión de Gimnasio Los Teques

**Usa este checklist para configurar todo desde cero paso a paso**

---

## 📋 FASE 1: PREPARACIÓN

### Verificar Archivos del Proyecto

- [ ] **Abrir el proyecto en tu editor de código**
- [ ] **Verificar que existan estos archivos:**
  - [ ] `/supabase/migrations/schema.sql`
  - [ ] `/supabase/functions/server/index.tsx`
  - [ ] `/src/app/lib/api.ts`
  - [ ] `/src/app/components/DatabaseSetup.tsx`
  - [ ] `/src/app/pages/TestSupabase.tsx`

### Verificar Conexión a Supabase

- [ ] **Tienes una cuenta en Supabase** (https://supabase.com)
- [ ] **Tienes un proyecto creado** (o crea uno nuevo)
- [ ] **Conoces tu PROJECT_ID** (visible en la URL del dashboard)
- [ ] **Conoces tu ANON_KEY** (Settings → API → anon public)

**Anota aquí tu información:**
```
PROJECT_ID: ihyeytzmrgfglsdpsvzb
ANON_KEY:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloeWV5dHptcmdmZ2xzZHBzdnpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDc1ODUsImV4cCI6MjA4NzYyMzU4NX0.8F4Brq8V_smZX03Uz1W0yCukvjoXJWmpTVGhb085k8U
```

---

## 📋 FASE 2: EJECUTAR SCHEMA SQL

### Paso 1: Acceder a Supabase SQL Editor

- [ ] **Ir a** https://supabase.com/dashboard
- [ ] **Hacer clic en tu proyecto**
- [ ] **En el menú lateral, buscar "SQL Editor"**
- [ ] **Hacer clic en "SQL Editor"**
- [ ] **Hacer clic en botón "+ New Query" o "New Query"**

### Paso 2: Copiar Schema SQL

- [ ] **Abrir archivo:** `/supabase/migrations/schema.sql`
- [ ] **Seleccionar TODO el contenido** (Ctrl+A / Cmd+A)
- [ ] **Copiar** (Ctrl+C / Cmd+C)

### Paso 3: Pegar y Ejecutar

- [ ] **Pegar en el editor SQL de Supabase** (Ctrl+V / Cmd+V)
- [ ] **Verificar que el contenido se haya pegado completo**
  - [ ] Primera línea debe ser: `-- SCHEMA SQL COMPLETO...`
  - [ ] Debe tener aprox. 600-700 líneas
  - [ ] Última línea debe incluir políticas RLS
- [ ] **Hacer clic en botón "RUN"** o presionar Ctrl+Enter

### Paso 4: Verificar Ejecución

- [ ] **Esperar a que termine** (10-30 segundos)
- [ ] **Verificar mensaje "✅ Success"** en panel de resultados
- [ ] **Si hay error:** revisar el mensaje y repetir el paso

**✅ Completado cuando veas:** `Success - Query executed successfully`

---

## 📋 FASE 3: VERIFICAR TABLAS CREADAS

### Ir a Table Editor

- [ ] **En menú lateral, hacer clic en "Table Editor"**
- [ ] **Refrescar la página** (F5) si es necesario

### Verificar que existan estas 12 tablas:

- [ ] ✅ `users` (0 rows)
- [ ] ✅ `staff` (0 rows)
- [ ] ✅ `payments` (0 rows)
- [ ] ✅ `attendance` (0 rows)
- [ ] ✅ `physical_progress` (0 rows)
- [ ] ✅ `routine_templates` (0 rows)
- [ ] ✅ `exercise_templates` (0 rows)
- [ ] ✅ `user_routine_assignments` (0 rows)
- [ ] ✅ `workout_sessions` (0 rows)
- [ ] ✅ `workout_exercise_logs` (0 rows)
- [ ] ✅ `set_logs` (0 rows)
- [ ] ✅ `invoices` (0 rows)

**Nota:** También verás `kv_store_104060a1` (tabla de sistema)

**✅ Completado cuando:** Las 12 tablas estén visibles

---

## 📋 FASE 4: CREAR USUARIOS DE PRUEBA

### Opción A: Automático con Endpoint (Recomendado)

#### Preparar el comando

- [ ] **Copiar este comando** (reemplaza TU_PROJECT_ID):
  ```bash
  curl -X POST https://TU_PROJECT_ID.supabase.co/functions/v1/make-server-104060a1/seed
  ```

- [ ] **Reemplazar `TU_PROJECT_ID`** con tu ID real
- [ ] **Abrir terminal** (CMD, PowerShell, Terminal de Mac)
- [ ] **Pegar y ejecutar** el comando
- [ ] **Esperar respuesta** (5-15 segundos)

#### Verificar respuesta

- [ ] **Debe retornar JSON con:**
  ```json
  {
    "success": true,
    "message": "Seed completado exitosamente",
    "created": {
      "staff": 3,
      "members": 5
    },
    "credentials": { ... }
  }
  ```

**Si no funciona curl:**

- [ ] **Opción alternativa:** Usar Postman, Insomnia o navegador
- [ ] **URL:** `https://TU_PROJECT_ID.supabase.co/functions/v1/make-server-104060a1/seed`
- [ ] **Método:** POST
- [ ] **Body:** Vacío

### Opción B: Desde la Interfaz de la App

- [ ] **Ejecutar tu app localmente** (`npm run dev`)
- [ ] **Importar componente DatabaseSetup:**
  ```tsx
  import { DatabaseSetup } from './components/DatabaseSetup';
  ```
- [ ] **Renderizar en App.tsx temporalmente:**
  ```tsx
  <DatabaseSetup />
  ```
- [ ] **Abrir navegador en localhost**
- [ ] **Hacer clic en "Inicializar Base de Datos"**
- [ ] **Esperar mensaje de éxito**

**✅ Completado cuando:** Veas el mensaje de éxito con credenciales

---

## 📋 FASE 5: VERIFICAR USUARIOS CREADOS

### Verificar en Supabase Authentication

- [ ] **Ir a Supabase Dashboard**
- [ ] **En menú lateral, hacer clic en "Authentication"**
- [ ] **Hacer clic en "Users"**

### Debe haber 3 usuarios:

- [ ] ✅ `admin@gymteques.com`
- [ ] ✅ `trainer@gymteques.com`
- [ ] ✅ `recepcion@gymteques.com`

### Verificar en Table Editor

- [ ] **Ir a Table Editor → staff**
- [ ] **Debe haber 3 filas:**
  - [ ] Roberto Administrador
  - [ ] Laura Entrenadora
  - [ ] Pedro Recepcionista

- [ ] **Ir a Table Editor → users**
- [ ] **Debe haber 5 filas:**
  - [ ] Carlos Rodríguez (GYM-001)
  - [ ] María González (GYM-002)
  - [ ] José Pérez (GYM-003)
  - [ ] Ana Martínez (GYM-004)
  - [ ] Luis Hernández (GYM-005)

**✅ Completado cuando:** Veas 3 usuarios en Auth y 3+5 en las tablas

---

## 📋 FASE 6: PROBAR LOGIN

### Preparar Credenciales

**Anota estas credenciales (las necesitarás):**

```
ADMINISTRADOR:
Email:    admin@gymteques.com
Password: Admin123!

ENTRENADOR:
Email:    trainer@gymteques.com
Password: Trainer123!

RECEPCIÓN:
Email:    recepcion@gymteques.com
Password: Recepcion123!
```

### Probar Login desde tu App

- [ ] **Ejecutar tu app** (`npm run dev`)
- [ ] **Ir a la página de login**
- [ ] **Ingresar:** admin@gymteques.com / Admin123!
- [ ] **Hacer clic en "Login" o "Iniciar Sesión"**
- [ ] **Debe redirigir al Dashboard**
- [ ] **Verificar que aparezca el nombre:** "Roberto Administrador"

### Verificar LocalStorage

- [ ] **Abrir DevTools del navegador** (F12)
- [ ] **Ir a pestaña "Application" o "Storage"**
- [ ] **Expandir "Local Storage"**
- [ ] **Debe existir:**
  - [ ] `access_token` con un JWT largo
  - [ ] `user` con datos del usuario en JSON

**✅ Completado cuando:** Login funcione y veas datos en localStorage

---

## 📋 FASE 7: PROBAR ENDPOINTS (OPCIONAL)

### Usar Página de Testing

- [ ] **Importar TestSupabase:**
  ```tsx
  import TestSupabase from './pages/TestSupabase';
  ```
- [ ] **Agregar ruta en routes.ts:**
  ```tsx
  { path: "/test", Component: TestSupabase }
  ```
- [ ] **Ir a** `http://localhost:5173/test`
- [ ] **Ingresar credenciales** (admin@gymteques.com / Admin123!)
- [ ] **Hacer clic en "Ejecutar Todos los Tests"**

### Verificar Resultados

- [ ] **Health Check** → ✅ Success
- [ ] **Login** → ✅ Success
- [ ] **Obtener Usuarios** → ✅ Success (5 usuarios)
- [ ] **Obtener Pagos** → ✅ Success (2 pagos)
- [ ] **Obtener Staff** → ✅ Success (3 staff)
- [ ] **Obtener Asistencia** → ✅ Success (0 registros)
- [ ] **Obtener Rutinas** → ✅ Success (0 rutinas)
- [ ] **Estadísticas** → ✅ Success

**✅ Completado cuando:** Todos los tests pasen exitosamente

---

## 📋 FASE 8: INTEGRACIÓN EN TU APP

### Importar Cliente API

- [ ] **En tu componente, importar:**
  ```tsx
  import api from '../lib/api';
  ```

### Implementar Login

- [ ] **Crear función de login:**
  ```tsx
  const handleLogin = async () => {
    try {
      const response = await api.auth.login(email, password);
      // Redirigir al dashboard
    } catch (error) {
      // Mostrar error
    }
  };
  ```

### Obtener Datos

- [ ] **Ejemplo para usuarios:**
  ```tsx
  useEffect(() => {
    const fetchUsers = async () => {
      const users = await api.users.getAll();
      setUsers(users);
    };
    fetchUsers();
  }, []);
  ```

### Crear Componentes

- [ ] **Dashboard** → Conectar con `api.stats.getDashboard()`
- [ ] **Users** → Conectar con `api.users.getAll()`
- [ ] **Payments** → Conectar con `api.payments.getAll()`
- [ ] **Attendance** → Conectar con `api.attendance.getAll()`

**✅ Completado cuando:** Tu app use datos reales de Supabase

---

## 📋 FASE 9: VERIFICACIÓN FINAL

### Checklist de Funcionalidades

- [ ] **Login funciona** con las 3 cuentas
- [ ] **Logout funciona** correctamente
- [ ] **Dashboard muestra estadísticas reales**
- [ ] **Lista de usuarios se carga** desde Supabase
- [ ] **Puede crear nuevo usuario** (con permisos adecuados)
- [ ] **Puede registrar pago**
- [ ] **Puede ver historial de pagos**
- [ ] **Sistema de roles funciona** (Admin vs Trainer vs Reception)

### Checklist de Seguridad

- [ ] **Token se guarda** en localStorage al login
- [ ] **Token se envía** en cada request
- [ ] **RLS está activo** (verificar en Supabase → Database → Policies)
- [ ] **Usuarios sin permisos** no pueden acceder a recursos protegidos

**✅ Completado cuando:** Todas las funcionalidades principales funcionen

---

## 🎉 ¡CONFIGURACIÓN COMPLETA!

### Resumen de lo que tienes ahora:

✅ **Base de datos** con 12 tablas operacionales
✅ **Sistema de autenticación** funcionando
✅ **3 usuarios de staff** con diferentes roles
✅ **5 miembros de prueba** con datos variados
✅ **API REST completa** con todos los endpoints
✅ **Cliente TypeScript** para consumir la API
✅ **Seguridad RLS** implementada
✅ **Documentación completa** de referencia

---

## 📚 ARCHIVOS DE AYUDA DISPONIBLES

Si tienes dudas, consulta:

| Archivo | Para qué sirve |
|---------|----------------|
| `INSTRUCCIONES_SUPABASE.md` | Guía paso a paso detallada |
| `GUIA_VISUAL_SUPABASE.md` | Tutorial con capturas visuales |
| `SUPABASE_STRUCTURE.md` | Detalles de todas las tablas |
| `RESUMEN_CONFIGURACION.md` | Resumen técnico completo |
| `ARQUITECTURA_SISTEMA.md` | Arquitectura y flujos |
| `README_SUPABASE.md` | Inicio rápido y referencia |
| `CHECKLIST_SETUP.md` | Este archivo |

---

## 🆘 SI ALGO FALLA

### Problema: Schema SQL no se ejecuta

**Soluciones:**
1. Verifica que copiaste TODO el archivo completo
2. Asegúrate de estar en el proyecto correcto
3. Revisa el mensaje de error específico
4. Intenta ejecutar sección por sección

### Problema: Seed no crea usuarios

**Soluciones:**
1. Verifica que el schema se ejecutó primero
2. Revisa los logs en Supabase → Edge Functions → Logs
3. Verifica tu PROJECT_ID en el comando
4. Intenta usar la Opción B (desde la app)

### Problema: Login no funciona

**Soluciones:**
1. Verifica que el seed se ejecutó correctamente
2. Confirma que el email y password sean correctos (case-sensitive)
3. Revisa la consola del navegador por errores
4. Verifica que los usuarios existan en Authentication

### Problema: Errores de permisos

**Soluciones:**
1. Verifica que RLS esté activo
2. Confirma que las políticas se crearon
3. Asegúrate de estar logueado con el usuario correcto
4. Revisa el rol del usuario en la tabla staff

---

## ✅ CHECKLIST COMPLETO - RESUMEN

```
FASE 1: Preparación                          [ ]
  └─ Verificar archivos                      [ ]
  └─ Tener PROJECT_ID y ANON_KEY            [ ]

FASE 2: Ejecutar Schema SQL                  [ ]
  └─ Acceder a SQL Editor                    [ ]
  └─ Copiar y pegar schema.sql              [ ]
  └─ Ejecutar y verificar Success           [ ]

FASE 3: Verificar Tablas                     [ ]
  └─ Ver 12 tablas en Table Editor          [ ]

FASE 4: Crear Usuarios de Prueba            [ ]
  └─ Ejecutar endpoint /seed                [ ]
  └─ Ver mensaje de éxito                   [ ]

FASE 5: Verificar Usuarios                   [ ]
  └─ 3 usuarios en Authentication           [ ]
  └─ 3 staff + 5 miembros en tablas        [ ]

FASE 6: Probar Login                         [ ]
  └─ Login funciona                         [ ]
  └─ Token en localStorage                  [ ]

FASE 7: Probar Endpoints (Opcional)         [ ]
  └─ Todos los tests pasan                  [ ]

FASE 8: Integración en App                   [ ]
  └─ API client importado                   [ ]
  └─ Datos reales en la app                 [ ]

FASE 9: Verificación Final                   [ ]
  └─ Todas las funcionalidades funcionan    [ ]
  └─ Seguridad RLS activa                   [ ]
```

---

**CUANDO TODAS LAS FASES ESTÉN ✅:**
**¡Tu sistema está listo para desarrollar! 🚀💪**

**Fecha de completación:** _______________

**Creado para:** Gimnasio Los Teques, Sector Lagunetica
**Versión:** 1.0
