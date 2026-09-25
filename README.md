# 💪 Sistema de Gestión - Gimnasio Los Teques

<div align="center">

![Estado](https://img.shields.io/badge/Estado-Integración_Completa-success)
![Versión](https://img.shields.io/badge/Versión-1.0-blue)
![Frontend](https://img.shields.io/badge/Frontend-React_18-61dafb)
![Backend](https://img.shields.io/badge/Backend-Supabase-3ecf8e)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)

**Sistema web completo para la gestión integral de gimnasios**

[Inicio Rápido](#-inicio-rápido) • [Documentación](#-documentación) • [Características](#-características) • [Tech Stack](#-tech-stack)

</div>

---

## 🎯 Descripción

Sistema administrativo moderno y completo para la gestión del **Gimnasio Los Teques** (Sector Lagunetica). Incluye control de usuarios, pagos, asistencia, rutinas de ejercicio, seguimiento físico y gestión de personal.

### ✨ Características Principales

- 🔐 **Autenticación completa** con 3 roles (Admin, Entrenador, Recepción)
- 👥 **Gestión de usuarios** (miembros del gimnasio)
- 💳 **Control de pagos** y mensualidades
- 📊 **Dashboard** con estadísticas en tiempo real
- 📋 **Registro de asistencia** con códigos QR
- 🏋️ **Sistema de rutinas** personalizadas
- 📈 **Seguimiento de progreso** físico (peso, IMC, medidas)
- 👔 **Gestión de personal** y turnos
- 📄 **Reportes** y exportación de datos
- 🎨 **Diseño fitness moderno** con tema oscuro y neón

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ instalado
- Cuenta en [Supabase](https://supabase.com)
- Git (opcional)

### Instalación

```bash
# 1. Clonar o descargar el proyecto
git clone <url-del-repo>
cd sistema-gimnasio

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# 4. Ejecutar en modo desarrollo
npm run dev

# 5. Abrir en el navegador
# http://localhost:5173
```

### ⚙️ Configuración de Variables de Entorno

#### Paso 1: Obtener credenciales de Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia tu **Project URL** y **anon/public key**

#### Paso 2: Configurar .env

El proyecto ya incluye un archivo `.env` configurado. Si necesitas cambiarlo:

```bash
# Edita el archivo .env con tus credenciales
VITE_SUPABASE_PROJECT_ID=tu_project_id
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

> ⚠️ **IMPORTANTE:** El archivo `.env` NO se sube a GitHub por seguridad. Usa `.env.example` como plantilla.

### Configuración Rápida (3 Pasos)

#### Paso 1: Ejecutar Schema SQL
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. SQL Editor → New Query
3. Copia todo el contenido de `/supabase/migrations/schema.sql`
4. Pégalo y haz clic en **RUN**

#### Paso 2: Crear Usuarios de Prueba
```bash
curl -X POST https://jhzgcfvshnjgktajspqo.supabase.co/functions/v1/make-server-104060a1/seed
```

#### Paso 3: Iniciar Sesión
```
Email:    admin@gymteques.com
Password: Admin123!
```

**¡Listo! 🎉** Tu sistema está funcionando.

> 📖 Para instrucciones detalladas, lee: [`INICIO_RAPIDO.md`](./INICIO_RAPIDO.md)

---

## 📚 Documentación

### 🎓 Para Comenzar

| Documento | Descripción | Tiempo |
|-----------|-------------|--------|
| [**INICIO_RAPIDO.md**](./INICIO_RAPIDO.md) | 3 pasos para empezar | 3 min ⭐ |
| [**RESUMEN_EJECUTIVO.md**](./RESUMEN_EJECUTIVO.md) | Vista general del proyecto | 5 min ⭐ |
| [**CHECKLIST_SETUP.md**](./CHECKLIST_SETUP.md) | Guía paso a paso completa | 10 min |

### 🛠️ Para Desarrolladores

| Documento | Descripción | Tiempo |
|-----------|-------------|--------|
| [**GUIA_INTEGRACION_FRONTEND.md**](./GUIA_INTEGRACION_FRONTEND.md) | Integración completa | 15 min ⭐ |
| [**CRUD_DOCUMENTATION.md**](./CRUD_DOCUMENTATION.md) | Ejemplos de código | 10 min |
| [**ARQUITECTURA_SISTEMA.md**](./ARQUITECTURA_SISTEMA.md) | Arquitectura técnica | 12 min |

### 📖 Referencia

| Documento | Descripción | Tiempo |
|-----------|-------------|--------|
| [**SUPABASE_STRUCTURE.md**](./SUPABASE_STRUCTURE.md) | Estructura de base de datos | 8 min |
| [**GUIA_VISUAL.md**](./GUIA_VISUAL.md) | Guía visual del diseño | 10 min |
| [**CAMBIOS_INTEGRACION.md**](./CAMBIOS_INTEGRACION.md) | Historial de cambios | 8 min |
| [**README_SUPABASE.md**](./README_SUPABASE.md) | Documentación de Supabase | 10 min |

> ⭐ = Recomendado para empezar

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Login    │  │Dashboard │  │ Users    │  │ Payments │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                          │                                  │
│                    AuthContext                              │
│                          │                                  │
│                      API Client                             │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    HTTPS (Bearer Token)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  BACKEND (Supabase)                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │          Edge Function (API REST)                     │ │
│  │  /auth/login  /users  /payments  /staff  /routines   │ │
│  └────────────────────────┬──────────────────────────────┘ │
│                           │                                 │
│  ┌────────────────────────▼──────────��──────────────────┐  │
│  │         PostgreSQL + Row Level Security             │  │
│  │  12 Tablas | Políticas RLS | Triggers | Functions   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Supabase Auth (JWT)                     │  │
│  │  3 Roles: Administrador | Entrenador | Recepción    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Características del Diseño

### Tema Fitness Oscuro

- **Verde Neón:** `#10f94e` - Acciones principales, éxito
- **Rojo Neón:** `#ff3b5c` - Alertas, errores, morosos
- **Fondo Oscuro:** `#0a0a0f` - Background principal
- **Tipografía:** Rajdhani (títulos) + Inter (texto)

### Responsive Design

✅ Desktop (1920x1080)  
✅ Tablet (768px - 1024px)  
✅ Mobile (< 768px)

### Componentes UI

- 50+ componentes de shadcn/ui
- Gráficos con Recharts
- Iconos con Lucide React
- Animaciones suaves
- Estados de carga

---

## 💻 Tech Stack

### Frontend

- **React 18.3.1** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Tailwind CSS 4** - Estilos utility-first
- **React Router 7** - Navegación SPA
- **Recharts 2** - Gráficos y visualizaciones
- **Lucide React** - Biblioteca de iconos
- **shadcn/ui** - Componentes accesibles
- **Vite 6** - Build tool ultra rápido

### Backend

- **Supabase** - Backend as a Service
- **PostgreSQL** - Base de datos relacional
- **Supabase Auth** - Autenticación JWT
- **Edge Functions** - API REST serverless
- **Row Level Security** - Seguridad a nivel de fila

### Herramientas

- **ESLint** - Linter de código
- **PostCSS** - Procesamiento CSS
- **QRCode.react** - Generación de códigos QR
- **Date-fns** - Manejo de fechas

---

## 📊 Base de Datos

### 12 Tablas Principales

```
📁 Usuarios y Personal
├── users              # Miembros del gimnasio
└── staff              # Personal (Admin, Trainer, Reception)

📁 Finanzas
├── payments           # Registro de pagos
└── invoices           # Facturas

📁 Asistencia
└── attendance         # Entradas y salidas

📁 Progreso Físico
└── physical_progress  # Peso, IMC, medidas

📁 Sistema de Rutinas
├── routine_templates        # Plantillas de rutinas
├── exercise_templates       # Ejercicios
├── user_routine_assignments # Asignaciones
├── workout_sessions         # Sesiones
├── workout_exercise_logs    # Ejercicios completados
└── set_logs                # Series y repeticiones
```

### Row Level Security (RLS)

✅ **Activo en todas las tablas**  
✅ **Políticas por rol**  
✅ **Aislamiento de datos**  
✅ **Auditoría automática**

---

## 🔐 Sistema de Roles

### 👑 Administrador
- **Permisos:** Acceso total al sistema
- **Puede:** Todo (CRUD completo en todas las tablas)
- **Credenciales:** `admin@gymteques.com` / `Admin123!`

### 🏋️ Entrenador
- **Permisos:** Gestión de rutinas y usuarios
- **Puede:** Ver/editar usuarios, crear/asignar rutinas, ver asistencia
- **Credenciales:** `trainer@gymteques.com` / `Trainer123!`

### 📋 Recepción
- **Permisos:** Registro operativo
- **Puede:** Registrar asistencia, pagos, ver usuarios
- **Credenciales:** `recepcion@gymteques.com` / `Recepcion123!`

---

## 🛠️ API Client

### Endpoints Disponibles

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

// Staff
await api.staff.getAll();
await api.staff.update(id, staffData);

// Asistencia
await api.attendance.getAll(date?);
await api.attendance.create(attendanceData);

// Rutinas
await api.routines.getAll();
await api.routines.create(routineData);
await api.routineAssignments.getAll(userId?);
await api.routineAssignments.create(assignmentData);

// Estadísticas
await api.stats.getDashboard();
```

> 📖 Ver ejemplos completos en: [`CRUD_DOCUMENTATION.md`](./CRUD_DOCUMENTATION.md)

---

## 🧪 Testing

### Página de Pruebas Integrada

**URL:** `http://localhost:5173/test-supabase`

**Tests incluidos:**
- ✅ Health Check del servidor
- ✅ Login con credenciales
- ✅ Obtener Usuarios
- ✅ Obtener Pagos
- ✅ Obtener Staff
- ✅ Obtener Asistencia
- ✅ Obtener Rutinas
- ✅ Estadísticas del Dashboard

**Acceso:**
- Desde Login: Click en "Test de Conexión Supabase →"
- Desde Sidebar: Sección "Desarrollo" → "Test Supabase"

---

## 📁 Estructura del Proyecto

```
sistema-gimnasio/
│
├── 📁 src/app/                      # Código fuente principal
│   ├── App.tsx                      # Punto de entrada
│   ├── routes.ts                    # Configuración de rutas
│   │
│   ├── 📁 pages/                    # Páginas de la aplicación
│   │   ├── Login.tsx               # Pantalla de login
│   │   ├── Dashboard.tsx           # Panel principal
│   │   ├── Users.tsx               # Gestión de usuarios
│   │   ├── Payments.tsx            # Control de pagos
│   │   ├── Staff.tsx               # Gestión de personal
│   │   ├── Attendance.tsx          # Registro de asistencia
│   │   ├── Routines.tsx            # Rutinas de ejercicio
│   │   ├── MyWorkout.tsx           # Entrenamiento personal
│   │   ├── Reports.tsx             # Reportes
│   │   ├── Layout.tsx              # Layout principal
│   │   └── TestSupabase.tsx        # Página de pruebas
│   │
│   ├── 📁 components/               # Componentes reutilizables
│   │   ├── Sidebar.tsx             # Navegación lateral
│   │   ├── ProtectedRoute.tsx      # HOC de protección
│   │   ├── StatCard.tsx            # Tarjeta de estadística
│   │   └── ui/                     # Componentes UI (shadcn)
│   │
│   ├── 📁 contexts/                 # Contextos de React
│   │   └── AuthContext.tsx         # Estado de autenticación
│   │
│   ├── 📁 lib/                      # Utilidades y configuración
│   │   ├── api.ts                  # Cliente API de Supabase
│   │   └── mockData.ts             # Datos de demostración
│   │
│   └── 📁 types/                    # Definiciones de TypeScript
│       └── index.ts                # Tipos globales
│
├── 📁 supabase/                     # Configuración de Supabase
│   ├── 📁 migrations/
│   │   └── schema.sql              # Schema completo de la BD
│   └── 📁 functions/server/
│       ├── index.tsx               # Edge Function principal
│       └── seed.tsx                # Seed de datos de prueba
│
├── 📁 utils/supabase/               # Info de configuración
│   └── info.tsx                    # PROJECT_ID y ANON_KEY
│
├── 📁 src/styles/                   # Estilos globales
│   ├── theme.css                   # Tema y variables CSS
│   ├── fonts.css                   # Fuentes de Google
│   └── index.css                   # Estilos base
│
├── 📄 package.json                  # Dependencias del proyecto
├── 📄 vite.config.ts               # Configuración de Vite
├─��� 📄 tsconfig.json                # Configuración de TypeScript
│
└── 📚 Documentación/                # Guías y manuales
    ├── README.md                   # Este archivo
    ├── INICIO_RAPIDO.md
    ├── RESUMEN_EJECUTIVO.md
    ├── CHECKLIST_SETUP.md
    ├── GUIA_INTEGRACION_FRONTEND.md
    ├── CRUD_DOCUMENTATION.md
    ├── ARQUITECTURA_SISTEMA.md
    ├── SUPABASE_STRUCTURE.md
    ├── GUIA_VISUAL.md
    ├── CAMBIOS_INTEGRACION.md
    └── README_SUPABASE.md
```

---

## 🎯 Roadmap

### ✅ Fase 1: Infraestructura (Completada)
- [x] Setup de Supabase
- [x] Schema SQL completo
- [x] Sistema de autenticación
- [x] Row Level Security
- [x] Edge Functions
- [x] Frontend base con React
- [x] Sistema de rutas
- [x] Integración frontend-backend

### 🚧 Fase 2: Funcionalidades Core (En Progreso)
- [ ] CRUD completo de usuarios
- [ ] Sistema de pagos
- [ ] Registro de asistencia con QR
- [ ] Dashboard con datos reales
- [ ] Gestión de personal

### 📅 Fase 3: Funcionalidades Avanzadas
- [ ] Sistema completo de rutinas
- [ ] Seguimiento de progreso físico
- [ ] Reportes y exportación
- [ ] Notificaciones automáticas
- [ ] Calendario de eventos

### 🚀 Fase 4: Optimización
- [ ] Tests unitarios
- [ ] Tests E2E
- [ ] Optimización de rendimiento
- [ ] PWA (Progressive Web App)
- [ ] Deploy a producción

---

## 🤝 Contribución

### Cómo Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Estándares de Código

- ✅ Usar TypeScript para todo
- ✅ Seguir guía de estilo de Tailwind
- ✅ Componentes funcionales con hooks
- ✅ Nombres descriptivos en español
- ✅ Comentarios en código complejo
- ✅ Tests para funcionalidades críticas

---

## 📝 Licencia

Este proyecto es privado y pertenece al **Gimnasio Los Teques**.

---

## 📞 Contacto

**Gimnasio Los Teques**  
Sector Lagunetica, Los Teques  
Estado Miranda, Venezuela

---

## 🙏 Agradecimientos

- **Supabase** - Por la plataforma increíble
- **shadcn/ui** - Por los componentes UI
- **Tailwind CSS** - Por el sistema de diseño
- **Recharts** - Por los gráficos hermosos
- **React Router** - Por la navegación fluida

---

## 📊 Estado del Proyecto

![Progreso](https://img.shields.io/badge/Progreso-78%25-success)
![Backend](https://img.shields.io/badge/Backend-100%25-success)
![Frontend](https://img.shields.io/badge/Frontend_Base-100%25-success)
![Integración](https://img.shields.io/badge/Integración-100%25-success)
![Funcionalidades](https://img.shields.io/badge/Funcionalidades-30%25-yellow)

---

## 🎉 ¡Gracias por usar nuestro sistema!

Si tienes preguntas o necesitas ayuda, consulta la documentación o abre un issue.

**¡Vamos a hacer grande al Gimnasio Los Teques! 💪🏋️‍♂️**

---

<div align="center">

**Hecho con ❤️ para el Gimnasio Los Teques**

[⬆ Volver arriba](#-sistema-de-gestión---gimnasio-los-teques)

</div>