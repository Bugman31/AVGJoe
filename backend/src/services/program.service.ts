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
  const program = await prisma.program.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'desc' },
    include: { plannedWorkouts: { orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }] } },
  });

  if (!program) return null;

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

export async function getProgram(userId: string, programId: string) {
  const program = await prisma.program.findFirst({
    where: { id: programId, userId },
    include: { plannedWorkouts: { orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }] } },
  });

  if (!program) return null;
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
    data: { isCompleted: true, completedSessionId: sessionId },
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
