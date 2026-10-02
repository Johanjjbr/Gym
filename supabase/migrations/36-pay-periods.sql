-- =====================================================================
-- 36 - COBRO DE N PERÍODOS (flujo único "Cobrar")
-- ---------------------------------------------------------------------
-- Igual que pay_advance_months(), pero permite indicar la fecha real del
-- pago (p. ej. una transferencia de ayer) y notas.
--  * Salda primero las facturas abiertas más antiguas (Vencida/Pendiente).
--  * Si se pagan más períodos que los adeudados, crea las facturas siguientes.
--  * Todo en una sola transacción: o se cobra todo o nada.
-- No toca RLS ni borra datos.
-- =====================================================================
CREATE OR REPLACE FUNCTION pay_periods(
  p_user_id   uuid,
  p_months    int,
  p_method    text,
  p_reference text      DEFAULT NULL,
  p_notes     text      DEFAULT NULL,
  p_paid_at   timestamp DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  p         RECORD;
  v_id      uuid;
  v_last    date;
  v_due     date;
  v_paid    int := 0;
  v_created int := 0;
  v_total   numeric := 0;
  v_amount  numeric;
BEGIN
  IF p_months IS NULL OR p_months < 1 OR p_months > 12 THEN
    RAISE EXCEPTION 'Los períodos deben estar entre 1 y 12';
  END IF;
  IF p_paid_at IS NOT NULL AND p_paid_at::date > billing_today() THEN
    RAISE EXCEPTION 'La fecha de pago no puede ser futura';
  END IF;

  SELECT pl.* INTO p
  FROM users u JOIN plans pl ON pl.id = u.plan_id
  WHERE u.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El socio no tiene un plan asignado';
  END IF;
  IF p.price IS NULL OR p.price <= 0 THEN
    RAISE EXCEPTION 'El plan del socio no tiene precio';
  END IF;

  FOR i IN 1..p_months LOOP
    v_id := NULL;
    SELECT id INTO v_id
    FROM invoices
    WHERE user_id = p_user_id AND status IN ('Vencida', 'Pendiente')
    ORDER BY due_date ASC
    LIMIT 1
    FOR UPDATE;

    IF v_id IS NULL THEN
      SELECT MAX(due_date)::date INTO v_last FROM invoices WHERE user_id = p_user_id;
      v_due := CASE WHEN v_last IS NULL
                    THEN date_trunc('month', billing_today()::timestamp)::date
                    ELSE plan_next_due(v_last, p.duration_days) END;

      INSERT INTO invoices (user_id, plan_id, concept, amount, due_date, status)
      VALUES (p_user_id, p.id, p.name || ' - ' || month_es(v_due), p.price, v_due::timestamp, 'Pendiente')
      RETURNING id INTO v_id;
      v_created := v_created + 1;
    END IF;

    SELECT amount INTO v_amount FROM invoices WHERE id = v_id;
    PERFORM pay_invoice(v_id, p_method, p_reference, p_notes, p_paid_at);
    v_paid  := v_paid + 1;
    v_total := v_total + v_amount;
  END LOOP;

  RETURN jsonb_build_object(
    'paid', v_paid,
    'created', v_created,
    'total', v_total,
    'paid_until', (SELECT paid_until FROM users WHERE id = p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION pay_periods(uuid, int, text, text, text, timestamp) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pay_periods(uuid, int, text, text, text, timestamp) TO authenticated, service_role;
