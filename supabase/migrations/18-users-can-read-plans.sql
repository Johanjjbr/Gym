-- Permitir que todos los usuarios autenticados vean los planes
CREATE POLICY "Usuarios pueden ver planes"
  ON plans FOR SELECT
  USING (true);
