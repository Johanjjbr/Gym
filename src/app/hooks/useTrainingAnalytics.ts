import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

function estimate1rm(weight: number, reps: number): number {
  if (!weight || !reps || reps < 1) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + Math.min(reps, 12) / 30) * 10) / 10;
}

export interface StrengthPoint {
  date: string;
  weight: number;
  reps: number;
  estimated_1rm: number;
  volume: number;
}

export interface ExerciseStrength {
  exercise_name: string;
  data: StrengthPoint[];
  best_weight: number;
  best_reps: number;
  best_1rm: number;
  latest_weight: number;
  latest_reps: number;
  latest_1rm: number;
}

export interface WeeklyVolume {
  week_start: string;
  session_count: number;
  total_volume: number;
  total_exercises: number;
}

export interface TrainingAnalytics {
  strengthByExercise: ExerciseStrength[];
  weeklyVolume: WeeklyVolume[];
  exerciseNames: string[];
  currentWeekSessions: number;
  currentWeekExercises: number;
  currentWeekVolume: number;
  streakDays: number;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStart(dateStr: string): string {
  return getMonday(new Date(dateStr)).toISOString().split('T')[0];
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateStreak(allSessionDates: string[]): number {
  const unique = [...new Set(allSessionDates.map(d => d.split('T')[0]))]
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  if (unique.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = daysBetween(unique[0], today);
  if (diff > 1) return 0;

  let streak = 1;
  for (let i = 0; i < unique.length - 1; i++) {
    const gap = daysBetween(unique[i + 1], unique[i]);
    if (gap === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function useTrainingAnalytics(userId: string) {
  return useQuery<TrainingAnalytics>({
    queryKey: ['trainingAnalytics', userId],
    queryFn: async () => {
      const { data: rawData, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          date,
          workout_exercise_logs (
            exercise_name,
            set_logs (
              weight,
              reps
            )
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) throw error;

      if (!rawData || rawData.length === 0) {
        return {
          strengthByExercise: [],
          weeklyVolume: [],
          exerciseNames: [],
          currentWeekSessions: 0,
          currentWeekExercises: 0,
          currentWeekVolume: 0,
          streakDays: 0,
        };
      }

      const allSessionDates: string[] = [];
      const volumeByWeek = new Map<string, { sessions: Set<string>; volume: number; exercises: Set<string> }>();
      const strengthMap = new Map<string, StrengthPoint[]>();

      for (const session of rawData as any[]) {
        const sessionDate = session.date as string;
        const sessionId = session.id as string;
        const weekStart = getWeekStart(sessionDate);

        allSessionDates.push(sessionDate);

        if (!volumeByWeek.has(weekStart)) {
          volumeByWeek.set(weekStart, { sessions: new Set(), volume: 0, exercises: new Set() });
        }
        volumeByWeek.get(weekStart)!.sessions.add(sessionId);

        const exerciseLogs = session.workout_exercise_logs || [];

        for (const log of exerciseLogs) {
          const exerciseName = log.exercise_name as string;
          if (!exerciseName) continue;

          volumeByWeek.get(weekStart)!.exercises.add(exerciseName);

          const setLogs = log.set_logs || [];
          let sessionWeight = 0;
          let sessionReps = 0;
          let sessionVolume = 0;

          for (const set of setLogs) {
            const w = Number(set.weight) || 0;
            const r = Number(set.reps) || 0;

            if (w > 0) {
              sessionVolume += w * r;
              if (w > sessionWeight) {
                sessionWeight = w;
                sessionReps = r;
              }
            }
          }

          if (sessionWeight <= 0) continue;

          if (!strengthMap.has(exerciseName)) {
            strengthMap.set(exerciseName, []);
          }

          volumeByWeek.get(weekStart)!.volume += sessionVolume;

          const points = strengthMap.get(exerciseName)!;
          const existingIndex = points.findIndex(p => p.date === sessionDate.split('T')[0]);

          if (existingIndex >= 0) {
            const existing = points[existingIndex];
            if (sessionWeight > existing.weight) {
              existing.weight = sessionWeight;
              existing.reps = sessionReps;
              existing.estimated_1rm = estimate1rm(sessionWeight, sessionReps);
            }
            existing.volume += sessionVolume;
          } else {
            points.push({
              date: sessionDate.split('T')[0],
              weight: sessionWeight,
              reps: sessionReps,
              estimated_1rm: estimate1rm(sessionWeight, sessionReps),
              volume: sessionVolume,
            });
          }
        }
      }

      const strengthByExercise: ExerciseStrength[] = [];

      for (const [exerciseName, points] of strengthMap.entries()) {
        points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let bestWeight = 0;
        let bestReps = 0;
        let best1rm = 0;

        for (const p of points) {
          if (p.weight > bestWeight) bestWeight = p.weight;
          if (p.reps > bestReps) bestReps = p.reps;
          if (p.estimated_1rm > best1rm) best1rm = p.estimated_1rm;
        }

        const latest = points[points.length - 1];

        strengthByExercise.push({
          exercise_name: exerciseName,
          data: points,
          best_weight: bestWeight,
          best_reps: bestReps,
          best_1rm: best1rm,
          latest_weight: latest.weight,
          latest_reps: latest.reps,
          latest_1rm: latest.estimated_1rm,
        });
      }

      const weeklyVolume: WeeklyVolume[] = [];

      for (const [weekStart, data] of volumeByWeek.entries()) {
        weeklyVolume.push({
          week_start: weekStart,
          session_count: data.sessions.size,
          total_volume: Math.round(data.volume * 100) / 100,
          total_exercises: data.exercises.size,
        });
      }

      weeklyVolume.sort((a, b) => a.week_start.localeCompare(b.week_start));

      const currentWeekStart = getWeekStart(new Date().toISOString());
      const currentWeek = volumeByWeek.get(currentWeekStart);

      return {
        strengthByExercise: strengthByExercise.sort((a, b) => a.exercise_name.localeCompare(b.exercise_name)),
        weeklyVolume,
        exerciseNames: strengthByExercise.map(s => s.exercise_name).sort(),
        currentWeekSessions: currentWeek?.sessions.size || 0,
        currentWeekExercises: currentWeek?.exercises.size || 0,
        currentWeekVolume: currentWeek?.volume || 0,
        streakDays: calculateStreak(allSessionDates),
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
}
