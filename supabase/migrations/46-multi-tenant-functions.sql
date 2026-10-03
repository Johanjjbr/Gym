-- =====================================================================
-- 46 - MULTI-GIMNASIO: FUNCIONES QUE SALTAN RLS VALIDAN LA EMPRESA
-- ---------------------------------------------------------------------
--  * Tasa BCV por empresa: exchange_rate_for(fecha, empresa); pay_invoice
--    usa la tasa de la empresa de la factura.
--  * register_attendance_atomic / void_invoice: solo socios y facturas
--    de la empresa del empleado.
--  * Estado de asistencia: solo para la propia empresa; sin acceso anónimo.
--  * Permisos del rol Dueño (igual que Administrador).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.exchange_rate_for(p_date date, p_org uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT rate FROM exchange_rates
  WHERE organization_id = p_org AND rate_date <= p_date AND rate_date >= p_date - 3
  ORDER BY rate_date DESC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.exchange_rate_for(p_date date)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT exchange_rate_for(p_date, current_org_id())
$$;

CREATE OR REPLACE FUNCTION public.pay_invoice(
  p_invoice_id uuid,
  p_method text,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_paid_at timestamp without time zone DEFAULT NULL
)
RETURNS invoices
LANGUAGE plpgsql
AS $function$
DECLARE
  inv        invoices%ROWTYPE;
  v_days     int;
  v_pay_id   uuid;
  v_paid     timestamp := COALESCE(p_paid_at, billing_now());
  v_currency text;
  v_rate     numeric;
  v_original numeric;
BEGIN
  IF p_method IS NULL OR btrim(p_method) = '' THEN
    RAISE EXCEPTION 'Método de pago requerido';
  END IF;

  SELECT * INTO inv FROM invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  IF inv.status = 'Pagada' THEN
    RAISE EXCEPTION 'La factura % ya está pagada', inv.invoice_number;
  END IF;

  v_currency := method_currency(p_method);
  IF v_currency = 'VES' THEN
    v_rate := exchange_rate_for(v_paid::date, inv.organization_id);
    IF v_rate IS NULL THEN
      RAISE EXCEPTION 'No hay tasa BCV cargada para el %. Cárgala antes de cobrar en bolívares.', to_char(v_paid::date, 'DD/MM/YYYY');
    END IF;
    v_original := round(inv.amount * v_rate, 2);
  ELSE
    v_original := inv.amount;
  END IF;

  SELECT pl.duration_days INTO v_days
  FROM plans pl
  WHERE pl.id = COALESCE(inv.plan_id, (SELECT plan_id FROM users WHERE id = inv.user_id));

  INSERT INTO payments (user_id, amount, date, next_payment, status, method,
                        currency, amount_original, exchange_rate, amount_usd)
  VALUES (inv.user_id, inv.amount, v_paid,
          plan_next_due(inv.due_date::date, COALESCE(v_days, 30))::timestamp,
          'Pagado', p_method,
          v_currency, v_original, v_rate, inv.amount)
  RETURNING id INTO v_pay_id;

  UPDATE invoices
  SET status     = 'Pagada',
      method     = p_method,
      reference  = NULLIF(p_reference, ''),
      notes      = COALESCE(NULLIF(p_notes, ''), notes),
      paid_at    = v_paid,
      payment_id = v_pay_id
  WHERE id = p_invoice_id
  RETURNING * INTO inv;

  IF EXISTS (SELECT 1 FROM users WHERE id = inv.user_id AND status = 'Suspendido')
     AND NOT EXISTS (SELECT 1 FROM invoices WHERE user_id = inv.user_id AND status = 'Vencida') THEN
    UPDATE users SET status = 'Activo' WHERE id = inv.user_id;
    PERFORM ensure_user_invoices(inv.user_id, true);
  END IF;

  RETURN inv;
END;
$function$;

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

  -- Solo socios de la empresa del empleado (la edge function usa service_role)
  SELECT status INTO v_user_status FROM public.users
  WHERE id = p_user_id
    AND (organization_id = current_org_id() OR coalesce(auth.jwt() ->> 'role', '') = 'service_role');

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

CREATE OR REPLACE FUNCTION public.void_invoice(p_invoice_id uuid, p_reason text)
RETURNS invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inv      invoices%ROWTYPE;
  v_staff  staff%ROWTYPE;
  v_reason text := btrim(COALESCE(p_reason, ''));
BEGIN
  SELECT * INTO v_staff FROM staff WHERE auth_user_id = auth.uid();
  IF NOT FOUND OR v_staff.role NOT IN ('Dueño', 'Administrador', 'Recepción') THEN
    RAISE EXCEPTION 'No tienes permiso para anular facturas';
  END IF;

  IF length(v_reason) < 3 THEN
    RAISE EXCEPTION 'Escribe el motivo de la anulación';
  END IF;

  SELECT * INTO inv FROM invoices WHERE id = p_invoice_id AND organization_id = v_staff.organization_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  IF inv.status = 'Anulada' THEN
    RAISE EXCEPTION 'La factura % ya está anulada', inv.invoice_number;
  END IF;

  -- Las pagadas solo con permiso de eliminar en Facturación
  IF inv.status = 'Pagada'
     AND NOT COALESCE(v_staff.is_super_admin, false)
     AND v_staff.role NOT IN ('Dueño', 'Administrador')
     AND NOT EXISTS (
       SELECT 1 FROM role_module_permissions
       WHERE role = v_staff.role AND module_path = '/facturacion' AND can_delete
     ) THEN
    RAISE EXCEPTION 'Anular una factura pagada requiere el permiso "Eliminar" de Facturación';
  END IF;

  IF inv.payment_id IS NOT NULL THEN
    UPDATE payments SET status = 'Anulado' WHERE id = inv.payment_id;
  END IF;

  UPDATE invoices
  SET status      = 'Anulada',
      voided_at   = billing_now(),
      voided_by   = v_staff.id,
      void_reason = v_reason
  WHERE id = p_invoice_id
  RETURNING * INTO inv;

  -- Si estaba suspendido y ya no debe nada vencido, se reactiva (igual que al pagar)
  IF EXISTS (SELECT 1 FROM users WHERE id = inv.user_id AND status = 'Suspendido')
     AND NOT EXISTS (SELECT 1 FROM invoices WHERE user_id = inv.user_id AND status = 'Vencida') THEN
    UPDATE users SET status = 'Activo' WHERE id = inv.user_id;
    PERFORM ensure_user_invoices(inv.user_id, true);
  END IF;

  RETURN inv;
END;
$function$;

-- Estado de asistencia: solo socios de la propia empresa
CREATE OR REPLACE FUNCTION public.get_user_attendance_status(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_last_record RECORD;
  v_entry_count INT;
  v_exit_count INT;
  v_inside BOOLEAN;
BEGIN
  IF NOT (user_in_my_org(p_user_id) OR coalesce(auth.jwt() ->> 'role', '') = 'service_role') THEN
    RETURN jsonb_build_object('inside', false, 'last_entry_time', NULL, 'session_count_today', 0,
                              'can_enter', false, 'can_exit', false, 'last_record_type', NULL);
  END IF;

  SELECT * INTO v_last_record FROM attendance
  WHERE user_id = p_user_id AND date = p_date ORDER BY created_at DESC LIMIT 1;

  SELECT COUNT(*) FILTER (WHERE type = 'Entrada'), COUNT(*) FILTER (WHERE type = 'Salida')
    INTO v_entry_count, v_exit_count
  FROM attendance WHERE user_id = p_user_id AND date = p_date;

  v_inside := v_entry_count > v_exit_count;

  RETURN jsonb_build_object(
    'inside', v_inside,
    'last_entry_time', CASE WHEN v_last_record.type = 'Entrada' THEN v_last_record.time ELSE NULL END,
    'session_count_today', v_entry_count,
    'can_enter', NOT v_inside,
    'can_exit', v_inside,
    'last_record_type', v_last_record.type
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_user_attendance_status(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_attendance_status(uuid, date) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.can_register_attendance(uuid, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_register_attendance(uuid, text, date) TO authenticated, service_role;

-- Permisos del rol Dueño = los del Administrador
ALTER TABLE role_module_permissions DROP CONSTRAINT IF EXISTS role_module_permissions_role_check;
ALTER TABLE role_module_permissions ADD CONSTRAINT role_module_permissions_role_check
  CHECK (role = ANY (ARRAY['Dueño', 'Administrador', 'Entrenador', 'Recepción', 'Usuario']));
INSERT INTO role_module_permissions (role, module_path, can_view, can_create, can_edit, can_delete, gym_id)
SELECT 'Dueño', p.module_path, true, true, true, true, p.gym_id
FROM role_module_permissions p
WHERE p.role = 'Administrador'
  AND NOT EXISTS (
    SELECT 1 FROM role_module_permissions d
    WHERE d.role = 'Dueño' AND d.module_path = p.module_path AND d.gym_id IS NOT DISTINCT FROM p.gym_id
  );
