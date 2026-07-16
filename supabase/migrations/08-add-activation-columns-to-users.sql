-- =============================================
-- MIGRACIÓN: Agregar columnas faltantes para el
-- sistema de activación de cuentas
-- =============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_activation_token ON users(activation_token);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
