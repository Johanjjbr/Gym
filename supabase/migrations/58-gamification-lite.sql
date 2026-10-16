-- =============================================================================
-- 58 · Gamificación mínima (Fase 0)
-- -----------------------------------------------------------------------------
--   · xp_events: historial de puntos. Una sesión completada = 50 XP (una sola vez).
--     Cumplir la meta semanal = 100 XP extra (una vez por semana).
--   · user_stats: resumen (XP, nivel, racha de semanas cumpliendo la meta).
--   · Solo el servidor escribe: el navegador no tiene permisos de insertar/editar.
--   · finish_workout(session): cierra la sesión si se hizo al menos el 60 % de los
--     ejercicios del día y otorga los puntos.
--   · my_stats(): todo lo que necesita la pantalla "Hoy".
-- Sin DROP ni DELETE. Se puede ejecutar más de una vez.
-- =============================================================================

-- Día de la rutina que se hizo en la sesión (Día 1, 2, 3… en modo secuencia)
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS routine_day integer;
ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_routine_day_check;
ALTER TABLE public.workout_sessions ADD CONSTRAINT workout_sessions_routine_day_check
  CHECK (routine_day IS NULL OR routine_day BETWEEN 1 AND 7);

-- 1. Tablas -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xp_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('session', 'weekly_goal')),
  ref_key    text NOT NULL,
  xp         integer NOT NULL CHECK (xp > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref_key)
);
CREATE INDEX IF NOT EXISTS xp_events_user_idx ON public.xp_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id            uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  xp                 integer NOT NULL DEFAULT 0,
  level              integer NOT NULL DEFAULT 1,
  total_sessions     integer NOT NULL DEFAULT 0,
  current_streak     integer NOT NULL DEFAULT 0,  -- semanas seguidas cumpliendo la meta
  best_streak        integer NOT NULL DEFAULT 0,
  last_session_date  date,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Solo lectura: el socio ve lo suyo, el personal ve a los socios de su empresa
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'xp_events' AND policyname = 'Ver puntos') THEN
    CREATE POLICY "Ver puntos" ON public.xp_events FOR SELECT
      USING (user_id = get_user_id_from_auth() OR (is_staff_any() AND user_in_my_org(user_id)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_stats' AND policyname = 'Ver estadísticas') THEN
    CREATE POLICY "Ver estadísticas" ON public.user_stats FOR SELECT
      USING (user_id = get_user_id_from_auth() OR (is_staff_any() AND user_in_my_org(user_id)));
  END IF;
END $$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.xp_events, public.user_stats FROM anon, authenticated;
GRANT SELECT ON public.xp_events, public.user_stats TO authenticated;

-- 2. Cálculos ----------------------------------------------------------------------
-- Nivel: cada 250 XP (5 sesiones) se sube uno.
CREATE OR REPLACE FUNCTION public.xp_level(p_xp integer)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 1 + greatest(coalesce(p_xp, 0), 0) / 250 $$;

-- Fecha "de hoy" en la zona horaria del socio
CREATE OR REPLACE FUNCTION public.user_today(p_user uuid)
RETURNS date
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_tz text;
BEGIN
  SELECT timezone INTO v_tz FROM users WHERE id = p_user;
  IF v_tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = v_tz) THEN
    v_tz := 'America/Caracas';
  END IF;
  RETURN (now() AT TIME ZONE v_tz)::date;
END;
$function$;

-- Recalcula el resumen del socio a partir de sus sesiones y puntos
CREATE OR REPLACE FUNCTION public.refresh_user_stats(p_user uuid)
RETURNS public.user_stats
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_goal    integer;
  v_today   date := user_today(p_user);
  v_week    date := date_trunc('week', v_today)::date;   -- lunes de esta semana
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
  SELECT count(*), max(date) INTO v_total, v_last FROM workout_sessions WHERE user_id = p_user AND is_completed;

  -- Semanas que cumplieron la meta, de la más antigua a la más reciente
  FOR w IN
    SELECT date_trunc('week', date)::date AS wk
    FROM workout_sessions
    WHERE user_id = p_user AND is_completed
    GROUP BY 1
    HAVING count(*) >= v_goal
    ORDER BY 1
  LOOP
    IF v_prev IS NOT NULL AND w.wk = v_prev + 7 THEN v_run := v_run + 1; ELSE v_run := 1; END IF;
    v_best := greatest(v_best, v_run);
    v_prev := w.wk;
  END LOOP;

  -- La racha sigue viva si la última semana cumplida es esta o la anterior
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
REVOKE ALL ON FUNCTION public.user_today(uuid) FROM public, anon, authenticated;

-- 3. Terminar entrenamiento -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finish_workout(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user     uuid := get_user_id_from_auth();
  s          record;
  v_day      integer;
  v_planned  integer;
  v_done     integer;
  v_ratio    numeric;
  v_ok       boolean;
  v_goal     integer;
  v_week     date;
  v_week_n   integer;
  v_gained   integer := 0;
  v_n        integer;
  v_stats    public.user_stats;
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
           end_time = coalesce(end_time, (now() AT TIME ZONE 'UTC')::time)
     WHERE id = s.id;

    INSERT INTO xp_events (user_id, kind, ref_key, xp)
    VALUES (v_user, 'session', s.id::text, 50)
    ON CONFLICT (user_id, kind, ref_key) DO NOTHING;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_gained := v_gained + 50 * v_n;

    -- Bono por cumplir la meta de la semana
    SELECT coalesce(weekly_goal, 3) INTO v_goal FROM users WHERE id = v_user;
    v_week := date_trunc('week', s.date)::date;
    SELECT count(*) INTO v_week_n FROM workout_sessions
     WHERE user_id = v_user AND is_completed AND date >= v_week AND date < v_week + 7;
    IF v_week_n >= v_goal THEN
      INSERT INTO xp_events (user_id, kind, ref_key, xp)
      VALUES (v_user, 'weekly_goal', v_week::text, 100)
      ON CONFLICT (user_id, kind, ref_key) DO NOTHING;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_gained := v_gained + 100 * v_n;
    END IF;
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

-- 4. Pantalla "Hoy" -----------------------------------------------------------------
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
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión como socio'; END IF;

  v_today := user_today(v_user);
  v_week  := date_trunc('week', v_today)::date;
  SELECT coalesce(weekly_goal, 3) INTO v_goal FROM users WHERE id = v_user;
  v_stats := refresh_user_stats(v_user);

  SELECT count(*) INTO v_week_n FROM workout_sessions
   WHERE user_id = v_user AND is_completed AND date >= v_week AND date < v_week + 7;

  -- Rutina activa (la más reciente)
  SELECT t.id, t.name, t.schedule_mode, t.minutes_per_session, t.location, a2.start_date
    INTO a
    FROM user_routine_assignments a2
    JOIN routine_templates t ON t.id = a2.routine_id
   WHERE a2.user_id = v_user AND a2.is_active AND t.is_active
   ORDER BY a2.start_date DESC
   LIMIT 1;

  SELECT jsonb_build_object('id', id, 'completed', is_completed, 'routine_day', routine_day)
    INTO v_session
    FROM workout_sessions WHERE user_id = v_user AND date = v_today;

  IF a.id IS NOT NULL THEN
    SELECT count(DISTINCT day_of_week) INTO v_days FROM routine_exercises WHERE routine_id = a.id;
    IF a.schedule_mode = 'sequence' AND v_days > 0 THEN
      -- Siguiente día de la secuencia según las sesiones ya completadas (sin contar hoy)
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
    'onboarded', (SELECT onboarding_completed_at IS NOT NULL FROM users WHERE id = v_user),
    'routine', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', a.id, 'name', a.name, 'schedule_mode', a.schedule_mode,
      'minutes', a.minutes_per_session, 'location', a.location,
      'days', v_days, 'next_day', v_next) END,
    'today_session', v_session
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.my_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_stats() TO authenticated;

-- 5. Permisos de las pantallas nuevas del socio ---------------------------------------
INSERT INTO public.role_module_permissions (role, module_path, can_view, gym_id)
VALUES ('Usuario', '/usuario/hoy', true, NULL),
       ('Usuario', '/usuario/entrenar', true, NULL),
       ('Usuario', '/usuario/bienvenida', true, NULL)
ON CONFLICT (role, module_path, gym_id) DO UPDATE SET can_view = true, updated_at = now();

-- Pantallas de diagnóstico retiradas de la app
UPDATE public.role_module_permissions SET can_view = false, updated_at = now()
WHERE role = 'Usuario' AND module_path IN ('/usuario/diagnostico-rutina', '/usuario/migrar-rutinas', '/usuario/debug-asignaciones');
