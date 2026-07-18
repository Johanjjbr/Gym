-- =============================================
-- Migration 30: Gym reviews + admin_gyms + counts
-- =============================================

-- 1. Tabla de reseñas de gimnasios
CREATE TABLE IF NOT EXISTS gym_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(gym_id, user_id)
);

ALTER TABLE gym_reviews ENABLE ROW LEVEL SECURITY;

-- 2. Tabla de gyms asignados a administradores
CREATE TABLE IF NOT EXISTS admin_gyms (
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (staff_id, gym_id)
);

ALTER TABLE admin_gyms ENABLE ROW LEVEL SECURITY;

-- 3. Trigger para actualizar rating promedio del gym
CREATE OR REPLACE FUNCTION update_gym_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gyms SET
    rating = COALESCE(
      (SELECT ROUND(AVG(rating)::numeric, 1) FROM gym_reviews WHERE gym_id = COALESCE(NEW.gym_id, OLD.gym_id)),
      0.0
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.gym_id, OLD.gym_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_gym_rating ON gym_reviews;
CREATE TRIGGER trg_update_gym_rating
  AFTER INSERT OR UPDATE OR DELETE ON gym_reviews
  FOR EACH ROW EXECUTE FUNCTION update_gym_rating();

-- 4. Poblar admin_gyms con los admins existentes
INSERT INTO admin_gyms (staff_id, gym_id)
SELECT s.id, s.gym_id FROM staff s
WHERE s.role = 'Administrador' AND s.gym_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. RLS Policies
-- gym_reviews: usuarios pueden insertar/ver sus reseñas, staff puede ver todas
CREATE POLICY "Usuarios pueden ver reseñas de su gym"
  ON gym_reviews FOR SELECT
  USING (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)
    OR EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND status = 'Activo')
  );

CREATE POLICY "Usuarios pueden crear su reseña"
  ON gym_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id)
  );

CREATE POLICY "Usuarios pueden actualizar su reseña"
  ON gym_reviews FOR UPDATE
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id))
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "Usuarios pueden eliminar su reseña"
  ON gym_reviews FOR DELETE
  USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- admin_gyms: solo admins y super admin
CREATE POLICY "Admins pueden ver sus gyms asignados"
  ON admin_gyms FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND id = admin_gyms.staff_id AND status = 'Activo')
    OR EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND is_super_admin = true AND status = 'Activo')
  );

CREATE POLICY "Solo super admin puede gestionar admin_gyms"
  ON admin_gyms FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND is_super_admin = true AND status = 'Activo')
  );

CREATE POLICY "Solo super admin puede eliminar admin_gyms"
  ON admin_gyms FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM staff WHERE auth_user_id = auth.uid() AND is_super_admin = true AND status = 'Activo')
  );

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_gym_reviews_gym_id ON gym_reviews(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_reviews_user_id ON gym_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_gyms_staff_id ON admin_gyms(staff_id);
CREATE INDEX IF NOT EXISTS idx_admin_gyms_gym_id ON admin_gyms(gym_id);

-- 7. Función para obtener reseña del usuario logueado para un gym
CREATE OR REPLACE FUNCTION get_my_gym_review(p_gym_id UUID)
RETURNS SETOF gym_reviews AS $$
BEGIN
  RETURN QUERY
  SELECT gr.* FROM gym_reviews gr
  JOIN users u ON u.id = gr.user_id
  WHERE u.auth_user_id = auth.uid() AND gr.gym_id = p_gym_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
