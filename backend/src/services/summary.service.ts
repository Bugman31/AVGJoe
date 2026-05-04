import { prisma } from '../utils/prisma';
import { ensurePlannedWorkoutsForProgram } from './program.service';
import {
  calculateEstimated1RM,
  calculateSessionVolume,
  calculateConsistency,
  summarizeWeekCompletion,
  calculateStreak,
  deriveReadiness,
  rangeStartDate,
} from '../utils/metrics';

// ─── Dashboard Summary ────────────────────────────────────────────────────────

export interface NextWorkoutSummary {
  id: string;
  name: string;
  focus: string | null;
  estimatedDuration: number | null;
  dayOfWeek: string;
  exerciseCount: number;
}

export interface WeekDayStatus {
  dayOfWeek: string;
  isCompleted: boolean;
}

export interface ActiveProgramSummary {
  id: string;
  name: string;
  currentWeek: number;
  totalWeeks: number;
  progressPercent: number;
  nextWorkout: NextWorkoutSummary | null;
  weekAdherence: { completed: number; total: number; percent: number };
  weekDays: WeekDayStatus[];
}

export interface RecentSessionSummary {
  id: string;
  name: string;
  completedAt: string;
  workoutScore: number | null;
  scoreLabel: string | null;
  setCount: number;
  totalVolume: number;
}

export interface ReadinessSummary {
  label: 'Ready' | 'Needs Recovery' | 'Behind Plan';
  daysSinceLast: number;
}

export interface InProgressSession {
  id: string;
  name: string;
}

export interface DashboardSummary {
  activeProgram: ActiveProgramSummary | null;
  streak: number;
  readiness: ReadinessSummary;
  recentSessions: RecentSessionSummary[];
  inProgressSession: InProgressSession | null;
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  let [program, sessions, inProgressRaw] = await Promise.all([
    prisma.program.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        plannedWorkouts: { orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }] },
      },
    }),
    prisma.workoutSession.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: { _count: { select: { sets: true } } },
    }),
    prisma.workoutSession.findFirst({
      where: { userId, completedAt: null },
      orderBy: { startedAt: 'desc' },
      select: { id: true, name: true },
    }),
  ]);

  if (program) {
    const repaired = await ensurePlannedWorkoutsForProgram(program);
    if (repaired) {
      program = await prisma.program.findFirst({
        where: { userId, status: 'active' },
        orderBy: { createdAt: 'desc' },
        include: {
          plannedWorkouts: { orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }] },
        },
      });
    }
  }

  // Streak
  const completedDates = sessions.map((s) =>
    s.completedAt!.toISOString().slice(0, 10)
  );
  const streak = calculateStreak(completedDates);

  // Readiness
  const lastSession = sessions[0] ?? null;
  const daysSinceLast = lastSession
    ? Math.floor((Date.now() - lastSession.completedAt!.getTime()) / 86_400_000)
    : 999;

  const skippedThisWeek = program
    ? (() => {
        const week = program.plannedWorkouts.filter(
          (pw) => pw.weekNumber === program.currentWeek
        );
        return week.filter((pw) => !pw.isCompleted).length;
      })()
    : 0;

  const readiness: ReadinessSummary = {
    label: deriveReadiness(daysSinceLast, skippedThisWeek),
    daysSinceLast,
  };

  // Recent sessions with volume
  const recentSessionIds = sessions.slice(0, 5).map((s) => s.id);
  const sessionSets = await prisma.sessionSet.findMany({
    where: { sessionId: { in: recentSessionIds } },
    select: { sessionId: true, actualWeight: true, actualReps: true },
  });

  const volumeBySession = new Map<string, number>();
  for (const set of sessionSets) {
    const vol = (set.actualWeight ?? 0) * (set.actualReps ?? 0);
    volumeBySession.set(set.sessionId, (volumeBySession.get(set.sessionId) ?? 0) + vol);
  }

  const recentSessions: RecentSessionSummary[] = sessions.slice(0, 5).map((s) => ({
    id: s.id,
    name: s.name,
    completedAt: s.completedAt!.toISOString(),
    workoutScore: s.workoutScore,
    scoreLabel: s.scoreLabel,
    setCount: s._count.sets,
    totalVolume: volumeBySession.get(s.id) ?? 0,
  }));

  // Active program summary
  let activeProgram: ActiveProgramSummary | null = null;
  if (program) {
    const weekAdherence = summarizeWeekCompletion(
      program.plannedWorkouts,
      program.currentWeek
    );

    const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = DAY_ORDER[new Date().getDay()];

    // Next workout: today first, otherwise next incomplete in current week, then next week
    const currentWeek = program.plannedWorkouts.filter(
      (pw) => pw.weekNumber === program.currentWeek && !pw.isCompleted
    );
    const todayPw = currentWeek.find((pw) => pw.dayOfWeek === todayName);
    const nextPw =
      todayPw ??
      currentWeek.sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek))[0] ??
      null;

    let nextWorkout: NextWorkoutSummary | null = null;
    if (nextPw) {
      const exercises = JSON.parse(nextPw.exercises as string);
      nextWorkout = {
        id: nextPw.id,
        name: nextPw.name,
        focus: nextPw.focus,
        estimatedDuration: nextPw.estimatedDuration,
        dayOfWeek: nextPw.dayOfWeek,
        exerciseCount: Array.isArray(exercises) ? exercises.length : 0,
      };
    }

    const weekDays: WeekDayStatus[] = currentWeek
      .sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek))
      .map((pw) => ({ dayOfWeek: pw.dayOfWeek, isCompleted: pw.isCompleted }));

    // Also include already-completed workouts from current week for full picture
    const allCurrentWeek = program.plannedWorkouts.filter(
      (pw) => pw.weekNumber === program.currentWeek
    );
    const allWeekDays: WeekDayStatus[] = allCurrentWeek
      .sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek))
      .map((pw) => ({ dayOfWeek: pw.dayOfWeek, isCompleted: pw.isCompleted }));

    activeProgram = {
      id: program.id,
      name: program.name,
      currentWeek: program.currentWeek,
      totalWeeks: program.totalWeeks,
      progressPercent: Math.round(((program.currentWeek - 1) / program.totalWeeks) * 100),
      nextWorkout,
      weekAdherence,
      weekDays: allWeekDays,
    };
  }

  const inProgressSession: InProgressSession | null = inProgressRaw
    ? { id: inProgressRaw.id, name: inProgressRaw.name }
    : null;

  return { activeProgram, streak, readiness, recentSessions, inProgressSession };
}

// ─── Progress Summary ─────────────────────────────────────────────────────────

export interface TopLift {
  name: string;
  estimated1RM: number;
  unit: string;
}

export interface ProgressSummary {
  range: string;
  totalWorkouts: number;
  totalVolume: number;
  avgWorkoutScore: number | null;
  consistencyScore: number;
  topLifts: TopLift[];
}

export async function getProgressSummary(
  userId: string,
  range: string
): Promise<ProgressSummary> {
  const since = rangeStartDate(range);

  const [sessions, activeProgram] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId, completedAt: { not: null, gte: since } },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        workoutScore: true,
        sets: {
          select: { actualWeight: true, actualReps: true, exerciseName: true, unit: true },
        },
      },
    }),
    prisma.program.findFirst({
      where: { userId, status: 'active' },
      select: {
        currentWeek: true,
        plannedWorkouts: { select: { weekNumber: true, isCompleted: true } },
      },
    }),
  ]);

  const totalWorkouts = sessions.length;

  const totalVolume = sessions.reduce(
    (sum, s) => sum + calculateSessionVolume(s.sets),
    0
  );

  const scored = sessions.filter((s) => s.workoutScore != null);
  const avgWorkoutScore =
    scored.length > 0
      ? scored.reduce((sum, s) => sum + s.workoutScore!, 0) / scored.length
      : null;

  // Consistency: completed / scheduled in period (use active program's current week data as proxy)
  let consistencyScore = 0;
  if (activeProgram) {
    const { completed, total } = summarizeWeekCompletion(
      activeProgram.plannedWorkouts,
      activeProgram.currentWeek
    );
    consistencyScore = calculateConsistency(completed, total);
  } else if (totalWorkouts > 0) {
    // No program: estimate based on days in range vs sessions
    const rangeDays = Math.max(
      1,
      Math.floor((Date.now() - since.getTime()) / 86_400_000)
    );
    consistencyScore = Math.min(1, totalWorkouts / Math.floor(rangeDays / 2));
  }

  // Top lifts: best estimated 1RM per exercise from sets in range
  const allSets = sessions.flatMap((s) => s.sets);
  const bestByExercise = new Map<string, { e1rm: number; unit: string }>();
  for (const set of allSets) {
    if (!set.actualWeight || !set.actualReps) continue;
    const e1rm = calculateEstimated1RM(set.actualWeight, set.actualReps);
    const existing = bestByExercise.get(set.exerciseName);
    if (!existing || e1rm > existing.e1rm) {
      bestByExercise.set(set.exerciseName, { e1rm, unit: set.unit });
    }
  }

  const topLifts: TopLift[] = Array.from(bestByExercise.entries())
    .map(([name, { e1rm, unit }]) => ({
      name,
      estimated1RM: Math.round(e1rm * 10) / 10,
      unit,
    }))
    .sort((a, b) => b.estimated1RM - a.estimated1RM)
    .slice(0, 5);

  return {
    range,
    totalWorkouts,
    totalVolume: Math.round(totalVolume),
    avgWorkoutScore: avgWorkoutScore != null ? Math.round(avgWorkoutScore * 10) / 10 : null,
    consistencyScore: Math.round(consistencyScore * 100) / 100,
    topLifts,
  };
}
