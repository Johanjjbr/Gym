/**
 * Script para subir imágenes y GIFs de ejercicios a Supabase Storage
 * 
 * Uso: node scripts/upload-exercise-media.js
 * 
 * Requiere:
 *   - SERVICE_ROLE_KEY en .env (SUPABASE_SERVICE_ROLE_KEY)
 *   - VITE_SUPABASE_URL en .env
 *   - El repo exercises-dataset clonado en ../exercises-dataset/
 * 
 * NOTA: La migración actual usa URLs de GitHub raw, este script es
 * opcional para migrar a Supabase Storage cuando se desee.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync, createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const DATASET_DIR = join(__dirname, '..', '..', 'exercises-dataset');
const BUCKET_NAME = 'exercise-media';
const BATCH_SIZE = 20;

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET_NAME);
  if (!exists) {
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/gif'],
      fileSizeLimit: 5242880, // 5MB
    });
    if (error) throw error;
    console.log(`✅ Bucket "${BUCKET_NAME}" creado`);
  } else {
    console.log(`ℹ️ Bucket "${BUCKET_NAME}" ya existe`);
  }
}

async function uploadFile(localPath, storagePath) {
  if (!existsSync(localPath)) {
    console.warn(`⚠️ No encontrado: ${localPath}`);
    return null;
  }

  const fileBuffer = readFileSync(localPath);
  const contentType = localPath.endsWith('.gif') ? 'image/gif' : 'image/jpeg';

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(`❌ Error subiendo ${storagePath}:`, error.message);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return publicUrl;
}

async function updateExerciseUrls(externalId, imageUrl, gifUrl) {
  const { error } = await supabase
    .from('exercises')
    .update({ image_url: imageUrl, gif_url: gifUrl })
    .eq('external_id', externalId);

  if (error) {
    console.error(`❌ Error actualizando ejercicio ${externalId}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Iniciando upload de media a Supabase Storage...\n');

  await ensureBucket();

  // Leer el JSON de ejercicios para obtener la lista completa
  const exercisesPath = join(DATASET_DIR, 'data', 'exercises.json');
  if (!existsSync(exercisesPath)) {
    console.error(`❌ No se encuentra ${exercisesPath}`);
    console.log('   Clona el repo: git clone https://github.com/hasaneyldrm/exercises-dataset.git ../exercises-dataset');
    process.exit(1);
  }

  const exercises = JSON.parse(readFileSync(exercisesPath, 'utf-8'));
  console.log(`📦 ${exercises.length} ejercicios para procesar\n`);

  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (ex) => {
      const imageLocal = join(DATASET_DIR, ex.image || '');
      const gifLocal = join(DATASET_DIR, ex.gif_url || '');

      const imageStoragePath = `images/${ex.id}.jpg`;
      const gifStoragePath = `gifs/${ex.id}.gif`;

      const results = await Promise.all([
        ex.image ? uploadFile(imageLocal, imageStoragePath) : null,
        ex.gif_url ? uploadFile(gifLocal, gifStoragePath) : null,
      ]);

      if (results[0] || results[1]) {
        await updateExerciseUrls(ex.id, results[0], results[1]);
        uploaded++;
      } else {
        failed++;
      }
    });

    await Promise.all(batchPromises);
    const progress = Math.min(i + BATCH_SIZE, exercises.length);
    console.log(`📊 Progreso: ${progress}/${exercises.length} (${Math.round(progress/exercises.length*100)}%)`);
  }

  console.log(`\n✅ Procesado: ${uploaded} subidos, ${failed} fallidos`);
}

main().catch(console.error);
