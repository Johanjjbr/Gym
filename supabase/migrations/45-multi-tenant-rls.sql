-- =====================================================================
-- 45 - MULTI-GIMNASIO: SEPARACIÓN DE DATOS POR EMPRESA (RLS)
-- ---------------------------------------------------------------------
-- Cada empleado y cada socio solo ve datos de SU empresa
-- (current_org_id()). El super admin también trabaja dentro de su
-- empresa actual; el panel de plataforma (etapa 5) usará funciones aparte.
-- Las políticas existentes se ajustan con ALTER POLICY (mismo nombre y
-- comando, se agrega la condición de empresa).
-- Las funciones SECURITY DEFINER (que saltan RLS) validan la empresa.
-- =====================================================================

-- ---------- Empresas y sedes del staff ----------
CREATE POLICY "Ver mi empresa" ON public.organizations
  FOR SELECT TO authenticated USING (id = current_org_id() OR is_super_admin());
CREATE POLICY "Dueño/Admin edita su empresa" ON public.organizations
  FOR UPDATE TO authenticated USING (id = current_org_id() AND is_staff_admin()) WITH CHECK (id = current_org_id() AND is_staff_admin());
CREATE POLICY "Super admin gestiona empresas" ON public.organizations
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "Ver sedes del staff de mi empresa" ON public.staff_branches
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff s WHERE s.id = staff_id AND s.organization_id = current_org_id()));
CREATE POLICY "Dueño/Admin asigna sedes" ON public.staff_branches
  FOR ALL TO authenticated
  USING (is_staff_admin() AND EXISTS (SELECT 1 FROM staff s WHERE s.id = staff_id AND s.organization_id = current_org_id()))
  WITH CHECK (is_staff_admin()
    AND EXISTS (SELECT 1 FROM staff s WHERE s.id = staff_id AND s.organization_id = current_org_id())
    AND EXISTS (SELECT 1 FROM gyms g WHERE g.id = gym_id AND g.organization_id = current_org_id()));

-- ---------- gyms (sedes) ----------
ALTER POLICY "Staff pueden gestionar gimnasios" ON public.gyms
  USING (is_staff_admin() AND organization_id = current_org_id())
  WITH CHECK (is_staff_admin() AND organization_id = current_org_id());
ALTER POLICY "Usuarios pueden ver gimnasios" ON public.gyms
  USING (organization_id = current_org_id());

-- ---------- staff ----------
ALTER POLICY "Administradores tienen acceso total a staff" ON public.staff
  USING (is_staff_admin() AND organization_id = current_org_id())
  WITH CHECK (is_staff_admin() AND organization_id = current_org_id());
ALTER POLICY "Staff puede ver su propio registro" ON public.staff
  USING (auth.uid() = auth_user_id OR ((is_staff_admin() OR is_staff_reception() OR is_staff_trainer()) AND organization_id = current_org_id()));
ALTER POLICY "Staff pueden actualizar staff del mismo gym" ON public.staff
  USING (is_staff_admin() AND organization_id = current_org_id())
  WITH CHECK (is_staff_admin() AND organization_id = current_org_id());
ALTER POLICY "Staff pueden eliminar staff del mismo gym" ON public.staff
  USING (is_staff_admin() AND organization_id = current_org_id());
ALTER POLICY "Staff pueden gestionar staff del mismo gym" ON public.staff
  WITH CHECK (is_staff_admin() AND organization_id = current_org_id());

-- ---------- users (socios) ----------
ALTER POLICY "Administrador y Recepción pueden actualizar usuarios" ON public.users
  USING (is_staff_reception() AND organization_id = current_org_id())
  WITH CHECK (is_staff_reception() AND organization_id = current_org_id());
ALTER POLICY "Administrador y Recepción pueden crear usuarios" ON public.users
  WITH CHECK (is_staff_reception() AND organization_id = current_org_id());
ALTER POLICY "Solo Administrador puede eliminar usuarios" ON public.users
  USING (is_staff_admin() AND organization_id = current_org_id());
ALTER POLICY "Staff puede ver todos los usuarios" ON public.users
  USING (is_staff_any() AND organization_id = current_org_id());

-- ---------- plans ----------
ALTER POLICY "Administrador y Recepción pueden gestionar planes" ON public.plans
  USING (is_staff_reception() AND organization_id = current_org_id())
  WITH CHECK (is_staff_reception() AND organization_id = current_org_id());
ALTER POLICY "Staff puede ver planes" ON public.plans
  USING (is_staff_any() AND organization_id = current_org_id());
ALTER POLICY "Usuarios pueden ver planes" ON public.plans
  USING (organization_id = current_org_id());

-- ---------- invoices ----------
ALTER POLICY "Administrador y Recepción pueden gestionar facturas" ON public.invoices
  USING (is_staff_reception() AND organization_id = current_org_id())
  WITH CHECK (is_staff_reception() AND organization_id = current_org_id());
ALTER POLICY "Staff puede ver facturas" ON public.invoices
  USING (is_staff_any() AND organization_id = current_org_id());

-- ---------- payments ----------
ALTER POLICY "Administrador y Recepción pueden gestionar pagos" ON public.payments
  USING (is_staff_reception() AND organization_id = current_org_id())
  WITH CHECK (is_staff_reception() AND organization_id = current_org_id());
ALTER POLICY "Staff puede ver todos los pagos" ON public.payments
  USING (is_staff_any() AND organization_id = current_org_id());

-- ---------- attendance ----------
ALTER POLICY "Recepción puede registrar asistencia" ON public.attendance
  WITH CHECK (is_staff_reception() AND organization_id = current_org_id());
ALTER POLICY "Staff puede ver asistencia" ON public.attendance
  USING (is_staff_any() AND organization_id = current_org_id());

-- ---------- exchange_rates (cada empresa su tasa) ----------
ALTER POLICY "Usuarios autenticados ven las tasas" ON public.exchange_rates
  USING (organization_id = current_org_id());
ALTER POLICY "Recepción y Admin cargan tasas" ON public.exchange_rates
  WITH CHECK (is_staff_reception() AND organization_id = current_org_id());
ALTER POLICY "Recepción y Admin corrigen tasas" ON public.exchange_rates
  USING (is_staff_reception() AND organization_id = current_org_id())
  WITH CHECK (is_staff_reception() AND organization_id = current_org_id());

-- ---------- exercises (biblioteca global = organization_id NULL) ----------
ALTER POLICY "Lectura pública de ejercicios" ON public.exercises
  USING (organization_id IS NULL OR organization_id = current_org_id());
ALTER POLICY "Staff puede actualizar ejercicios" ON public.exercises
  USING (is_staff_any() AND organization_id = current_org_id());
ALTER POLICY "Staff puede crear ejercicios" ON public.exercises
  WITH CHECK (is_staff_trainer() AND organization_id = current_org_id());
ALTER POLICY "Staff puede eliminar ejercicios" ON public.exercises
  USING (is_staff_any() AND organization_id = current_org_id());

-- ---------- routine_templates / routine_exercises ----------
ALTER POLICY "Acceso a rutinas" ON public.routine_templates
  USING (is_public = true OR shared_publicly = true OR created_by_user = get_user_id_from_auth()
         OR (is_staff_any() AND organization_id = current_org_id()));
ALTER POLICY "Actualizar rutinas" ON public.routine_templates
  USING (created_by_user = get_user_id_from_auth()
         OR (is_staff_owner_or_admin(COALESCE(created_by, '00000000-0000-0000-0000-000000000000'::uuid)) AND organization_id = current_org_id()));
ALTER POLICY "Crear rutinas" ON public.routine_templates
  WITH CHECK (created_by_user = get_user_id_from_auth() OR (is_staff_trainer() AND organization_id = current_org_id()));
ALTER POLICY "Eliminar rutinas" ON public.routine_templates
  USING (created_by_user = get_user_id_from_auth()
         OR (is_staff_owner_or_admin(COALESCE(created_by, '00000000-0000-0000-0000-000000000000'::uuid)) AND organization_id = current_org_id()));

ALTER POLICY "Actualizar ejercicios" ON public.routine_exercises
  USING (routine_id IN (SELECT id FROM routine_templates WHERE created_by_user = get_user_id_from_auth())
         OR (is_staff_trainer() AND routine_in_my_org(routine_id)));
ALTER POLICY "Eliminar ejercicios" ON public.routine_exercises
  USING (routine_id IN (SELECT id FROM routine_templates WHERE created_by_user = get_user_id_from_auth())
         OR (is_staff_trainer() AND routine_in_my_org(routine_id)));
ALTER POLICY "Gestionar ejercicios" ON public.routine_exercises
  WITH CHECK (routine_id IN (SELECT id FROM routine_templates WHERE created_by_user = get_user_id_from_auth())
         OR (is_staff_trainer() AND routine_in_my_org(routine_id)));
ALTER POLICY "Ver ejercicios de rutina" ON public.routine_exercises
  USING (routine_id IN (SELECT id FROM routine_templates
                        WHERE is_public = true OR shared_publicly = true OR created_by_user = get_user_id_from_auth())
         OR (is_staff_any() AND routine_in_my_org(routine_id)));

-- ---------- Datos del socio (progreso, asignaciones, entrenamientos) ----------
ALTER POLICY "Entrenadores pueden registrar progreso" ON public.physical_progress
  USING (is_staff_trainer() AND user_in_my_org(user_id))
  WITH CHECK (is_staff_trainer() AND user_in_my_org(user_id));
ALTER POLICY "Staff puede ver progreso físico" ON public.physical_progress
  USING (is_staff_any() AND user_in_my_org(user_id));

ALTER POLICY "Actualizar asignaciones" ON public.user_routine_assignments
  USING (user_id = get_user_id_from_auth() OR (is_staff_trainer() AND user_in_my_org(user_id)));
ALTER POLICY "Crear asignaciones" ON public.user_routine_assignments
  WITH CHECK (user_id = get_user_id_from_auth() OR (is_staff_trainer() AND user_in_my_org(user_id)));
ALTER POLICY "Ver asignaciones" ON public.user_routine_assignments
  USING (user_id = get_user_id_from_auth() OR (is_staff_any() AND user_in_my_org(user_id)));

ALTER POLICY "Actualizar sesiones" ON public.workout_sessions
  USING (user_id = get_user_id_from_auth() OR (is_staff_any() AND user_in_my_org(user_id)));
ALTER POLICY "Crear sesiones" ON public.workout_sessions
  WITH CHECK (user_id = get_user_id_from_auth() OR (is_staff_any() AND user_in_my_org(user_id)));
ALTER POLICY "Ver sesiones" ON public.workout_sessions
  USING (user_id = get_user_id_from_auth() OR (is_staff_any() AND user_in_my_org(user_id)));

ALTER POLICY "Actualizar logs de ejercicios" ON public.workout_exercise_logs
  USING (session_id IN (SELECT id FROM workout_sessions WHERE user_id = get_user_id_from_auth())
         OR (is_staff_any() AND session_in_my_org(session_id)));
ALTER POLICY "Crear logs de ejercicios" ON public.workout_exercise_logs
  WITH CHECK (session_id IN (SELECT id FROM workout_sessions WHERE user_id = get_user_id_from_auth())
         OR (is_staff_any() AND session_in_my_org(session_id)));
ALTER POLICY "Ver logs de ejercicios" ON public.workout_exercise_logs
  USING (session_id IN (SELECT id FROM workout_sessions WHERE user_id = get_user_id_from_auth())
         OR (is_staff_any() AND session_in_my_org(session_id)));

ALTER POLICY "Actualizar set_logs" ON public.set_logs
  USING (exercise_log_id IN (SELECT el.id FROM workout_exercise_logs el JOIN workout_sessions ws ON ws.id = el.session_id
                             WHERE ws.user_id = get_user_id_from_auth())
         OR (is_staff_any() AND EXISTS (SELECT 1 FROM workout_exercise_logs el WHERE el.id = exercise_log_id AND session_in_my_org(el.session_id))));
ALTER POLICY "Crear set_logs" ON public.set_logs
  WITH CHECK (exercise_log_id IN (SELECT el.id FROM workout_exercise_logs el JOIN workout_sessions ws ON ws.id = el.session_id
                             WHERE ws.user_id = get_user_id_from_auth())
         OR (is_staff_any() AND EXISTS (SELECT 1 FROM workout_exercise_logs el WHERE el.id = exercise_log_id AND session_in_my_org(el.session_id))));
ALTER POLICY "Ver set_logs" ON public.set_logs
  USING (exercise_log_id IN (SELECT el.id FROM workout_exercise_logs el JOIN workout_sessions ws ON ws.id = el.session_id
                             WHERE ws.user_id = get_user_id_from_auth())
         OR (is_staff_any() AND EXISTS (SELECT 1 FROM workout_exercise_logs el WHERE el.id = exercise_log_id AND session_in_my_org(el.session_id))));

-- ---------- Reseñas del gimnasio ----------
ALTER POLICY "Usuarios pueden ver reseñas de su gym" ON public.gym_reviews
  USING (auth.uid() = (SELECT users.auth_user_id FROM users WHERE users.id = gym_reviews.user_id)
         OR (is_staff_any() AND gym_id IN (SELECT id FROM gyms WHERE organization_id = current_org_id())));
