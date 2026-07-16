-- Drop old invoices table (references payments via FK, but has no real data yet)
DROP TABLE IF EXISTS invoices CASCADE;

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- New unified invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Pagada', 'Vencida')),
  method TEXT CHECK (method IN ('Efectivo', 'Transferencia', 'Tarjeta', 'Pago Móvil')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Migrate existing payments into new invoices table
INSERT INTO invoices (id, user_id, invoice_number, amount, due_date, paid_at, status, method, reference, notes, created_at)
SELECT 
  id,
  user_id,
  'LEGACY-' || id,
  amount,
  date AS due_date,
  CASE WHEN status = 'Pagado' THEN date ELSE NULL END AS paid_at,
  CASE 
    WHEN status = 'Pagado' THEN 'Pagada'
    WHEN status = 'Pendiente' THEN 'Pendiente'
    WHEN status = 'Vencido' THEN 'Vencida'
  END AS status,
  method,
  reference,
  notes,
  created_at
FROM payments;

-- Drop payments table (data migrated to invoices)
DROP TABLE IF EXISTS payments CASCADE;

-- RLS for new invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver facturas"
  ON invoices FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Administrador y Recepción pueden gestionar facturas"
  ON invoices FOR ALL
  USING (public.is_staff_reception());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Update check_overdue_users to create invoices + suspend users
CREATE OR REPLACE FUNCTION check_overdue_users()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Create overdue invoices for users whose next_payment has passed
  INSERT INTO invoices (user_id, plan_id, invoice_number, amount, due_date, status)
  SELECT 
    u.id,
    u.plan_id,
    'FAC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0'),
    COALESCE(p.price, 0),
    u.next_payment,
    'Vencida'
  FROM users u
  LEFT JOIN plans p ON p.id = u.plan_id
  WHERE u.status = 'Activo' AND u.next_payment < CURRENT_DATE;

  -- Suspend overdue users
  UPDATE users
  SET status = 'Suspendido', updated_at = NOW()
  WHERE status = 'Activo' AND next_payment < CURRENT_DATE;
END;
$$;
