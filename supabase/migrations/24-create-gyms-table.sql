CREATE TABLE IF NOT EXISTS gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO gyms (name, address, phone, code) VALUES
  ('Gimnasio Los Teques', 'Sector Lagunetica, Los Teques', '0412-1234567', 'GYM-LTQ-001')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver gimnasios"
  ON gyms FOR SELECT
  USING (true);

CREATE POLICY "Staff pueden gestionar gimnasios"
  ON gyms FOR ALL
  USING (public.is_staff_admin());

CREATE INDEX IF NOT EXISTS idx_gyms_code ON gyms(code);
CREATE INDEX IF NOT EXISTS idx_gyms_is_active ON gyms(is_active);
