-- =====================================================================
-- 42 - COBRO POR ANIVERSARIO (día de pago de cada socio)
-- ---------------------------------------------------------------------
-- Antes todos se facturaban el día 1 de cada mes. Ahora cada socio paga el
-- mismo día del mes en que se inscribió (users.billing_day, editable).
--  * Días 29/30/31: en meses más cortos vence el último día del mes.
--  * Planes de 3/6/12 meses: mismo día cada 3/6/12 meses.
--  * users.billing_start: primer cobro de un socio migrado de otra plataforma
--    ("próximo pago"); no se le factura nada anterior a esa fecha.
--  * Concepto de la factura con el período: "Premium Plus · 24 oct – 23 nov".
-- No modifica políticas RLS.
-- =====================================================================

-- 1. Columnas -----------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS billing_day   smallint CHECK (billing_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS billing_start date;

COMMENT ON COLUMN public.users.billing_day IS 'Día del mes en que paga (aniversario de inscripción).';
COMMENT ON COLUMN public.users.billing_start IS 'Primer cobro en el sistema (socios migrados): no se factura nada anterior.';

UPDATE public.users
SET billing_day = extract(day FROM start_date)::smallint
WHERE billing_day IS NULL AND start_date IS NOT NULL;

-- 2. Fechas ----------------------------------------------------------------
-- Día p_day del mes de p_ref (o el último día si el mes es más corto)
CREATE OR REPLACE FUNCTION public.anchor_date(p_ref date, p_day int)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT make_date(
    extract(year FROM p_ref)::int,
    extract(month FROM p_ref)::int,
    LEAST(GREATEST(p_day, 1),
          extract(day FROM (date_trunc('month', p_ref::timestamp) + interval '1 month - 1 day'))::int)
  )
$$;

-- Siguiente vencimiento respetando el día de pago
CREATE OR REPLACE FUNCTION public.plan_next_due(p_last date, p_days int, p_day int)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_days BETWEEN 28 AND 31
      THEN anchor_date((date_trunc('month', p_last::timestamp) + interval '1 month')::date, p_day)
    WHEN p_days BETWEEN 60 AND 360 AND p_days % 30 = 0
      THEN anchor_date((date_trunc('month', p_last::timestamp) + (p_days / 30) * interval '1 month')::date, p_day)
    WHEN p_days IN (365, 366)
      THEN anchor_date((date_trunc('month', p_last::timestamp) + interval '1 year')::date, p_day)
    ELSE p_last + GREATEST(p_days, 1)
  END
$$;

-- Versión anterior (2 argumentos): conserva el día de la fecha dada
CREATE OR REPLACE FUNCTION public.plan_next_due(p_last date, p_days integer)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT plan_next_due(p_last, p_days, extract(day FROM p_last)::int)
$$;

-- Inicio del ciclo vigente: último día de pago <= hoy
CREATE OR REPLACE FUNCTION public.billing_cycle_start(p_today date, p_day int, p_days int)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_days < 28 OR p_days > 366 OR (p_days > 31 AND p_days % 30 <> 0 AND p_days NOT IN (365, 366))
      THEN p_today
    WHEN anchor_date(p_today, p_day) <= p_today THEN anchor_date(p_today, p_day)
    ELSE anchor_date((p_today - interval '1 month')::date, p_day)
  END
$$;

-- "24 oct"
CREATE OR REPLACE FUNCTION public.short_date_es(p_date date)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT extract(day FROM p_date)::int || ' ' ||
    (ARRAY['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month FROM p_date)::int]
$$;

-- Concepto: "Premium Plus · 24 oct – 23 nov"
CREATE OR REPLACE FUNCTION public.invoice_concept(p_plan_name text, p_due date, p_days int, p_day int, p_type text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_type = 'Visita' THEN p_plan_name || ' · ' || short_date_es(p_due)
    ELSE p_plan_name || ' · ' || short_date_es(p_due) || ' – ' || short_date_es(plan_next_due(p_due, p_days, p_day) - 1)
  END
$$;

-- 3. Día de pago al crear el socio ----------------------------------------
CREATE OR REPLACE FUNCTION public.trg_users_billing_day_default()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.billing_day IS NULL THEN
    NEW.billing_day := extract(day FROM COALESCE(NEW.billing_start, NEW.start_date::date, billing_today()))::smallint;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER users_billing_day_default BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION trg_users_billing_day_default();

-- 4. Generación de facturas -------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_user_invoices(p_user_id uuid, p_restart boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  u           RECORD;
  p           RECORD;
  v_today     date := billing_today();
  v_due       date;
  v_last      date;
  v_day       int;
  v_created   int := 0;
  v_iter      int := 0;
  v_recurring boolean;
BEGIN
  SELECT id, plan_id, status, COALESCE(is_free_user, false) AS is_free, billing_day, billing_start, start_date
    INTO u FROM users WHERE id = p_user_id;

  IF NOT FOUND OR u.plan_id IS NULL OR u.is_free OR u.status <> 'Activo' THEN
    RETURN 0;
  END IF;

  SELECT * INTO p FROM plans WHERE id = u.plan_id;
  IF NOT FOUND OR p.price IS NULL OR p.price <= 0 THEN
    RETURN 0;
  END IF;

  v_day := COALESCE(u.billing_day, extract(day FROM u.start_date)::int, 1);
  v_recurring := p.type IS DISTINCT FROM 'Visita';

  IF NOT v_recurring THEN
    IF EXISTS (SELECT 1 FROM invoices WHERE user_id = p_user_id AND plan_id = p.id) THEN
      RETURN 0;
    END IF;
    v_due := GREATEST(COALESCE(u.billing_start, v_today), v_today);
  ELSIF NOT EXISTS (SELECT 1 FROM invoices WHERE user_id = p_user_id) THEN
    -- Primer cobro: el indicado al migrarlo, o el ciclo vigente
    v_due := COALESCE(u.billing_start, billing_cycle_start(v_today, v_day, p.duration_days));
  ELSIF p_restart THEN
    v_due := billing_cycle_start(v_today, v_day, p.duration_days);
  ELSE
    SELECT MAX(due_date)::date INTO v_last
    FROM invoices WHERE user_id = p_user_id AND plan_id = p.id;
    v_due := CASE WHEN v_last IS NULL
                  THEN billing_cycle_start(v_today, v_day, p.duration_days)
                  ELSE plan_next_due(v_last, p.duration_days, v_day) END;
  END IF;

  WHILE v_due <= v_today AND v_iter < 24 LOOP
    IF NOT EXISTS (
      SELECT 1 FROM invoices
      WHERE user_id = p_user_id AND due_date::date = v_due
    ) THEN
      INSERT INTO invoices (user_id, plan_id, concept, amount, due_date, status)
      VALUES (p_user_id, p.id, invoice_concept(p.name, v_due, p.duration_days, v_day, p.type),
              p.price, v_due::timestamp, 'Pendiente');
      v_created := v_created + 1;
    END IF;

    EXIT WHEN NOT v_recurring;
    v_due  := plan_next_due(v_due, p.duration_days, v_day);
    v_iter := v_iter + 1;
  END LOOP;

  RETURN v_created;
END;
$function$;

-- 5. Cobrar N períodos ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay_periods(
  p_user_id uuid, p_months integer, p_method text,
  p_reference text DEFAULT NULL, p_notes text DEFAULT NULL, p_paid_at timestamp without time zone DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  p         RECORD;
  u         RECORD;
  v_id      uuid;
  v_last    date;
  v_due     date;
  v_day     int;
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

  SELECT billing_day, billing_start, start_date INTO u FROM users WHERE id = p_user_id;
  SELECT pl.* INTO p
  FROM users x JOIN plans pl ON pl.id = x.plan_id
  WHERE x.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El socio no tiene un plan asignado';
  END IF;
  IF p.price IS NULL OR p.price <= 0 THEN
    RAISE EXCEPTION 'El plan del socio no tiene precio';
  END IF;
  v_day := COALESCE(u.billing_day, extract(day FROM u.start_date)::int, 1);

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
                    THEN COALESCE(u.billing_start, billing_cycle_start(billing_today(), v_day, p.duration_days))
                    ELSE plan_next_due(v_last, p.duration_days, v_day) END;

      INSERT INTO invoices (user_id, plan_id, concept, amount, due_date, status)
      VALUES (p_user_id, p.id, invoice_concept(p.name, v_due, p.duration_days, v_day, p.type),
              p.price, v_due::timestamp, 'Pendiente')
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
$function$;

-- 6. Próximo pago guardado en users ------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_user_billing(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_first_unpaid timestamp;
  v_last_paid    timestamp;
  v_last_any     timestamp;
  v_days         int;
  v_day          int;
  v_start        date;
  v_next         timestamp;
BEGIN
  SELECT MIN(due_date) FILTER (WHERE status IN ('Pendiente', 'Vencida')),
         MAX(due_date) FILTER (WHERE status = 'Pagada'),
         MAX(due_date)
    INTO v_first_unpaid, v_last_paid, v_last_any
  FROM invoices
  WHERE user_id = p_user_id;

  SELECT pl.duration_days, u.billing_day, u.billing_start INTO v_days, v_day, v_start
  FROM users u LEFT JOIN plans pl ON pl.id = u.plan_id
  WHERE u.id = p_user_id;

  IF v_last_any IS NULL THEN
    UPDATE users SET paid_until = NULL, next_payment = v_start
    WHERE id = p_user_id AND (paid_until IS NOT NULL OR next_payment IS DISTINCT FROM v_start);
    RETURN;
  END IF;

  v_next := COALESCE(v_first_unpaid,
                     plan_next_due(v_last_any::date, COALESCE(v_days, 30),
                                   COALESCE(v_day, extract(day FROM v_last_any)::int))::timestamp);

  UPDATE users
  SET next_payment = v_next,
      paid_until   = v_last_paid::date
  WHERE id = p_user_id
    AND (next_payment IS DISTINCT FROM v_next OR paid_until IS DISTINCT FROM v_last_paid::date);
END;
$function$;

-- 7. Cambiar el día de pago mueve las facturas abiertas -----------------------
CREATE OR REPLACE FUNCTION public.trg_users_billing_day_change()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  p RECORD;
BEGIN
  IF NEW.billing_day IS NOT DISTINCT FROM OLD.billing_day OR NEW.billing_day IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO p FROM plans WHERE id = NEW.plan_id;

  UPDATE invoices i
  SET due_date = anchor_date(i.due_date::date, NEW.billing_day)::timestamp,
      status   = CASE WHEN anchor_date(i.due_date::date, NEW.billing_day) >= billing_today() THEN 'Pendiente' ELSE i.status END,
      concept  = CASE WHEN p.id IS NULL THEN i.concept
                      ELSE invoice_concept(p.name, anchor_date(i.due_date::date, NEW.billing_day), p.duration_days, NEW.billing_day, p.type) END
  WHERE i.user_id = NEW.id AND i.status IN ('Pendiente', 'Vencida');

  -- Si ya no debe nada vencido, deja de estar suspendido
  IF NEW.status = 'Suspendido'
     AND NOT EXISTS (SELECT 1 FROM invoices WHERE user_id = NEW.id AND status = 'Vencida') THEN
    UPDATE users SET status = 'Activo' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER users_billing_day_change AFTER UPDATE OF billing_day ON public.users
  FOR EACH ROW EXECUTE FUNCTION trg_users_billing_day_change();
