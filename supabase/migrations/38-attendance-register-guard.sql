-- =====================================================================
-- 38 - REGISTRO DE ASISTENCIA: SOLO RECEPCIÓN / ADMIN + HORA DE CARACAS
-- ---------------------------------------------------------------------
-- register_attendance_atomic es SECURITY DEFINER (salta RLS) y tenía
-- EXECUTE para anon/PUBLIC: cualquiera con la anon key podía registrar
-- asistencia de cualquier socio. Ahora exige staff de recepción/admin
-- (o service_role, que usa la edge function).
-- Además la fecha/hora por defecto pasan a ser las de Caracas (antes UTC:
-- después de las 8 pm se guardaba con la fecha del día siguiente).
-- No toca RLS.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.register_attendance_atomic(
  p_user_id uuid,
  p_type text,
  p_date date DEFAULT (now() AT TIME ZONE 'America/Caracas')::date,
  p_time time without time zone DEFAULT (now() AT TIME ZONE 'America/Caracas')::time,
  p_source text DEFAULT 'manual',
  p_device_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_entry_count INT;
  v_exit_count INT;
  v_inside BOOLEAN;
  v_session_number INT;
  v_new_record attendance;
  v_user_status TEXT;
BEGIN
  IF NOT (is_staff_reception() OR coalesce(auth.jwt() ->> 'role', '') = 'service_role') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Solo recepción o administración pueden registrar asistencia');
  END IF;

  IF p_type NOT IN ('Entrada', 'Salida') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Tipo inválido: debe ser Entrada o Salida');
  END IF;

  SELECT status INTO v_user_status FROM public.users WHERE id = p_user_id;

  IF v_user_status IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Socio no encontrado');
  END IF;

  -- La salida siempre se permite (un socio puede quedar suspendido estando dentro)
  IF p_type = 'Entrada' AND v_user_status <> 'Activo' THEN
    RETURN jsonb_build_object('allowed', false, 'reason',
      CASE v_user_status
        WHEN 'Suspendido' THEN 'Socio suspendido por falta de pago'
        WHEN 'Inactivo' THEN 'Socio dado de baja'
        ELSE 'Socio no activo (' || v_user_status || ')'
      END);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_date::text));

  SELECT COUNT(*) FILTER (WHERE type = 'Entrada'), COUNT(*) FILTER (WHERE type = 'Salida')
    INTO v_entry_count, v_exit_count
  FROM attendance WHERE user_id = p_user_id AND date = p_date;

  v_inside := v_entry_count > v_exit_count;

  IF p_type = 'Entrada' AND v_inside THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'El socio ya está dentro (falta registrar su salida)');
  END IF;

  IF p_type = 'Salida' AND NOT v_inside THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'El socio no tiene una entrada abierta hoy');
  END IF;

  v_session_number := v_entry_count + CASE WHEN p_type = 'Entrada' THEN 1 ELSE 0 END;

  INSERT INTO attendance (user_id, date, time, type, source, device_id, session_number)
  VALUES (p_user_id, p_date, p_time, p_type, p_source, p_device_id, v_session_number)
  RETURNING * INTO v_new_record;

  RETURN jsonb_build_object('allowed', true, 'data', to_jsonb(v_new_record));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.register_attendance_atomic(uuid, text, date, time without time zone, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_attendance_atomic(uuid, text, date, time without time zone, text, text) TO authenticated, service_role;
