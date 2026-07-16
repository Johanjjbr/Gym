-- =============================================
-- MIGRACIÓN: Agregar columnas faltantes a users
-- address, birth_date, emergency_contact, notes,
-- medical_notes
-- =============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_notes TEXT;
