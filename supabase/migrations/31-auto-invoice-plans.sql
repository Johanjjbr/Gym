-- =============================================
-- FACTURACIÓN AUTOMÁTICA POR PLAN
-- 1. Concepto en facturas
-- 2. Generador de número de factura
-- 3. Trigger: factura automática al asignar un plan
-- 4. Renovación automática por periodo
-- =============================================

-- 1. Columna de concepto (nombre del plan o motivo personalizado)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS concept TEXT;

-- 2. Generador de número de factura (reutiliza invoice_number_seq)
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_number TEXT;
BEGIN
  next_number := 'FAC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0');
  RETURN next_number;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_invoice_number() TO anon, authenticated, service_role;

-- 3. Trigger: crear factura automática cuando se asigna un plan a un usuario
CREATE OR REPLACE FUNCTION auto_create_plan_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_existing_id UUID;
BEGIN
  -- Solo actúa si hay un plan asignado
  IF NEW.plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- En UPDATE, solo si el plan cambió (evita duplicados al editar otros datos)
  IF TG_OP = 'UPDATE' AND OLD.plan_id IS NOT DISTINCT FROM NEW.plan_id THEN
    RETURN NEW;
  END IF;

  -- Obtener el plan
  SELECT * INTO v_plan FROM plans WHERE id = NEW.plan_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Evitar duplicados: si ya existe una factura Pendiente para este usuario+plan
  SELECT id INTO v_existing_id FROM invoices
    WHERE user_id = NEW.id AND plan_id = NEW.plan_id AND status = 'Pendiente'
    LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO invoices (user_id, plan_id, invoice_number, amount, due_date, status, concept)
  VALUES (
    NEW.id,
    NEW.plan_id,
    generate_invoice_number(),
    v_plan.price,
    COALESCE(NEW.next_payment, NOW()),
    'Pendiente',
    v_plan.name
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_plan_invoice ON users;
CREATE TRIGGER trg_auto_create_plan_invoice
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION auto_create_plan_invoice();

-- 4. Renovación automática por periodo:
--    - Factura Vencida del periodo pasado (comportamiento existente, con deduplicación)
--    - Factura Pendiente del siguiente periodo (renovación automática)
CREATE OR REPLACE FUNCTION check_overdue_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Factura Vencida del periodo pasado
  INSERT INTO invoices (user_id, plan_id, invoice_number, amount, due_date, status, concept)
  SELECT
    u.id,
    u.plan_id,
    generate_invoice_number(),
    COALESCE(p.price, 0),
    u.next_payment,
    'Vencida',
    p.name
  FROM users u
  LEFT JOIN plans p ON p.id = u.plan_id
  WHERE u.status = 'Activo'
    AND u.next_payment < CURRENT_DATE
    AND COALESCE(u.is_free_user, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.user_id = u.id
        AND i.status = 'Vencida'
        AND i.due_date = u.next_payment
    );

  -- Factura Pendiente del siguiente periodo (renovación automática)
  INSERT INTO invoices (user_id, plan_id, invoice_number, amount, due_date, status, concept)
  SELECT
    u.id,
    u.plan_id,
    generate_invoice_number(),
    p.price,
    u.next_payment + (p.duration_days || ' days')::INTERVAL,
    'Pendiente',
    p.name
  FROM users u
  INNER JOIN plans p ON p.id = u.plan_id
  WHERE u.status = 'Activo'
    AND u.next_payment < CURRENT_DATE
    AND COALESCE(u.is_free_user, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.user_id = u.id
        AND i.plan_id = u.plan_id
        AND i.status IN ('Pendiente', 'Vencida')
        AND i.due_date = u.next_payment + (p.duration_days || ' days')::INTERVAL
    );

  -- Suspender usuarios vencidos
  UPDATE users
  SET status = 'Suspendido', updated_at = NOW()
  WHERE status = 'Activo' AND next_payment < CURRENT_DATE;
END;
$$;
