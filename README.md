# 🏋️ GymTeques — Sistema de Gestión de Gimnasio

<div align="center">

![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38BDF8?style=for-the-badge&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?style=for-the-badge&logo=vite)

**Sistema web completo para la gestión del Gimnasio Los Teques, Sector Lagunetica.**

</div>

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Arquitectura](#-arquitectura)
- [Base de Datos](#-base-de-datos)
- [Sistema de Roles](#-sistema-de-roles)
- [Instalación](#-instalación)
- [Configuración de Supabase](#-configuración-de-supabase)
- [Credenciales de Prueba](#-credenciales-de-prueba)
- [API Client](#-api-client)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Diseño](#-diseño)
- [Estado del Proyecto](#-estado-del-proyecto)

---

## 📖 Descripción

GymTeques es una aplicación web moderna y completa para la administración integral de un gimnasio. Permite gestionar miembros, pagos, asistencia, rutinas de ejercicio y progreso físico desde una interfaz intuitiva con tema oscuro estilo fitness.

El sistema cuenta con tres niveles de acceso (Administrador, Entrenador, Recepción) y seguridad robusta implementada directamente en la base de datos mediante Row Level Security (RLS) de PostgreSQL.

---

## ✨ Características

### ✅ Implementadas
- **Autenticación completa** — Login/logout con JWT, persistencia de sesión y protección de rutas
- **Dashboard con estadísticas** — 6 tarjetas de métricas, gráficos de ingresos, asistencia semanal y distribución de usuarios
- **Gestión de Usuarios (CRUD completo)** — Creación con número de miembro automático (GYM-XXX), cálculo de IMC en tiempo real, búsqueda en tiempo real
- **Gestión de Personal (CRUD completo)** — Administración de staff con roles, turnos y badges visuales por rol
- **Control de Pagos** — Registro de pagos, historial y alertas de vencimiento
- **Registro de Asistencia** — Control de entradas/salidas con generación de códigos QR por usuario
- **Sistema de Roles** — 3 niveles de acceso con permisos diferenciados
- **Seguridad RLS** — Políticas de acceso a nivel de base de datos

### 🚧 En Desarrollo
- Sistema de rutinas de ejercicio
- Seguimiento de progreso físico
- Reportes y exportación de datos
- Dashboard de progreso con gráficas avanzadas

---

## 🛠️ Tecnologías

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| React | 18.3.1 | Framework UI principal |
| TypeScript | 5.x | Tipado estático |
| React Router | 7 | Navegación SPA |
| Tailwind CSS | 4 | Estilos utilitarios |
| Recharts | — | Gráficos y estadísticas |
| Lucide React | — | Iconos |
| shadcn/ui | — | Componentes UI |
| React Query | — | Gestión de estado del servidor |
| Vite | — | Build tool y dev server |

### Backend
| Tecnología | Uso |
|---|---|
| Supabase | BaaS — Base de datos, Auth, Edge Functions |
| PostgreSQL | Base de datos relacional |
| Supabase Auth | Sistema de autenticación con JWT |
| Hono (Deno) | Framework web para Edge Functions |
| Row Level Security | Seguridad de datos a nivel BD |

---

## 🏗️ Arquitectura

```
Usuario (Browser)
      │
      ▼
React + TypeScript (Vite)
      │
      ▼
api.ts (Cliente HTTP con JWT)
      │
      ▼
Supabase Edge Functions (Hono / Deno)
      │
      ├── Verificación JWT
      ├── Consulta staff table (rol del usuario)
      │
      ▼
PostgreSQL (Supabase)
      │
      ├── Políticas RLS según rol
      │
      ▼
JSON Response → Componente React → DOM
```

---

## 🗃️ Base de Datos

El sistema utiliza **12 tablas** en PostgreSQL:

### Usuarios y Personal
- `users` — Miembros del gimnasio (nombre, plan, estado, datos físicos)
- `staff` — Personal con autenticación integrada (Administradores, Entrenadores, Recepción)

### Finanzas
- `payments` — Registro de pagos realizados
- `invoices` — Facturas generadas

### Asistencia
- `attendance` — Registro de entradas y salidas

### Progreso Físico
- `physical_progress` — Peso, altura, IMC y medidas corporales

### Sistema de Rutinas
- `routine_templates` — Plantillas de rutinas
- `exercise_templates` — Biblioteca de ejercicios
- `user_routine_assignments` — Asignaciones de rutinas a miembros
- `workout_sessions` — Sesiones de entrenamiento
- `workout_exercise_logs` — Ejercicios completados por sesión
- `set_logs` — Series y repeticiones registradas

> ✅ RLS activo en todas las tablas con políticas granulares por rol.

---

## 🔐 Sistema de Roles

| Funcionalidad | 👑 Administrador | 🏋️ Entrenador | 📋 Recepción |
|---|:---:|:---:|:---:|
| Gestión de usuarios | ✅ CRUD | ✅ Ver/Editar | ✅ Ver |
| Gestión de pagos | ✅ CRUD | ❌ | ✅ Crear |
| Registro de asistencia | ✅ | ✅ | ✅ |
| Gestión de rutinas | ✅ CRUD | ✅ CRUD | ❌ |
| Gestión de staff | ✅ CRUD | ❌ | ❌ |
| Progreso físico | ✅ | ✅ Crear/Editar | ✅ Ver |

---

## 🚀 Instalación

### Requisitos previos
- Node.js 18+
- npm o pnpm
- Cuenta en [Supabase](https://supabase.com)

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd gimnasio-los-teques

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (ver sección siguiente)

# 4. Iniciar servidor de desarrollo
npm run dev
```

---

## ⚙️ Configuración de Supabase

### 1. Crear proyecto en Supabase

Crea un nuevo proyecto en [supabase.com](https://supabase.com) y obtén tu **Project ID** y **Anon Key**.

### 2. Configurar credenciales

Edita el archivo `utils/supabase/info.tsx` con tus datos:

```typescript
export const SUPABASE_PROJECT_ID = 'tu-project-id';
export const SUPABASE_ANON_KEY = 'tu-anon-key';
```

### 3. Ejecutar schema SQL

En el **SQL Editor** de Supabase, ejecuta el archivo:
```
supabase/migrations/schema.sql
```

Esto creará las 12 tablas con todas sus políticas RLS.

### 4. Cargar datos de prueba

Llama al endpoint de seed para poblar la base de datos:

```
POST https://[tu-project-id].supabase.co/functions/v1/make-server-104060a1/seed
```

### 5. Verificar la instalación

Navega a `/test-supabase` en la app para ejecutar las pruebas de conexión.

#### Checklist de verificación
- [ ] Schema SQL ejecutado (12 tablas visibles en Table Editor)
- [ ] Endpoint `/seed` ejecutado correctamente
- [ ] 3 usuarios en Supabase Authentication
- [ ] 5 miembros en tabla `users`
- [ ] Login funciona con `admin@gymteques.com`

---

## 🔑 Credenciales de Prueba

| Rol | Email | Contraseña |
|---|---|---|
| 👑 Administrador | `admin@gymteques.com` | `Admin123!` |
| 🏋️ Entrenador | `trainer@gymteques.com` | `Trainer123!` |
| 📋 Recepción | `recepcion@gymteques.com` | `Recepcion123!` |

### Miembros de prueba incluidos

| Nombre | N° Miembro | Plan | Estado |
|---|---|---|---|
| Carlos Rodríguez | GYM-001 | Mensual | ✅ Activo |
| María González | GYM-002 | Trimestral | ✅ Activo |
| José Pérez | GYM-003 | Mensual | ⚠️ Moroso |
| Ana Martínez | GYM-004 | Anual | ✅ Activo |
| Luis Hernández | GYM-005 | — | ❌ Inactivo |

---

## 📡 API Client

Importa el cliente centralizado desde cualquier componente:

```typescript
import api from './lib/api';

// Autenticación
await api.auth.login(email, password);
await api.auth.logout();
await api.auth.getSession();

// Usuarios (Miembros)
await api.users.getAll();
await api.users.getById(id);
await api.users.create(userData);
await api.users.update(id, userData);
await api.users.delete(id);

// Pagos
await api.payments.getAll();
await api.payments.create(paymentData);

// Personal
await api.staff.getAll();
await api.staff.update(id, staffData);

// Asistencia
await api.attendance.getAll(date?);
await api.attendance.create(attendanceData);

// Rutinas
await api.routines.getAll();
await api.routines.create(routineData);
await api.routineAssignments.getAll(userId?);

// Estadísticas del Dashboard
await api.stats.getDashboard();
```

---

## 📁 Estructura del Proyecto

```
gimnasio-los-teques/
│
├── supabase/
│   ├── migrations/
│   │   └── schema.sql              # Schema SQL completo
│   └── functions/
│       └── server/
│           ├── index.tsx           # Servidor Hono con todos los endpoints
│           ├── seed.tsx            # Datos de prueba
│           └── kv_store.tsx        # [Sistema — No editar]
│
├── src/
│   └── app/
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── StatCard.tsx
│       │   ├── DatabaseSetup.tsx
│       │   └── ui/                 # Componentes shadcn/ui
│       │
│       ├── contexts/
│       │   └── AuthContext.tsx     # Contexto global de autenticación
│       │
│       ├── lib/
│       │   ├── api.ts              # Cliente API TypeScript centralizado
│       │   └── mockData.ts         # Datos de demostración (fallback)
│       │
│       ├── pages/
│       │   ├── Dashboard.tsx       # Panel principal con estadísticas
│       │   ├── Users.tsx           # Gestión de miembros
│       │   ├── Payments.tsx        # Control de pagos
│       │   ├── Routines.tsx        # Sistema de rutinas
│       │   ├── Staff.tsx           # Gestión de personal
│       │   ├── Attendance.tsx      # Registro de asistencia + QR
│       │   ├── TestSupabase.tsx    # Página de diagnóstico
│       │   └── Layout.tsx          # Layout principal con Sidebar
│       │
│       ├── types/
│       │   └── index.ts            # Tipos TypeScript globales
│       │
│       ├── routes.ts               # Definición de rutas
│       └── App.tsx                 # Componente raíz
│
├── utils/
│   └── supabase/
│       └── info.tsx                # Project ID y Anon Key
│
├── package.json
└── vite.config.ts
```

---

## 🎨 Diseño

El sistema utiliza un tema oscuro con estética fitness moderna:

| Token | Color | Uso |
|---|---|---|
| Primary | `#10f94e` | Acciones positivas, CTA principal |
| Secondary | `#ff3b5c` | Alertas, estados negativos |
| Background | `#0a0a0f` | Fondo principal |
| Surface | `#13131a` | Cards y paneles |

**Tipografías:** Rajdhani (títulos) + Inter (texto general)

---

## 📊 Estado del Proyecto

| Módulo | Estado | Progreso |
|---|---|---|
| Infraestructura (Supabase + BD) | ✅ Completo | 100% |
| Autenticación y roles | ✅ Completo | 100% |
| Dashboard | ✅ Completo | 100% |
| Gestión de Usuarios | ✅ Completo | 100% |
| Gestión de Personal | ✅ Completo | 100% |
| Control de Pagos | ✅ Completo | 100% |
| Registro de Asistencia + QR | ✅ Completo | 100% |
| Sistema de Rutinas | 🚧 En desarrollo | 30% |
| Progreso Físico | 🚧 En desarrollo | 30% |
| Reportes y Exportación | ⏳ Pendiente | 0% |

**Progreso General: ~78%** ✅

---

## 🛠️ Solución de Problemas

| Error | Solución |
|---|---|
| `"Database error querying schema"` | Ejecutar el schema SQL en Supabase SQL Editor |
| `"Usuario no encontrado en staff"` | Ejecutar el endpoint `/seed` |
| `"Invalid token"` / `"Unauthorized"` | Verificar token en localStorage o volver a hacer login |
| Tablas no aparecen en Supabase | Refrescar Table Editor y verificar ejecución del SQL |

---

## 📄 Licencia

Proyecto desarrollado para **Gimnasio Los Teques, Sector Lagunetica**.  
Versión 1.0 — Febrero 2026.
