import { prisma } from '../utils/prisma';

interface StartSessionData {
  templateId?: string;
  name: string;
}

interface LogSetData {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  actualReps?: number;
  actualWeight?: number;
  unit?: string;
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
      name: data.name,
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
      include: {
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
  // Verify session ownership
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
      unit: data.unit ?? 'kg',
    },
  });
}

export async function completeSession(
  sessionId: string,
  userId: string,
  notes?: string
) {
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

  return prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      completedAt: new Date(),
      ...(notes !== undefined && { notes }),
    },
    include: {
      _count: { select: { sets: true } },
    },
  });
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

  // Group by date (YYYY-MM-DD)
  const byDate = new Map<
    string,
    { maxWeight: number; totalVolume: number; reps: number }
  >();

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

    result.push({
      date,
      maxWeight: stats.maxWeight,
      totalVolume: stats.totalVolume,
      reps: stats.reps,
      isPR,
    });
  }

  return result;
}
