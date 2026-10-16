-- =====================================================================
-- 56 - USUARIOS INDEPENDIENTES (entrenan en casa, sin gimnasio)
-- ---------------------------------------------------------------------
-- * Un usuario independiente = fila en `users` con organization_id NULL.
--   (NO se usa is_free_user: ese campo ya significa "socio exonerado de pago").
-- * Se registran solos vía register_independent_user(); ya no se permite
--   que cualquier sesión inserte filas en `users` directamente.
-- * El socio solo puede cambiar sus datos personales: las columnas de
--   facturación, estado, empresa, etc. se conservan si él mismo edita.
-- * La biblioteca de ejercicios importada (external_id) pasa a ser global.
-- * Respaldo previo en el esquema backup_56.
-- =====================================================================

-- 0. Respaldo ------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS backup_56;
REVOKE ALL ON SCHEMA backup_56 FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS backup_56.users AS TABLE public.users;
CREATE TABLE IF NOT EXISTS backup_56.exercises_org AS
  SELECT id, organization_id FROM public.exercises;
CREATE TABLE IF NOT EXISTS backup_56.users_policies AS
  SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users';

-- 1. Columnas ------------------------------------------------------------------
ALTER TABLE public.users ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN member_number DROP NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS timezone               text,
  ADD COLUMN IF NOT EXISTS weekly_goal            smallint CHECK (weekly_goal BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS fitness_profile        jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

COMMENT ON COLUMN public.users.organization_id IS
  'Empresa del socio. NULL = usuario independiente (entrena en casa, sin gimnasio).';
COMMENT ON COLUMN public.users.fitness_profile IS
  'Respuestas del cuestionario inicial: objetivo, nivel, minutos, equipo, limitaciones.';

-- Un independiente no tiene sede ni plan del gimnasio
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_independent_shape;
ALTER TABLE public.users ADD CONSTRAINT users_independent_shape
  CHECK (organization_id IS NOT NULL OR (gym_id IS NULL AND plan_id IS NULL));

-- 2. Asignación automática de empresa: no aplicar a independientes -----------------
CREATE OR REPLACE FUNCTION public.trg_users_set_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Registro de un usuario independiente: queda sin empresa ni sede
  IF current_setting('gymstars.registering_independent', true) = 'on' THEN
    NEW.organization_id := NULL;
    NEW.gym_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(current_org_id(), (SELECT id FROM organizations ORDER BY created_at LIMIT 1));
  END IF;
  IF NEW.gym_id IS NULL THEN
    NEW.gym_id := COALESCE(current_gym_id(),
      (SELECT id FROM gyms WHERE organization_id = NEW.organization_id AND is_active ORDER BY created_at LIMIT 1));
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Candado de empresa: un independiente puede pasar a una empresa (fase 2) -------
CREATE OR REPLACE FUNCTION public.trg_lock_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     AND OLD.organization_id IS NOT NULL
     AND coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND is_super_admin AND status = 'Activo') THEN
    RAISE EXCEPTION 'No se puede cambiar la empresa de un registro';
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. El socio solo edita sus datos personales -----------------------------------
-- Si quien actualiza es el propio socio (rol authenticated, sin ser staff), las
-- columnas administrativas conservan su valor anterior. Las funciones
-- SECURITY DEFINER (activation_complete, facturación) no pasan por aquí porque
-- corren con otro current_user.
CREATE OR REPLACE FUNCTION public.trg_users_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user <> 'authenticated'
     OR OLD.auth_user_id IS DISTINCT FROM auth.uid()
     OR EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND status = 'Activo') THEN
    RETURN NEW;
  END IF;

  NEW.organization_id    := OLD.organization_id;
  NEW.gym_id             := OLD.gym_id;
  NEW.auth_user_id       := OLD.auth_user_id;
  NEW.email              := OLD.email;
  NEW.member_number      := OLD.member_number;
  NEW.cedula             := OLD.cedula;
  NEW.status             := OLD.status;
  NEW.plan               := OLD.plan;
  NEW.plan_id            := OLD.plan_id;
  NEW.start_date         := OLD.start_date;
  NEW.next_payment       := OLD.next_payment;
  NEW.paid_until         := OLD.paid_until;
  NEW.billing_day        := OLD.billing_day;
  NEW.billing_start      := OLD.billing_start;
  NEW.is_free_user       := OLD.is_free_user;
  NEW.can_share_routines := OLD.can_share_routines;
  NEW.assigned_trainer   := OLD.assigned_trainer;
  NEW.activation_token   := OLD.activation_token;
  NEW.is_activated       := OLD.is_activated;
  NEW.notes              := OLD.notes;
  NEW.created_at         := OLD.created_at;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER users_self_update_guard
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_users_self_update_guard();

-- 5. Registro de independientes ------------------------------------------------
-- Ya no se permite insertar en `users` desde el navegador sin ser staff.
-- (se cierra la política en vez de borrarla: nadie puede insertar por ella)
ALTER POLICY "Usuarios pueden crear su propio registro" ON public.users WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.register_independent_user(
  p_name     text DEFAULT NULL,
  p_phone    text DEFAULT NULL,
  p_timezone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
  v_meta  jsonb;
  v_name  text;
  v_id    uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para registrarte';
  END IF;

  -- Idempotente: si ya tiene perfil de socio, devolverlo
  SELECT id INTO v_id FROM users WHERE auth_user_id = v_uid;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  IF EXISTS (SELECT 1 FROM staff WHERE auth_user_id = v_uid) THEN
    RAISE EXCEPTION 'Esta cuenta pertenece al personal de un gimnasio';
  END IF;

  SELECT lower(email), coalesce(raw_user_meta_data, '{}'::jsonb)
    INTO v_email, v_meta
    FROM auth.users WHERE id = v_uid;

  IF EXISTS (SELECT 1 FROM users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'Este email ya está registrado en un gimnasio. Activa tu cuenta con el enlace que te dio tu gimnasio.';
  END IF;

  v_name := nullif(btrim(coalesce(p_name, v_meta ->> 'name', '')), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'El nombre es obligatorio';
  END IF;

  PERFORM set_config('gymstars.registering_independent', 'on', true);

  INSERT INTO users (name, email, phone, status, start_date, is_activated, auth_user_id, timezone)
  VALUES (
    left(v_name, 120),
    v_email,
    nullif(btrim(coalesce(p_phone, v_meta ->> 'phone', '')), ''),
    'Activo',
    now(),
    true,
    v_uid,
    left(coalesce(p_timezone, v_meta ->> 'timezone'), 64)
  )
  RETURNING id INTO v_id;

  PERFORM set_config('gymstars.registering_independent', 'off', true);
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.register_independent_user(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_independent_user(text, text, text) TO authenticated;

-- 6. Biblioteca de ejercicios global -------------------------------------------
-- Los ejercicios importados (con external_id) los ven todas las empresas y los
-- usuarios independientes; los que cree el staff siguen siendo de su empresa.
UPDATE public.exercises
SET organization_id = NULL
WHERE external_id IS NOT NULL AND created_by IS NULL AND organization_id IS NOT NULL;
