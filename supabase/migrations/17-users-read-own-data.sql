-- Permitir que usuarios regulares vean su propio progreso físico
CREATE POLICY "Usuarios pueden ver su propio progreso"
  ON physical_progress FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Permitir que usuarios regulares vean su propia asistencia
CREATE POLICY "Usuarios pueden ver su propia asistencia"
  ON attendance FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Permitir que usuarios regulares vean sus propias facturas
CREATE POLICY "Usuarios pueden ver sus propias facturas"
  ON invoices FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
