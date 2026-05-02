import { prisma } from '../utils/prisma';

function makeError(message: string, statusCode: number): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

export interface CreateSharedProgramData {
  name: string;
  description?: string;
  category?: string;
  difficulty?: string;
  durationWeeks?: number;
  daysPerWeek?: number;
  equipment?: string[];
  tags?: string[];
  workoutPlan?: Record<string, unknown>;
  price?: number;
  currency?: string;
  creatorName?: string;
  creatorAvatar?: string;
  coverImageUrl?: string;
}

export interface ListSharedProgramsOpts {
  category?: string;
  q?: string;
  difficulty?: string;
  sort?: 'popular' | 'top_rated' | 'newest' | string;
}

export interface SharedProgramRecord extends Record<string, unknown> {
  id: string;
  creatorId?: string;
  creatorName: string;
  creatorAvatar?: string | null;
  coverImageUrl?: string | null;
  name: string;
  description?: string | null;
  category: string;
  difficulty: string;
  durationWeeks: number;
  daysPerWeek: number;
  equipment: string[];
  tags: string[];
  workoutPlan: Record<string, unknown>;
  price?: number;
  currency?: string;
  ratingAverage?: number;
  enrollmentCount?: number;
  isPublished?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return (value as T) ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function serializeProgram(data: CreateSharedProgramData) {
  return {
    equipment: JSON.stringify(data.equipment ?? []),
    tags: JSON.stringify(data.tags ?? []),
    workoutPlan: JSON.stringify(data.workoutPlan ?? {}),
  };
}

function deserializeProgram(sp: Record<string, unknown>): SharedProgramRecord {
  return {
    ...sp,
    equipment: parseJson(sp.equipment, [] as string[]),
    tags: parseJson(sp.tags, [] as string[]),
    workoutPlan: parseJson(sp.workoutPlan, {} as Record<string, unknown>),
  } as SharedProgramRecord;
}

export async function createSharedProgram(
  creatorId: string,
  data: CreateSharedProgramData,
) {
  if (!data.name) {
    throw makeError('name is required', 400);
  }

  const serialized = serializeProgram(data);

  const sp = await prisma.sharedProgram.create({
    data: {
      creatorId,
      creatorName: data.creatorName ?? '',
      creatorAvatar: data.creatorAvatar ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      name: data.name,
      description: data.description,
      category: data.category ?? 'general',
      difficulty: data.difficulty ?? 'intermediate',
      durationWeeks: data.durationWeeks ?? 4,
      daysPerWeek: data.daysPerWeek ?? 3,
      price: data.price ?? 0,
      currency: data.currency ?? 'USD',
      equipment: serialized.equipment,
      tags: serialized.tags,
      workoutPlan: serialized.workoutPlan,
    },
  });

  return deserializeProgram(sp);
}

export async function listSharedPrograms(opts: ListSharedProgramsOpts) {
  const where: Record<string, unknown> = { isPublished: true };

  if (opts.category) {
    where.category = opts.category;
  }

  if (opts.difficulty) {
    where.difficulty = opts.difficulty;
  }

  if (opts.q) {
    where.OR = [
      { name: { contains: opts.q } },
      { description: { contains: opts.q } },
      { tags: { contains: opts.q } },
      { equipment: { contains: opts.q } },
    ];
  }

  let orderBy: Record<string, string> = { createdAt: 'desc' };
  if (opts.sort === 'popular') {
    orderBy = { enrollmentCount: 'desc' };
  } else if (opts.sort === 'top_rated') {
    orderBy = { ratingAverage: 'desc' };
  } else if (opts.sort === 'newest') {
    orderBy = { createdAt: 'desc' };
  }

  const results = await prisma.sharedProgram.findMany({ where, orderBy });
  return results.map((result) => deserializeProgram(result as Record<string, unknown>));
}

export async function getSharedProgram(id: string) {
  const sp = await prisma.sharedProgram.findUnique({ where: { id } });
  if (!sp) {
    throw makeError('Shared program not found', 404);
  }
  return deserializeProgram(sp as Record<string, unknown>);
}

function normalizeSets(exercise: Record<string, unknown>) {
  if (Array.isArray(exercise.sets)) {
    return exercise.sets.map((set, index) => {
      const rawSet = set as Record<string, unknown>;
      return {
        setNumber: typeof rawSet.setNumber === 'number' ? rawSet.setNumber : index + 1,
        targetReps: parseRepString(rawSet.targetReps as string | number | undefined),
        targetWeight: typeof rawSet.targetWeight === 'number' ? rawSet.targetWeight : null,
        unit: (rawSet.unit as string) ?? 'kg',
      };
    });
  }

  return Array.from({ length: Number(exercise.sets) || 3 }, (_, i) => ({
    setNumber: i + 1,
    targetReps: parseRepString(exercise.reps as string | number | undefined),
    targetWeight: typeof exercise.weight === 'number' ? exercise.weight : null,
    unit: (exercise.unit as string) ?? 'kg',
  }));
}

// workoutPlan JSON shape from shared programs:
// { week1: { Monday: { name, focus, estimatedDuration, coachNotes, exercises: [...] } } }
function expandWorkoutPlanToPlannedWorkouts(
  workoutPlan: unknown,
  programId: string,
  userId: string,
): Array<Parameters<typeof prisma.plannedWorkout.create>[0]['data']> {
  const plan = typeof workoutPlan === 'string' ? JSON.parse(workoutPlan) : (workoutPlan ?? {});
  const rows: Array<Parameters<typeof prisma.plannedWorkout.create>[0]['data']> = [];

  for (const [weekKey, days] of Object.entries(plan as Record<string, unknown>)) {
    const weekNumber = parseInt(weekKey.replace(/\D/g, ''), 10);
    if (isNaN(weekNumber)) continue;

    for (const [dayName, session] of Object.entries(days as Record<string, unknown>)) {
      const s = session as Record<string, unknown>;
      const rawExercises = Array.isArray(s.exercises) ? s.exercises : [];
      const plannedExercises = rawExercises.map((ex: Record<string, unknown>, idx: number) => ({
        name: ex.name ?? 'Exercise',
        orderIndex: idx,
        notes: ex.notes ?? null,
        sets: normalizeSets(ex),
      }));

      rows.push({
        programId,
        userId,
        weekNumber,
        dayOfWeek: dayName,
        name: (s.name as string) ?? dayName,
        focus: (s.focus as string) ?? null,
        warmup: JSON.stringify(Array.isArray(s.warmup) ? s.warmup : []),
        exercises: JSON.stringify(plannedExercises),
        conditioning: s.conditioning ? JSON.stringify(s.conditioning) : null,
        coachNotes: typeof s.coachNotes === 'string' ? s.coachNotes : null,
        estimatedDuration: typeof s.estimatedDuration === 'number' ? s.estimatedDuration : null,
        isCompleted: false,
      });
    }
  }

  return rows;
}

function parseRepString(reps: string | number | undefined): number | null {
  if (reps == null) return null;
  if (typeof reps === 'number') return reps;
  const first = reps.split(/[-–]/)[0].trim().replace(/\D/g, '');
  const n = parseInt(first, 10);
  return isNaN(n) ? null : n;
}

export async function enrollInProgram(
  userId: string,
  sharedProgramId: string,
  sharedProgram: SharedProgramRecord,
) {
  const existingEnrollment = await prisma.programEnrollment.findFirst({
    where: { userId, sharedProgramId },
  });
  if (existingEnrollment) {
    throw makeError('You are already enrolled in this program', 400);
  }

  await prisma.programEnrollment.deleteMany({
    where: { userId, sharedProgramId },
  });

  const totalWeeks = typeof sharedProgram.durationWeeks === 'number'
    ? sharedProgram.durationWeeks
    : 4;

  await prisma.program.updateMany({
    where: { userId, status: 'active' },
    data: { status: 'archived' },
  });

  const workoutPlan = typeof sharedProgram.workoutPlan === 'string'
    ? sharedProgram.workoutPlan
    : JSON.stringify(sharedProgram.workoutPlan ?? {});

  const forkedProgram = await prisma.program.create({
    data: {
      userId,
      name: sharedProgram.name as string,
      description: (sharedProgram.description as string | undefined) ?? null,
      totalWeeks,
      weeklyStructure: workoutPlan,
      progressionRules: JSON.stringify({}),
      status: 'active',
    },
  });

  const workoutRows = expandWorkoutPlanToPlannedWorkouts(
    sharedProgram.workoutPlan,
    forkedProgram.id,
    userId,
  );

  if (workoutRows.length > 0) {
    await prisma.plannedWorkout.createMany({ data: workoutRows as any });
  }

  await prisma.programEnrollment.create({
    data: {
      userId,
      sharedProgramId,
      programId: forkedProgram.id,
    },
  });

  await prisma.sharedProgram.update({
    where: { id: sharedProgramId },
    data: { enrollmentCount: { increment: 1 } },
  });

  return { forkedProgramId: forkedProgram.id };
}

export async function rateProgram(
  userId: string,
  sharedProgramId: string,
  rating: number,
  review?: string,
) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw makeError('Rating must be an integer between 1 and 5', 400);
  }

  const existingRating = await prisma.programRating.findFirst({
    where: { userId, sharedProgramId },
  });
  if (existingRating) {
    throw makeError('You have already rated this program', 409);
  }

  const newRating = await prisma.programRating.create({
    data: {
      userId,
      sharedProgramId,
      rating,
      review: review ?? null,
    },
  });

  const allRatings = (await prisma.programRating.findMany({
    where: { sharedProgramId },
  })) ?? [];

  const avg =
    allRatings.length > 0
      ? allRatings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
        allRatings.length
      : rating;

  await prisma.sharedProgram.update({
    where: { id: sharedProgramId },
    data: { ratingAverage: avg },
  });

  return newRating;
}
