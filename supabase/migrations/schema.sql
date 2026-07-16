-- =============================================
-- SCHEMA SQL COMPLETO PARA SISTEMA DE GIMNASIO
-- =============================================

-- Crear extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: users (Miembros del gimnasio)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_number TEXT UNIQUE NOT NULL,
  cedula TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Masculino', 'Femenino', 'Otro')),
  status TEXT NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo', 'Inactivo', 'Suspendido')),
  plan TEXT NOT NULL,
  plan_id UUID REFERENCES plans(id),
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  next_payment TIMESTAMP NOT NULL,
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  imc DECIMAL(4,2),
  photo TEXT,
  address TEXT,
  birth_date TEXT,
  emergency_contact TEXT,
  notes TEXT,
  medical_notes TEXT,
  activation_token TEXT,
  is_activated BOOLEAN DEFAULT false,
  auth_user_id UUID UNIQUE,
  assigned_trainer UUID REFERENCES staff(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: staff (Personal del gimnasio)
-- =============================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE, -- Referencia a auth.users de Supabase
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Administrador', 'Entrenador', 'Recepción')),
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  shift TEXT,
  status TEXT NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo', 'Inactivo')),
  photo TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: plans (Planes de Membresía)
-- =============================================
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  duration_days INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: attendance (Asistencia)
-- =============================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  type TEXT NOT NULL CHECK (type IN ('Entrada', 'Salida')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: physical_progress (Progreso físico)
-- =============================================
CREATE TABLE IF NOT EXISTS physical_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL DEFAULT NOW(),
  weight DECIMAL(5,2) NOT NULL,
  body_fat DECIMAL(4,2),
  muscle_mass DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: routine_templates (Plantillas de rutinas)
-- =============================================
CREATE TABLE IF NOT EXISTS routine_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL CHECK (level IN ('Principiante', 'Intermedio', 'Avanzado')),
  category TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL DEFAULT 4,
  days_per_week INTEGER NOT NULL,
  created_by UUID REFERENCES staff(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: routine_exercises (Ejercicios dentro de rutinas)
-- =============================================
CREATE TABLE IF NOT EXISTS routine_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID REFERENCES routine_templates(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  order_index INTEGER NOT NULL DEFAULT 0,
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL,
  rest_seconds INTEGER NOT NULL DEFAULT 60,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: user_routine_assignments (Asignaciones de rutinas a usuarios)
-- =============================================
CREATE TABLE IF NOT EXISTS user_routine_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES routine_templates(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES staff(id),
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: workout_sessions (Sesiones de entrenamiento)
-- =============================================
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES routine_templates(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME NOT NULL,
  end_time TIME,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: workout_exercise_logs (Logs de ejercicios en sesiones)
-- =============================================
CREATE TABLE IF NOT EXISTS workout_exercise_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES routine_exercises(id),
  exercise_name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: set_logs (Logs de series dentro de ejercicios)
-- =============================================
CREATE TABLE IF NOT EXISTS set_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_log_id UUID REFERENCES workout_exercise_logs(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(6,2) NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: invoices (Facturas unificadas)
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Pagada', 'Vencida')),
  method TEXT CHECK (method IN ('Efectivo', 'Transferencia', 'Tarjeta', 'Pago Móvil')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ÍNDICES para optimización
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_member_number ON users(member_number);
CREATE INDEX IF NOT EXISTS idx_users_cedula ON users(cedula);
CREATE INDEX IF NOT EXISTS idx_users_activation_token ON users(activation_token);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON staff(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_plan_id ON users(plan_id);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_routine_templates_created_by ON routine_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_user_routine_assignments_user_id ON user_routine_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);

-- =============================================
-- TRIGGERS para actualizar updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routine_templates_updated_at BEFORE UPDATE ON routine_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCIONES HELPER SECURITY DEFINER (evitan recursión RLS)
-- =============================================

CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE auth_user_id = auth.uid()
    AND role = 'Administrador'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_any()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE auth_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_reception()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE auth_user_id = auth.uid()
    AND role IN ('Administrador', 'Recepción')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_trainer()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE auth_user_id = auth.uid()
    AND role IN ('Administrador', 'Entrenador')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_owner_or_admin(owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE auth_user_id = auth.uid()
    AND (role = 'Administrador' OR id = owner_id)
  );
$$;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS deshabilitado para rutinas (el servidor usa SERVICE_ROLE_KEY)
-- ALTER TABLE routine_templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_routine_assignments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE workout_exercise_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para USERS
CREATE POLICY "Staff puede ver todos los usuarios"
  ON users FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Administrador y Recepción pueden crear usuarios"
  ON users FOR INSERT
  WITH CHECK (public.is_staff_reception());

CREATE POLICY "Administrador y Recepción pueden actualizar usuarios"
  ON users FOR UPDATE
  USING (public.is_staff_reception());

CREATE POLICY "Solo Administrador puede eliminar usuarios"
  ON users FOR DELETE
  USING (public.is_staff_admin());

-- Políticas para STAFF
CREATE POLICY "Administradores tienen acceso total a staff"
  ON staff FOR ALL
  USING (public.is_staff_admin());

-- Políticas para PLANS
CREATE POLICY "Staff puede ver planes"
  ON plans FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Administrador y Recepción pueden gestionar planes"
  ON plans FOR ALL
  USING (public.is_staff_reception());

-- Políticas para ATTENDANCE
CREATE POLICY "Staff puede ver asistencia"
  ON attendance FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Recepción puede registrar asistencia"
  ON attendance FOR INSERT
  WITH CHECK (public.is_staff_reception());

-- Políticas para ROUTINE TEMPLATES
CREATE POLICY "Staff puede ver rutinas"
  ON routine_templates FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Entrenadores y Administradores pueden crear rutinas"
  ON routine_templates FOR INSERT
  WITH CHECK (public.is_staff_trainer());

CREATE POLICY "Entrenadores pueden actualizar sus rutinas"
  ON routine_templates FOR UPDATE
  USING (public.is_staff_owner_or_admin(COALESCE(created_by, '00000000-0000-0000-0000-000000000000'::UUID)));

CREATE POLICY "Entrenadores pueden eliminar sus rutinas"
  ON routine_templates FOR DELETE
  USING (public.is_staff_owner_or_admin(COALESCE(created_by, '00000000-0000-0000-0000-000000000000'::UUID)));

-- Políticas para ROUTINE EXERCISES
CREATE POLICY "Staff puede ver ejercicios"
  ON routine_exercises FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Entrenadores pueden gestionar ejercicios"
  ON routine_exercises FOR ALL
  USING (public.is_staff_trainer());

-- Políticas para USER ROUTINE ASSIGNMENTS
CREATE POLICY "Staff puede ver asignaciones"
  ON user_routine_assignments FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Entrenadores pueden asignar rutinas"
  ON user_routine_assignments FOR ALL
  USING (public.is_staff_trainer());

-- Políticas para WORKOUT SESSIONS
CREATE POLICY "Staff puede ver sesiones"
  ON workout_sessions FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Cualquier staff puede crear sesiones"
  ON workout_sessions FOR INSERT
  WITH CHECK (public.is_staff_any());

-- Políticas para WORKOUT EXERCISE LOGS
CREATE POLICY "Staff puede ver logs de ejercicios"
  ON workout_exercise_logs FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Staff puede crear logs"
  ON workout_exercise_logs FOR INSERT
  WITH CHECK (public.is_staff_any());

-- Políticas para SET LOGS
CREATE POLICY "Staff puede ver logs de series"
  ON set_logs FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Staff puede crear logs de series"
  ON set_logs FOR INSERT
  WITH CHECK (public.is_staff_any());

-- Políticas para PHYSICAL PROGRESS
CREATE POLICY "Staff puede ver progreso físico"
  ON physical_progress FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Entrenadores pueden registrar progreso"
  ON physical_progress FOR ALL
  USING (public.is_staff_trainer());

-- Políticas para INVOICES
CREATE POLICY "Staff puede ver facturas"
  ON invoices FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Administrador y Recepción pueden gestionar facturas"
  ON invoices FOR ALL
  USING (public.is_staff_reception());

-- =============================================
-- AUTO-SUSPENDER USUARIOS VENCIDOS DIARIAMENTE
-- =============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION check_overdue_users()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO invoices (user_id, plan_id, invoice_number, amount, due_date, status)
  SELECT 
    u.id,
    u.plan_id,
    'FAC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0'),
    COALESCE(p.price, 0),
    u.next_payment,
    'Vencida'
  FROM users u
  LEFT JOIN plans p ON p.id = u.plan_id
  WHERE u.status = 'Activo' AND u.next_payment < CURRENT_DATE;

  UPDATE users
  SET status = 'Suspendido', updated_at = NOW()
  WHERE status = 'Activo' AND next_payment < CURRENT_DATE;
END;
$$;

SELECT cron.schedule('check-overdue-users', '0 0 * * *', 'SELECT check_overdue_users();');