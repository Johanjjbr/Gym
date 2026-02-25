-- =====================================================
-- GYM LAGUNETICA - SCHEMA COMPLETO
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLA DE PERFILES DE USUARIO
-- =====================================================
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrador', 'entrenador', 'usuario')),
  member_number TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('Masculino', 'Femenino', 'Otro')),
  height DECIMAL(5,2), -- en cm
  membership_type TEXT CHECK (membership_type IN ('Básica', 'Premium', 'VIP')),
  membership_status TEXT CHECK (membership_status IN ('Activo', 'Inactivo', 'Moroso')),
  join_date DATE DEFAULT CURRENT_DATE,
  avatar_url TEXT,
  assigned_trainer_id UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLA DE PAGOS
-- =====================================================
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta', 'Pago Móvil')),
  concept TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  status TEXT CHECK (status IN ('Pagado', 'Pendiente', 'Vencido')) DEFAULT 'Pagado',
  invoice_number TEXT UNIQUE,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABLA DE FACTURAS
-- =====================================================
CREATE TABLE public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  concept TEXT NOT NULL,
  status TEXT CHECK (status IN ('Pagada', 'Pendiente', 'Anulada')) DEFAULT 'Pagada',
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABLA DE ASISTENCIA
-- =====================================================
CREATE TABLE public.attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  qr_code TEXT,
  registered_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TABLA DE PROGRESO FÍSICO
-- =====================================================
CREATE TABLE public.physical_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight DECIMAL(5,2) NOT NULL, -- en kg
  body_fat DECIMAL(5,2), -- porcentaje
  muscle_mass DECIMAL(5,2), -- en kg
  bmi DECIMAL(5,2),
  chest DECIMAL(5,2), -- medidas en cm
  waist DECIMAL(5,2),
  hips DECIMAL(5,2),
  arms DECIMAL(5,2),
  thighs DECIMAL(5,2),
  notes TEXT,
  recorded_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. TABLA DE PLANTILLAS DE RUTINAS
-- =====================================================
CREATE TABLE public.routine_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT CHECK (level IN ('Principiante', 'Intermedio', 'Avanzado')) NOT NULL,
  category TEXT CHECK (category IN ('Fuerza', 'Cardio', 'Funcional', 'Hipertrofia', 'Pérdida de Peso', 'Resistencia')) NOT NULL,
  duration TEXT, -- ej: "8 semanas"
  days_per_week INTEGER CHECK (days_per_week >= 1 AND days_per_week <= 7),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.user_profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. TABLA DE EJERCICIOS DE RUTINAS
-- =====================================================
CREATE TABLE public.routine_exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  routine_id UUID REFERENCES public.routine_templates(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  muscle_group TEXT CHECK (muscle_group IN ('Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Cardio', 'Cuerpo Completo')) NOT NULL,
  sets INTEGER NOT NULL CHECK (sets > 0),
  reps TEXT NOT NULL, -- puede ser "10-12" o "30 segundos"
  rest_time TEXT, -- ej: "60s"
  weight TEXT, -- ej: "Peso corporal", "10kg"
  instructions TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. TABLA DE ASIGNACIONES DE RUTINAS A USUARIOS
-- =====================================================
CREATE TABLE public.user_routine_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  routine_id UUID REFERENCES public.routine_templates(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES public.user_profiles(id) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. TABLA DE SESIONES DE ENTRENAMIENTO
-- =====================================================
CREATE TABLE public.workout_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  routine_id UUID REFERENCES public.routine_templates(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME NOT NULL,
  end_time TIME,
  is_completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. TABLA DE LOGS DE EJERCICIOS EN SESIÓN
-- =====================================================
CREATE TABLE public.workout_exercise_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES public.routine_exercises(id) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 11. TABLA DE SETS INDIVIDUALES
-- =====================================================
CREATE TABLE public.workout_set_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exercise_log_id UUID REFERENCES public.workout_exercise_logs(id) ON DELETE CASCADE NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL DEFAULT 0,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 12. TABLA DE TURNOS DE PERSONAL
-- =====================================================
CREATE TABLE public.staff_shifts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week TEXT CHECK (day_of_week IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_membership_status ON public.user_profiles(membership_status);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_date ON public.payments(payment_date);
CREATE INDEX idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_physical_progress_user_id ON public.physical_progress(user_id);
CREATE INDEX idx_routine_assignments_user_id ON public.user_routine_assignments(user_id);
CREATE INDEX idx_routine_assignments_active ON public.user_routine_assignments(is_active);
CREATE INDEX idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_date ON public.workout_sessions(date);

-- =====================================================
-- TRIGGERS PARA ACTUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routine_templates_updated_at
  BEFORE UPDATE ON public.routine_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Activar RLS en todas las tablas
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_routine_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES PARA user_profiles
-- =====================================================

-- Administradores pueden ver y editar todo
CREATE POLICY "Administradores pueden ver todos los perfiles"
  ON public.user_profiles FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'administrador')
  );

CREATE POLICY "Administradores pueden actualizar todos los perfiles"
  ON public.user_profiles FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'administrador')
  );

CREATE POLICY "Administradores pueden crear perfiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'administrador')
  );

-- Entrenadores pueden ver todos los usuarios y otros entrenadores
CREATE POLICY "Entrenadores pueden ver usuarios"
  ON public.user_profiles FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('entrenador', 'administrador'))
    OR role = 'usuario'
  );

-- Usuarios pueden ver su propio perfil y el de sus entrenadores
CREATE POLICY "Usuarios pueden ver su perfil"
  ON public.user_profiles FOR SELECT
  USING (
    auth.uid() = id 
    OR id IN (SELECT assigned_trainer_id FROM public.user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Usuarios pueden actualizar su perfil"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- POLICIES PARA payments
-- =====================================================

CREATE POLICY "Administradores pueden gestionar pagos"
  ON public.payments FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'administrador')
  );

CREATE POLICY "Usuarios pueden ver sus pagos"
  ON public.payments FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

-- =====================================================
-- POLICIES PARA attendance
-- =====================================================

CREATE POLICY "Todos pueden registrar asistencia"
  ON public.attendance FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Usuarios pueden ver su asistencia"
  ON public.attendance FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

-- =====================================================
-- POLICIES PARA physical_progress
-- =====================================================

CREATE POLICY "Entrenadores y admin pueden gestionar progreso"
  ON public.physical_progress FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

CREATE POLICY "Usuarios pueden ver su progreso"
  ON public.physical_progress FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

-- =====================================================
-- POLICIES PARA routine_templates
-- =====================================================

CREATE POLICY "Todos pueden ver rutinas activas"
  ON public.routine_templates FOR SELECT
  USING (is_active = TRUE OR auth.uid() = created_by);

CREATE POLICY "Entrenadores y admin pueden crear rutinas"
  ON public.routine_templates FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

CREATE POLICY "Entrenadores y admin pueden actualizar rutinas"
  ON public.routine_templates FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

CREATE POLICY "Entrenadores y admin pueden eliminar rutinas"
  ON public.routine_templates FOR DELETE
  USING (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

-- =====================================================
-- POLICIES PARA routine_exercises
-- =====================================================

CREATE POLICY "Todos pueden ver ejercicios de rutinas activas"
  ON public.routine_exercises FOR SELECT
  USING (
    routine_id IN (SELECT id FROM public.routine_templates WHERE is_active = TRUE)
  );

CREATE POLICY "Entrenadores y admin pueden gestionar ejercicios"
  ON public.routine_exercises FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

-- =====================================================
-- POLICIES PARA user_routine_assignments
-- =====================================================

CREATE POLICY "Usuarios pueden ver sus asignaciones"
  ON public.user_routine_assignments FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

CREATE POLICY "Entrenadores y admin pueden asignar rutinas"
  ON public.user_routine_assignments FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

-- =====================================================
-- POLICIES PARA workout_sessions
-- =====================================================

CREATE POLICY "Usuarios pueden gestionar sus sesiones"
  ON public.workout_sessions FOR ALL
  USING (
    user_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

-- =====================================================
-- POLICIES PARA workout_exercise_logs
-- =====================================================

CREATE POLICY "Usuarios pueden gestionar logs de sus sesiones"
  ON public.workout_exercise_logs FOR ALL
  USING (
    session_id IN (SELECT id FROM public.workout_sessions WHERE user_id = auth.uid())
    OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

-- =====================================================
-- POLICIES PARA workout_set_logs
-- =====================================================

CREATE POLICY "Usuarios pueden gestionar sets de sus logs"
  ON public.workout_set_logs FOR ALL
  USING (
    exercise_log_id IN (
      SELECT el.id FROM public.workout_exercise_logs el
      JOIN public.workout_sessions ws ON el.session_id = ws.id
      WHERE ws.user_id = auth.uid()
    )
    OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role IN ('administrador', 'entrenador'))
  );

-- =====================================================
-- POLICIES PARA staff_shifts
-- =====================================================

CREATE POLICY "Personal puede ver sus turnos"
  ON public.staff_shifts FOR SELECT
  USING (
    staff_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'administrador')
  );

CREATE POLICY "Administradores pueden gestionar turnos"
  ON public.staff_shifts FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'administrador')
  );

-- =====================================================
-- FUNCIÓN PARA CREAR PERFIL AUTOMÁTICO AL REGISTRARSE
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario Nuevo'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'usuario')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- VISTA PARA ESTADÍSTICAS DEL DASHBOARD
-- =====================================================
CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM public.user_profiles WHERE role = 'usuario' AND membership_status = 'Activo') as active_users,
  (SELECT COUNT(*) FROM public.user_profiles WHERE role = 'usuario' AND membership_status = 'Moroso') as delinquent_users,
  (SELECT COUNT(*) FROM public.attendance WHERE date = CURRENT_DATE) as today_attendance,
  (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)) as monthly_revenue,
  (SELECT COUNT(*) FROM public.user_profiles WHERE role IN ('entrenador', 'administrador')) as staff_count;

-- Grant permisos para la vista
GRANT SELECT ON public.dashboard_stats TO authenticated;
