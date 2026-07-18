-- =============================================
-- Habilitar RLS + Políticas para Usuarios en tablas de rutinas
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid();
$$;

-- =============================================
-- 1. routine_templates
-- =============================================
ALTER TABLE routine_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff puede ver rutinas" ON routine_templates CASCADE;
DROP POLICY IF EXISTS "Entrenadores y Administradores pueden crear rutinas" ON routine_templates CASCADE;
DROP POLICY IF EXISTS "Entrenadores pueden actualizar sus rutinas" ON routine_templates CASCADE;
DROP POLICY IF EXISTS "Entrenadores pueden eliminar sus rutinas" ON routine_templates CASCADE;

CREATE POLICY "Acceso a rutinas"
  ON routine_templates FOR SELECT
  USING (
    is_public = true
    OR shared_publicly = true
    OR created_by_user = get_user_id_from_auth()
    OR public.is_staff_any()
  );

CREATE POLICY "Crear rutinas"
  ON routine_templates FOR INSERT
  WITH CHECK (
    created_by_user = get_user_id_from_auth()
    OR public.is_staff_trainer()
  );

CREATE POLICY "Actualizar rutinas"
  ON routine_templates FOR UPDATE
  USING (
    created_by_user = get_user_id_from_auth()
    OR public.is_staff_owner_or_admin(COALESCE(created_by, '00000000-0000-0000-0000-000000000000'::UUID))
  );

CREATE POLICY "Eliminar rutinas"
  ON routine_templates FOR DELETE
  USING (
    created_by_user = get_user_id_from_auth()
    OR public.is_staff_owner_or_admin(COALESCE(created_by, '00000000-0000-0000-0000-000000000000'::UUID))
  );

-- =============================================
-- 2. routine_exercises
-- =============================================
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff puede ver ejercicios" ON routine_exercises CASCADE;
DROP POLICY IF EXISTS "Entrenadores pueden gestionar ejercicios" ON routine_exercises CASCADE;

CREATE POLICY "Ver ejercicios de rutina"
  ON routine_exercises FOR SELECT
  USING (
    routine_id IN (
      SELECT id FROM routine_templates
      WHERE is_public = true OR shared_publicly = true OR created_by_user = get_user_id_from_auth()
    )
    OR public.is_staff_any()
  );

CREATE POLICY "Gestionar ejercicios"
  ON routine_exercises FOR INSERT
  WITH CHECK (
    routine_id IN (SELECT id FROM routine_templates WHERE created_by_user = get_user_id_from_auth())
    OR public.is_staff_trainer()
  );

CREATE POLICY "Actualizar ejercicios"
  ON routine_exercises FOR UPDATE
  USING (
    routine_id IN (SELECT id FROM routine_templates WHERE created_by_user = get_user_id_from_auth())
    OR public.is_staff_trainer()
  );

CREATE POLICY "Eliminar ejercicios"
  ON routine_exercises FOR DELETE
  USING (
    routine_id IN (SELECT id FROM routine_templates WHERE created_by_user = get_user_id_from_auth())
    OR public.is_staff_trainer()
  );

-- =============================================
-- 3. user_routine_assignments
-- =============================================
ALTER TABLE user_routine_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff puede ver asignaciones" ON user_routine_assignments CASCADE;
DROP POLICY IF EXISTS "Entrenadores pueden asignar rutinas" ON user_routine_assignments CASCADE;

CREATE POLICY "Ver asignaciones"
  ON user_routine_assignments FOR SELECT
  USING (user_id = get_user_id_from_auth() OR public.is_staff_any());

CREATE POLICY "Crear asignaciones"
  ON user_routine_assignments FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth() OR public.is_staff_trainer());

CREATE POLICY "Actualizar asignaciones"
  ON user_routine_assignments FOR UPDATE
  USING (user_id = get_user_id_from_auth() OR public.is_staff_trainer());

-- =============================================
-- 4. workout_sessions
-- =============================================
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff puede ver sesiones" ON workout_sessions CASCADE;
DROP POLICY IF EXISTS "Cualquier staff puede crear sesiones" ON workout_sessions CASCADE;

CREATE POLICY "Ver sesiones"
  ON workout_sessions FOR SELECT
  USING (user_id = get_user_id_from_auth() OR public.is_staff_any());

CREATE POLICY "Crear sesiones"
  ON workout_sessions FOR INSERT
  WITH CHECK (user_id = get_user_id_from_auth() OR public.is_staff_any());

CREATE POLICY "Actualizar sesiones"
  ON workout_sessions FOR UPDATE
  USING (user_id = get_user_id_from_auth() OR public.is_staff_any());

-- =============================================
-- 5. workout_exercise_logs
-- =============================================
ALTER TABLE workout_exercise_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff puede ver logs de ejercicios" ON workout_exercise_logs CASCADE;
DROP POLICY IF EXISTS "Staff puede crear logs" ON workout_exercise_logs CASCADE;

CREATE POLICY "Ver logs de ejercicios"
  ON workout_exercise_logs FOR SELECT
  USING (
    session_id IN (SELECT id FROM workout_sessions WHERE user_id = get_user_id_from_auth())
    OR public.is_staff_any()
  );

CREATE POLICY "Crear logs de ejercicios"
  ON workout_exercise_logs FOR INSERT
  WITH CHECK (
    session_id IN (SELECT id FROM workout_sessions WHERE user_id = get_user_id_from_auth())
    OR public.is_staff_any()
  );

CREATE POLICY "Actualizar logs de ejercicios"
  ON workout_exercise_logs FOR UPDATE
  USING (
    session_id IN (SELECT id FROM workout_sessions WHERE user_id = get_user_id_from_auth())
    OR public.is_staff_any()
  );

-- =============================================
-- 6. set_logs
-- =============================================
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff puede ver logs de series" ON set_logs CASCADE;
DROP POLICY IF EXISTS "Staff puede crear logs de series" ON set_logs CASCADE;

CREATE POLICY "Ver set_logs"
  ON set_logs FOR SELECT
  USING (
    exercise_log_id IN (
      SELECT el.id FROM workout_exercise_logs el
      JOIN workout_sessions ws ON ws.id = el.session_id
      WHERE ws.user_id = get_user_id_from_auth()
    )
    OR public.is_staff_any()
  );

CREATE POLICY "Crear set_logs"
  ON set_logs FOR INSERT
  WITH CHECK (
    exercise_log_id IN (
      SELECT el.id FROM workout_exercise_logs el
      JOIN workout_sessions ws ON ws.id = el.session_id
      WHERE ws.user_id = get_user_id_from_auth()
    )
    OR public.is_staff_any()
  );

CREATE POLICY "Actualizar set_logs"
  ON set_logs FOR UPDATE
  USING (
    exercise_log_id IN (
      SELECT el.id FROM workout_exercise_logs el
      JOIN workout_sessions ws ON ws.id = el.session_id
      WHERE ws.user_id = get_user_id_from_auth()
    )
    OR public.is_staff_any()
  );
