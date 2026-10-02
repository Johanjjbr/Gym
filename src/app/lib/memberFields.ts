/**
 * Normalización y validación de los campos del socio (lógica pura, testeable).
 * Pensado para recepción en Venezuela: cédulas con V-/E- y puntos, teléfonos
 * 04xx-xxx-xx-xx (o extranjeros), fechas escritas como DD/MM/AAAA.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Edad mínima y máxima razonables para un socio. */
export const MIN_AGE = 5;
export const MAX_AGE = 100;

/**
 * Convierte "12/05/1990", "12-05-1990", "12051990" o "1990-05-12" a "1990-05-12".
 * Devuelve null si no es una fecha real (31/02, mes 13, etc.).
 */
export function parseDateInput(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.trim();
  let d: number, m: number, y: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{2})(\d{2})(\d{4})$/.exec(t))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** "1990-05-12" → "12/05/1990" */
export function toDisplayDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return String(iso);
}

/** Máscara mientras se escribe: "1205199" → "12/05/199". */
export function maskDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Edad cumplida en `today` (yyyy-MM-dd). */
export function ageOn(birthIso: string, today: string): number {
  const [by, bm, bd] = birthIso.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}

/** Mensaje de error para la fecha de nacimiento, o null si está bien (o vacía). */
export function birthDateError(text: string | null | undefined, today: string): string | null {
  if (!text || !text.trim()) return null;
  const iso = parseDateInput(text);
  if (!iso) return 'Fecha inválida. Usa DD/MM/AAAA (ej.: 12/05/1990)';
  if (iso > today) return 'La fecha de nacimiento no puede ser futura';
  const age = ageOn(iso, today);
  if (age > MAX_AGE) return `Revisa el año: tendría ${age} años`;
  if (age < MIN_AGE) return `Revisa la fecha: tendría ${age < 0 ? 0 : age} año${age === 1 ? '' : 's'}`;
  return null;
}

/** "V-12.345.678" → "12345678" */
export function normalizeCedula(text: string | null | undefined): string {
  return (text ?? '').replace(/^\s*[VvEeJjPp]\s*-?\s*/, '').replace(/\D/g, '');
}

export function cedulaError(text: string | null | undefined): string | null {
  const raw = (text ?? '').trim();
  if (!raw) return 'La cédula es requerida';
  if (/[^\dVvEeJjPp.\-\s]/.test(raw)) return 'La cédula solo lleva números (puedes escribir V- o E- delante)';
  const digits = normalizeCedula(raw);
  if (digits.length < 5 || digits.length > 10) return 'La cédula debe tener entre 5 y 10 dígitos';
  return null;
}

/** Solo dígitos del teléfono. */
export const phoneDigits = (text: string | null | undefined) => (text ?? '').replace(/\D/g, '');

/**
 * Teléfono válido: venezolano de 11 dígitos (04xx / 02xx), con +58, o extranjero
 * de 10 a 15 dígitos.
 */
export function phoneError(text: string | null | undefined): string | null {
  const raw = (text ?? '').trim();
  if (!raw) return 'El teléfono es requerido';
  if (/[^\d+\-\s().]/.test(raw)) return 'El teléfono solo lleva números';
  const digits = phoneDigits(raw);
  if (digits.startsWith('0')) {
    if (digits.length !== 11) return 'Un teléfono venezolano tiene 11 dígitos (ej.: 0414-1234567)';
    if (!/^0(4|2)/.test(digits)) return 'Debe empezar por 04 (celular) o 02 (fijo)';
    return null;
  }
  if (digits.startsWith('58') && digits.length !== 12) return 'Con +58 debe tener 12 dígitos (ej.: +58 414 1234567)';
  if (digits.length < 10 || digits.length > 15) return 'Teléfono incompleto';
  return null;
}

/** "04141234567" → "0414-1234567"; otros formatos se dejan como se escribieron. */
export function formatPhone(text: string | null | undefined): string {
  const raw = (text ?? '').trim();
  const digits = phoneDigits(raw);
  if (/^0[24]\d{9}$/.test(digits)) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return raw.replace(/\s+/g, ' ');
}

export const normalizeEmail = (text: string | null | undefined) => (text ?? '').trim().toLowerCase();

/** Quita espacios dobles y de los extremos. */
export const cleanText = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

export function nameError(text: string | null | undefined): string | null {
  const v = cleanText(text);
  if (v.length < 3) return 'Escribe nombre y apellido';
  if (v.length > 100) return 'El nombre es demasiado largo';
  if (/\d/.test(v)) return 'El nombre no debe llevar números';
  if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(v)) return 'El nombre tiene caracteres no válidos';
  return null;
}

/** Fecha de inicio: válida, no antes de 2000 ni más de 60 días en el futuro. */
export function startDateError(text: string | null | undefined, today: string): string | null {
  if (!text || !text.trim()) return null;
  const iso = parseDateInput(text);
  if (!iso) return 'Fecha inválida';
  if (iso < '2000-01-01') return 'Revisa el año de inicio';
  const [y, m, d] = today.split('-').map(Number);
  const limit = new Date(Date.UTC(y, m - 1, d + 60)).toISOString().slice(0, 10);
  if (iso > limit) return 'No puede ser más de 60 días en el futuro';
  return null;
}

/** Estatura: si la escriben en metros (1.75) se pasa a centímetros. */
export function normalizeHeight(v: number | undefined): number | undefined {
  if (v === undefined || Number.isNaN(v)) return v;
  return v > 0 && v < 3 ? Math.round(v * 100) : v;
}

/**
 * Próximo pago sugerido para un socio según su fecha de inscripción:
 *  - Se inscribe hoy (o en el futuro): ese mismo día.
 *  - Viene de otra plataforma: su próximo aniversario a partir de hoy
 *    (se asume que está al día hasta entonces).
 */
export function suggestedFirstDue(startIso: string, today: string): string {
  if (startIso >= today) return startIso;
  const day = Number(startIso.slice(8, 10));
  const [y, m] = today.split('-').map(Number);
  const anchor = (yy: number, mm: number) => {
    const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
    return `${yy}-${String(mm).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`;
  };
  const thisMonth = anchor(y, m);
  if (thisMonth >= today) return thisMonth;
  return m === 12 ? anchor(y + 1, 1) : anchor(y, m + 1);
}

/** Primer cobro: válido, no antes de hoy - 1 año ni más de 1 año en el futuro. */
export function firstDueError(text: string | null | undefined, today: string): string | null {
  if (!text || !text.trim()) return null;
  const iso = parseDateInput(text);
  if (!iso) return 'Fecha inválida';
  const [y, m, d] = today.split('-').map(Number);
  const min = `${y - 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const max = `${y + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (iso < min || iso > max) return 'Revisa la fecha del próximo pago';
  return null;
}
