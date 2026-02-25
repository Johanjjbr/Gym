# 🏋️ GYM Lagunetica - Sistema Administrativo Completo

## 📋 Resumen Ejecutivo

Sistema web administrativo moderno para gestión integral de gimnasio con autenticación multi-rol, control de membresías, seguimiento de entrenamientos y administración de personal.

**📍 Ubicación:** Los Teques, Sector Lagunetica  
**🔧 Stack:** React + TypeScript + Supabase + Tailwind CSS  
**🎨 Diseño:** Tema fitness oscuro con acentos neón (#10f94e verde, #ff3b5c rojo)

---

## 🚀 INICIO RÁPIDO (5 MINUTOS)

### ⚡ Para empezar inmediatamente:

1. **Lee primero:** [`GUIA_RAPIDA_SETUP.md`](GUIA_RAPIDA_SETUP.md)
2. **Crea usuarios:** [`CREAR_USUARIOS_PRUEBA.sql`](CREAR_USUARIOS_PRUEBA.sql)
3. **Verifica todo:** [`CHECKLIST_VERIFICACION.md`](CHECKLIST_VERIFICACION.md)

---

## 📚 ÍNDICE DE DOCUMENTACIÓN

### 🔰 Para Comenzar

| Documento | Descripción | Cuándo Usar |
|-----------|-------------|-------------|
| **[GUIA_RAPIDA_SETUP.md](GUIA_RAPIDA_SETUP.md)** | Setup completo en 5 min | ⭐ **EMPIEZA AQUÍ** |
| **[README_USUARIOS.md](README_USUARIOS.md)** | Creación de usuarios paso a paso | Si no sabes cómo crear usuarios |
| **[CHECKLIST_VERIFICACION.md](CHECKLIST_VERIFICACION.md)** | Verificar que todo funciona | Después del setup |

### 🔐 Usuarios y Autenticación

| Documento | Descripción | Cuándo Usar |
|-----------|-------------|-------------|
| **[CREAR_USUARIOS_PRUEBA.sql](CREAR_USUARIOS_PRUEBA.sql)** | SQL para crear 3 usuarios | ⭐ **EJECUTA ESTO en Supabase** |
| **[INSTRUCCIONES_CREAR_USUARIOS.md](INSTRUCCIONES_CREAR_USUARIOS.md)** | Guía completa de usuarios | Si tienes problemas con usuarios |
| **[SISTEMA_DE_ROLES.md](SISTEMA_DE_ROLES.md)** | Permisos por rol | Ver qué puede hacer cada rol |

### 🗄️ Base de Datos

| Documento | Descripción | Cuándo Usar |
|-----------|-------------|-------------|
| **[SQL_PARA_SUPABASE.sql](SQL_PARA_SUPABASE.sql)** | Schema completo de BD | ⭐ **EJECUTA PRIMERO en Supabase** |
| **[CONFIGURACION_SUPABASE.md](CONFIGURACION_SUPABASE.md)** | Configuración detallada | Configuración avanzada |

### 🛠️ Desarrollo y API

| Documento | Descripción | Cuándo Usar |
|-----------|-------------|-------------|
| **[CRUD_DOCUMENTATION.md](CRUD_DOCUMENTATION.md)** | Funciones CRUD disponibles | Para desarrollar nuevas features |

### 🚨 Solución de Problemas

| Documento | Descripción | Cuándo Usar |
|-----------|-------------|-------------|
| **[SOLUCION_ERRORES_LOCK.md](SOLUCION_ERRORES_LOCK.md)** | Fix errores de Supabase lock | Si ves "lock timed out" |

---

## 🔑 CREDENCIALES DE PRUEBA

Después de ejecutar `CREAR_USUARIOS_PRUEBA.sql`:

| Rol | Email | Password | Acceso |
|-----|-------|----------|--------|
| 👤 **Administrador** | admin@gymlagunetica.com | Admin123! | Total |
| 🏋️ **Entrenador** | entrenador@gymlagunetica.com | Trainer123! | Limitado |
| 💪 **Usuario** | usuario@gymlagunetica.com | User123! | Básico |

---

## 🎯 Características Principales

### ✅ Sistema de Autenticación y Roles
- 3 roles diferenciados: **Administrador**, **Entrenador**, **Usuario**
- Control de acceso basado en permisos (RLS)
- Login seguro con Supabase Auth
- Protección de rutas por rol

### ✅ Gestión de Usuarios
- Registro completo de usuarios
- Perfiles detallados con datos personales
- Asignación de entrenadores
- Control de membresías (Básica, Premium, VIP)
- Estados (Activo, Inactivo, Moroso)

### ✅ Control de Pagos y Facturación
- Registro de pagos con múltiples métodos
- Generación automática de facturas
- Historial de pagos por usuario
- Alertas de pagos pendientes
- Estadísticas de ingresos

### ✅ Sistema de Rutinas de Entrenamiento
- **Para Entrenadores:**
  - Crear rutinas personalizadas
  - Biblioteca de ejercicios
  - Asignación a usuarios
  - Niveles: Principiante, Intermedio, Avanzado
  - Categorías: Fuerza, Cardio, Funcional, etc.

- **Para Usuarios:**
  - Ver rutina asignada
  - Iniciar sesiones de entrenamiento
  - Registrar series, repeticiones y peso
  - Seguimiento de progreso
  - Historial de entrenamientos

### ✅ Seguimiento Físico
- Registro de peso, grasa corporal, masa muscular
- Medidas corporales (pecho, cintura, caderas, brazos, piernas)
- Gráficos de evolución con Recharts
- Cálculo automático de IMC

### ✅ Control de Asistencia
- Registro de entrada/salida
- Sistema de códigos QR
- Estadísticas de asistencia
- Historial completo

### ✅ Gestión de Personal
- Registro de entrenadores y personal
- Asignación de turnos
- Control de horarios
- Roles y permisos

### ✅ Dashboard Interactivo
- Estadísticas en tiempo real
- Gráficos de ingresos mensuales
- Métricas de usuarios activos
- Indicadores de asistencia

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Tipado estático
- **React Router 7** - Navegación
- **Tailwind CSS v4** - Estilos
- **shadcn/ui** - Componentes UI
- **Recharts** - Gráficos
- **React Hook Form** - Formularios
- **Sonner** - Notificaciones

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL Database
  - Authentication
  - Row Level Security (RLS)
  - Real-time subscriptions

### Diseño
- Tema fitness oscuro
- Colores neón: Verde (#10f94e) y Rojo (#ff3b5c)
- Tipografía: Rajdhani (títulos), Inter (texto)
- Completamente responsive

---

## 📊 Permisos por Rol

### 👨‍💼 Administrador
✅ Acceso total al sistema
- Gestión de usuarios (crear, editar, eliminar)
- Control de pagos y facturación
- Gestión de personal y turnos
- Creación y asignación de rutinas
- Reportes y estadísticas completas

### 🏃 Entrenador
✅ Gestión de entrenamientos
- Ver usuarios (solo lectura)
- Crear y asignar rutinas
- Registrar progreso físico
- Control de asistencia
- ❌ Sin acceso a pagos ni gestión de personal

### 💪 Usuario
✅ Vista personal
- Mi perfil y datos personales
- Mi entrenamiento diario
- Mis pagos e historial
- Mi asistencia
- Mi progreso físico
- ❌ No puede ver datos de otros usuarios

---

## 📁 Estructura del Proyecto

```
/
├── src/
│   ├── app/
│   │   ├── components/         # Componentes reutilizables
│   │   │   ├── ui/            # Componentes shadcn/ui
│   │   │   ├── Sidebar.tsx    # Navegación lateral
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/          # Context providers
│   │   │   └── AuthContext.tsx
│   │   ├── lib/               # Utilidades y helpers
│   │   │   ├── supabase.ts
│   │   │   └── mockData.ts
│   │   ├── pages/             # Páginas de la aplicación
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Users.tsx
│   │   │   ├── UserDetail.tsx
│   │   │   ├── Payments.tsx
│   │   │   ├── Staff.tsx
│   │   │   ├── Attendance.tsx
│   │   │   ├── Routines.tsx
│   │   │   ├── MyWorkout.tsx
│   │   │   └── Reports.tsx
│   │   ├── types/             # TypeScript types
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── routes.ts
│   └── styles/
│       ├── theme.css          # Tema y variables CSS
│       └── fonts.css
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_seed_data.sql
├── CONFIGURACION_SUPABASE.md  # Guía de setup Supabase
├── SISTEMA_DE_ROLES.md        # Documentación de roles
├── GUIA_RAPIDA_SETUP.md       # Setup rápido
└── SQL_PARA_SUPABASE.sql      # SQL completo
```

---

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- Cuenta en Supabase
- npm o pnpm

### Instalación Rápida

1. **Configurar Supabase:**
   - Sigue `GUIA_RAPIDA_SETUP.md`
   - Ejecuta `SQL_PARA_SUPABASE.sql` en Supabase
   - Crea usuarios de prueba

2. **Iniciar Aplicación:**
   ```bash
   npm install
   npm run dev
   ```

3. **Acceder:**
   - URL: http://localhost:5173
   - Ver credenciales en `GUIA_RAPIDA_SETUP.md`

---

## 🗄️ Base de Datos

### Tablas Principales (12 tablas)
- `user_profiles` - Perfiles de usuarios
- `payments` - Registro de pagos
- `invoices` - Facturas generadas
- `attendance` - Control de asistencia
- `physical_progress` - Progreso físico
- `routine_templates` - Plantillas de rutinas
- `routine_exercises` - Ejercicios de rutinas
- `user_routine_assignments` - Asignaciones
- `workout_sessions` - Sesiones de entrenamiento
- `workout_exercise_logs` - Logs de ejercicios
- `workout_set_logs` - Logs de series
- `staff_shifts` - Turnos de personal

### Seguridad
- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Políticas específicas por rol
- ✅ Triggers automáticos
- ✅ Índices optimizados

---

## 📱 Funcionalidades por Módulo

### Dashboard
- Tarjetas de estadísticas
- Gráfico de ingresos mensuales
- Lista de usuarios activos/morosos
- Asistencia reciente
- Próximas sesiones

### Usuarios
- Lista con filtros y búsqueda
- Detalles completos en 5 tabs:
  1. General (info personal)
  2. Asistencia (historial)
  3. Progreso Físico (gráficos)
  4. Rutinas (asignadas)
  5. Pagos (historial y facturas)

### Rutinas
- CRUD completo de rutinas
- Editor visual de ejercicios
- Asignación masiva
- Filtros por nivel y categoría
- Estadísticas de uso

### Mi Entrenamiento
- Vista de rutina asignada
- Temporizador de sesión
- Registro de sets con peso y reps
- Barra de progreso en tiempo real
- Historial de entrenamientos

### Pagos
- Registro de nuevos pagos
- Generación de facturas PDF
- Filtros avanzados
- Historial completo
- Alertas de vencimiento

---

## 🎨 Personalización

### Colores (theme.css)
```css
--primary: #10f94e;      /* Verde neón */
--secondary: #ff3b5c;    /* Rojo neón */
--background: #0a0a0f;   /* Fondo oscuro */
--card: #16161f;         /* Cards */
```

### Tipografía
- Títulos: Rajdhani (Google Fonts)
- Texto: Inter (sistema)

---

## 🔐 Seguridad

### Implementada
- ✅ Autenticación con Supabase
- ✅ Row Level Security (RLS)
- ✅ Protección de rutas
- ✅ Validación de roles
- ✅ HTTPS en producción

### Recomendaciones
- Cambiar contraseñas de prueba
- Habilitar 2FA para admins
- Configurar email confirmations
- Revisar políticas RLS periódicamente
- Backups automáticos

---

## 📚 Documentación Completa

1. **GUIA_RAPIDA_SETUP.md** - Setup paso a paso (15 min)
2. **CONFIGURACION_SUPABASE.md** - Configuración detallada
3. **SISTEMA_DE_ROLES.md** - Permisos y acceso completo
4. **SQL_PARA_SUPABASE.sql** - Schema de base de datos

---

## 🐛 Troubleshooting

Ver sección de troubleshooting en `GUIA_RAPIDA_SETUP.md`

Problemas comunes:
- Login no funciona → Verificar email confirmations
- Perfil no se crea → Ejecutar INSERT manual
- Permisos incorrectos → Revisar campo `role` en user_profiles
- RLS bloquea todo → Verificar políticas y rol del usuario

---

## 🔄 Próximas Funcionalidades

- [ ] Notificaciones push
- [ ] Chat usuario-entrenador
- [ ] Calendario de clases grupales
- [ ] Sistema de metas y objetivos
- [ ] Badges y logros
- [ ] Exportación de reportes PDF
- [ ] App móvil (React Native)
- [ ] Integración con wearables

---

## 📞 Soporte

Para reportar bugs o solicitar features:
- Revisa la documentación completa
- Consulta johanjesus1arg@gmail.com
- Revisa logs de Supabase

---

## 📄 Licencia

Proyecto propietario - EX

---

## 🙏 Tecnologías y Créditos

- [Supabase](https://supabase.com) - Backend
- [shadcn/ui](https://ui.shadcn.com) - Componentes
- [Tailwind CSS](https://tailwindcss.com) - Estilos
- [Recharts](https://recharts.org) - Gráficos
- [Lucide Icons](https://lucide.dev) - Iconos

---

**Sistema desarrollado con ❤️ para GYM Lagunetica**

**Versión:** 1.0.0  
**Última actualización:** Febrero 2026  
**Estado:** ✅ Producción Ready