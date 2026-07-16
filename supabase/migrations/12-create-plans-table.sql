-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  duration_days INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed data
INSERT INTO plans (name, description, duration_days, price) VALUES
  ('Mensual', 'Plan mensual - Acceso completo al gimnasio', 30, 300),
  ('Trimestral', 'Plan trimestral - 3 meses con descuento', 90, 810),
  ('Semestral', 'Plan semestral - 6 meses con descuento especial', 180, 1500),
  ('Anual', 'Plan anual - 12 meses con el mejor descuento', 365, 2400);

-- Trigger for updated_at
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver planes"
  ON plans FOR SELECT
  USING (public.is_staff_any());

CREATE POLICY "Administrador y Recepción pueden gestionar planes"
  ON plans FOR ALL
  USING (public.is_staff_reception());

-- Index
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);
