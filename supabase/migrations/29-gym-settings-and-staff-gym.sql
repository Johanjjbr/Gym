-- =============================================
-- Migration 29: Gym settings + staff gym_id + super admin
-- =============================================

-- 1. Nuevas columnas en gyms para configuración
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Agregar gym_id a staff (nullable primero para poblar)
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id);

-- 3. Agregar is_super_admin a staff
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 4. Asignar el gym por defecto a todo el staff existente
DO $$
DECLARE
  default_gym_id UUID;
BEGIN
  SELECT id INTO default_gym_id FROM gyms ORDER BY created_at ASC LIMIT 1;
  IF default_gym_id IS NOT NULL THEN
    UPDATE staff SET gym_id = default_gym_id WHERE gym_id IS NULL;
  END IF;
END $$;

-- 5. Marcar al primer admin como super admin
UPDATE staff SET is_super_admin = true WHERE role = 'Administrador' AND is_super_admin = false
  AND id = (SELECT id FROM staff WHERE role = 'Administrador' ORDER BY created_at ASC LIMIT 1);

-- 6. Hacer gym_id NOT NULL después de poblar
ALTER TABLE staff
  ALTER COLUMN gym_id SET NOT NULL;

-- 7. Índices
CREATE INDEX IF NOT EXISTS idx_staff_gym_id ON staff(gym_id);
CREATE INDEX IF NOT EXISTS idx_gyms_updated_at ON gyms(updated_at);

-- 8. Actualizar o crear políticas RLS para staff con gym
DROP POLICY IF EXISTS "Staff puede ver su propio registro" ON staff;
CREATE POLICY "Staff puede ver su propio registro"
  ON staff FOR SELECT
  USING (
    auth.uid() = auth_user_id
    OR public.is_staff_admin()
    OR public.is_staff_reception()
    OR public.is_staff_trainer()
  );

DROP POLICY IF EXISTS "Staff pueden gestionar staff del mismo gym" ON staff;
CREATE POLICY "Staff pueden gestionar staff del mismo gym"
  ON staff FOR INSERT
  WITH CHECK (
    public.is_staff_admin()
  );

CREATE POLICY "Staff pueden actualizar staff del mismo gym"
  ON staff FOR UPDATE
  USING (
    public.is_staff_admin()
  );

CREATE POLICY "Staff pueden eliminar staff del mismo gym"
  ON staff FOR DELETE
  USING (
    public.is_staff_admin()
  );

-- 9. Actualizar políticas de gyms
DROP POLICY IF EXISTS "Staff pueden gestionar gimnasios" ON gyms;
CREATE POLICY "Staff pueden gestionar gimnasios"
  ON gyms FOR ALL
  USING (public.is_staff_admin());

-- 10. Insertar datos de ejemplo para el gym por defecto si no existe
UPDATE gyms SET
  email = COALESCE(email, 'contacto@gymlagunetica.com'),
  description = COALESCE(description, 'Gimnasio ubicado en Los Teques, sector Lagunetica. Ofrecemos entrenamiento personalizado, rutinas de fuerza, cardio y funcional.'),
  schedule = COALESCE(schedule, '{
    "lunes": {"abre": "06:00", "cierra": "22:00"},
    "martes": {"abre": "06:00", "cierra": "22:00"},
    "miercoles": {"abre": "06:00", "cierra": "22:00"},
    "jueves": {"abre": "06:00", "cierra": "22:00"},
    "viernes": {"abre": "06:00", "cierra": "22:00"},
    "sabado": {"abre": "08:00", "cierra": "20:00"},
    "domingo": {"abre": "08:00", "cierra": "14:00"}
  }'::jsonb),
  social_links = COALESCE(social_links, '{
    "instagram": "https://instagram.com/gymlagunetica",
    "whatsapp": "https://wa.me/584121234567",
    "twitter": "https://twitter.com/gymlagunetica",
    "tiktok": "https://tiktok.com/@gymlagunetica",
    "youtube": "https://youtube.com/@gymlagunetica"
  }'::jsonb),
  updated_at = NOW()
WHERE code = 'GYM-LTQ-001';

-- 11. Función helper para verificar super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff
    WHERE auth_user_id = auth.uid()
    AND is_super_admin = true
    AND status = 'Activo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
