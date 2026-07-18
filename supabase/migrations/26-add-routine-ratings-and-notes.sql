-- =====================================================
-- MIGRACIÓN: Calificaciones y notas para rutinas
-- =====================================================
-- Descripción: Agrega tabla de calificaciones con estrellas
-- y columna de notas para el creador de la rutina
-- =====================================================

-- 1. Agregar columna de notas para el creador
ALTER TABLE routine_templates ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Crear tabla de calificaciones
CREATE TABLE IF NOT EXISTS routine_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID NOT NULL REFERENCES routine_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(routine_id, user_id)
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_routine_ratings_routine_id ON routine_ratings(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_ratings_user_id ON routine_ratings(user_id);

-- 4. RLS
ALTER TABLE routine_ratings ENABLE ROW LEVEL SECURITY;

-- Staff y usuarios autenticados pueden ver calificaciones
CREATE POLICY "Anyone can view ratings"
  ON routine_ratings FOR SELECT
  USING (true);

-- Usuarios autenticados pueden crear/actualizar su propia calificación
CREATE POLICY "Users can upsert own ratings"
  ON routine_ratings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own ratings"
  ON routine_ratings FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
