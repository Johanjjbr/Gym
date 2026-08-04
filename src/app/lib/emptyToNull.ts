/**
 * Convierte strings vacíos o valores null/undefined a null.
 * Evita enviar '' a columnas timestamp o con CHECK constraints en Supabase.
 */
export function emptyToNull(value: unknown): string | number | boolean | null {
  if (value === '' || value == null) return null;
  return value as string | number | boolean;
}
