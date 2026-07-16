const fs = require('fs');
const path = require('path');

const exercisesPath = path.join(process.env.TEMP, 'exercises.json');
const raw = fs.readFileSync(exercisesPath, 'utf-8');
const exercises = JSON.parse(raw);

function esc(val) {
  if (val == null) return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function escArray(arr) {
  if (!arr || arr.length === 0) return "'{}'";
  const inner = arr.map(v => '"' + String(v).replace(/"/g, '\\"') + '"').join(',');
  return "'{" + inner + "}'";
}

let lines = [];
lines.push(`-- =====================================================`);
lines.push(`-- MIGRACIÓN: Enriquecimiento de Biblioteca de Ejercicios`);
lines.push(`-- =====================================================`);
lines.push(`-- Descripción: Agrega nuevos campos a la tabla exercises`);
lines.push(`-- e importa 1,324 ejercicios del dataset exercises-dataset`);
lines.push(`-- =====================================================`);
lines.push(``);
lines.push(`-- 1. Agregar nuevas columnas a exercises`);
lines.push(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS external_id TEXT;`);
lines.push(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category TEXT;`);
lines.push(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS body_part TEXT;`);
lines.push(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS target TEXT;`);
lines.push(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[] DEFAULT '{}';`);
lines.push(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_es TEXT;`);
lines.push(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_en TEXT;`);
lines.push(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_url TEXT;`);
lines.push(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gif_url TEXT;`);
lines.push(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS media_id TEXT;`);
lines.push(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS attribution TEXT;`);
lines.push(``);
lines.push(`CREATE INDEX IF NOT EXISTS idx_exercises_external_id ON exercises(external_id);`);
lines.push(`CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);`);
lines.push(`CREATE INDEX IF NOT EXISTS idx_exercises_target ON exercises(target);`);
lines.push(``);
lines.push(`-- 2. Actualizar los ejercicios existentes con datos enriquecidos si hay match`);
lines.push(`-- (los 25 ejercicios actuales están en español, el dataset en inglés,`);
lines.push(`--  así que no hay conflicto de nombres)`);
lines.push(``);
lines.push(`-- 3. Insertar 1,324 ejercicios del dataset`);
lines.push(`INSERT INTO exercises (external_id, name, description, muscle_group, equipment, category, body_part, target, secondary_muscles, instructions_es, instructions_en, image_url, gif_url, media_id, attribution) VALUES`);

const batchSize = 50;
const insertStatements = [];

for (let i = 0; i < exercises.length; i += batchSize) {
  const batch = exercises.slice(i, i + batchSize);
  const rows = batch.map((ex, idx) => {
    const desc = ex.instructions && ex.instructions.es
      ? ex.instructions.es.substring(0, 300)
      : (ex.instructions && ex.instructions.en ? ex.instructions.en.substring(0, 300) : null);
    const name = esc(ex.name);
    const description = esc(desc);
    const muscleGroup = esc(ex.category || ex.muscle_group || 'General');
    const equipment = esc(ex.equipment || 'Ninguno');
    const category = esc(ex.category || null);
    const bodyPart = esc(ex.body_part || null);
    const target = esc(ex.target || null);
    const secondaryMuscles = escArray(ex.secondary_muscles || []);
    const instructionsEs = esc(ex.instructions && ex.instructions.es ? ex.instructions.es : null);
    const instructionsEn = esc(ex.instructions && ex.instructions.en ? ex.instructions.en : null);
    const imageUrl = esc(ex.image ? 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/' + ex.image : null);
    const gifUrl = esc(ex.gif_url ? 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/' + ex.gif_url : null);
    const mediaId = esc(ex.media_id || null);
    const attribution = esc('© Gym visual — https://gymvisual.com/');
    const externalId = esc(ex.id);

    return `(${externalId}, ${name}, ${description}, ${muscleGroup}, ${equipment}, ${category}, ${bodyPart}, ${target}, ${secondaryMuscles}, ${instructionsEs}, ${instructionsEn}, ${imageUrl}, ${gifUrl}, ${mediaId}, ${attribution})`;
  });

  const clause = rows.join(',\n');
  const conflict = i + batchSize >= exercises.length ? '' : '';
  insertStatements.push(clause);
}

// Combine all inserts with ON CONFLICT
lines.push(insertStatements.join(',\n'));
lines.push(`ON CONFLICT (name) DO UPDATE SET`);
lines.push(`  external_id = EXCLUDED.external_id,`);
lines.push(`  category = EXCLUDED.category,`);
lines.push(`  body_part = EXCLUDED.body_part,`);
lines.push(`  target = EXCLUDED.target,`);
lines.push(`  secondary_muscles = EXCLUDED.secondary_muscles,`);
lines.push(`  instructions_es = EXCLUDED.instructions_es,`);
lines.push(`  instructions_en = EXCLUDED.instructions_en,`);
lines.push(`  image_url = EXCLUDED.image_url,`);
lines.push(`  gif_url = EXCLUDED.gif_url,`);
lines.push(`  media_id = EXCLUDED.media_id,`);
lines.push(`  attribution = EXCLUDED.attribution,`);
lines.push(`  equipment = CASE WHEN exercises.equipment IS NULL THEN EXCLUDED.equipment ELSE exercises.equipment END,`);
lines.push(`  description = CASE WHEN exercises.description IS NULL THEN EXCLUDED.description ELSE exercises.description END;`);
lines.push(``);
lines.push(`-- 4. Vaciar ejercicios temporales si existen (de la migración 03/04)`);
lines.push(`-- Ya se insertaron con ON CONFLICT, no se necesita borrar nada`);
lines.push(``);
lines.push(`-- =====================================================`);
lines.push(`-- VERIFICACIÓN`);
lines.push(`-- =====================================================`);
lines.push(`SELECT COUNT(*) as total_exercises FROM exercises;`);
lines.push(`SELECT 'Migración completada: 1,324 ejercicios importados' as mensaje;`);

const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', '06-exercises-dataset-enrichment.sql');
fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');

console.log(`Migration generated: ${outputPath}`);
console.log(`Total exercises: ${exercises.length}`);
console.log(`File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
