-- =============================================================================
-- 61 · Una sola app de entrenamiento para todos los socios (Fase 1)
-- -----------------------------------------------------------------------------
--   · "Día entrenado" = sesión completada en la app O entrada al gimnasio.
--     Ambas cuentan para la meta semanal, la racha y los puntos (50 XP por día,
--     una sola vez aunque haga las dos cosas).
--   · Al marcar entrada en el gimnasio se otorgan los puntos automáticamente.
--   · finish_workout guarda la hora de fin en la hora local del socio.
--   · La rutina asignada por un entrenador tiene prioridad sobre la de GymStars.
--   · users.health_consent_at: cuándo aceptó el aviso de salud.
-- Sin DROP de tablas ni DELETE de datos. Se puede ejecutar más de una vez.
-- =============================================================================

-- 1. Aviso de salud ---------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS health_consent_at timestamptz;
COMMENT ON COLUMN public.users.health_consent_at IS 'Cuándo aceptó el aviso de salud antes de entrenar con la app.';

-- 2. Zona horaria del socio ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_tz(p_user uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_tz text;
BEGIN
  SELECT timezone INTO v_tz FROM users WHERE id = p_user;
  IF v_tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = v_tz) THEN
    v_tz := 'America/Caracas';
  END IF;
  RETURN v_tz;
END;
$function$;
REVOKE ALL ON FUNCTION public.user_tz(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.user_today(p_user uuid)
RETURNS date
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT (now() AT TIME ZONE user_tz(p_user))::date $$;
REVOKE ALL ON FUNCTION public.user_today(uuid) FROM public, anon, authenticated;

-- 3. Días entrenados ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.training_days(p_user uuid)
RETURNS TABLE (day date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT date FROM workout_sessions WHERE user_id = p_user AND is_completed
  UNION
  SELECT date FROM attendance WHERE user_id = p_user AND type = 'Entrada'
$$;
REVOKE ALL ON FUNCTION public.training_days(uuid) FROM public, anon, authenticated;

-- Puntos de un día entrenado + bono de la meta semanal. Devuelve los XP ganados.
CREATE OR REPLACE FUNCTION public.award_training_day(p_user uuid, p_day date)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_gained integer := 0;
  v_n      integer;
  v_goal   integer;
  v_week   date := date_trunc('week', p_day)::date;
  v_week_n integer;
BEGIN
  INSERT INTO xp_events (user_id, kind, ref_key, xp)
  VALUES (p_user, 'session', p_day::text, 50)
  ON CONFLICT (user_id, kind, ref_key) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_gained := 50 * v_n;

  SELECT coalesce(weekly_goal, 3) INTO v_goal FROM users WHERE id = p_user;
  SELECT count(*) INTO v_week_n FROM training_days(p_user) d WHERE d.day >= v_week AND d.day < v_week + 7;
  IF v_week_n >= v_goal THEN
    INSERT INTO xp_events (user_id, kind, ref_key, xp)
    VALUES (p_user, 'weekly_goal', v_week::text, 100)
    ON CONFLICT (user_id, kind, ref_key) DO NOTHING;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_gained := v_gained + 100 * v_n;
  END IF;
  RETURN v_gained;
END;
$function$;
REVOKE ALL ON FUNCTION public.award_training_day(uuid, date) FROM public, anon, authenticated;

-- 4. Resumen del socio (días entrenados en vez de solo sesiones) ------------------------
CREATE OR REPLACE FUNCTION public.refresh_user_stats(p_user uuid)
RETURNS public.user_stats
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_goal    integer;
  v_today   date := user_today(p_user);
  v_week    date := date_trunc('week', v_today)::date;
  v_xp      integer;
  v_total   integer;
  v_last    date;
  v_current integer := 0;
  v_best    integer := 0;
  v_run     integer := 0;
  v_prev    date;
  w         record;
  v_row     public.user_stats;
BEGIN
  SELECT coalesce(weekly_goal, 3) INTO v_goal FROM users WHERE id = p_user;
  SELECT coalesce(sum(xp), 0) INTO v_xp FROM xp_events WHERE user_id = p_user;
  SELECT count(*), max(day) INTO v_total, v_last FROM training_days(p_user);

  FOR w IN
    SELECT date_trunc('week', day)::date AS wk
    FROM training_days(p_user)
    GROUP BY 1
    HAVING count(*) >= v_goal
    ORDER BY 1
  LOOP
    IF v_prev IS NOT NULL AND w.wk = v_prev + 7 THEN v_run := v_run + 1; ELSE v_run := 1; END IF;
    v_best := greatest(v_best, v_run);
    v_prev := w.wk;
  END LOOP;

  IF v_prev IS NOT NULL AND v_prev >= v_week - 7 THEN v_current := v_run; END IF;

  INSERT INTO user_stats (user_id, xp, level, total_sessions, current_streak, best_streak, last_session_date, updated_at)
  VALUES (p_user, v_xp, xp_level(v_xp), v_total, v_current, v_best, v_last, now())
  ON CONFLICT (user_id) DO UPDATE SET
    xp = EXCLUDED.xp, level = EXCLUDED.level, total_sessions = EXCLUDED.total_sessions,
    current_streak = EXCLUDED.current_streak, best_streak = EXCLUDED.best_streak,
    last_session_date = EXCLUDED.last_session_date, updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$function$;
REVOKE ALL ON FUNCTION public.refresh_user_stats(uuid) FROM public, anon, authenticated;

-- 5. Entrada al gimnasio = día entrenado ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_attendance_training_day()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  -- Los puntos nunca deben impedir registrar la asistencia
  BEGIN
    PERFORM award_training_day(NEW.user_id, NEW.date);
    PERFORM refresh_user_stats(NEW.user_id);
  EXCEPTION WHEN others THEN
    RAISE WARNING 'No se pudieron otorgar los puntos de la asistencia %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.trg_attendance_training_day() FROM public, anon, authenticated;

CREATE OR REPLACE TRIGGER attendance_training_day
  AFTER INSERT ON public.attendance
  FOR EACH ROW WHEN (NEW.type = 'Entrada')
  EXECUTE FUNCTION public.trg_attendance_training_day();

-- 6. Terminar entrenamiento -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finish_workout(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user    uuid := get_user_id_from_auth();
  s         record;
  v_day     integer;
  v_planned integer;
  v_done    integer;
  v_ratio   numeric;
  v_ok      boolean;
  v_gained  integer := 0;
  v_stats   public.user_stats;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión como socio'; END IF;

  SELECT * INTO s FROM workout_sessions WHERE id = p_session_id AND user_id = v_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesión no encontrada'; END IF;

  v_day := coalesce(s.routine_day, extract(isodow FROM s.date)::integer);

  SELECT count(*) INTO v_planned
  FROM routine_exercises WHERE routine_id = s.routine_id AND day_of_week = v_day;

  SELECT count(DISTINCT l.exercise_id) INTO v_done
  FROM workout_exercise_logs l
  JOIN routine_exercises re ON re.id = l.exercise_id
  WHERE l.session_id = s.id AND l.is_completed AND NOT coalesce(l.is_skipped, false)
    AND re.routine_id = s.routine_id AND re.day_of_week = v_day;

  v_ratio := CASE WHEN v_planned > 0 THEN v_done::numeric / v_planned ELSE 0 END;
  v_ok := v_planned > 0 AND v_ratio >= 0.6;

  IF v_ok THEN
    UPDATE workout_sessions
       SET is_completed = true,
           end_time = coalesce(end_time, (now() AT TIME ZONE user_tz(v_user))::time)
     WHERE id = s.id;
    v_gained := award_training_day(v_user, s.date);
  END IF;

  v_stats := refresh_user_stats(v_user);

  RETURN jsonb_build_object(
    'completed', v_ok,
    'done', v_done,
    'planned', v_planned,
    'ratio', round(v_ratio, 2),
    'xp_gained', v_gained,
    'stats', to_jsonb(v_stats) - 'user_id'
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.finish_workout(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.finish_workout(uuid) TO authenticated;

-- 7. Pantalla "Hoy" ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user    uuid := get_user_id_from_auth();
  v_today   date;
  v_week    date;
  v_goal    integer;
  v_stats   public.user_stats;
  v_week_n  integer;
  a         record;
  v_days    integer;
  v_done_n  integer;
  v_next    integer;
  v_session jsonb;
  v_checkin boolean;
  v_gym     boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión como socio'; END IF;

  v_today := user_today(v_user);
  v_week  := date_trunc('week', v_today)::date;
  SELECT coalesce(weekly_goal, 3), organization_id IS NOT NULL INTO v_goal, v_gym FROM users WHERE id = v_user;
  v_stats := refresh_user_stats(v_user);

  SELECT count(*) INTO v_week_n FROM training_days(v_user) d WHERE d.day >= v_week AND d.day < v_week + 7;
  SELECT EXISTS (SELECT 1 FROM attendance WHERE user_id = v_user AND type = 'Entrada' AND date = v_today) INTO v_checkin;

  -- Rutina activa: primero la del entrenador, luego la más reciente
  SELECT t.id, t.name, t.schedule_mode, t.minutes_per_session, t.location, t.is_platform_template, a2.start_date,
         st.name AS trainer_name
    INTO a
    FROM user_routine_assignments a2
    JOIN routine_templates t ON t.id = a2.routine_id
    LEFT JOIN staff st ON st.id = a2.assigned_by
   WHERE a2.user_id = v_user AND a2.is_active AND t.is_active
   ORDER BY t.is_platform_template, a2.start_date DESC
   LIMIT 1;

  SELECT jsonb_build_object('id', id, 'completed', is_completed, 'routine_day', routine_day, 'routine_id', routine_id)
    INTO v_session
    FROM workout_sessions WHERE user_id = v_user AND date = v_today;

  IF a.id IS NOT NULL THEN
    SELECT count(DISTINCT day_of_week) INTO v_days FROM routine_exercises WHERE routine_id = a.id;
    IF a.schedule_mode = 'sequence' AND v_days > 0 THEN
      SELECT count(*) INTO v_done_n FROM workout_sessions
       WHERE user_id = v_user AND routine_id = a.id AND is_completed
         AND date >= a.start_date::date AND date < v_today;
      v_next := (v_done_n % v_days) + 1;
    ELSE
      v_next := extract(isodow FROM v_today)::integer;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'today', v_today,
    'xp', v_stats.xp,
    'level', v_stats.level,
    'level_xp', v_stats.xp % 250,
    'level_size', 250,
    'total_sessions', v_stats.total_sessions,
    'current_streak', v_stats.current_streak,
    'best_streak', v_stats.best_streak,
    'weekly_goal', v_goal,
    'week_sessions', v_week_n,
    'checked_in_today', v_checkin,
    'is_gym_member', v_gym,
    'onboarded', (SELECT onboarding_completed_at IS NOT NULL FROM users WHERE id = v_user),
    'routine', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', a.id, 'name', a.name, 'schedule_mode', a.schedule_mode,
      'minutes', a.minutes_per_session, 'location', a.location,
      'days', v_days, 'next_day', v_next,
      'source', CASE WHEN a.is_platform_template THEN 'platform' ELSE 'trainer' END,
      'trainer_name', a.trainer_name) END,
    'today_session', v_session
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.my_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_stats() TO authenticated;

-- 8. Onboarding con aviso de salud ----------------------------------------------------------
DROP FUNCTION IF EXISTS public.complete_onboarding(jsonb, integer, uuid);

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_profile         jsonb,
  p_weekly_goal     integer,
  p_template_id     uuid DEFAULT NULL,
  p_health_accepted boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user     uuid := get_user_id_from_auth();
  v_template uuid;
  v_trainer  boolean;
  v_profile  jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión como socio';
  END IF;
  IF NOT coalesce(p_health_accepted, false) THEN
    RAISE EXCEPTION 'Debes aceptar el aviso de salud para continuar';
  END IF;
  IF p_weekly_goal IS NULL OR p_weekly_goal NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'La meta semanal debe ser de 1 a 7 días';
  END IF;
  IF p_profile IS NULL OR jsonb_typeof(p_profile) <> 'object' OR length(p_profile::text) > 4000 THEN
    RAISE EXCEPTION 'Respuestas del cuestionario no válidas';
  END IF;

  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb) INTO v_profile
  FROM jsonb_each(p_profile)
  WHERE key IN ('goal', 'activity_level', 'location', 'equipment', 'minutes', 'days_per_week', 'limitations');

  SELECT id INTO v_template
  FROM routine_templates
  WHERE is_platform_template AND is_active
    AND (p_template_id IS NULL OR id = p_template_id)
  ORDER BY (location = coalesce(v_profile ->> 'location', 'casa')) DESC,
           (level = 'Principiante') DESC,
           created_at
  LIMIT 1;

  IF p_template_id IS NOT NULL AND v_template IS NULL THEN
    RAISE EXCEPTION 'Esa rutina no está disponible';
  END IF;

  UPDATE users
     SET fitness_profile = v_profile,
         weekly_goal = p_weekly_goal,
         onboarding_completed_at = coalesce(onboarding_completed_at, now()),
         health_consent_at = coalesce(health_consent_at, now())
   WHERE id = v_user;

  SELECT EXISTS (
    SELECT 1 FROM user_routine_assignments a
    JOIN routine_templates t ON t.id = a.routine_id
    WHERE a.user_id = v_user AND a.is_active AND NOT t.is_platform_template
  ) INTO v_trainer;

  IF v_template IS NOT NULL AND NOT v_trainer THEN
    UPDATE user_routine_assignments a
       SET is_active = false, end_date = now()
      FROM routine_templates t
     WHERE t.id = a.routine_id AND a.user_id = v_user AND a.is_active
       AND t.is_platform_template AND a.routine_id <> v_template;

    IF NOT EXISTS (
      SELECT 1 FROM user_routine_assignments
      WHERE user_id = v_user AND routine_id = v_template AND is_active
    ) THEN
      INSERT INTO user_routine_assignments (user_id, routine_id, assigned_by, start_date, is_active)
      VALUES (v_user, v_template, NULL, now(), true);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_user,
    'routine_id', CASE WHEN v_trainer THEN NULL ELSE v_template END,
    'kept_trainer_routine', v_trainer
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_onboarding(jsonb, integer, uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(jsonb, integer, uuid, boolean) TO authenticated;

-- 9. Puntos de las asistencias que ya existían -----------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id, date FROM attendance WHERE type = 'Entrada' ORDER BY date LOOP
    PERFORM award_training_day(r.user_id, r.date);
  END LOOP;
  FOR r IN SELECT DISTINCT user_id FROM attendance WHERE type = 'Entrada' LOOP
    PERFORM refresh_user_stats(r.user_id);
  END LOOP;
END $$;
