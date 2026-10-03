/**
 * Logo de la empresa: se sube una imagen, se reduce en el navegador y se guarda
 * en la base como data URL (organizations.logo_url, migración 55).
 */

/** Lado máximo del logo guardado, en píxeles. */
export const LOGO_MAX_SIDE = 256;
/** Tamaño máximo del archivo que se acepta subir. */
export const LOGO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Límite de la columna en la base (migración 55). */
export const LOGO_MAX_STORED_CHARS = 400_000;

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
export const LOGO_ACCEPT = ACCEPTED.join(',');

/** Error para mostrar al elegir el archivo, o null si se puede usar. */
export function logoFileError(file: { type: string; size: number }): string | null {
  if (!ACCEPTED.includes(file.type)) return 'Usa una imagen PNG, JPG, WEBP, SVG o GIF';
  if (file.size > LOGO_MAX_UPLOAD_BYTES) return 'La imagen pesa más de 5 MB';
  return null;
}

/** Tamaño final manteniendo proporción, sin agrandar imágenes pequeñas. */
export function fitWithin(width: number, height: number, max = LOGO_MAX_SIDE): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: max, height: max };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** ¿Es un logo guardado válido? (mismo formato que exige la base) */
export function isLogoDataUrl(value: string | null | undefined): boolean {
  return !!value && value.length <= LOGO_MAX_STORED_CHARS && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value);
}

/** Peso aproximado en KB de un data URL base64. */
export function dataUrlKb(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.round((b64.length * 3) / 4 / 1024);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

/**
 * Convierte el archivo en un data URL de máximo 256 px (WEBP con transparencia;
 * PNG si el navegador no soporta WEBP). Las SVG y GIF se convierten a imagen fija.
 */
export async function fileToLogoDataUrl(file: File): Promise<string> {
  const err = logoFileError(file);
  if (err) throw new Error(err);
  const img = await loadImage(file);
  const { width, height } = fitWithin(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no permite procesar imágenes');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  let out = canvas.toDataURL('image/webp', 0.9);
  if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/png');
  if (!isLogoDataUrl(out)) throw new Error('La imagen procesada es demasiado grande');
  return out;
}
