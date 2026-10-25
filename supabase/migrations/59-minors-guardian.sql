-- =============================================================================
-- 59 · Socios menores de edad y su representante
-- -----------------------------------------------------------------------------
--   · Columnas del representante en users (nombre, cédula, teléfono, parentesco
--     y fecha en que autorizó).
--   · is_minor(birth_date): menor de 18 años (hora de Caracas).
--   · Un socio de gimnasio menor de edad debe tener representante completo al
--     crearlo, o cuando se cambia su fecha de nacimiento o su representante.
--     Los menores ya inscritos sin representante siguen igual (solo aviso en la app).
--   · El socio de gimnasio no puede cambiar su fecha de nacimiento ni su
--     representante desde su perfil.
--   · register_independent_user acepta la fecha de nacimiento (opcional).
-- Sin DROP de tablas ni DELETE de datos. Se puede ejecutar más de una vez.
-- =============================================================================

-- 1. Columnas ----------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS guardian_name         text,
  ADD COLUMN IF NOT EXISTS guardian_cedula       text,
  ADD COLUMN IF NOT EXISTS guardian_phone        text,
  ADD COLUMN IF NOT EXISTS guardian_relationship text,
  ADD COLUMN IF NOT EXISTS guardian_consent_at   timestamptz;

COMMENT ON COLUMN public.users.guardian_name IS 'Representante (padre, madre o tutor) del socio menor de edad.';
COMMENT ON COLUMN public.users.guardian_consent_at IS 'Cuándo se registró la autorización del representante.';

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_guardian_lengths;
ALTER TABLE public.users ADD CONSTRAINT users_guardian_lengths CHECK (
  coalesce(length(guardian_name), 0) <= 120
  AND coalesce(length(guardian_cedula), 0) <= 15
  AND coalesce(length(guardian_phone), 0) <= 20
  AND coalesce(length(guardian_relationship), 0) <= 40
);

-- 2. ¿Es menor de edad? ---------------------------------------------------------------
-- birth_date es texto AAAA-MM-DD; cualquier otro valor se considera "no se sabe" (NULL).
CREATE OR REPLACE FUNCTION public.is_minor(p_birth_date text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_birth_date IS NULL OR p_birth_date !~ '^\d{4}-\d{2}-\d{2}$' THEN NULL
    ELSE p_birth_date::date > ((now() AT TIME ZONE 'America/Caracas')::date - interval '18 years')::date
  END
$$;

GRANT EXECUTE ON FUNCTION public.is_minor(text) TO authenticated;

-- 3. Representante obligatorio para menores de un gimnasio ------------------------------
CREATE OR REPLACE FUNCTION public.trg_users_minor_guardian()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Usuarios independientes (sin gimnasio): solo se les muestra un aviso
  IF NEW.organization_id IS NULL OR NOT coalesce(is_minor(NEW.birth_date), false) THEN
    RETURN NEW;
  END IF;

  -- Solo se exige al crear el socio o al tocar su fecha / su representante
  IF TG_OP = 'UPDATE'
     AND NEW.birth_date            IS NOT DISTINCT FROM OLD.birth_date
     AND NEW.guardian_name         IS NOT DISTINCT FROM OLD.guardian_name
     AND NEW.guardian_cedula       IS NOT DISTINCT FROM OLD.guardian_cedula
     AND NEW.guardian_phone        IS NOT DISTINCT FROM OLD.guardian_phone
     AND NEW.guardian_relationship IS NOT DISTINCT FROM OLD.guardian_relationship THEN
    RETURN NEW;
  END IF;

  IF nullif(btrim(NEW.guardian_name), '') IS NULL
     OR nullif(btrim(NEW.guardian_cedula), '') IS NULL
     OR nullif(btrim(NEW.guardian_phone), '') IS NULL
     OR nullif(btrim(NEW.guardian_relationship), '') IS NULL THEN
    RAISE EXCEPTION 'El socio es menor de edad: faltan los datos del representante (nombre, cédula, teléfono y parentesco)'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.guardian_consent_at := coalesce(NEW.guardian_consent_at, now());
  RETURN NEW;
END;
$function$;

-- El nombre empieza por "users_z" para que corra después de users_self_update_guard
CREATE OR REPLACE TRIGGER users_z_minor_guardian
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_users_minor_guardian();

-- 4. El socio no cambia su fecha de nacimiento ni su representante ------------------------
-- (igual que la 56, más las columnas nuevas)
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
  -- Menores: lo controla el gimnasio
  NEW.guardian_name         := OLD.guardian_name;
  NEW.guardian_cedula       := OLD.guardian_cedula;
  NEW.guardian_phone        := OLD.guardian_phone;
  NEW.guardian_relationship := OLD.guardian_relationship;
  NEW.guardian_consent_at   := OLD.guardian_consent_at;
  IF OLD.organization_id IS NOT NULL THEN
    NEW.birth_date := OLD.birth_date;
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Registro de independientes con fecha de nacimiento ------------------------------------
-- Se reemplaza la versión de 3 parámetros (la app la llama con parámetros por nombre).
DROP FUNCTION IF EXISTS public.register_independent_user(text, text, text);

CREATE OR REPLACE FUNCTION public.register_independent_user(
  p_name       text DEFAULT NULL,
  p_phone      text DEFAULT NULL,
  p_timezone   text DEFAULT NULL,
  p_birth_date date DEFAULT NULL
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
  v_birth date;
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

  v_birth := p_birth_date;
  IF v_birth IS NULL AND coalesce(v_meta ->> 'birth_date', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN
    v_birth := (v_meta ->> 'birth_date')::date;
  END IF;
  IF v_birth IS NOT NULL AND (v_birth > current_date OR v_birth < current_date - interval '100 years') THEN
    RAISE EXCEPTION 'Revisa la fecha de nacimiento';
  END IF;

  PERFORM set_config('gymstars.registering_independent', 'on', true);

  INSERT INTO users (name, email, phone, status, start_date, is_activated, auth_user_id, timezone, birth_date)
  VALUES (
    left(v_name, 120),
    v_email,
    nullif(btrim(coalesce(p_phone, v_meta ->> 'phone', '')), ''),
    'Activo',
    now(),
    true,
    v_uid,
    left(coalesce(p_timezone, v_meta ->> 'timezone'), 64),
    to_char(v_birth, 'YYYY-MM-DD')
  )
  RETURNING id INTO v_id;

  PERFORM set_config('gymstars.registering_independent', 'off', true);
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.register_independent_user(text, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_independent_user(text, text, text, date) TO authenticated;
