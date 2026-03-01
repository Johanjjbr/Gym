-- =====================================================
-- MIGRACIÓN: Sistema de Biblioteca de Ejercicios
-- =====================================================
-- Descripción: Crea una tabla centralizada de ejercicios
-- que pueden ser reutilizados en múltiples rutinas
-- =====================================================

-- 1. Crear tabla de ejercicios
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  muscle_group TEXT NOT NULL DEFAULT 'General',
  equipment TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON exercises(created_by);

-- 3. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_exercises_updated_at();

-- 4. Agregar columna exercise_id a routine_exercises (FK a exercises)
-- Esto permite vincular ejercicios de la biblioteca
ALTER TABLE routine_exercises 
ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL;

-- Índice para la nueva FK
CREATE INDEX IF NOT EXISTS idx_routine_exercises_exercise_id ON routine_exercises(exercise_id);

-- 5. DESHABILITAR RLS en la tabla exercises (usar SERVICE_ROLE_KEY desde servidor)
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;

-- 6. Insertar ejercicios comunes predeterminados
INSERT INTO exercises (name, muscle_group, equipment, description) VALUES
  ('Press de Banca', 'Pecho', 'Barra', 'Ejercicio fundamental para desarrollar el pecho'),
  ('Sentadilla', 'Piernas', 'Barra', 'Rey de los ejercicios para piernas'),
  ('Peso Muerto', 'Espalda', 'Barra', 'Ejercicio compuesto para espalda y piernas'),
  ('Press Militar', 'Hombros', 'Barra', 'Desarrollo de hombros con barra'),
  ('Dominadas', 'Espalda', 'Barra fija', 'Ejercicio de tracción para espalda'),
  ('Remo con Barra', 'Espalda', 'Barra', 'Desarrollo de espesor en la espalda'),
  ('Curl de Bíceps', 'Bíceps', 'Mancuernas', 'Aislamiento de bíceps'),
  ('Extensiones de Tríceps', 'Tríceps', 'Polea', 'Aislamiento de tríceps'),
  ('Elevaciones Laterales', 'Hombros', 'Mancuernas', 'Desarrollo de hombros laterales'),
  ('Prensa de Pierna', 'Piernas', 'Máquina', 'Desarrollo cuádriceps en máquina'),
  ('Curl Femoral', 'Piernas', 'Máquina', 'Aislamiento de femorales'),
  ('Pantorrillas en Máquina', 'Pantorrillas', 'Máquina', 'Desarrollo de gemelos'),
  ('Abdominales', 'Core', 'Peso corporal', 'Ejercicio básico de abdominales'),
  ('Plancha', 'Core', 'Peso corporal', 'Isométrico para core'),
  ('Fondos', 'Pecho/Tríceps', 'Paralelas', 'Ejercicio compuesto peso corporal')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================
-- Ahora los usuarios pueden:
-- 1. Seleccionar ejercicios de la biblioteca al crear rutinas
-- 2. Crear nuevos ejercicios que se guardan en la biblioteca
-- 3. Reutilizar ejercicios en múltiples rutinas
-- 4. La columna exercise_id vincula el ejercicio de la biblioteca
-- 5. exercise_name se mantiene como respaldo/cache del nombre
-- =====================================================
