-- =============================================
-- POLÍTICA RLS PARA VERIFICACIÓN DE TOKEN DE ACTIVACIÓN
-- =============================================
-- Permite a usuarios no autenticados verificar tokens de activación
-- accediendo a /activar/{token}

CREATE POLICY "Verificar token de activación"
  ON users FOR SELECT
  USING (activation_token IS NOT NULL);