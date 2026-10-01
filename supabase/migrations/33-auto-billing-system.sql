-- =============================================
-- SISTEMA DE FACTURACIÓN AUTOMÁTICA DIARIA
-- =============================================

-- 1. Agregar campo paid_until a users
ALTER TABLE users ADD COLUMN IF NOT EXISTS paid_until DATE;

-- 2. Índices para optimizar queries del job diario
CREATE INDEX IF NOT EXISTS idx_users_next_payment ON users(next_payment) WHERE status = 'Activo';
CREATE INDEX IF NOT EXISTS idx_users_paid_until ON users(paid_until) WHERE status = 'Activo';
CREATE INDEX IF NOT EXISTS idx_invoices_user_due ON invoices(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);

-- 3. Constraint único para evitar facturas duplicadas (usuario + plan + due_date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_user_plan_due 
ON invoices(user_id, plan_id, due_date) 
WHERE status IN ('Pendiente', 'Pagada');

-- 4. Función para generar facturas diarias
CREATE OR REPLACE FUNCTION generate_daily_invoices()
RETURNS void AS $$
DECLARE
  u RECORD;
  p RECORD;
  current_due DATE;
  next_due DATE;
  max_date DATE;
  concept TEXT;
  amount NUMERIC;
  iteration_count INT := 0;
BEGIN
  -- Buscar usuarios activos con plan asignado
  FOR u IN 
    SELECT id, plan_id, next_payment, paid_until
    FROM users 
    WHERE status = 'Activo' 
    AND plan_id IS NOT NULL
  LOOP
    -- Obtener plan
    SELECT * INTO p FROM plans WHERE id = u.plan_id;
    IF p IS NULL OR p.price IS NULL OR p.price <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Fecha base: desde next_payment o hoy si es null
    -- next_payment = primer día del mes que debe pagar
    DECLARE base_date DATE := COALESCE(u.next_payment, CURRENT_DATE);
    
    -- Límite: hasta paid_until (si tiene adelanto) o hasta 1 mes adelante si no tiene adelanto
    -- Si tiene paid_until, generar hasta esa fecha
    -- Si no tiene paid_until, generar solo 1 mes adelante (mes actual)
    DECLARE limit_date DATE := COALESCE(u.paid_until, base_date + interval '1 month');
    DECLARE max_date DATE := base_date + interval '12 months'; -- Seguridad: máximo 1 año adelante
    
    current_due := base_date;
    DECLARE iteration_count INT := 0;
    
    WHILE current_due <= LEAST(limit_date, base_date + interval '12 months') 
          AND iteration_count < 24 LOOP  -- Máx 24 facturas (2 años)
      -- Verificar si ya existe factura para este mes
      IF NOT EXISTS (
        SELECT 1 FROM invoices 
        WHERE user_id = u.id 
        AND plan_id = u.plan_id 
        AND due_date = current_due
        AND status IN ('Pendiente', 'Pagada')
      ) THEN
        -- Concepto: "PlanName - Month Year"
        DECLARE concept TEXT := p.name || ' - ' || to_char(current_due, 'Month YYYY');
        
        INSERT INTO invoices (user_id, plan_id, concept, amount, due_date, status)
        VALUES (u.id, u.plan_id, p.name || ' - ' || to_char(current_due, 'Month YYYY'), p.price, current_due, 'Pendiente')
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- Siguiente vencimiento según duration_days del plan
      current_due := current_due + p.duration_days * interval '1 day';
      iteration_count := iteration_count + 1;
      
      -- Seguridad: salir si pasamos de 2 años
      IF current_due > CURRENT_DATE + interval '2 years' THEN 
        EXIT; 
      END IF;
    END LOOP;
    
    -- Actualizar next_payment = primer factura Pendiente
    UPDATE users SET next_payment = (
      SELECT MIN(due_date) FROM invoices 
      WHERE user_id = u.id AND status = 'Pendiente'
    ) WHERE id = u.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para generar factura inmediata al crear usuario con plan
CREATE OR REPLACE FUNCTION create_initial_invoice(user_id UUID, plan_id UUID)
RETURNS void AS $$
DECLARE
  p RECORD;
  due_date DATE;
  concept TEXT;
BEGIN
  SELECT * INTO p FROM plans WHERE id = plan_id;
  IF p IS NULL OR p.price IS NULL OR p.price <= 0 THEN
    RETURN;
  END IF;
  
  -- due_date = hoy (primer día del mes actual)
  due_date := date_trunc('month', CURRENT_DATE)::date;
  
  INSERT INTO invoices (user_id, plan_id, concept, amount, due_date, status)
  VALUES (user_id, plan_id, p.name || ' - ' || to_char(CURRENT_DATE, 'Month YYYY'), p.price, due_date, 'Pendiente')
  ON CONFLICT DO NOTHING;
  
  -- Actualizar next_payment del usuario
  UPDATE users SET 
    next_payment = date_trunc('month', CURRENT_DATE)::date + interval '1 month',
    paid_until = NULL
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para crear factura inicial al asignar plan a usuario
CREATE OR REPLACE FUNCTION trigger_create_initial_invoice()
RETURNS trigger AS $$
BEGIN
  IF NEW.plan_id IS NOT NULL AND (OLD.plan_id IS NULL OR OLD.plan_id != NEW.plan_id) THEN
    PERFORM create_initial_invoice(NEW.id, NEW.plan_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_plan_change ON users;
CREATE TRIGGER trigger_user_plan_change
AFTER UPDATE OF plan_id ON users
FOR EACH ROW EXECUTE FUNCTION trigger_create_initial_invoice();

-- 7. Función para pago adelantado (N meses) - Opción A: facturas explícitas Pagadas
CREATE OR REPLACE FUNCTION pay_advance_months(p_user_id UUID, p_months INT, p_method TEXT, p_reference TEXT)
RETURNS void AS $$
DECLARE
  inv RECORD;
  last_due DATE;
  pending_count INT := 0;
BEGIN
  -- Validar meses
  IF p_months <= 0 OR p_months > 12 THEN
    RAISE EXCEPTION 'Meses debe estar entre 1 y 12';
  END IF;
  
  -- Obtener facturas pendientes ordenadas
  FOR inv IN 
    SELECT id, due_date FROM invoices 
    WHERE user_id = p_user_id 
    AND status = 'Pendiente'
    ORDER BY due_date ASC
    LIMIT 12  -- Máx 12 meses por adelantado
  LOOP
    IF pending_count >= 12 THEN EXIT; END IF;
    
    UPDATE invoices 
    SET status = 'Pagada', 
        paid_at = CURRENT_TIMESTAMP,
        method = 'Adelantado',
        reference = 'Pago adelantado ' || pending_count + 1 || ' meses'
    WHERE id = inv.id;
    
    last_due := inv.due_date;
    pending_count := pending_count + 1;
    
    IF pending_count >= 12 THEN EXIT; END IF;
  END LOOP;
  
  IF pending_count = 0 THEN
    RAISE EXCEPTION 'No hay facturas pendientes para pagar por adelantado';
  END IF;
  
  -- Actualizar paid_until = due_date del último mes pagado
  -- Actualizar next_payment = primera factura Pendiente restante
  UPDATE users SET 
    paid_until = (SELECT MAX(due_date) FROM invoices WHERE user_id = p_user_id AND status = 'Pagada'),
    next_payment = (
      SELECT MIN(due_date) FROM invoices 
      WHERE user_id = p_user_id AND status = 'Pendiente'
    )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Función para resetear facturación al reactivar usuario (decisión 5: resetear)
CREATE OR REPLACE FUNCTION reset_user_billing(p_user_id UUID)
RETURNS void AS $$
DECLARE
  p RECORD;
BEGIN
  -- Eliminar facturas Pendientes (no Pagadas)
  DELETE FROM invoices WHERE user_id = p_user_id AND status = 'Pendiente';
  
  -- Obtener plan actual
  SELECT plan_id INTO p FROM users WHERE id = p_user_id;
  
  IF p.plan_id IS NOT NULL THEN
    -- Generar factura inicial para mes actual
    PERFORM create_initial_invoice(p_user_id, p.plan_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para resetear facturación al reactivar usuario (Inactivo -> Activo)
CREATE OR REPLACE FUNCTION trigger_reset_billing_on_reactivate()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'Inactivo' AND NEW.status = 'Activo' THEN
    PERFORM reset_user_billing(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_reactivate_billing ON users;
CREATE TRIGGER trigger_user_reactivate_billing
AFTER UPDATE OF status ON users
FOR EACH ROW EXECUTE FUNCTION trigger_reset_billing_on_reactivate();

-- 9. Función para detener generación al desactivar plan (decisión 4)
CREATE OR REPLACE FUNCTION trigger_stop_billing_on_plan_deactivate()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Eliminar facturas Pendientes de usuarios con este plan
    DELETE FROM invoices 
    WHERE plan_id = NEW.id 
    AND status = 'Pendiente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_plan_deactivate_billing ON plans;
CREATE TRIGGER trigger_plan_deactivate_billing
AFTER UPDATE OF is_active ON plans
FOR EACH ROW EXECUTE FUNCTION trigger_stop_billing_on_plan_deactivate();