-- =====================================================
-- MIGRACIÓN: Agregar columnas de imagen/GIF a ejercicios
-- =====================================================
-- NOTA: Esta migración reemplaza parcialmente la 06
-- (que no fue aplicada). Agrega las columnas faltantes
-- e inserta los 1,324 ejercicios del dataset público.
-- =====================================================

-- 1. Agregar nuevas columnas a exercises
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS body_part TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS target TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[] DEFAULT '{}';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_es TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_en TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS media_id TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS attribution TEXT;

CREATE INDEX IF NOT EXISTS idx_exercises_external_id ON exercises(external_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_target ON exercises(target);

-- 2. Insertar ejercicios del dataset público
INSERT INTO exercises (external_id, name, description, muscle_group, equipment, category, body_part, target, secondary_muscles, instructions_es, instructions_en, image_url, gif_url, media_id, attribution) VALUES
('0001', '3/4 sit-up', 'Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo. Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera. Activando el abdomen, levanta lentamente la parte superior del cuerpo del suelo, curvándote hacia adelante hasta que tu torso forme un áng', 'waist', 'body weight', 'waist', 'waist', 'abs', '{"hip flexors","lower back"}', 'Túmbate sobre tu espalda con las rodillas flexionadas y los pies apoyados en el suelo. Coloca las manos detrás de la cabeza con los codos apuntando hacia afuera. Activando el abdomen, levanta lentamente la parte superior del cuerpo del suelo, curvándote hacia adelante hasta que tu torso forme un ángulo de 45 grados. Haz una pausa por un momento en la parte superior, luego baja lentamente la parte superior del cuerpo de vuelta a la posición inicial. Repite el número de repeticiones deseado.', 'Lie flat on your back with your knees bent and feet flat on the ground. Place your hands behind your head with your elbows pointing outwards. Engaging your abs, slowly lift your upper body off the ground, curling forward until your torso is at a 45-degree angle. Pause for a moment at the top, then slowly lower your upper body back down to the starting position. Repeat for the desired number of repetitions.', 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/0001-2gPfomN.jpg', 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0001-2gPfomN.gif', '2gPfomN', '© Gym visual — https://gymvisual.com/'),
