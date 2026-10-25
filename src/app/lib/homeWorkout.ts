/**
 * Lógica pura de la experiencia "Entrena en casa" (Fase 0):
 * cuestionario inicial, series con tiempo, progreso semanal y de nivel.
 */

// ---------------------------------------------------------------------------
// Cuestionario inicial
// ---------------------------------------------------------------------------

export interface OnboardingOption {
  value: string;
  label: string;
  hint?: string;
}

export interface OnboardingQuestion {
  key: 'goal' | 'activity_level' | 'location' | 'equipment' | 'minutes' | 'days_per_week';
  title: string;
  subtitle?: string;
  multiple?: boolean;
  options: OnboardingOption[];
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    key: 'goal',
    title: '¿Qué quieres lograr?',
    options: [
      { value: 'salud', label: 'Moverme y sentirme mejor' },
      { value: 'perder_peso', label: 'Bajar de peso' },
      { value: 'fuerza', label: 'Ganar fuerza' },
      { value: 'energia', label: 'Tener más energía' },
    ],
  },
  {
    key: 'activity_level',
    title: '¿Qué tan activo eres hoy?',
    options: [
      { value: 'sedentario', label: 'Casi no hago ejercicio' },
      { value: 'poco', label: 'Camino o me muevo a veces' },
      { value: 'activo', label: 'Entreno con frecuencia' },
    ],
  },
  {
    key: 'location',
    title: '¿Dónde vas a entrenar?',
    options: [
      { value: 'casa', label: 'En casa' },
      { value: 'gym', label: 'En un gimnasio' },
      { value: 'ambos', label: 'En los dos' },
    ],
  },
  {
    key: 'equipment',
    title: '¿Qué tienes a mano?',
    subtitle: 'Puedes elegir varias',
    multiple: true,
    options: [
      { value: 'ninguno', label: 'Nada, solo mi cuerpo' },
      { value: 'mancuernas', label: 'Mancuernas' },
      { value: 'bandas', label: 'Bandas elásticas' },
      { value: 'colchoneta', label: 'Colchoneta' },
    ],
  },
  {
    key: 'minutes',
    title: '¿Cuánto tiempo tienes por sesión?',
    options: [
      { value: '10', label: '10 minutos' },
      { value: '20', label: '20 minutos' },
      { value: '30', label: '30 minutos' },
      { value: '45', label: '45 minutos o más' },
    ],
  },
  {
    key: 'days_per_week',
    title: '¿Cuántos días a la semana?',
    subtitle: 'Esta será tu meta semanal',
    options: [
      { value: '2', label: '2 días' },
      { value: '3', label: '3 días', hint: 'Recomendado para empezar' },
      { value: '4', label: '4 días' },
      { value: '5', label: '5 días' },
    ],
  },
];

export type OnboardingAnswers = Partial<Record<OnboardingQuestion['key'], string | string[]>>;

/** ¿Tiene respuesta válida la pregunta? */
export function isAnswered(q: OnboardingQuestion, answers: OnboardingAnswers): boolean {
  const a = answers[q.key];
  if (q.multiple) return Array.isArray(a) && a.length > 0;
  return typeof a === 'string' && q.options.some((o) => o.value === a);
}

/** Alterna una opción en una pregunta de varias respuestas ("Nada" excluye a las demás). */
export function toggleMulti(current: string[] | undefined, value: string, exclusive = 'ninguno'): string[] {
  const list = current ?? [];
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (value === exclusive) return [exclusive];
  return [...list.filter((v) => v !== exclusive), value];
}

/** Respuestas -> lo que guarda complete_onboarding(p_profile, p_weekly_goal). */
export function buildOnboardingPayload(answers: OnboardingAnswers): { profile: Record<string, unknown>; weeklyGoal: number } {
  const days = Number(answers.days_per_week);
  const weeklyGoal = Number.isInteger(days) && days >= 1 && days <= 7 ? days : 3;
  const equipment = Array.isArray(answers.equipment) ? answers.equipment.filter((e) => e !== 'ninguno') : [];
  const minutes = Number(answers.minutes);
  return {
    profile: {
      goal: answers.goal ?? null,
      activity_level: answers.activity_level ?? null,
      location: answers.location ?? 'casa',
      equipment,
      minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      days_per_week: weeklyGoal,
    },
    weeklyGoal,
  };
}

// ---------------------------------------------------------------------------
// Ejercicios
// ---------------------------------------------------------------------------

/** "30 s", "45 seg", "1 min" -> segundos. Repeticiones ("10", "8 por lado") -> null. */
export function timedSeconds(reps: string | null | undefined): number | null {
  if (!reps) return null;
  const m = reps.trim().toLowerCase().match(/^(\d+(?:[.,]\d+)?)\s*(s|seg|segs|segundos?|min|mins|minutos?)\b/);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  const secs = m[2].startsWith('m') ? n * 60 : n;
  return secs > 0 ? Math.round(secs) : null;
}

/** 75 -> "1:15", 30 -> "0:30" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Texto de la prescripción: "2 × 10", "1 × 30 s por lado". */
export function prescription(sets: number, reps: string): string {
  return `${sets} × ${reps}`;
}

/** Mínimo de ejercicios para que la sesión cuente (60 %, igual que finish_workout). */
export function minExercisesToComplete(planned: number): number {
  return planned > 0 ? Math.ceil(planned * 0.6) : 0;
}

/** Hora local "HH:MM:SS" para workout_sessions.start_time. */
export function localTime(d = new Date()): string {
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}

// ---------------------------------------------------------------------------
// Progreso
// ---------------------------------------------------------------------------

export function percent(value: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

export function weekLabel(done: number, goal: number): string {
  if (done >= goal) return `¡Meta cumplida! ${done} de ${goal} esta semana`;
  const left = goal - done;
  return `${done} de ${goal} esta semana · ${left === 1 ? 'te falta 1' : `te faltan ${left}`}`;
}

export function streakLabel(weeks: number): string {
  if (weeks <= 0) return 'Cumple tu meta semanal para empezar una racha';
  return weeks === 1 ? '1 semana cumpliendo tu meta' : `${weeks} semanas seguidas cumpliendo tu meta`;
}

export function greeting(name: string | undefined, d = new Date()): string {
  const h = d.getHours();
  const part = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

// ---------------------------------------------------------------------------
// Registro de series con peso
// ---------------------------------------------------------------------------

/** Equipos con los que no se anota peso. */
const NO_WEIGHT_EQUIPMENT = ['body weight', 'assisted', 'stability ball', 'roller', 'wheel roller', 'band', 'resistance band', 'bosu ball'];

/** ¿Se anota peso y repeticiones? (con pesas o máquinas y por repeticiones, no por tiempo). */
export function isWeighted(equipment: string | null | undefined, reps: string | null | undefined): boolean {
  if (!equipment || timedSeconds(reps) !== null) return false;
  return !NO_WEIGHT_EQUIPMENT.includes(equipment.trim().toLowerCase());
}

/** "10" -> 10, "8-12" -> 8, "8 por lado" -> 8; sin número -> null */
export function repsNumber(reps: string | null | undefined): number | null {
  const m = (reps ?? '').match(/\d+/);
  return m ? Number(m[0]) : null;
}

export interface SetValues {
  reps: number | null;
  weight: number | null;
}

/**
 * Valores propuestos para la serie `n` (1..): los de esa misma serie la última
 * vez; si no, los de la última serie anterior; si no, las repeticiones indicadas.
 */
export function suggestedSet(n: number, last: { set_number: number; reps: number | null; weight: number | null }[] | undefined, prescribed: string): SetValues {
  const same = last?.find((s) => s.set_number === n);
  const prev = last && last.length ? [...last].sort((a, b) => b.set_number - a.set_number).find((s) => s.set_number <= n) ?? last[last.length - 1] : undefined;
  const src = same ?? prev;
  return { reps: src?.reps ?? repsNumber(prescribed), weight: src?.weight ?? null };
}

/** "12,5" -> 12.5; vacío o inválido -> null; fuera de rango -> null */
export function parseWeight(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 1000 ? Math.round(n * 100) / 100 : null;
}
