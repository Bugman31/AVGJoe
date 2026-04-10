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
  creatorName?: string;
  creatorAvatar?: string;
}

export interface ListSharedProgramsOpts {
  category?: string;
  q?: string;
  difficulty?: string;
  sort?: 'popular' | 'top_rated' | 'newest' | string;
}

function serializeProgram(data: CreateSharedProgramData) {
  return {
    equipment: JSON.stringify(data.equipment ?? []),
    tags: JSON.stringify(data.tags ?? []),
    workoutPlan: JSON.stringify(data.workoutPlan ?? {}),
  };
}

function deserializeProgram(sp: Record<string, unknown>) {
  return {
    ...sp,
    equipment: typeof sp.equipment === 'string' ? JSON.parse(sp.equipment) : sp.equipment,
    tags: typeof sp.tags === 'string' ? JSON.parse(sp.tags) : sp.tags,
    workoutPlan: typeof sp.workoutPlan === 'string' ? JSON.parse(sp.workoutPlan) : sp.workoutPlan,
  };
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
      name: data.name,
      description: data.description,
      category: data.category ?? 'general',
      difficulty: data.difficulty ?? 'intermediate',
      durationWeeks: data.durationWeeks ?? 4,
      daysPerWeek: data.daysPerWeek ?? 3,
      equipment: serialized.equipment,
      tags: serialized.tags,
      workoutPlan: serialized.workoutPlan,
    },
  });

  return sp;
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
  return results;
}

export async function getSharedProgram(id: string) {
  const sp = await prisma.sharedProgram.findUnique({ where: { id } });
  if (!sp) {
    throw makeError('Shared program not found', 404);
  }
  return sp;
}

// workoutPlan JSON shape from shared programs:
// { week1: { Monday: { name, focus, exercises: [{name, sets, reps, weight, unit, notes}] } } }
function expandWorkoutPlanToPlannedWorkouts(
  workoutPlan: unknown,
  programId: string,
  userId: string,
): Array<Parameters<typeof prisma.plannedWorkout.create>[0]['data']> {
  const plan = typeof workoutPlan === 'string' ? JSON.parse(workoutPlan) : (workoutPlan ?? {});
  const rows: Array<Parameters<typeof prisma.plannedWorkout.create>[0]['data']> = [];

  for (const [weekKey, days] of Object.entries(plan as Record<string, unknown>)) {
    // weekKey: "week1", "week2", etc.
    const weekNumber = parseInt(weekKey.replace(/\D/g, ''), 10);
    if (isNaN(weekNumber)) continue;

    for (const [dayName, session] of Object.entries(days as Record<string, unknown>)) {
      const s = session as Record<string, unknown>;

      // Convert the compact exercise format used in seedPrograms into the
      // PlannedExercise shape that the active workout screen expects.
      const rawExercises = Array.isArray(s.exercises) ? s.exercises : [];
      const plannedExercises = rawExercises.map((ex: Record<string, unknown>, idx: number) => ({
        name: ex.name ?? 'Exercise',
        orderIndex: idx,
        notes: ex.notes ?? null,
        sets: Array.from({ length: Number(ex.sets) || 3 }, (_, i) => ({
          setNumber: i + 1,
          targetReps: parseRepString(ex.reps as string | number | undefined),
          targetWeight: typeof ex.weight === 'number' ? ex.weight : null,
          unit: (ex.unit as string) ?? 'kg',
        })),
      }));

      rows.push({
        programId,
        userId,
        weekNumber,
        dayOfWeek: dayName,
        name: (s.name as string) ?? dayName,
        focus: (s.focus as string) ?? null,
        warmup: JSON.stringify([]),
        exercises: JSON.stringify(plannedExercises),
        conditioning: null,
        coachNotes: null,
        estimatedDuration: null,
        isCompleted: false,
      });
    }
  }

  return rows;
}

// Parse "5", "8-12", "10-15", 10 → the lower bound as a number (or null)
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
  sharedProgram: {
    id: string;
    name: string;
    workoutPlan: unknown;
    durationWeeks?: unknown;
    [key: string]: unknown;
  },
) {
  // Check for existing enrollment
  const existing = await prisma.programEnrollment.findFirst({
    where: { userId, sharedProgramId },
  });
  if (existing) {
    throw makeError('Already enrolled in this program', 400);
  }

  const totalWeeks = typeof sharedProgram.durationWeeks === 'number'
    ? sharedProgram.durationWeeks
    : 4;

  // Archive any currently active program
  await prisma.program.updateMany({
    where: { userId, status: 'active' },
    data: { status: 'archived' },
  });

  // Fork the program + create PlannedWorkout rows in one transaction
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

  // Expand workoutPlan JSON into individual PlannedWorkout rows
  const workoutRows = expandWorkoutPlanToPlannedWorkouts(
    sharedProgram.workoutPlan,
    forkedProgram.id,
    userId,
  );

  if (workoutRows.length > 0) {
    await prisma.plannedWorkout.createMany({ data: workoutRows as any });
  }

  // Create enrollment record
  await prisma.programEnrollment.create({
    data: {
      userId,
      sharedProgramId,
      programId: forkedProgram.id,
    },
  });

  // Increment enrollment count
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
  // Validate rating
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw makeError('Rating must be an integer between 1 and 5', 400);
  }

  // Check for existing rating
  const existingRating = await prisma.programRating.findFirst({
    where: { userId, sharedProgramId },
  });
  if (existingRating) {
    throw makeError('You have already rated this program', 409);
  }

  // Create rating
  const newRating = await prisma.programRating.create({
    data: {
      userId,
      sharedProgramId,
      rating,
      review: review ?? null,
    },
  });

  // Recalculate average rating from all ratings for this program
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
