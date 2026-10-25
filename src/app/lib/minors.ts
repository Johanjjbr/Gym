/**
 * Socios menores de edad: cálculo de edad y si les falta el representante.
 * Misma regla que is_minor() en la base: menos de 18 años cumplidos.
 */
import { ageOn, parseDateInput } from './memberFields';

export const ADULT_AGE = 18;

/** yyyy-MM-dd de hoy en hora local. */
export function todayIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** true/false si se conoce la fecha (AAAA-MM-DD o DD/MM/AAAA); null si no. */
export function isMinor(birth: string | null | undefined, today = todayIso()): boolean | null {
  if (!birth) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.test(birth) ? birth.slice(0, 10) : parseDateInput(birth);
  if (!iso || iso > today) return null;
  return ageOn(iso, today) < ADULT_AGE;
}

export interface GuardianFields {
  guardian_name?: string | null;
  guardian_cedula?: string | null;
  guardian_phone?: string | null;
  guardian_relationship?: string | null;
}

export function hasGuardian(u: GuardianFields): boolean {
  return [u.guardian_name, u.guardian_cedula, u.guardian_phone, u.guardian_relationship].every((v) => !!v && v.trim() !== '');
}

/** Menor de un gimnasio sin representante completo. */
export function missingGuardian(u: GuardianFields & { birth_date?: string | null }, today = todayIso()): boolean {
  return isMinor(u.birth_date, today) === true && !hasGuardian(u);
}

export const GUARDIAN_RELATIONSHIPS = ['Madre', 'Padre', 'Tutor legal', 'Abuelo/a', 'Otro'] as const;
