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
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo', 'Inactivo', 'Moroso')),
  plan TEXT NOT NULL,
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  next_payment TIMESTAMP NOT NULL,
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  imc DECIMAL(4,2),
  photo TEXT,
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
-- TABLA: payments (Pagos/Mensualidades)
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT NOW(),
  next_payment TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pagado', 'Pendiente', 'Vencido')),
  method TEXT NOT NULL CHECK (method IN ('Efectivo', 'Transferencia', 'Tarjeta')),
  created_at TIMESTAMP DEFAULT NOW()
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
  category TEXT NOT NULL CHECK (category IN ('Fuerza', 'Cardio', 'Funcional', 'Hipertrofia', 'Pérdida de Peso', 'Resistencia')),
  duration TEXT NOT NULL, -- ej: "4 semanas", "8 semanas"
  days_per_week INTEGER NOT NULL,
  created_by UUID REFERENCES staff(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TABLA: exercise_templates (Ejercicios dentro de rutinas)
-- =============================================
CREATE TABLE IF NOT EXISTS exercise_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID REFERENCES routine_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL CHECK (muscle_group IN ('Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Cardio', 'Cuerpo Completo')),
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL, -- ej: "12", "10-12", "Al fallo"
  rest_time TEXT, -- ej: "60s", "90s"
  weight TEXT, -- ej: "Peso corporal", "5kg"
  instructions TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
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
  exercise_id UUID REFERENCES exercise_templates(id),
  exercise_name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
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
-- TABLA: invoices (Facturas)
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT NOW(),
  concept TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pagada', 'Pendiente')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ÍNDICES para optimización
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_member_number ON users(member_number);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON staff(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
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

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_routine_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Políticas para STAFF (administrador tiene acceso total)
CREATE POLICY "Administradores tienen acceso total a staff"
  ON staff FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.auth_user_id = auth.uid()
      AND s.role = 'Administrador'
    )
  );

-- Políticas para USERS
CREATE POLICY "Staff puede ver todos los usuarios"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Administrador y Recepción pueden crear usuarios"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('Administrador', 'Recepción')
    )
  );

CREATE POLICY "Administrador y Recepción pueden actualizar usuarios"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('Administrador', 'Recepción')
    )
  );

CREATE POLICY "Solo Administrador puede eliminar usuarios"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role = 'Administrador'
    )
  );

-- Políticas para PAYMENTS
CREATE POLICY "Staff puede ver todos los pagos"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Administrador y Recepción pueden gestionar pagos"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('Administrador', 'Recepción')
    )
  );

-- Políticas para ATTENDANCE
CREATE POLICY "Staff puede ver asistencia"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Recepción puede registrar asistencia"
  ON attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('Administrador', 'Recepción')
    )
  );

-- Políticas para ROUTINE TEMPLATES
CREATE POLICY "Staff puede ver rutinas"
  ON routine_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Entrenadores y Administradores pueden crear rutinas"
  ON routine_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('Administrador', 'Entrenador')
    )
  );

CREATE POLICY "Entrenadores pueden actualizar sus rutinas"
  ON routine_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.auth_user_id = auth.uid()
      AND (s.role = 'Administrador' OR (s.role = 'Entrenador' AND routine_templates.created_by = s.id))
    )
  );

-- Políticas para EXERCISE TEMPLATES
CREATE POLICY "Staff puede ver ejercicios"
  ON exercise_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Entrenadores pueden gestionar ejercicios"
  ON exercise_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('Administrador', 'Entrenador')
    )
  );

-- Políticas para USER ROUTINE ASSIGNMENTS
CREATE POLICY "Staff puede ver asignaciones"
  ON user_routine_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Entrenadores pueden asignar rutinas"
  ON user_routine_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('Administrador', 'Entrenador')
    )
  );

-- Políticas para WORKOUT SESSIONS
CREATE POLICY "Staff puede ver sesiones"
  ON workout_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Cualquier staff puede crear sesiones"
  ON workout_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

-- Políticas para WORKOUT EXERCISE LOGS
CREATE POLICY "Staff puede ver logs de ejercicios"
  ON workout_exercise_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff puede crear logs"
  ON workout_exercise_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

-- Políticas para SET LOGS
CREATE POLICY "Staff puede ver logs de series"
  ON set_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff puede crear logs de series"
  ON set_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

-- Políticas para PHYSICAL PROGRESS
CREATE POLICY "Staff puede ver progreso físico"
  ON physical_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Entrenadores pueden registrar progreso"
  ON physical_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('Administrador', 'Entrenador')
    )
  );

-- Políticas para INVOICES
CREATE POLICY "Staff puede ver facturas"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Administrador y Recepción pueden gestionar facturas"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE auth_user_id = auth.uid()
      AND role IN ('Administrador', 'Recepción')
    )
  );
