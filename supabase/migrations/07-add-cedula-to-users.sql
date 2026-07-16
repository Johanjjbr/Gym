-- =============================================
-- MIGRACIÓN: Agregar cédula (documento de identidad)
-- a la tabla de usuarios
-- =============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS cedula TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_cedula ON users(cedula);
