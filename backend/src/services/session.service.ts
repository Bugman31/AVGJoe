import { prisma } from '../utils/prisma';
import { generateWorkoutSummary } from './ai.service';
import { markPlannedWorkoutComplete } from './program.service';

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

export async function listSessions(userId: string, limit: number, offset: number) {
  const [sessions, total] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        startedAt: true,
        completedAt: true,
        plannedWorkoutId: true,
        programId: true,
        completionScore: true,
        performanceScore: true,
        preEnergyLevel: true,
        postEnergyLevel: true,
        sorenessLevel: true,
        _count: { select: { sets: true } },
        template: { select: { id: true, name: true } },
      },
    }),
    prisma.workoutSession.count({ where: { userId } }),
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

  return prisma.sessionSet.create({
    data: {
      sessionId,
      exerciseId: data.exerciseId,
      exerciseName: data.exerciseName,
      setNumber: data.setNumber,
      actualReps: data.actualReps,
      actualWeight: data.actualWeight,
      unit: data.unit ?? 'lbs',
      rpe: data.rpe,
    },
  });
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

  // Generate AI summary (synchronous, 15s timeout fallback)
  let aiSummary: string | undefined;
  let completionScore: number | undefined;
  let performanceScore: number | undefined;

  try {
    const summaryResult = await Promise.race([
      generateWorkoutSummary(userId, {
        sessionName: session.name,
        completedSets: session.sets,
        preEnergyLevel: session.preEnergyLevel ?? undefined,
        postEnergyLevel: data.postEnergyLevel,
        sorenessLevel: data.sorenessLevel,
        durationMinutes,
        notes: data.notes,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI summary timeout')), 15000)
      ),
    ]);
    aiSummary = JSON.stringify(summaryResult);
    completionScore = summaryResult.completionScore;
    performanceScore = summaryResult.performanceScore;
  } catch {
    // Fallback: no summary, generic scores
    completionScore = session.sets.length > 0 ? 75 : 0;
    performanceScore = 70;
  }

  const updated = await prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      completedAt: endTime,
      notes: data.notes,
      postEnergyLevel: data.postEnergyLevel,
      sorenessLevel: data.sorenessLevel,
      completionScore,
      performanceScore,
      aiSummary,
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
      sets: { some: { exerciseName: { equals: exerciseName, mode: 'insensitive' } } },
    },
    orderBy: { completedAt: 'desc' },
    select: {
      sets: {
        where: { exerciseName: { equals: exerciseName, mode: 'insensitive' } },
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
      exerciseName: { equals: exerciseName, mode: 'insensitive' },
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
    where: { session: { userId }, actualWeight: { not: null } },
    select: { exerciseName: true },
    distinct: ['exerciseName'],
    orderBy: { exerciseName: 'asc' },
  });
  return sets.map((s) => s.exerciseName);
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
