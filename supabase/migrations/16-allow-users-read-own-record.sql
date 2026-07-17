-- Permitir que usuarios regulares vean su propio registro en la tabla users
CREATE POLICY "Usuarios pueden ver su propio registro"
  ON users FOR SELECT
  USING (auth_user_id = auth.uid());
