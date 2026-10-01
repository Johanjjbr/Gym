-- =====================================================================
-- 34 - CORRECCIONES DEL SISTEMA DE FACTURACIÓN
-- ---------------------------------------------------------------------
-- Principios:
--   * `invoices` es la única fuente de verdad.
--   * `users.next_payment` y `users.paid_until` los DERIVA la base de datos
--     (trigger sobre invoices); el cliente ya no los escribe.
--   * Los periodos mensuales se anclan al día 1 de cada mes (nada de
--     "+30 días" que se desfasa: 1-oct, 31-oct, 30-nov...).
--   * Un solo motor de facturación automática (pg_cron -> run_daily_billing).
--   * El pago de una factura es una operación transaccional (pay_invoice).
--
-- Zona horaria: el "hoy" del gimnasio se calcula con billing_today().
-- Por defecto America/Caracas. Para cambiarla:
--   ALTER DATABASE postgres SET app.billing_timezone = 'America/Argentina/Buenos_Aires';
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Retirar el motor antiguo (se redefine más abajo)
-- ---------------------------------------------------------------------
DO $$ BEGIN PERFORM cron.unschedule('check-overdue-users');     EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('generate-daily-invoices'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_auto_create_plan_invoice   ON users;
DROP TRIGGER IF EXISTS trigger_user_plan_change        ON users;
DROP TRIGGER IF EXISTS trigger_user_plan_change_insert ON users;

DROP FUNCTION IF EXISTS auto_create_plan_invoice();
DROP FUNCTION IF EXISTS trigger_create_initial_invoice();
DROP FUNCTION IF EXISTS create_initial_invoice(uuid, uuid);
DROP FUNCTION IF EXISTS generate_daily_invoices();
DROP FUNCTION IF EXISTS check_overdue_users();
DROP FUNCTION IF EXISTS pay_advance_months(uuid, integer, text, text);

-- ---------------------------------------------------------------------
-- 1. Cambios de esquema
-- ---------------------------------------------------------------------
-- 1.1 payments aceptaba menos métodos que invoices ('Pago Móvil' fallaba en silencio)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('Efectivo', 'Transferencia', 'Tarjeta', 'Pago Móvil'));

-- 1.2 Enlace factura -> pago (para no dejar pagos huérfanos al borrar facturas)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES payments(id) ON DELETE SET NULL;

-- 1.3 El número de factura lo asigna SIEMPRE la base de datos (secuencia)
ALTER TABLE invoices ALTER COLUMN invoice_number SET DEFAULT generate_invoice_number();

-- 1.4 La secuencia estaba por detrás de facturas ya emitidas (p. ej. FAC-2026-0051):
--     el siguiente nextval() chocaba con el UNIQUE y rompía el cron.
SELECT setval(
  'invoice_number_seq',
  GREATEST(
    (SELECT last_value FROM invoice_number_seq),
    COALESCE((SELECT MAX((substring(invoice_number FROM '^FAC-\d{4}-(\d+)$'))::int)
              FROM invoices WHERE invoice_number ~ '^FAC-\d{4}-\d+$'), 0)
  )
);

-- ---------------------------------------------------------------------
-- 2. Helpers de fecha
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION billing_now() RETURNS timestamp
LANGUAGE sql STABLE AS $$
  SELECT now() AT TIME ZONE COALESCE(NULLIF(current_setting('app.billing_timezone', true), ''), 'America/Caracas')
$$;

CREATE OR REPLACE FUNCTION billing_today() RETURNS date
LANGUAGE sql STABLE AS $$ SELECT billing_now()::date $$;

CREATE OR REPLACE FUNCTION month_es(p_date date) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT (ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto',
                'Septiembre','Octubre','Noviembre','Diciembre'])[extract(month FROM p_date)::int]
         || ' ' || extract(year FROM p_date)::int
$$;

-- Siguiente vencimiento después de p_last. Planes de 28-31 días = 1 mes calendario,
-- 90 = 3 meses, 180 = 6 meses, 365 = 1 año; cualquier otro = días exactos.
CREATE OR REPLACE FUNCTION plan_next_due(p_last date, p_days int) RETURNS date
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_days BETWEEN 28 AND 31
      THEN (date_trunc('month', p_last::timestamp) + interval '1 month')::date
    WHEN p_days BETWEEN 60 AND 360 AND p_days % 30 = 0
      THEN (date_trunc('month', p_last::timestamp) + (p_days / 30) * interval '1 month')::date
    WHEN p_days IN (365, 366)
      THEN (date_trunc('month', p_last::timestamp) + interval '1 year')::date
    ELSE p_last + GREATEST(p_days, 1)
  END
$$;

-- ---------------------------------------------------------------------
-- 3. Derivar next_payment / paid_until desde las facturas
--    next_payment = vencimiento de la factura impaga más antigua; si no hay,
--                   el siguiente periodo a facturar.
--    paid_until   = vencimiento del último periodo pagado.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_user_billing(p_user_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_first_unpaid timestamp;
  v_last_paid    timestamp;
  v_last_any     timestamp;
  v_days         int;
  v_next         timestamp;
BEGIN
  SELECT MIN(due_date) FILTER (WHERE status IN ('Pendiente', 'Vencida')),
         MAX(due_date) FILTER (WHERE status = 'Pagada'),
         MAX(due_date)
    INTO v_first_unpaid, v_last_paid, v_last_any
  FROM invoices
  WHERE user_id = p_user_id;

  IF v_last_any IS NULL THEN
    -- Sin facturas: no hay periodo pagado
    UPDATE users SET paid_until = NULL WHERE id = p_user_id AND paid_until IS NOT NULL;
    RETURN;
  END IF;

  SELECT pl.duration_days INTO v_days
  FROM users u JOIN plans pl ON pl.id = u.plan_id
  WHERE u.id = p_user_id;

  v_next := COALESCE(v_first_unpaid, plan_next_due(v_last_any::date, COALESCE(v_days, 30))::timestamp);

  UPDATE users
  SET next_payment = v_next,
      paid_until   = v_last_paid::date
  WHERE id = p_user_id
    AND (next_payment IS DISTINCT FROM v_next OR paid_until IS DISTINCT FROM v_last_paid::date);
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Generar las facturas que faltan de un usuario (hasta el periodo actual)
--    p_restart = true  -> empieza en el mes actual (alta, cambio de plan,
--                         reactivación): no cobra periodos pasados.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ensure_user_invoices(p_user_id uuid, p_restart boolean DEFAULT false)
RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
  u           RECORD;
  p           RECORD;
  v_today     date := billing_today();
  v_due       date;
  v_last      date;
  v_created   int := 0;
  v_iter      int := 0;
  v_recurring boolean;
BEGIN
  SELECT id, plan_id, status, COALESCE(is_free_user, false) AS is_free
    INTO u FROM users WHERE id = p_user_id;

  IF NOT FOUND OR u.plan_id IS NULL OR u.is_free OR u.status <> 'Activo' THEN
    RETURN 0;
  END IF;

  SELECT * INTO p FROM plans WHERE id = u.plan_id;
  IF NOT FOUND OR p.price IS NULL OR p.price <= 0 THEN
    RETURN 0;
  END IF;

  v_recurring := p.type IS DISTINCT FROM 'Visita';

  IF NOT v_recurring THEN
    -- Plan de visita: una única factura
    IF EXISTS (SELECT 1 FROM invoices WHERE user_id = p_user_id AND plan_id = p.id) THEN
      RETURN 0;
    END IF;
    v_due := v_today;
  ELSIF p_restart THEN
    v_due := date_trunc('month', v_today::timestamp)::date;
  ELSE
    SELECT MAX(due_date)::date INTO v_last
    FROM invoices WHERE user_id = p_user_id AND plan_id = p.id;
    v_due := CASE WHEN v_last IS NULL
                  THEN date_trunc('month', v_today::timestamp)::date
                  ELSE plan_next_due(v_last, p.duration_days) END;
  END IF;

  WHILE v_due <= v_today AND v_iter < 24 LOOP
    -- Una membresía = una factura por vencimiento (sin importar el plan)
    IF NOT EXISTS (
      SELECT 1 FROM invoices
      WHERE user_id = p_user_id AND due_date::date = v_due
    ) THEN
      INSERT INTO invoices (user_id, plan_id, concept, amount, due_date, status)
      VALUES (p_user_id, p.id, p.name || ' - ' || month_es(v_due), p.price, v_due::timestamp, 'Pendiente');
      v_created := v_created + 1;
    END IF;

    EXIT WHEN NOT v_recurring;
    v_due  := plan_next_due(v_due, p.duration_days);
    v_iter := v_iter + 1;
  END LOOP;

  RETURN v_created;
END;
$$;

-- ---------------------------------------------------------------------
-- 5. Job diario: 1) marcar vencidas / suspender  2) generar facturas
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_overdue_users() RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_today   date := billing_today();
  v_overdue int;
  v_susp    int;
BEGIN
  -- La factura Pendiente pasa a Vencida (antes se insertaba una copia y quedaban dos)
  UPDATE invoices i
  SET status = 'Vencida'
  WHERE i.status = 'Pendiente'
    AND i.due_date::date < v_today
    AND i.user_id IN (SELECT id FROM users WHERE COALESCE(is_free_user, false) = false);
  GET DIAGNOSTICS v_overdue = ROW_COUNT;

  UPDATE users u
  SET status = 'Suspendido'
  WHERE u.status = 'Activo'
    AND COALESCE(u.is_free_user, false) = false
    AND EXISTS (SELECT 1 FROM invoices i WHERE i.user_id = u.id AND i.status = 'Vencida');
  GET DIAGNOSTICS v_susp = ROW_COUNT;

  RETURN jsonb_build_object('overdue_invoices', v_overdue, 'suspended_users', v_susp);
END;
$$;

CREATE OR REPLACE FUNCTION generate_daily_invoices() RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
  u       RECORD;
  v_total int := 0;
BEGIN
  FOR u IN
    SELECT id FROM users
    WHERE status = 'Activo' AND plan_id IS NOT NULL AND COALESCE(is_free_user, false) = false
  LOOP
    v_total := v_total + ensure_user_invoices(u.id);
  END LOOP;
  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION run_daily_billing() RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_overdue   jsonb;
  v_generated int;
BEGIN
  v_overdue   := check_overdue_users();      -- primero vencidas/suspensión
  v_generated := generate_daily_invoices();  -- luego facturas nuevas (solo usuarios Activos)
  RETURN v_overdue || jsonb_build_object('generated_invoices', v_generated);
END;
$$;

-- ---------------------------------------------------------------------
-- 6. Pago de una factura (transaccional)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pay_invoice(
  p_invoice_id uuid,
  p_method     text,
  p_reference  text      DEFAULT NULL,
  p_notes      text      DEFAULT NULL,
  p_paid_at    timestamp DEFAULT NULL
) RETURNS invoices
LANGUAGE plpgsql AS $$
DECLARE
  inv      invoices%ROWTYPE;
  v_days   int;
  v_pay_id uuid;
  v_paid   timestamp := COALESCE(p_paid_at, billing_now());
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

  SELECT pl.duration_days INTO v_days
  FROM plans pl
  WHERE pl.id = COALESCE(inv.plan_id, (SELECT plan_id FROM users WHERE id = inv.user_id));

  INSERT INTO payments (user_id, amount, date, next_payment, status, method)
  VALUES (inv.user_id, inv.amount, v_paid,
          plan_next_due(inv.due_date::date, COALESCE(v_days, 30))::timestamp,
          'Pagado', p_method)
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
  -- (el trigger trg_invoices_sync recalcula next_payment / paid_until)

  -- Si estaba suspendido y ya no debe nada vencido, se reactiva y se factura el mes actual
  IF EXISTS (SELECT 1 FROM users WHERE id = inv.user_id AND status = 'Suspendido')
     AND NOT EXISTS (SELECT 1 FROM invoices WHERE user_id = inv.user_id AND status = 'Vencida') THEN
    UPDATE users SET status = 'Activo' WHERE id = inv.user_id;
    PERFORM ensure_user_invoices(inv.user_id, true);
  END IF;

  RETURN inv;
END;
$$;

-- Pago adelantado de N periodos: paga las facturas existentes (la más antigua primero)
-- y CREA las que falten hasta completar N.
CREATE OR REPLACE FUNCTION pay_advance_months(
  p_user_id   uuid,
  p_months    int,
  p_method    text,
  p_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  p         RECORD;
  v_id      uuid;
  v_last    date;
  v_due     date;
  v_paid    int := 0;
  v_created int := 0;
  v_ref     text := COALESCE(NULLIF(p_reference, ''), 'Pago adelantado');
BEGIN
  IF p_months IS NULL OR p_months < 1 OR p_months > 12 THEN
    RAISE EXCEPTION 'Meses debe estar entre 1 y 12';
  END IF;

  SELECT pl.* INTO p
  FROM users u JOIN plans pl ON pl.id = u.plan_id
  WHERE u.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El usuario no tiene un plan asignado';
  END IF;
  IF p.price IS NULL OR p.price <= 0 THEN
    RAISE EXCEPTION 'El plan del usuario no tiene precio';
  END IF;

  FOR i IN 1..p_months LOOP
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

    PERFORM pay_invoice(v_id, p_method, v_ref || ' (' || i || '/' || p_months || ')', NULL, NULL);
    v_paid := v_paid + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'paid', v_paid,
    'created', v_created,
    'paid_until', (SELECT paid_until FROM users WHERE id = p_user_id)
  );
END;
$$;

-- ---------------------------------------------------------------------
-- 7. Triggers
--    (SECURITY DEFINER: se ejecutan también cuando un socio se auto-registra,
--     y las políticas RLS no le permiten insertar facturas.)
-- ---------------------------------------------------------------------
-- 7.1 invoices -> mantiene users.next_payment / paid_until y limpia pagos huérfanos
CREATE OR REPLACE FUNCTION trg_invoices_sync() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.payment_id IS NOT NULL THEN
      DELETE FROM payments WHERE id = OLD.payment_id;
    END IF;
    PERFORM refresh_user_billing(OLD.user_id);
    RETURN OLD;
  END IF;

  PERFORM refresh_user_billing(NEW.user_id);
  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM refresh_user_billing(OLD.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_sync ON invoices;
CREATE TRIGGER trg_invoices_sync
AFTER INSERT OR UPDATE OF status, due_date, user_id OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION trg_invoices_sync();

-- 7.2 users: alta con plan o cambio de plan (reemplaza 3 triggers que duplicaban facturas)
CREATE OR REPLACE FUNCTION trg_users_billing_assign() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.plan_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.plan_id IS NOT DISTINCT FROM NEW.plan_id THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.plan_id IS NOT NULL THEN
    -- El plan anterior ya no se cobra: se descartan sus facturas pendientes del mes en curso en adelante
    DELETE FROM invoices
    WHERE user_id = NEW.id AND plan_id = OLD.plan_id AND status = 'Pendiente'
      AND due_date::date >= date_trunc('month', billing_today()::timestamp)::date;
  END IF;

  PERFORM ensure_user_invoices(NEW.id, true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_billing_assign ON users;
CREATE TRIGGER trg_users_billing_assign
AFTER INSERT OR UPDATE OF plan_id ON users
FOR EACH ROW EXECUTE FUNCTION trg_users_billing_assign();

-- 7.3 Reactivación (Inactivo -> Activo): se resetea la facturación (decisión original)
--     Se conservan las facturas Vencidas (deuda real).
CREATE OR REPLACE FUNCTION reset_user_billing(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM invoices WHERE user_id = p_user_id AND status = 'Pendiente';
  PERFORM ensure_user_invoices(p_user_id, true);
END;
$$;
-- El trigger trigger_user_reactivate_billing ya existe. Su función se ejecuta con los permisos de
-- quien edita al socio (staff = rol authenticated), que NO puede llamar a reset_user_billing()
-- (ver sección 9): por eso pasa a SECURITY DEFINER.
CREATE OR REPLACE FUNCTION trigger_reset_billing_on_reactivate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status = 'Inactivo' AND NEW.status = 'Activo' THEN
    PERFORM reset_user_billing(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 8. Cron: un único job, a las 04:30 UTC (00:30 Caracas / 01:30 Buenos Aires)
-- ---------------------------------------------------------------------
SELECT cron.schedule('billing-daily', '30 4 * * *', 'SELECT run_daily_billing();');

-- ---------------------------------------------------------------------
-- 9. Permisos
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION trg_invoices_sync(), trg_users_billing_assign(), trigger_reset_billing_on_reactivate(), reset_user_billing(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  refresh_user_billing(uuid), ensure_user_invoices(uuid, boolean), check_overdue_users(),
  generate_daily_invoices(), run_daily_billing(),
  pay_invoice(uuid, text, text, text, timestamp), pay_advance_months(uuid, int, text, text)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  refresh_user_billing(uuid), ensure_user_invoices(uuid, boolean), check_overdue_users(),
  generate_daily_invoices(), run_daily_billing(),
  pay_invoice(uuid, text, text, text, timestamp), pay_advance_months(uuid, int, text, text)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 10. Reparar datos existentes (recalcula next_payment / paid_until desde las facturas)
-- ---------------------------------------------------------------------
SELECT refresh_user_billing(id) FROM users;
