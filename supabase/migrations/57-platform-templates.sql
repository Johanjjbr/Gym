-- =============================================================================
-- 57 · Plantillas de plataforma + "Salir del sedentarismo" + onboarding
-- -----------------------------------------------------------------------------
-- Fase 0 (usuarios independientes que entrenan en casa):
--   1. Columnas nuevas en routine_templates (dónde, equipo, objetivo, minutos,
--      modo de calendario y si es plantilla de GymStars).
--   2. Plantilla "Salir del sedentarismo": 4 semanas, 3 días, ~20 min, sin equipo.
--      Usa la biblioteca global de ejercicios (GIF).
--   3. complete_onboarding(): guarda las respuestas del cuestionario y asigna la
--      plantilla recomendada. No toca rutinas asignadas por un entrenador.
-- Sin DROP ni DELETE. Se puede ejecutar más de una vez.
-- =============================================================================

-- 1. Columnas --------------------------------------------------------------------
ALTER TABLE public.routine_templates
  ADD COLUMN IF NOT EXISTS location             text    NOT NULL DEFAULT 'gym',
  ADD COLUMN IF NOT EXISTS equipment            text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS goal                 text,
  ADD COLUMN IF NOT EXISTS minutes_per_session  integer,
  ADD COLUMN IF NOT EXISTS schedule_mode        text    NOT NULL DEFAULT 'weekday',
  ADD COLUMN IF NOT EXISTS is_platform_template boolean NOT NULL DEFAULT false;

ALTER TABLE public.routine_templates DROP CONSTRAINT IF EXISTS routine_templates_location_check;
ALTER TABLE public.routine_templates ADD CONSTRAINT routine_templates_location_check
  CHECK (location IN ('casa', 'gym', 'ambos'));

ALTER TABLE public.routine_templates DROP CONSTRAINT IF EXISTS routine_templates_schedule_mode_check;
ALTER TABLE public.routine_templates ADD CONSTRAINT routine_templates_schedule_mode_check
  CHECK (schedule_mode IN ('weekday', 'sequence'));

ALTER TABLE public.routine_templates DROP CONSTRAINT IF EXISTS routine_templates_minutes_check;
ALTER TABLE public.routine_templates ADD CONSTRAINT routine_templates_minutes_check
  CHECK (minutes_per_session IS NULL OR minutes_per_session BETWEEN 5 AND 180);

-- Una plantilla de GymStars no pertenece a ningún gimnasio (nadie del gym la edita)
ALTER TABLE public.routine_templates DROP CONSTRAINT IF EXISTS routine_templates_platform_shape;
ALTER TABLE public.routine_templates ADD CONSTRAINT routine_templates_platform_shape
  CHECK (NOT is_platform_template OR (organization_id IS NULL AND created_by_user IS NULL));

-- 2. Plantilla "Salir del sedentarismo" ------------------------------------------
INSERT INTO public.routine_templates (
  id, name, description, level, category, duration_weeks, days_per_week,
  is_active, is_public, shared_publicly, organization_id, notes,
  location, equipment, goal, minutes_per_session, schedule_mode, is_platform_template
) VALUES (
  '00000000-0000-4000-a000-000000005701',
  'Salir del sedentarismo',
  'Tu primer mes moviéndote en casa: 3 sesiones de unos 20 minutos por semana, sin equipo. Despierta piernas, glúteos, espalda y abdomen a tu ritmo.',
  'Principiante', 'Salud', 4, 3,
  true, true, false, NULL,
  'Semanas 1-2: haz las series indicadas. Semanas 3-4: si te sientes bien, agrega una serie más a cada ejercicio. Si sientes dolor (no cansancio), detente.',
  'casa', '{}', 'salud', 20, 'sequence', true
)
ON CONFLICT (id) DO NOTHING;

-- Ejercicios: en modo "sequence" day_of_week significa Día 1, 2, 3 (no lunes/martes)
INSERT INTO public.routine_exercises (routine_id, exercise_id, exercise_name, day_of_week, order_index, sets, reps, rest_seconds, notes)
SELECT '00000000-0000-4000-a000-000000005701'::uuid, v.exercise_id::uuid, v.name, v.day, v.ord, v.sets, v.reps, v.rest, v.notes
FROM (VALUES
  -- Día 1 · Piernas y abdomen
  ('7aeb077b-2de4-4382-b604-51566471e1b3', 'Rodillas altas apoyado en la pared', 1, 1, 2, '30 s',            30, 'Calentamiento: sube las rodillas a un ritmo cómodo.'),
  ('cdb8873d-382a-43fd-be3f-d247ce13193f', 'Sentadilla con brazos arriba',       1, 2, 2, '10',              45, 'Baja solo hasta donde estés cómodo.'),
  ('59db0e85-9850-4968-a60d-8071b7c37137', 'Puente de glúteo en el suelo',       1, 3, 2, '12',              45, NULL),
  ('71b4f3ae-61a0-4b59-8e41-8b59414c1f0f', 'Flexión inclinada (manos en mesa o pared)', 1, 4, 2, '8',        45, 'Cuanto más alto el apoyo, más fácil.'),
  ('c39b1f76-6aa7-48a0-8940-e6055a9e1b5e', 'Crunch en el suelo',                 1, 5, 2, '10',              45, NULL),
  ('c3ae3c90-7efa-46eb-891b-9a1b85455987', 'Estiramiento de pantorrilla en la pared', 1, 6, 1, '30 s por lado', 15, 'Vuelta a la calma.'),
  -- Día 2 · Empuje y core
  ('a0262dec-8046-4464-b93f-67c99d729e2a', 'Medias flexiones de rodilla',        2, 1, 2, '30 s',            30, 'Calentamiento.'),
  ('5396f8c2-5108-45b1-b9fa-279524f77cc3', 'Sentadilla isométrica en la pared',  2, 2, 2, '20 s',            45, 'Espalda pegada a la pared, rodillas sobre los tobillos.'),
  ('13e0e4b6-f96f-41df-bccc-52695888b84d', 'Flexión de rodillas',                2, 3, 2, '6-8',             45, NULL),
  ('4bf3b228-3c98-4403-b20f-84875e145f55', 'Puente de glúteo con marcha',        2, 4, 2, '8 por lado',      45, NULL),
  ('ee131b46-c65e-48b0-9cc8-23fd58302b09', 'Plancha de rodillas tocando hombros', 2, 5, 2, '8 por lado',     45, 'Mantén la cadera quieta.'),
  ('7a8c18ea-0d05-45fb-ad4e-1ac60ef64465', 'Estiramiento de espalda de rodillas', 2, 6, 1, '30 s',           15, 'Vuelta a la calma.'),
  -- Día 3 · Cuerpo completo
  ('7aeb077b-2de4-4382-b604-51566471e1b3', 'Rodillas altas apoyado en la pared', 3, 1, 2, '30 s',            30, 'Calentamiento.'),
  ('2e38244c-984b-40ab-a4bf-468735f65324', 'Sentadilla dividida',                3, 2, 2, '8 por lado',      45, 'Puedes apoyarte en una silla para equilibrio.'),
  ('816c406f-f323-40e6-a24f-09777a48c57b', 'Elevación de codos en el suelo',     3, 3, 2, '8',               45, 'Trabaja la espalda alta.'),
  ('5d45f7e6-e734-4267-8ea5-4844d2214815', 'Elevación de talones de pie',        3, 4, 2, '12',              45, NULL),
  ('f0259eca-d42e-4ac2-a70f-63b1b673be63', 'Crunch inverso',                     3, 5, 2, '8',               45, NULL),
  ('c3ae3c90-7efa-46eb-891b-9a1b85455987', 'Estiramiento de pantorrilla en la pared', 3, 6, 1, '30 s por lado', 15, 'Vuelta a la calma.')
) AS v(exercise_id, name, day, ord, sets, reps, rest, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.routine_exercises WHERE routine_id = '00000000-0000-4000-a000-000000005701'
)
-- Si un ejercicio ya no existe en la biblioteca se guarda igual, sin GIF
;

-- 3. Onboarding ---------------------------------------------------------------------
-- Guarda el cuestionario y asigna la plantilla de GymStars recomendada.
-- Respuestas esperadas en p_profile (todas opcionales):
--   goal, activity_level, location, equipment[], minutes, days_per_week, limitations
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_profile     jsonb,
  p_weekly_goal integer,
  p_template_id uuid DEFAULT NULL
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
  IF p_weekly_goal IS NULL OR p_weekly_goal NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'La meta semanal debe ser de 1 a 7 días';
  END IF;
  IF p_profile IS NULL OR jsonb_typeof(p_profile) <> 'object' OR length(p_profile::text) > 4000 THEN
    RAISE EXCEPTION 'Respuestas del cuestionario no válidas';
  END IF;

  -- Solo se guardan las claves conocidas
  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb) INTO v_profile
  FROM jsonb_each(p_profile)
  WHERE key IN ('goal', 'activity_level', 'location', 'equipment', 'minutes', 'days_per_week', 'limitations');

  -- Plantilla: la elegida (si es de GymStars y está activa) o la recomendada
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
         onboarding_completed_at = coalesce(onboarding_completed_at, now())
   WHERE id = v_user;

  -- Si un entrenador le asignó una rutina, se respeta
  SELECT EXISTS (
    SELECT 1 FROM user_routine_assignments a
    JOIN routine_templates t ON t.id = a.routine_id
    WHERE a.user_id = v_user AND a.is_active AND NOT t.is_platform_template
  ) INTO v_trainer;

  IF v_template IS NOT NULL AND NOT v_trainer THEN
    -- Cambia de plantilla de GymStars sin duplicar
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

REVOKE ALL ON FUNCTION public.complete_onboarding(jsonb, integer, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(jsonb, integer, uuid) TO authenticated;
