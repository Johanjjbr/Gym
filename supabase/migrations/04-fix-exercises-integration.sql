-- =====================================================
-- MIGRACIÓN: Fix de Integración de Ejercicios
-- =====================================================
-- Descripción: Asegura que la tabla exercises esté correctamente
-- configurada y que routine_exercises tenga la columna exercise_id
-- =====================================================

-- 1. Verificar que la tabla exercises existe con la estructura correcta
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

DROP TRIGGER IF EXISTS trigger_update_exercises_updated_at ON exercises;
CREATE TRIGGER trigger_update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_exercises_updated_at();

-- 4. Agregar columna exercise_id a routine_exercises si no existe
-- Esto permite vincular ejercicios de la biblioteca
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'routine_exercises' 
    AND column_name = 'exercise_id'
  ) THEN
    ALTER TABLE routine_exercises 
    ADD COLUMN exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Índice para la nueva FK
CREATE INDEX IF NOT EXISTS idx_routine_exercises_exercise_id ON routine_exercises(exercise_id);

-- 5. DESHABILITAR RLS en la tabla exercises
-- Esto permite que el cliente acceda directamente sin políticas RLS complejas
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;

-- 6. Insertar ejercicios comunes predeterminados (si no existen)
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
  ('Fondos', 'Pecho/Tríceps', 'Paralelas', 'Ejercicio compuesto peso corporal'),
  ('Press Inclinado', 'Pecho', 'Barra', 'Desarrollo del pecho superior'),
  ('Aperturas con Mancuernas', 'Pecho', 'Mancuernas', 'Aislamiento de pecho'),
  ('Jalón al Pecho', 'Espalda', 'Polea', 'Desarrollo de la espalda en ancho'),
  ('Remo en Polea', 'Espalda', 'Polea', 'Desarrollo de espesor medio de la espalda'),
  ('Face Pull', 'Hombros', 'Polea', 'Desarrollo de deltoides posterior'),
  ('Curl Martillo', 'Bíceps', 'Mancuernas', 'Desarrollo de bíceps y antebrazo'),
  ('Press Francés', 'Tríceps', 'Barra Z', 'Aislamiento de tríceps'),
  ('Zancadas', 'Piernas', 'Mancuernas', 'Ejercicio unilateral para piernas'),
  ('Peso Muerto Rumano', 'Piernas', 'Barra', 'Enfoque en femorales y glúteos'),
  ('Hip Thrust', 'Glúteos', 'Barra', 'Desarrollo de glúteos')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
-- Ejecuta estas queries para verificar que todo esté correcto:

-- SELECT COUNT(*) as total_exercises FROM exercises;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'routine_exercises' AND column_name IN ('exercise_id', 'exercise_name');
-- SELECT * FROM exercises ORDER BY name LIMIT 10;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================
-- Esta migración asegura que:
-- 1. La tabla exercises existe con todos sus campos
-- 2. Los índices están creados para mejorar el rendimiento
-- 3. El trigger de updated_at funciona correctamente
-- 4. routine_exercises tiene la columna exercise_id para vincular con la biblioteca
-- 5. RLS está deshabilitado para permitir acceso directo desde el cliente
-- 6. Hay ejercicios predeterminados listos para usar
-- =====================================================
