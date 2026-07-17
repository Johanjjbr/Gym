import { supabase } from './supabase';

type BucketName = 'user-photos' | 'staff-photos' | 'exercise-media';

export async function uploadFile(
  file: File,
  bucket: BucketName,
  folder?: string
): Promise<string> {
  if (!file) throw new Error('No file provided');

  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

export async function deleteFile(url: string): Promise<void> {
  const pathMatch = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
  if (!pathMatch) return;

  const fullPath = pathMatch[1];
  const bucketMatch = fullPath.match(/^([^/]+)\/(.+)/);
  if (!bucketMatch) return;

  const bucket = bucketMatch[1] as BucketName;
  const filePath = bucketMatch[2];

  await supabase.storage.from(bucket).remove([filePath]);
}

export function getFileUrl(bucket: BucketName, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
