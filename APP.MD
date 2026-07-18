# AGENT.MD — Sistema de Gestión Gimnasio Los Teques

> Este archivo describe el proyecto para asistentes de IA (Claude u otros agentes). Léelo antes de hacer cualquier cambio en el código.

---

## 🎯 ¿Qué es este proyecto?

Sistema web administrativo completo para la gestión del **Gimnasio Los Teques** (Venezuela). Permite controlar miembros, pagos, asistencia, rutinas de ejercicio y personal, todo desde una SPA (Single Page Application) con backend serverless en Supabase.

---

## 🏗️ Arquitectura General

```
Frontend (React SPA)
       │
       │  HTTPS + Bearer JWT
       ▼
Supabase Edge Function  ←→  PostgreSQL (12 tablas + RLS)
       │
Supabase Auth (JWT)
```

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS 4
- **Backend:** Supabase Edge Functions (Deno/Hono) como API REST
- **Base de datos:** PostgreSQL via Supabase con Row Level Security
- **Autenticación:** JWT via Supabase Auth (tokens guardados en localStorage)

---

## 📁 Estructura del Proyecto

```
sistema-gimnasio/
├── src/app/
│   ├── App.tsx                    # Punto de entrada
│   ├── routes.ts                  # React Router v7 — todas las rutas
│   ├── pages/                     # Páginas de la aplicación
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Users.tsx              # Gestión de miembros
│   │   ├── UserDetail.tsx         # Detalle de un miembro
│   │   ├── Payments.tsx
│   │   ├── StaffPage.tsx
│   │   ├── Attendance.tsx
│   │   ├── Routines.tsx
│   │   ├── RoutineBuilder.tsx     # Crear/editar rutinas
│   │   ├── MyWorkout.tsx          # Vista del miembro
│   │   ├── Reports.tsx
│   │   └── Layout.tsx             # Layout con sidebar
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── UserFormDialog.tsx
│   │   └── ui/                    # shadcn/ui components
│   ├── contexts/
│   │   └── AuthContext.tsx        # Estado global de auth
│   ├── hooks/
│   │   ├── useRoutines.ts         # React Query hooks para rutinas
│   │   └── ...
│   ├── lib/
│   │   └── api.ts                 # Cliente HTTP — todos los endpoints
│   └── types/
│       └── index.ts               # Tipos TypeScript globales
├── supabase/
│   ├── migrations/                # SQL para la base de datos
│   │   ├── schema.sql             # Schema principal
│   │   └── *.sql                  # Migraciones adicionales
│   └── functions/server/
│       ├── index.tsx              # Edge Function principal (Hono)
│       └── seed.tsx               # Datos de prueba
├── src/styles/
│   ├── theme.css                  # Variables CSS y colores
│   └── index.css
└── utils/supabase/
    └── info.tsx                   # PROJECT_ID y ANON_KEY
```

---

## 🔐 Sistema de Autenticación

### Dos tipos de usuarios

| Tipo | Tabla | Login vía |
|------|-------|-----------|
| **Staff** (Admin, Entrenador, Recepción) | `staff` | Edge Function `/auth/login` |
| **Miembros** (usuarios del gimnasio) | `users` | Supabase Auth directo |

### Flujo de login
1. Se intenta login como miembro via `supabase.auth.signInWithPassword`
2. Si falla, se intenta como staff via `api.auth.login()`
3. El token JWT se guarda en `localStorage` como `access_token`
4. El contexto `AuthContext` expone `user`, `isAuthenticated`, `hasRole()`

### Roles y permisos

| Rol | Acceso |
|-----|--------|
| `Administrador` | CRUD completo en todo |
| `Entrenador` | Ver/editar usuarios, rutinas, asistencia |
| `Recepción` | Asistencia, pagos, ver usuarios |

---

## 🛣️ Rutas Principales

```
/login                      → Login
/                           → Dashboard (staff)
/usuarios                   → Lista de miembros
/usuarios/:id               → Detalle de miembro
/pagos                      → Pagos
/personal                   → Staff
/asistencia                 → Asistencia
/rutinas                    → Lista de rutinas
/rutinas/crear              → Crear rutina
/rutinas/:id/editar         → Editar rutina
/mi-entrenamiento           → Vista de miembro autenticado

# Rutas de miembro (layout propio)
/perfil                     → Perfil
/progreso                   → Progreso físico
/asistencia (member)        → Historial de asistencia
/pagos (member)             → Historial de pagos
```

---

## 🌐 API Client (`src/app/lib/api.ts`)

Todas las llamadas al backend pasan por este archivo. Base URL: Edge Function de Supabase.

```typescript
// Importar
import api from '@/lib/api';

// Endpoints disponibles
api.auth.login(email, password)
api.auth.logout()
api.auth.getSession()

api.users.getAll()
api.users.getById(id)
api.users.create(data)
api.users.update(id, data)
api.users.delete(id)

api.payments.getAll()
api.payments.create(data)

api.staff.getAll()
api.staff.update(id, data)

api.attendance.getAll(date?)
api.attendance.create(data)

api.routines.getAll()
api.routines.create(data)
api.routines.update(id, data)
api.routines.delete(id)

api.routineAssignments.getAll(userId?)
api.routineAssignments.create(data)
api.routineAssignments.getActive(userId)

api.stats.getDashboard()
```

---

## 🗄️ Base de Datos (PostgreSQL)

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `users` | Miembros del gimnasio |
| `staff` | Personal (Admin, Entrenador, Recepción) |
| `payments` | Pagos y mensualidades |
| `attendance` | Entradas y salidas |
| `physical_progress` | Peso, IMC, medidas corporales |
| `routine_templates` | Plantillas de rutinas |
| `routine_exercises` | Ejercicios dentro de rutinas |
| `exercises` | Biblioteca de ejercicios (RLS deshabilitado) |
| `user_routine_assignments` | Asignación de rutinas a usuarios |
| `workout_sessions` | Sesiones de entrenamiento |
| `workout_exercise_logs` | Ejercicios completados en sesión |
| `set_logs` | Series y repeticiones |

### Notas importantes sobre RLS
- La mayoría de tablas tienen **Row Level Security activo**
- La tabla `exercises` tiene **RLS deshabilitado** (ver migración `04-fix-exercises-integration.sql`)
- Los tokens JWT deben enviarse en cada request para que RLS funcione correctamente

---

## 🎨 Diseño y UI

### Paleta de colores (variables CSS en `theme.css`)

| Color | Hex | Uso |
|-------|-----|-----|
| Verde neón | `#10f94e` | Acciones principales, éxito, activo |
| Rojo neón | `#ff3b5c` | Alertas, errores, morosos |
| Fondo oscuro | `#0a0a0f` | Background principal |

### Stack UI
- **shadcn/ui** — componentes base (Button, Dialog, Input, Badge, etc.)
- **Tailwind CSS 4** — utility classes
- **Lucide React** — iconos
- **Recharts** — gráficos del dashboard
- **QRCode.react** — generación de QR para asistencia

---

## ⚙️ Variables de Entorno

```env
VITE_SUPABASE_PROJECT_ID=jhzgcfvshnjgktajspqo
VITE_SUPABASE_ANON_KEY=<anon_key>
```

> El archivo `.env` no se sube a git. Usar `.env.example` como base.

---

## 🔄 Estado del Proyecto (Roadmap)

| Fase | Estado |
|------|--------|
| Infraestructura (Supabase, Auth, RLS, Edge Functions) | ✅ Completa |
| Frontend base (React, rutas, componentes) | ✅ Completa |
| CRUD usuarios y pagos | ✅ Completa |
| Sistema de rutinas | ✅ Completa |
| Dashboard con datos reales | 🚧 En progreso |
| Reportes y exportación | 📅 Pendiente |
| Tests unitarios y E2E | 📅 Pendiente |
| PWA / Deploy producción | 📅 Pendiente |

---

## 🧠 Convenciones de Código

- **100% TypeScript** — no usar `any` salvo en manejo de errores
- **Componentes funcionales** con hooks (no clases)
- **Nombres en español** para variables de dominio (usuarios, pagos, rutinas...)
- **React Query** para fetching y caché de datos del servidor
- **Formularios** con `react-hook-form` + `zod` para validación
- **Toasts** via `sonner` o `react-hot-toast` para feedback al usuario
- **No usar `<form>` HTML nativo** en componentes React — usar handlers de eventos

---

## 🚀 Comandos útiles

```bash
npm run dev          # Servidor de desarrollo en http://localhost:5173
npm run build        # Build de producción
npm run lint         # Linter ESLint

# Seed de datos de prueba
curl -X POST https://jhzgcfvshnjgktajspqo.supabase.co/functions/v1/make-server-104060a1/seed
```

### Credenciales de prueba

```
Admin:      admin@gymteques.com    / Admin123!
Entrenador: trainer@gymteques.com  / Trainer123!
Recepción:  recepcion@gymteques.com / Recepcion123!
```

---

## 📱 Capacitor (Android App)

Este proyecto usa **Capacitor** para empaquetar la web app como app Android nativa.

### Configuración

| Campo | Archivo | Valor |
|---|---|---|
| appId | `capacitor.config.json` | `com.losteques.gymapp` |
| appName | `capacitor.config.json` | `Gimnasio Los Teques` |
| webDir | `capacitor.config.json` | `dist` |

### Comandos para build mobile

```bash
npm run mobile:build      # Build web + copiar a Android
npm run mobile:sync       # Sincronizar plugins
npm run mobile:open       # Abrir Android Studio
```

### Flujo después de cambios en el código

1. Ejecutar `npm run mobile:build` para compilar la web y copiar los assets a Android
2. Si se agregaron plugins de Capacitor, ejecutar también `npx cap sync`
3. Desde Android Studio: `Build → Build APK` (debug) o `Build → Generate Signed Bundle` (release)

### Publicación en Play Store

1. Generar Android App Bundle (AAB) firmado desde Android Studio
2. Subir a Google Play Console

> Para más detalles, ver `.opencode/plans/capacitor-build.md`

---

## ⚠️ Puntos de atención para el agente

1. **localStorage**: Actualmente se usa para guardar el token y el usuario. En artifacts de Claude.ai esto NO funciona — usar estado en memoria si se construyen demos.
2. **RLS**: Si una consulta a Supabase retorna vacío sin error, probablemente el token JWT no se está enviando. Verificar que `api.ts` incluya el header `Authorization`.
3. **Dos tipos de login**: No asumir que todos los usuarios son `staff`. Los miembros se autentican directamente con Supabase Auth.
4. **Tabla `exercises`**: Tiene RLS deshabilitado intencionalmente. No reactivarlo sin revisar la migración `04-fix-exercises-integration.sql`.
5. **React Router v7**: Las rutas usan `{ Component: ... }` en vez de `element={<Component />}`. Respetar este estilo.
