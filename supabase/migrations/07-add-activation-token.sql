-- =====================================================
-- MIGRACIÓN: Agregar columnas faltantes a users
-- =====================================================
-- Descripción: Agrega activation_token, is_activated y
-- auth_user_id para el flujo de activación de cuentas
-- =====================================================

-- 1. Agregar columnas faltantes (IF NOT EXISTS para ser idempotente)
ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_users_activation_token ON users(activation_token);
CREATE INDEX IF NOT EXISTS idx_users_is_activated ON users(is_activated);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- 3. Verificar
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('activation_token', 'is_activated', 'auth_user_id')
ORDER BY column_name;
