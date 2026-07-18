# Plan de Implementación: Usuario Libre / Público

## Visión General

Permitir que un usuario sin gimnasio asignado ni entrenador pueda:
1. Registrarse libremente (con opción: **Entrenamiento Libre** o **Asociado a un Gym**)
2. Cargar/editar sus datos personales (con registro automático de peso → historial)
3. Explorar rutinas públicas (del sistema y compartidas por otros usuarios)
4. Crear sus propias rutinas privadas (con opción a compartirlas)
5. Asignarse rutinas a sí mismo
6. Llevar registro de entrenamiento (peso, reps, sesiones)

---

## Arquitectura

### Modelo de datos nuevo

```
gyms (nueva tabla)
  ├── id UUID PK
  ├── name TEXT NOT NULL
  ├── address TEXT
  ├── phone TEXT
  ├── code TEXT UNIQUE NOT NULL  ← código para que usuarios se unan
  ├── is_active BOOLEAN DEFAULT true
  └── created_at TIMESTAMP

users (modificada)
  ├── gym_id UUID FK → gyms (NUEVO, nullable)
  ├── is_free_user BOOLEAN DEFAULT false (NUEVO)
  └── can_share_routines BOOLEAN DEFAULT false (NUEVO)

routine_templates (modificada)
  ├── is_public BOOLEAN DEFAULT false (NUEVO)
  ├── created_by_user UUID FK → users (NUEVO, nullable)
  └── shared_publicly BOOLEAN DEFAULT false (NUEVO)
```

### Reglas de negocio

| Tipo | gym_id | is_free_user | Comportamiento |
|------|--------|-------------|----------------|
| Libre | NULL | true | Auto-gestiona rutinas, sin entrenador |
| Asociado | <gym_id> | false | Staff del gym puede asignarle entrenador/rutinas |
| Staff | N/A | N/A | Gestiona usuarios de su gym |

### Rutinas - visibilidad

| Tipo | is_public | shared_publicly | created_by | created_by_user | Visible para |
|------|-----------|----------------|------------|-----------------|-------------|
| Sistema | true | false | <staff_id> | NULL | Todos |
| Usuario compartida | true | true | NULL | <user_id> | Todos |
| Usuario privada | false | false | NULL | <user_id> | Solo el creador |
| Staff interna | false | false | <staff_id> | NULL | Solo staff |

---

## Fases de Implementación

### Fase 1: Base de Datos (Migraciones)

#### 1.1 Crear tabla `gyms`

```sql
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed: Gimnasio por defecto
INSERT INTO gyms (name, address, phone, code) VALUES
  ('Gimnasio Los Teques', 'Sector Lagunetica, Los Teques', '0412-1234567', 'GYM-LTQ-001');
```

#### 1.2 Modificar `users`

```sql
ALTER TABLE users ADD COLUMN gym_id UUID REFERENCES gyms(id);
ALTER TABLE users ADD COLUMN is_free_user BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN can_share_routines BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_gym_id ON users(gym_id);
```

#### 1.3 Modificar `routine_templates`

```sql
ALTER TABLE routine_templates ADD COLUMN is_public BOOLEAN DEFAULT false;
ALTER TABLE routine_templates ADD COLUMN created_by_user UUID REFERENCES users(id);
ALTER TABLE routine_templates ADD COLUMN shared_publicly BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_routine_templates_is_public ON routine_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_routine_templates_created_by_user ON routine_templates(created_by_user);
```

#### 1.4 Habilitar RLS en tablas de rutinas + políticas para usuarios

Migración crítica: actualmente RLS está **deshabilitado** en tablas de rutinas. Habilitarlo requiere crear políticas que permitan a **staff** (políticas existentes) Y a **usuarios** (nuevas políticas) acceder.

**Políticas necesarias:**

```sql
-- Habilitar RLS
ALTER TABLE routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_routine_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

-- Helper: obtener user_id desde auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid();
$$;

-- 1. routine_templates
DROP POLICY IF EXISTS "Staff puede ver rutinas" ON routine_templates;
CREATE POLICY "Acceso a rutinas" ON routine_templates FOR SELECT
  USING (
    is_public = true
    OR created_by_user = get_user_id_from_auth()
    OR shared_publicly = true
    OR public.is_staff_any()
  );

CREATE POLICY "Usuarios pueden crear sus rutinas" ON routine_templates FOR INSERT
  WITH CHECK (created_by_user = get_user_id_from_auth() OR public.is_staff_trainer());

CREATE POLICY "Usuarios pueden actualizar sus rutinas" ON routine_templates FOR UPDATE
  USING (created_by_user = get_user_id_from_auth() OR public.is_staff_owner_or_admin(COALESCE(created_by, '00000000-0000-0000-0000-000000000000'::UUID)));

CREATE POLICY "Usuarios pueden eliminar sus rutinas" ON routine_templates FOR DELETE
  USING (created_by_user = get_user_id_from_auth() OR public.is_staff_owner_or_admin(COALESCE(created_by, '00000000-0000-0000-0000-000000000000'::UUID)));

-- 2. routine_exercises
DROP POLICY IF EXISTS "Staff puede ver ejercicios" ON routine_exercises;
DROP POLICY IF EXISTS "Entrenadores pueden gestionar ejercicios" ON routine_exercises;

CREATE POLICY "Acceso a ejercicios de rutina" ON routine_exercises FOR SELECT
  USING (
    routine_id IN (SELECT id FROM routine_templates WHERE is_public OR shared_publicly OR created_by_user = get_user_id_from_auth())
    OR public.is_staff_any()
  );

CREATE POLICY "Gestión de ejercicios" ON routine_exercises FOR INSERT
  WITH CHECK (
    routine_id IN (SELECT id FROM routine_templates WHERE created_by_user = get_user_id_from_auth())
    OR public.is_staff_trainer()
  );

-- 3. user_routine_assignments
DROP POLICY IF EXISTS "Staff puede ver asignaciones" ON user_routine_assignments;
DROP POLICY IF EXISTS "Entrenadores pueden asignar rutinas" ON user_routine_assignments;

CREATE POLICY "Ver asignaciones" ON user_routine_assignments FOR SELECT
  USING (user_id = get_user_id_from_auth() OR public.is_staff_any());

CREATE POLICY "Crear asignaciones" ON user_routine_assignments FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth() OR public.is_staff_trainer());

-- 4. workout_sessions
DROP POLICY IF EXISTS "Staff puede ver sesiones" ON workout_sessions;
DROP POLICY IF EXISTS "Cualquier staff puede crear sesiones" ON workout_sessions;

CREATE POLICY "Ver sesiones" ON workout_sessions FOR SELECT
  USING (user_id = get_user_id_from_auth() OR public.is_staff_any());

CREATE POLICY "Crear sesiones" ON workout_sessions FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth() OR public.is_staff_any());

-- 5. workout_exercise_logs
DROP POLICY IF EXISTS "Staff puede ver logs de ejercicios" ON workout_exercise_logs;
DROP POLICY IF EXISTS "Staff puede crear logs" ON workout_exercise_logs;

CREATE POLICY "Ver logs" ON workout_exercise_logs FOR SELECT
  USING (
    session_id IN (SELECT id FROM workout_sessions WHERE user_id = get_user_id_from_auth())
    OR public.is_staff_any()
  );

CREATE POLICY "Crear logs" ON workout_exercise_logs FOR INSERT
  WITH CHECK (
    session_id IN (SELECT id FROM workout_sessions WHERE user_id = get_user_id_from_auth())
    OR public.is_staff_any()
  );

-- 6. set_logs
DROP POLICY IF EXISTS "Staff puede ver logs de series" ON set_logs;
DROP POLICY IF EXISTS "Staff puede crear logs de series" ON set_logs;

CREATE POLICY "Ver set_logs" ON set_logs FOR SELECT
  USING (
    exercise_log_id IN (
      SELECT el.id FROM workout_exercise_logs el
      JOIN workout_sessions ws ON ws.id = el.session_id
      WHERE ws.user_id = get_user_id_from_auth()
    )
    OR public.is_staff_any()
  );

CREATE POLICY "Crear set_logs" ON set_logs FOR INSERT
  WITH CHECK (
    exercise_log_id IN (
      SELECT el.id FROM workout_exercise_logs el
      JOIN workout_sessions ws ON ws.id = el.session_id
      WHERE ws.user_id = get_user_id_from_auth()
    )
    OR public.is_staff_any()
  );
```

#### 1.5 Política RLS para que usuarios vean/editen su perfil

```sql
-- Usuarios pueden ver su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil" ON users FOR SELECT
  USING (auth_user_id = auth.uid() OR public.is_staff_any());

-- Usuarios pueden actualizar su propio perfil (campos no críticos)
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON users FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
```

#### 1.6 Marcar rutinas existentes como públicas

```sql
UPDATE routine_templates SET is_public = true WHERE is_active = true;
```

### Fase 2: Backend - Hooks y API

#### 2.1 Nuevos métodos en `api.ts`

```typescript
export const gyms = {
  getAll: async () => supabase.from('gyms').select('*').eq('is_active', true).order('name'),
  getByCode: async (code: string) => supabase.from('gyms').select('*').eq('code', code).maybeSingle(),
};

routines.getPublic = async () => supabase
  .from('routine_templates')
  .select('*, staff:created_by(name), user:created_by_user(name)')
  .eq('is_public', true)
  .eq('is_active', true)
  .order('created_at', { ascending: false });

routines.getSharedByUsers = async () => supabase
  .from('routine_templates')
  .select('*, user:created_by_user(name)')
  .eq('shared_publicly', true)
  .eq('is_active', true)
  .order('created_at', { ascending: false });

routines.getOwn = async (userId: string) => supabase
  .from('routine_templates')
  .select('*, routine_exercises(*)')
  .eq('created_by_user', userId)
  .order('created_at', { ascending: false });

routineAssignments.selfAssign = async (userId: string, routineId: string) => {
  await supabase.from('user_routine_assignments')
    .update({ is_active: false, end_date: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_active', true);

  return supabase.from('user_routine_assignments')
    .insert([{ user_id: userId, routine_id: routineId, is_active: true, assigned_by: null }])
    .select('*, routine_templates(*)')
    .single();
};

routineAssignments.deactivateOwn = async (userId: string) => supabase
  .from('user_routine_assignments')
  .update({ is_active: false, end_date: new Date().toISOString() })
  .eq('user_id', userId)
  .eq('is_active', true);
```

#### 2.2 Nuevo hook: `useUserRoutines.ts`

```typescript
useGyms() → lista de gimnasios activos
useGymByCode(code) → buscar gimnasio por código
usePublicRoutines() → rutinas públicas del sistema
useSharedUserRoutines() → rutinas compartidas por usuarios
useUserOwnRoutines(userId) → rutinas creadas por el usuario
useSearchPublicRoutines(query) → búsqueda en rutinas públicas
useSelfAssignRoutine() → mutation para auto-asignarse
useDeactivateOwnAssignment() → mutation para quitar asignación
useCreateUserRoutine() → mutation para crear rutina privada
useToggleShareRoutine() → mutation para compartir/ocultar rutina
useUpdateOwnProfile() → mutation para editar perfil (con registro en physical_progress si cambia peso)
```

### Fase 3: Frontend - Registro con opción gym/libre

#### 3.1 Modificar `Login.tsx`

Agregar en el formulario de registro selector: "Entrenamiento Libre" vs "Asociado a un Gimnasio"
- Libre → `is_free_user = true`, `gym_id = null`
- Asociado → `is_free_user = false`, `gym_id = <id>`, buscar por código o selector

#### 3.2 Modificar `AuthContext.tsx`

Agregar `is_free_user` y `gym_id` al `AuthUser`.
Asegurar que la query de `checkSession()` funcione con la nueva política RLS de SELECT.

### Fase 4: Frontend - Página de Rutinas de Usuario

#### 4.1 Crear `UserRoutines.tsx`

Tres tabs:
- **Mi Rutina Actual**: muestra asignación activa o estado vacío con CTAs
- **Explorar Rutinas**: catálogo de rutinas públicas + compartidas, con búsqueda y filtros
- **Mis Rutinas**: CRUD de rutinas propias, con toggle para compartir

#### 4.2 Crear `UserRoutineCreator.tsx`

Wizard: nombre → días → ejercicios por día (búsqueda en librería)

### Fase 5: Frontend - Edición de Perfil con Historial de Peso

#### 5.1 Crear `EditProfileDialog.tsx`

Modal con campos editables. Si cambia peso, insertar en `physical_progress`.

#### 5.2 Modificar `MyProfile.tsx`

Agregar botón "Editar Perfil".

### Fase 6: Frontend - Navegación y Ajustes

#### 6.1 Modificar `UserLayout.tsx` - agregar "Rutinas" al menú
#### 6.2 Modificar `routes.tsx` - agregar rutas
#### 6.3 Modificar `MyTraining.tsx` - CTA "Explorar rutinas" en empty state

---

## Consideraciones importantes

### 1. RLS y el helper `get_user_id_from_auth()`

Las políticas RLS usan `auth.uid()` que devuelve el UUID de Supabase Auth. Pero la tabla `users` usa su propio `id` (UUID). Necesitamos la función helper `get_user_id_from_auth()` con `SECURITY DEFINER`.

### 2. Compatibilidad con staff existente

Las políticas existentes para staff se mantienen. Las nuevas políticas se agregan sin reemplazar las de staff.

### 3. Transición de RLS deshabilitado a habilitado

Actualmente `fix_rls_routines.sql` deshabilita RLS. Al habilitarlo:
- Queries con `supabase.from()` seguirán funcionando con nuevas políticas
- Edge Function usa `service_role` → bypass RLS
- Queries del frontend ahora protegidas: usuario no ve datos ajenos

### 4. Seguridad

- Nunca permitir UPDATE de: `status`, `plan`, `plan_id`, `assigned_trainer`, `role`, `auth_user_id`
- Políticas de UPDATE en `users` deben tener `WITH CHECK`
- `shared_publicly` solo modificable por el dueño de la rutina

### 5. Tests necesarios

```
1. Registro libre → is_free_user = true, gym_id = null
2. Registro asociado → is_free_user = false, gym_id = <id>
3. Crear rutina privada → created_by_user = user.id
4. Compartir rutina → shared_publicly = true
5. Auto-asignarse rutina pública
6. Auto-asignarse rutina compartida por otro usuario
7. Editar peso → crear registro physical_progress
8. RLS: no ver rutinas ajenas no compartidas
9. Staff: sigue viendo todo
```

---

## Resumen de archivos

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/24-create-gyms-table.sql` | Crear |
| `supabase/migrations/25-add-gym-fields-to-users.sql` | Crear |
| `supabase/migrations/26-add-public-shared-to-routines.sql` | Crear |
| `supabase/migrations/27-enable-rls-routines-with-user-policies.sql` | Crear |
| `supabase/migrations/28-add-user-rls-to-users-table.sql` | Crear |
| `supabase/migrations/29-mark-existing-routines-public.sql` | Crear |
| `src/app/types/index.ts` | Modificar |
| `src/app/lib/api.ts` | Modificar |
| `src/app/hooks/useUserRoutines.ts` | Crear |
| `src/app/hooks/useRoutineAssignments.ts` | Verificar/Modificar |
| `src/app/pages/Login.tsx` | Modificar |
| `src/app/contexts/AuthContext.tsx` | Modificar |
| `src/app/pages/UserRoutines.tsx` | Crear |
| `src/app/pages/UserRoutineCreator.tsx` | Crear |
| `src/app/components/EditProfileDialog.tsx` | Crear |
| `src/app/pages/MyProfile.tsx` | Modificar |
| `src/app/pages/MyTraining.tsx` | Modificar |
| `src/app/pages/UserLayout.tsx` | Modificar |
| `src/app/routes.tsx` | Modificar |
| Tests | Crear |
