// Epley formula: weight × (1 + reps / 30)
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function calculateSessionVolume(
  sets: Array<{ actualWeight?: number | null; actualReps?: number | null }>
): number {
  return sets.reduce((sum, s) => {
    const weight = s.actualWeight ?? 0;
    const reps = s.actualReps ?? 0;
    return sum + weight * reps;
  }, 0);
}

// 0–1 ratio; clamp to 1.0
export function calculateConsistency(completed: number, scheduled: number): number {
  if (scheduled === 0) return 0;
  return Math.min(1, completed / scheduled);
}

export function summarizeWeekCompletion(
  plannedWorkouts: Array<{ weekNumber: number; isCompleted: boolean }>,
  weekNumber: number
): { completed: number; total: number; percent: number } {
  const week = plannedWorkouts.filter((pw) => pw.weekNumber === weekNumber);
  const completed = week.filter((pw) => pw.isCompleted).length;
  const total = week.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}

export function workoutScoreLabel(score: number): string {
  if (score >= 9.0) return 'Excellent';
  if (score >= 8.0) return 'Great';
  if (score >= 7.0) return 'Solid';
  if (score >= 6.0) return 'Needs Work';
  return 'Recovery Day';
}

// Consecutive days with a completed workout, counting back from today (today allowed to be empty)
export function calculateStreak(completedDates: string[]): number {
  const dateSet = new Set(completedDates);
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (dateSet.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export type ReadinessLabel = 'Ready' | 'Needs Recovery' | 'Behind Plan';

export function deriveReadiness(
  daysSinceLastWorkout: number,
  skippedThisWeek: number
): ReadinessLabel {
  if (skippedThisWeek >= 2) return 'Behind Plan';
  if (daysSinceLastWorkout >= 3) return 'Needs Recovery';
  return 'Ready';
}

export function rangeStartDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case '1w': now.setDate(now.getDate() - 7); break;
    case '1m': now.setMonth(now.getMonth() - 1); break;
    case '3m': now.setMonth(now.getMonth() - 3); break;
    case '1y': now.setFullYear(now.getFullYear() - 1); break;
    default:   return new Date(0);
  }
  return now;
}
