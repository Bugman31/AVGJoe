import { prisma } from '../utils/prisma';
import { markPlannedWorkoutComplete } from './program.service';
import { recommend, type SetRecommendation } from './progression.service';

interface StartSessionData {
  templateId?: string;
  plannedWorkoutId?: string;
  programId?: string;
  name: string;
  preEnergyLevel?: number;
  startedAt?: string;
}

interface LogSetData {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  actualReps?: number;
  actualWeight?: number;
  unit?: string;
  rpe?: number;
  targetRepMin?: number;
  targetRepMax?: number;
  progressionType?: 'strength' | 'hypertrophy' | 'conditioning';
}

interface CompleteSessionData {
  notes?: string;
  postEnergyLevel?: number;
  sorenessLevel?: number;
}

interface ProgressPoint {
  date: string;
  maxWeight: number;
  totalVolume: number;
  reps: number;
  isPR: boolean;
}

const SESSION_RUNTIME_TEMPLATE_SOURCE = 'session_runtime';
const CUID_REGEX = /^c[^\s-]{8,}$/i;

function looksLikeCuid(value: string) {
  return CUID_REGEX.test(value);
}

async function ensureRuntimeTemplateId(session: {
  id: string;
  userId: string;
  templateId: string | null;
  name: string;
}) {
  if (session.templateId) return session.templateId;

  const runtimeTemplate = await prisma.workoutTemplate.create({
    data: {
      userId: session.userId,
      name: `${session.name} Runtime`,
      description: 'Hidden runtime template for active workout logging.',
      source: SESSION_RUNTIME_TEMPLATE_SOURCE,
    },
    select: { id: true },
  });

  await prisma.workoutSession.update({
    where: { id: session.id },
    data: { templateId: runtimeTemplate.id },
  });

  return runtimeTemplate.id;
}

async function resolveExerciseIdForSession(
  session: {
    id: string;
    userId: string;
    templateId: string | null;
    name: string;
  },
  data: LogSetData
) {
  if (looksLikeCuid(data.exerciseId)) {
    const existing = await prisma.exercise.findFirst({
      where: { id: data.exerciseId },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  const templateId = await ensureRuntimeTemplateId(session);
  const existingByName = await prisma.exercise.findFirst({
    where: {
      templateId,
      name: data.exerciseName,
    },
    select: { id: true },
  });

  if (existingByName) return existingByName.id;

  const orderIndex = await prisma.exercise.count({ where: { templateId } });
  const created = await prisma.exercise.create({
    data: {
      templateId,
      name: data.exerciseName,
      orderIndex,
    },
    select: { id: true },
  });

  return created.id;
}

export async function startSession(userId: string, data: StartSessionData) {
  return prisma.workoutSession.create({
    data: {
      userId,
      templateId: data.templateId,
      plannedWorkoutId: data.plannedWorkoutId,
      programId: data.programId,
      name: data.name,
      preEnergyLevel: data.preEnergyLevel,
      startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
    },
  });
}

export async function listSessions(
  userId: string,
  limit: number,
  offset: number,
  includeSets = false,
  from?: string,
  to?: string
) {
  const dateFilter =
    from || to
      ? {
          completedAt: {
            not: null as null,
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {};

  const whereClause = { userId, ...dateFilter };

  const [sessions, total] = await Promise.all([
    prisma.workoutSession.findMany({
      where: whereClause,
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        templateId: true,
        name: true,
        startedAt: true,
        completedAt: true,
        plannedWorkoutId: true,
        programId: true,
        notes: true,
        completionScore: true,
        performanceScore: true,
        workoutScore: true,
        scoreLabel: true,
        preEnergyLevel: true,
        postEnergyLevel: true,
        sorenessLevel: true,
        _count: { select: { sets: true } },
        ...(includeSets
          ? {
              sets: {
                orderBy: [{ exerciseName: 'asc' }, { setNumber: 'asc' }],
                select: {
                  id: true,
                  sessionId: true,
                  exerciseId: true,
                  exerciseName: true,
                  setNumber: true,
                  actualReps: true,
                  actualWeight: true,
                  unit: true,
                  rpe: true,
                  completedAt: true,
                },
              },
            }
          : {}),
        template: { select: { id: true, name: true } },
      },
    }),
    prisma.workoutSession.count({ where: whereClause }),
  ]);

  return { sessions, total, limit, offset };
}

export async function getSession(id: string, userId: string) {
  const session = await prisma.workoutSession.findFirst({
    where: { id, userId },
    include: {
      sets: {
        orderBy: [{ exerciseName: 'asc' }, { setNumber: 'asc' }],
      },
      template: { select: { id: true, name: true } },
    },
  });

  if (!session) {
    const err = new Error('Session not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  return session;
}

export async function logSet(sessionId: string, userId: string, data: LogSetData) {
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      id: true,
      userId: true,
      name: true,
      templateId: true,
      completedAt: true,
    },
  });

  if (!session) {
    const err = new Error('Session not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  if (session.completedAt) {
    const err = new Error('Session already completed') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  const resolvedExerciseId = await resolveExerciseIdForSession(session, data);

  const set = await prisma.sessionSet.create({
    data: {
      sessionId,
      exerciseId: resolvedExerciseId,
      exerciseName: data.exerciseName,
      setNumber: data.setNumber,
      actualReps: data.actualReps,
      actualWeight: data.actualWeight,
      unit: data.unit ?? 'lbs',
      rpe: data.rpe,
    },
  });

  const recommendation: SetRecommendation = recommend({
    exerciseName: data.exerciseName,
    actualWeight: data.actualWeight,
    actualReps: data.actualReps,
    rpe: data.rpe,
    targetRepMin: data.targetRepMin,
    targetRepMax: data.targetRepMax,
    progressionType: data.progressionType,
  });

  return { set, recommendation };
}

interface SetForScoring {
  actualReps?: number | null;
  rpe?: number | null;
}

function computeWorkoutScore(sets: SetForScoring[]): { workoutScore: number; scoreLabel: string } {
  const setsWithReps = sets.filter((s) => s.actualReps != null && s.actualReps > 0);

  // completionScore: did you log reps for all sets?
  const completionScore = sets.length === 0 ? 10 : (setsWithReps.length / sets.length) * 10;

  // performanceScore: no target data for MVP → neutral 7.5
  const performanceScore = 7.5;

  // effortScore: based on RPE
  const setsWithRpe = sets.filter((s) => s.rpe != null);
  let effortScore: number;
  if (setsWithRpe.length === 0) {
    effortScore = 7;
  } else {
    const total = setsWithRpe.reduce((sum, s) => {
      const rpe = s.rpe!;
      if (rpe >= 6 && rpe <= 9) return sum + 10;
      if (rpe === 5 || rpe === 10) return sum + 7;
      return sum + 5;
    }, 0);
    effortScore = total / setsWithRpe.length;
  }

  const restScore = 7;

  const raw =
    completionScore * 0.4 +
    performanceScore * 0.3 +
    effortScore * 0.2 +
    restScore * 0.1;

  const workoutScore = Math.min(10, Math.max(0, raw));

  let scoreLabel: string;
  if (workoutScore >= 9.0) scoreLabel = 'Excellent';
  else if (workoutScore >= 8.0) scoreLabel = 'Great';
  else if (workoutScore >= 7.0) scoreLabel = 'Solid';
  else if (workoutScore >= 6.0) scoreLabel = 'Needs Work';
  else scoreLabel = 'Recovery Day';

  return { workoutScore, scoreLabel };
}

export async function completeSession(sessionId: string, userId: string, data: CompleteSessionData = {}) {
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      sets: {
        select: {
          exerciseName: true,
          setNumber: true,
          actualReps: true,
          actualWeight: true,
          rpe: true,
          unit: true,
        },
      },
    },
  });

  if (!session) {
    const err = new Error('Session not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  if (session.completedAt) {
    const err = new Error('Session already completed') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  const endTime = new Date();
  const durationMinutes = Math.round((endTime.getTime() - session.startedAt.getTime()) / 60000);

  const { workoutScore, scoreLabel } = computeWorkoutScore(session.sets);
  const completionScore = session.sets.length > 0 ? 75 : 0;
  const performanceScore = 70;

  const updated = await prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      completedAt: endTime,
      notes: data.notes,
      postEnergyLevel: data.postEnergyLevel,
      sorenessLevel: data.sorenessLevel,
      completionScore,
      performanceScore,
      workoutScore,
      scoreLabel,
    },
    include: {
      _count: { select: { sets: true } },
    },
  });

  // Mark the planned workout as complete if linked
  if (session.plannedWorkoutId) {
    await markPlannedWorkoutComplete(session.plannedWorkoutId, sessionId).catch(() => {});
  }

  return updated;
}

/**
 * Returns the sets logged for a given exercise name in the most recent
 * completed session that included that exercise (excluding the current session).
 */
export async function deleteSession(id: string, userId: string): Promise<void> {
  const session = await prisma.workoutSession.findFirst({ where: { id, userId } });
  if (!session) {
    const err = new Error('Session not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  await prisma.workoutSession.delete({ where: { id } });
}

export async function getLastExerciseData(
  userId: string,
  exerciseName: string,
  excludeSessionId?: string
): Promise<{ setNumber: number; actualReps: number | null; actualWeight: number | null; unit: string }[]> {
  // Find the most recent completed session (other than the current one) that has this exercise
  const session = await prisma.workoutSession.findFirst({
    where: {
      userId,
      completedAt: { not: null },
      ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      sets: { some: { exerciseName: { equals: exerciseName } } },
    },
    orderBy: { completedAt: 'desc' },
    select: {
      sets: {
        where: { exerciseName: { equals: exerciseName } },
        orderBy: { setNumber: 'asc' },
        select: { setNumber: true, actualReps: true, actualWeight: true, unit: true },
      },
    },
  });
  return session?.sets ?? [];
}

export async function getProgressByName(
  exerciseName: string,
  userId: string,
  weeks: number
): Promise<ProgressPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const sets = await prisma.sessionSet.findMany({
    where: {
      exerciseName: { equals: exerciseName },
      completedAt: { gte: since },
      session: { userId },
      actualWeight: { not: null },
    },
    orderBy: { completedAt: 'asc' },
    select: { actualWeight: true, actualReps: true, completedAt: true },
  });

  const byDate = new Map<string, { maxWeight: number; totalVolume: number; reps: number }>();
  for (const set of sets) {
    const date = set.completedAt.toISOString().slice(0, 10);
    const weight = set.actualWeight ?? 0;
    const reps = set.actualReps ?? 0;
    const existing = byDate.get(date);
    if (existing) {
      existing.maxWeight = Math.max(existing.maxWeight, weight);
      existing.totalVolume += weight * reps;
      existing.reps = Math.max(existing.reps, reps);
    } else {
      byDate.set(date, { maxWeight: weight, totalVolume: weight * reps, reps });
    }
  }

  let allTimePR = 0;
  const result: ProgressPoint[] = [];
  for (const [date, stats] of byDate) {
    const isPR = stats.maxWeight > allTimePR;
    if (isPR) allTimePR = stats.maxWeight;
    result.push({ date, maxWeight: stats.maxWeight, totalVolume: stats.totalVolume, reps: stats.reps, isPR });
  }
  return result;
}

export async function getLoggedExerciseNames(userId: string): Promise<string[]> {
  const sets = await prisma.sessionSet.findMany({
    where: { session: { userId } },
    select: { exerciseName: true },
    distinct: ['exerciseName'],
    orderBy: { exerciseName: 'asc' },
  });
  return sets.map((s) => s.exerciseName);
}

export interface ExerciseHistorySet {
  setNumber: number;
  actualReps: number | null;
  actualWeight: number | null;
  unit: string;
}

export interface ExerciseHistoryEntry {
  sessionId: string;
  sessionName: string;
  completedAt: string;
  sets: ExerciseHistorySet[];
}

export async function getExerciseHistory(
  exerciseName: string,
  userId: string
): Promise<ExerciseHistoryEntry[]> {
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      completedAt: { not: null },
      sets: { some: { exerciseName } },
    },
    orderBy: { completedAt: 'desc' },
    take: 30,
    select: {
      id: true,
      name: true,
      completedAt: true,
      sets: {
        where: { exerciseName },
        orderBy: { setNumber: 'asc' },
        select: {
          setNumber: true,
          actualReps: true,
          actualWeight: true,
          unit: true,
        },
      },
    },
  });

  return sessions.map((s) => ({
    sessionId: s.id,
    sessionName: s.name,
    completedAt: s.completedAt!.toISOString(),
    sets: s.sets,
  }));
}

export async function getProgress(
  exerciseId: string,
  userId: string,
  weeks: number
): Promise<ProgressPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const sets = await prisma.sessionSet.findMany({
    where: {
      exerciseId,
      completedAt: { gte: since },
      session: { userId },
      actualWeight: { not: null },
    },
    orderBy: { completedAt: 'asc' },
    select: {
      actualWeight: true,
      actualReps: true,
      completedAt: true,
    },
  });

  const byDate = new Map<string, { maxWeight: number; totalVolume: number; reps: number }>();

  for (const set of sets) {
    const date = set.completedAt.toISOString().slice(0, 10);
    const weight = set.actualWeight ?? 0;
    const reps = set.actualReps ?? 0;
    const volume = weight * reps;

    const existing = byDate.get(date);
    if (existing) {
      existing.maxWeight = Math.max(existing.maxWeight, weight);
      existing.totalVolume += volume;
      existing.reps = Math.max(existing.reps, reps);
    } else {
      byDate.set(date, { maxWeight: weight, totalVolume: volume, reps });
    }
  }

  let allTimePR = 0;
  const result: ProgressPoint[] = [];

  for (const [date, stats] of byDate) {
    const isPR = stats.maxWeight > allTimePR;
    if (isPR) allTimePR = stats.maxWeight;
    result.push({ date, maxWeight: stats.maxWeight, totalVolume: stats.totalVolume, reps: stats.reps, isPR });
  }

  return result;
}
