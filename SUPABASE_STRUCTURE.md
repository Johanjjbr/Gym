# 🗄️ ESTRUCTURA COMPLETA DE SUPABASE

## Sistema de Gestión de Gimnasio - Los Teques, Lagunetica

---

## 📊 Esquema de Base de Datos

### 🔐 Autenticación (Supabase Auth)

El sistema usa **Supabase Authentication** para gestionar usuarios de staff:

- Cada miembro del staff tiene un usuario en `auth.users`
- Los roles se almacenan en `user_metadata` y en la tabla `staff`
- **3 roles disponibles:** Administrador, Entrenador, Recepción

---

## 📋 Tablas Principales

### 1. **users** (Miembros del Gimnasio)

Almacena información de los miembros/clientes del gimnasio.

```sql
Columns:
- id (UUID, PK)
- member_number (TEXT, UNIQUE) - Número de socio generado automáticamente
- name (TEXT)
- email (TEXT, UNIQUE)
- phone (TEXT)
- status (TEXT) - 'Activo', 'Inactivo', 'Moroso'
- plan (TEXT) - Tipo de plan contratado
- start_date (TIMESTAMP)
- next_payment (TIMESTAMP) - Próxima fecha de pago
- weight (DECIMAL)
- height (DECIMAL)
- imc (DECIMAL) - Índice de Masa Corporal
- photo (TEXT) - URL de foto de perfil
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**Permisos RLS:**
- **Ver:** Todo el staff
- **Crear:** Administrador, Recepción
- **Actualizar:** Administrador, Recepción
- **Eliminar:** Solo Administrador

---

### 2. **staff** (Personal del Gimnasio)

Almacena información del personal con acceso al sistema.

```sql
Columns:
- id (UUID, PK)
- auth_user_id (UUID, UNIQUE) - Referencia a auth.users de Supabase
- name (TEXT)
- role (TEXT) - 'Administrador', 'Entrenador', 'Recepción'
- email (TEXT, UNIQUE)
- phone (TEXT)
- shift (TEXT) - Turno de trabajo
- status (TEXT) - 'Activo', 'Inactivo'
- photo (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**Permisos RLS:**
- **Todo:** Solo Administrador

---

### 3. **payments** (Pagos/Mensualidades)

Registro de todos los pagos realizados por los miembros.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → users)
- amount (DECIMAL)
- date (TIMESTAMP)
- next_payment (TIMESTAMP)
- status (TEXT) - 'Pagado', 'Pendiente', 'Vencido'
- method (TEXT) - 'Efectivo', 'Transferencia', 'Tarjeta'
- created_at (TIMESTAMP)
```

**Permisos RLS:**
- **Ver:** Todo el staff
- **Gestionar:** Administrador, Recepción

---

### 4. **attendance** (Asistencia)

Control de entrada y salida de miembros.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → users)
- date (DATE)
- time (TIME)
- type (TEXT) - 'Entrada', 'Salida'
- created_at (TIMESTAMP)
```

**Permisos RLS:**
- **Ver:** Todo el staff
- **Registrar:** Administrador, Recepción

---

### 5. **physical_progress** (Progreso Físico)

Seguimiento de medidas corporales y progreso.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → users)
- date (TIMESTAMP)
- weight (DECIMAL)
- body_fat (DECIMAL) - % grasa corporal
- muscle_mass (DECIMAL)
- notes (TEXT)
- created_at (TIMESTAMP)
```

**Permisos RLS:**
- **Ver:** Todo el staff
- **Gestionar:** Administrador, Entrenador

---

### 6. **routine_templates** (Plantillas de Rutinas)

Rutinas de entrenamiento creadas por entrenadores.

```sql
Columns:
- id (UUID, PK)
- name (TEXT)
- description (TEXT)
- level (TEXT) - 'Principiante', 'Intermedio', 'Avanzado'
- category (TEXT) - 'Fuerza', 'Cardio', 'Funcional', etc.
- duration (TEXT) - ej: "4 semanas"
- days_per_week (INTEGER)
- created_by (UUID, FK → staff)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**Permisos RLS:**
- **Ver:** Todo el staff
- **Crear:** Administrador, Entrenador
- **Actualizar:** Administrador, o Entrenador (solo sus rutinas)

---

### 7. **exercise_templates** (Ejercicios)

Ejercicios específicos dentro de cada rutina.

```sql
Columns:
- id (UUID, PK)
- routine_id (UUID, FK → routine_templates)
- name (TEXT)
- muscle_group (TEXT) - 'Pecho', 'Espalda', 'Piernas', etc.
- sets (INTEGER)
- reps (TEXT) - ej: "12", "10-12", "Al fallo"
- rest_time (TEXT) - ej: "60s"
- weight (TEXT)
- instructions (TEXT)
- video_url (TEXT)
- order_index (INTEGER)
- created_at (TIMESTAMP)
```

**Permisos RLS:**
- **Ver:** Todo el staff
- **Gestionar:** Administrador, Entrenador

---

### 8. **user_routine_assignments** (Asignaciones de Rutinas)

Rutinas asignadas a miembros específicos.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → users)
- routine_id (UUID, FK → routine_templates)
- assigned_by (UUID, FK → staff)
- start_date (TIMESTAMP)
- end_date (TIMESTAMP)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
```

**Permisos RLS:**
- **Ver:** Todo el staff
- **Gestionar:** Administrador, Entrenador

---

### 9. **workout_sessions** (Sesiones de Entrenamiento)

Registro de cada sesión de entrenamiento realizada.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → users)
- routine_id (UUID, FK → routine_templates)
- date (DATE)
- start_time (TIME)
- end_time (TIME)
- is_completed (BOOLEAN)
- notes (TEXT)
- created_at (TIMESTAMP)
```

**Permisos RLS:**
- **Ver:** Todo el staff
- **Crear:** Todo el staff

---

### 10. **workout_exercise_logs** (Logs de Ejercicios)

Ejercicios completados en cada sesión.

```sql
Columns:
- id (UUID, PK)
- session_id (UUID, FK → workout_sessions)
- exercise_id (UUID, FK → exercise_templates)
- exercise_name (TEXT)
- muscle_group (TEXT)
- is_completed (BOOLEAN)
- notes (TEXT)
- created_at (TIMESTAMP)
```

---

### 11. **set_logs** (Logs de Series)

Registro detallado de cada serie realizada.

```sql
Columns:
- id (UUID, PK)
- exercise_log_id (UUID, FK → workout_exercise_logs)
- set_number (INTEGER)
- reps (INTEGER)
- weight (DECIMAL)
- is_completed (BOOLEAN)
- created_at (TIMESTAMP)
```

---

### 12. **invoices** (Facturas)

Facturas generadas por pagos.

```sql
Columns:
- id (UUID, PK)
- user_id (UUID, FK → users)
- payment_id (UUID, FK → payments)
- invoice_number (TEXT, UNIQUE)
- amount (DECIMAL)
- date (TIMESTAMP)
- concept (TEXT)
- status (TEXT) - 'Pagada', 'Pendiente'
- created_at (TIMESTAMP)
```

**Permisos RLS:**
- **Ver:** Todo el staff
- **Gestionar:** Administrador, Recepción

---

## 🔐 Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con políticas específicas por rol:

### Matriz de Permisos:

| Tabla | Administrador | Entrenador | Recepción |
|-------|---------------|------------|-----------|
| users | CRUD | R | CRU |
| staff | CRUD | - | - |
| payments | CRUD | R | CRUD |
| attendance | CRU | R | CRU |
| physical_progress | CRUD | CRUD | R |
| routine_templates | CRUD | CRU* | R |
| exercise_templates | CRUD | CRUD | R |
| user_routine_assignments | CRUD | CRUD | R |
| workout_sessions | CRUD | CRUD | CR |
| workout_exercise_logs | CRUD | CRUD | CR |
| set_logs | CRUD | CRUD | CR |
| invoices | CRUD | R | CRUD |

**Leyenda:**
- C = Create (Crear)
- R = Read (Leer)
- U = Update (Actualizar)
- D = Delete (Eliminar)
- * = Solo puede actualizar sus propias rutinas

---

## 🛠️ Endpoints del Servidor

### Autenticación

```
POST /make-server-104060a1/auth/signup
POST /make-server-104060a1/auth/login
GET  /make-server-104060a1/auth/session
POST /make-server-104060a1/auth/logout
```

### CRUD Usuarios

```
GET    /make-server-104060a1/users
GET    /make-server-104060a1/users/:id
POST   /make-server-104060a1/users
PUT    /make-server-104060a1/users/:id
DELETE /make-server-104060a1/users/:id
```

### CRUD Pagos

```
GET  /make-server-104060a1/payments
POST /make-server-104060a1/payments
```

### CRUD Personal

```
GET /make-server-104060a1/staff
PUT /make-server-104060a1/staff/:id
```

### CRUD Asistencia

```
GET  /make-server-104060a1/attendance
POST /make-server-104060a1/attendance
```

### CRUD Rutinas

```
GET  /make-server-104060a1/routines
POST /make-server-104060a1/routines
```

### CRUD Asignaciones

```
GET  /make-server-104060a1/routine-assignments?user_id=xxx
POST /make-server-104060a1/routine-assignments
```

### Estadísticas

```
GET /make-server-104060a1/stats
```

### Utilidades

```
POST /make-server-104060a1/seed  (Crear datos de prueba)
```

---

## 🚀 Flujo de Autenticación

1. **Login:**
   ```
   POST /auth/login
   Body: { email, password }
   Response: { session, user, staff }
   ```

2. **Verificar Sesión:**
   ```
   GET /auth/session
   Headers: { Authorization: "Bearer <access_token>" }
   Response: { user, staff }
   ```

3. **Logout:**
   ```
   POST /auth/logout
   Headers: { Authorization: "Bearer <access_token>" }
   ```

---

## 📦 Datos de Prueba Incluidos

Al ejecutar el seed (`POST /seed`), se crean:

### Staff:
1. **Roberto Administrador** - admin@gymteques.com
2. **Laura Entrenadora** - trainer@gymteques.com
3. **Pedro Recepcionista** - recepcion@gymteques.com

### Miembros:
1. **Carlos Rodríguez** - GYM-001 (Activo)
2. **María González** - GYM-002 (Activo)
3. **José Pérez** - GYM-003 (Moroso)
4. **Ana Martínez** - GYM-004 (Activo)
5. **Luis Hernández** - GYM-005 (Inactivo)

### Pagos:
- 2 pagos de ejemplo para los primeros miembros

---

## 🔄 Relaciones Entre Tablas

```
users (miembros)
├── payments (1:N)
├── attendance (1:N)
├── physical_progress (1:N)
├── user_routine_assignments (1:N)
│   └── routine_templates (N:1)
│       ├── exercise_templates (1:N)
│       └── staff (creator) (N:1)
└── workout_sessions (1:N)
    └── workout_exercise_logs (1:N)
        ├── exercise_templates (N:1)
        └── set_logs (1:N)

staff (personal)
├── routine_templates (created_by) (1:N)
└── user_routine_assignments (assigned_by) (1:N)

payments
├── users (N:1)
└── invoices (1:1)
```

---

## 📝 Notas Importantes

1. **Auto-confirmación de Email:** Los usuarios creados vía `auth/signup` tienen `email_confirm: true` porque no hay servidor SMTP configurado.

2. **Member Number:** Se genera automáticamente con formato `GYM-XXXXXX` al crear un usuario.

3. **Cascadas:** Las eliminaciones en `users` y `routine_templates` son en cascada (ON DELETE CASCADE).

4. **Triggers:** Las tablas `users`, `staff`, y `routine_templates` tienen triggers para actualizar `updated_at` automáticamente.

5. **Índices:** Se crearon índices en columnas frecuentemente consultadas para optimizar performance.

---

## ✅ Checklist de Verificación

- [ ] Schema SQL ejecutado en Supabase
- [ ] Endpoint de seed ejecutado exitosamente
- [ ] Login funcionando con admin@gymteques.com
- [ ] Tablas visibles en Supabase Dashboard
- [ ] RLS habilitado en todas las tablas
- [ ] Políticas de seguridad activas

---

**Última actualización:** Febrero 2026
**Versión del Schema:** 1.0
