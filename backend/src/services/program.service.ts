import { prisma } from '../utils/prisma';

export interface PlannedExercise {
  name: string;
  orderIndex: number;
  notes?: string;
  sets: Array<{
    setNumber: number;
    targetReps: number | null;
    targetWeight: number | null;
    rpeTarget?: string;
    unit: string;
  }>;
}

export interface PlannedWorkoutData {
  weekNumber: number;
  dayOfWeek: string;
  name: string;
  focus?: string;
  warmup?: unknown[];
  exercises: PlannedExercise[];
  conditioning?: unknown;
  coachNotes?: string;
  estimatedDuration?: number;
}

export interface CreateProgramData {
  name: string;
  description?: string;
  totalWeeks: number;
  weeklyStructure?: unknown;
  progressionRules?: unknown;
  aiGoalSummary?: string;
  workouts: PlannedWorkoutData[];
}

interface ProgramWithSerializedPlan {
  id: string;
  userId: string;
  weeklyStructure: string;
  plannedWorkouts: Array<{ id: string }>;
}

function parseRepString(reps: string | number | undefined): number | null {
  if (reps == null) return null;
  if (typeof reps === 'number') return reps;
  const first = reps.split(/[-–]/)[0].trim().replace(/\D/g, '');
  const n = parseInt(first, 10);
  return Number.isNaN(n) ? null : n;
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

function expandWeeklyStructureToPlannedWorkouts(
  weeklyStructure: string,
  programId: string,
  userId: string,
) {
  const plan = JSON.parse(weeklyStructure || '{}') as Record<string, unknown>;
  const rows: Array<{
    programId: string;
    userId: string;
    weekNumber: number;
    dayOfWeek: string;
    name: string;
    focus: string | null;
    warmup: string;
    exercises: string;
    conditioning: string | null;
    coachNotes: string | null;
    estimatedDuration: number | null;
    isCompleted: boolean;
  }> = [];

  for (const [weekKey, days] of Object.entries(plan)) {
    const weekNumber = parseInt(weekKey.replace(/\D/g, ''), 10);
    if (Number.isNaN(weekNumber)) continue;

    for (const [dayName, session] of Object.entries((days as Record<string, unknown>) ?? {})) {
      const s = session as Record<string, unknown>;
      const rawExercises = Array.isArray(s.exercises) ? s.exercises : [];
      const plannedExercises = rawExercises.map((ex, idx) => {
        const exercise = ex as Record<string, unknown>;
        return {
          name: (exercise.name as string) ?? 'Exercise',
          orderIndex: idx,
          notes: (exercise.notes as string | undefined) ?? null,
          sets: normalizeSets(exercise),
        };
      });

      rows.push({
        programId,
        userId,
        weekNumber,
        dayOfWeek: dayName,
        name: (s.name as string) ?? dayName,
        focus: (s.focus as string | undefined) ?? null,
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

export async function ensurePlannedWorkoutsForProgram(program: ProgramWithSerializedPlan) {
  if (program.plannedWorkouts.length > 0) return false;

  const workoutRows = expandWeeklyStructureToPlannedWorkouts(
    program.weeklyStructure,
    program.id,
    program.userId,
  );

  if (workoutRows.length === 0) return false;

  await prisma.plannedWorkout.createMany({ data: workoutRows as any });
  return true;
}

export async function createProgram(userId: string, data: CreateProgramData) {
  // Archive any existing active program first
  await prisma.program.updateMany({
    where: { userId, status: 'active' },
    data: { status: 'archived' },
  });

  const program = await prisma.program.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      totalWeeks: data.totalWeeks,
      weeklyStructure: JSON.stringify(data.weeklyStructure ?? {}),
      progressionRules: JSON.stringify(data.progressionRules ?? {}),
      aiGoalSummary: data.aiGoalSummary,
      plannedWorkouts: {
        create: data.workouts.map((w) => ({
          userId,
          weekNumber: w.weekNumber,
          dayOfWeek: w.dayOfWeek,
          name: w.name,
          focus: w.focus,
          warmup: JSON.stringify(w.warmup ?? []),
          exercises: JSON.stringify(w.exercises),
          conditioning: w.conditioning ? JSON.stringify(w.conditioning) : null,
          coachNotes: w.coachNotes,
          estimatedDuration: w.estimatedDuration,
        })),
      },
    },
    include: { plannedWorkouts: true },
  });

  return program;
}

export async function getActiveProgram(userId: string) {
  let program = await prisma.program.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    include: { plannedWorkouts: { orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }] } },
  });

  if (!program) return null;

  const repaired = await ensurePlannedWorkoutsForProgram(program);
  if (repaired) {
    program = await prisma.program.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: { plannedWorkouts: { orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }] } },
    });
    if (!program) return null;
  }

  return deserializeProgram(program);
}

export async function listPrograms(userId: string) {
  const programs = await prisma.program.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { plannedWorkouts: true } } },
  });
  return programs;
}

export async function listCurrentPrograms(userId: string) {
  let programs = await prisma.program.findMany({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    include: {
      plannedWorkouts: { orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }] },
    },
  });

  const repairedFlags = await Promise.all(programs.map(ensurePlannedWorkoutsForProgram));
  if (repairedFlags.some(Boolean)) {
    programs = await prisma.program.findMany({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        plannedWorkouts: { orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }] },
      },
    });
  }

  return programs.map(deserializeProgram);
}

export async function listPastPrograms(userId: string) {
  return prisma.program.findMany({
    where: { userId, status: { in: ['completed', 'archived'] } },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { plannedWorkouts: true, sessions: true } } },
  });
}

export async function getProgram(userId: string, programId: string) {
  let program = await prisma.program.findFirst({
    where: { id: programId, userId },
    include: { plannedWorkouts: { orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }] } },
  });

  if (!program) return null;
  const repaired = await ensurePlannedWorkoutsForProgram(program);
  if (repaired) {
    program = await prisma.program.findFirst({
      where: { id: programId, userId },
      include: { plannedWorkouts: { orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }] } },
    });
    if (!program) return null;
  }
  return deserializeProgram(program);
}

export async function updateProgramStatus(userId: string, programId: string, status: 'active' | 'completed' | 'archived') {
  return prisma.program.update({
    where: { id: programId, userId },
    data: { status },
  });
}

export async function advanceProgramWeek(programId: string) {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program) return null;
  const nextWeek = Math.min(program.currentWeek + 1, program.totalWeeks);
  return prisma.program.update({ where: { id: programId }, data: { currentWeek: nextWeek } });
}

export async function markPlannedWorkoutComplete(plannedWorkoutId: string, sessionId: string) {
  return prisma.plannedWorkout.update({
    where: { id: plannedWorkoutId },
    data: { isCompleted: true, isSkipped: false, completedSessionId: sessionId },
  });
}

export async function skipPlannedWorkout(id: string, userId: string) {
  const pw = await prisma.plannedWorkout.findFirst({ where: { id, userId } });
  if (!pw) {
    const err = new Error('Planned workout not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return prisma.plannedWorkout.update({
    where: { id },
    data: { isSkipped: true },
  });
}

export async function restorePlannedWorkout(id: string, userId: string) {
  const pw = await prisma.plannedWorkout.findFirst({ where: { id, userId } });
  if (!pw) {
    const err = new Error('Planned workout not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return prisma.plannedWorkout.update({
    where: { id },
    data: { isSkipped: false, isCompleted: false, completedSessionId: null },
  });
}

function deserializeProgram(program: {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  totalWeeks: number;
  currentWeek: number;
  status: string;
  weeklyStructure: string;
  progressionRules: string;
  aiGoalSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
  plannedWorkouts: Array<{
    id: string;
    programId: string;
    userId: string;
    weekNumber: number;
    dayOfWeek: string;
    scheduledDate: Date | null;
    name: string;
    focus: string | null;
    warmup: string;
    exercises: string;
    conditioning: string | null;
    coachNotes: string | null;
    estimatedDuration: number | null;
    isCompleted: boolean;
    isSkipped: boolean;
    completedSessionId: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    ...program,
    weeklyStructure: JSON.parse(program.weeklyStructure),
    progressionRules: JSON.parse(program.progressionRules),
    plannedWorkouts: program.plannedWorkouts.map((pw) => ({
      ...pw,
      warmup: JSON.parse(pw.warmup),
      exercises: JSON.parse(pw.exercises),
      conditioning: pw.conditioning ? JSON.parse(pw.conditioning) : null,
    })),
  };
}
