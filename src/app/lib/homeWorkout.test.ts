import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_QUESTIONS, buildOnboardingPayload, formatClock, greeting, isAnswered, localTime,
  minExercisesToComplete, percent, streakLabel, timedSeconds, toggleMulti, weekLabel,
  isWeighted, parseWeight, repsNumber, suggestedSet,
} from './homeWorkout';

describe('cuestionario inicial', () => {
  it('tiene 6 preguntas', () => {
    expect(ONBOARDING_QUESTIONS).toHaveLength(6);
  });

  it('valida respuestas simples y múltiples', () => {
    const goal = ONBOARDING_QUESTIONS[0];
    const equip = ONBOARDING_QUESTIONS.find((q) => q.multiple)!;
    expect(isAnswered(goal, {})).toBe(false);
    expect(isAnswered(goal, { goal: 'salud' })).toBe(true);
    expect(isAnswered(goal, { goal: 'otra' })).toBe(false);
    expect(isAnswered(equip, { equipment: [] })).toBe(false);
    expect(isAnswered(equip, { equipment: ['bandas'] })).toBe(true);
  });

  it('"Nada" excluye al resto del equipo', () => {
    expect(toggleMulti(['bandas'], 'ninguno')).toEqual(['ninguno']);
    expect(toggleMulti(['ninguno'], 'bandas')).toEqual(['bandas']);
    expect(toggleMulti(['bandas', 'mancuernas'], 'bandas')).toEqual(['mancuernas']);
  });

  it('arma lo que se guarda y la meta semanal', () => {
    const p = buildOnboardingPayload({ goal: 'salud', location: 'casa', equipment: ['ninguno'], minutes: '20', days_per_week: '3' });
    expect(p.weeklyGoal).toBe(3);
    expect(p.profile).toEqual({ goal: 'salud', activity_level: null, location: 'casa', equipment: [], minutes: 20, days_per_week: 3 });
    expect(buildOnboardingPayload({ days_per_week: '9' }).weeklyGoal).toBe(3);
  });
});

describe('ejercicios', () => {
  it('detecta series por tiempo', () => {
    expect(timedSeconds('30 s')).toBe(30);
    expect(timedSeconds('30 s por lado')).toBe(30);
    expect(timedSeconds('45 seg')).toBe(45);
    expect(timedSeconds('1 min')).toBe(60);
    expect(timedSeconds('10')).toBeNull();
    expect(timedSeconds('8 por lado')).toBeNull();
    expect(timedSeconds(null)).toBeNull();
  });

  it('formatea el reloj', () => {
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(30)).toBe('0:30');
    expect(formatClock(-3)).toBe('0:00');
    expect(formatClock(4.2)).toBe('0:05');
  });

  it('60 % de los ejercicios para completar', () => {
    expect(minExercisesToComplete(6)).toBe(4);
    expect(minExercisesToComplete(5)).toBe(3);
    expect(minExercisesToComplete(0)).toBe(0);
  });

  it('hora local con ceros', () => {
    expect(localTime(new Date(2026, 0, 1, 7, 5, 9))).toBe('07:05:09');
  });
});

describe('progreso', () => {
  it('porcentajes acotados', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(5, 3)).toBe(100);
    expect(percent(1, 0)).toBe(0);
  });
  it('textos de semana y racha', () => {
    expect(weekLabel(1, 3)).toBe('1 de 3 esta semana · te faltan 2');
    expect(weekLabel(2, 3)).toContain('te falta 1');
    expect(weekLabel(3, 3)).toContain('Meta cumplida');
    expect(streakLabel(0)).toContain('empezar');
    expect(streakLabel(1)).toBe('1 semana cumpliendo tu meta');
    expect(streakLabel(4)).toContain('4 semanas');
  });
  it('saludo según la hora', () => {
    expect(greeting('Ana María', new Date(2026, 0, 1, 9))).toBe('Buenos días, Ana');
    expect(greeting(undefined, new Date(2026, 0, 1, 21))).toBe('Buenas noches');
  });
});

describe('series con peso', () => {
  it('solo con pesas o máquinas y por repeticiones', () => {
    expect(isWeighted('dumbbell', '10')).toBe(true);
    expect(isWeighted('leverage machine', '12')).toBe(true);
    expect(isWeighted('body weight', '10')).toBe(false);
    expect(isWeighted('resistance band', '10')).toBe(false);
    expect(isWeighted('dumbbell', '30 s')).toBe(false);
    expect(isWeighted(null, '10')).toBe(false);
  });
  it('repeticiones indicadas', () => {
    expect(repsNumber('8-12')).toBe(8);
    expect(repsNumber('10 por lado')).toBe(10);
    expect(repsNumber('al fallo')).toBeNull();
  });
  it('propone lo de la última vez', () => {
    const last = [{ set_number: 1, reps: 10, weight: 20 }, { set_number: 2, reps: 8, weight: 22.5 }];
    expect(suggestedSet(1, last, '12')).toEqual({ reps: 10, weight: 20 });
    expect(suggestedSet(3, last, '12')).toEqual({ reps: 8, weight: 22.5 });
    expect(suggestedSet(1, undefined, '12')).toEqual({ reps: 12, weight: null });
  });
  it('lee el peso con coma o punto', () => {
    expect(parseWeight('12,5')).toBe(12.5);
    expect(parseWeight('')).toBeNull();
    expect(parseWeight('abc')).toBeNull();
    expect(parseWeight('-3')).toBeNull();
  });
});
