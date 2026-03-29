import { prisma } from '../utils/prisma';

interface SetInput {
  setNumber: number;
  targetReps?: number;
  targetWeight?: number;
  unit?: string;
}

interface ExerciseInput {
  name: string;
  orderIndex: number;
  notes?: string;
  sets: SetInput[];
}

interface CreateTemplateData {
  name: string;
  description?: string;
  isAiGenerated?: boolean;
  aiGoal?: string;
  programId?: string;
  weekNumber?: number;
  dayOfWeek?: string;
  exercises: ExerciseInput[];
}

interface UpdateTemplateData {
  name?: string;
  description?: string;
  exercises?: ExerciseInput[];
}

export async function listTemplates(userId: string) {
  return prisma.workoutTemplate.findMany({
    where: { userId },
    include: {
      exercises: {
        orderBy: { orderIndex: 'asc' },
        include: {
          sets: { orderBy: { setNumber: 'asc' } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTemplate(id: string, userId: string) {
  const template = await prisma.workoutTemplate.findFirst({
    where: { id, userId },
    include: {
      exercises: {
        orderBy: { orderIndex: 'asc' },
        include: {
          sets: { orderBy: { setNumber: 'asc' } },
        },
      },
    },
  });

  if (!template) {
    const err = new Error('Template not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  return template;
}

export async function createTemplate(userId: string, data: CreateTemplateData) {
  return prisma.$transaction(async (tx) => {
    const template = await tx.workoutTemplate.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        isAiGenerated: data.isAiGenerated ?? false,
        aiGoal: data.aiGoal,
        programId: data.programId,
        weekNumber: data.weekNumber,
        dayOfWeek: data.dayOfWeek,
        exercises: {
          create: data.exercises.map((ex) => ({
            name: ex.name,
            orderIndex: ex.orderIndex,
            notes: ex.notes,
            sets: {
              create: ex.sets.map((s) => ({
                setNumber: s.setNumber,
                targetReps: s.targetReps,
                targetWeight: s.targetWeight,
                unit: s.unit ?? 'kg',
              })),
            },
          })),
        },
      },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: {
            sets: { orderBy: { setNumber: 'asc' } },
          },
        },
      },
    });

    return template;
  });
}

export async function updateTemplate(
  id: string,
  userId: string,
  data: UpdateTemplateData
) {
  // Verify ownership
  const existing = await prisma.workoutTemplate.findFirst({ where: { id, userId } });
  if (!existing) {
    const err = new Error('Template not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    if (data.exercises !== undefined) {
      // Delete all existing exercises (cascade deletes sets)
      await tx.exercise.deleteMany({ where: { templateId: id } });
    }

    const template = await tx.workoutTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.exercises !== undefined && {
          exercises: {
            create: data.exercises.map((ex) => ({
              name: ex.name,
              orderIndex: ex.orderIndex,
              notes: ex.notes,
              sets: {
                create: ex.sets.map((s) => ({
                  setNumber: s.setNumber,
                  targetReps: s.targetReps,
                  targetWeight: s.targetWeight,
                  unit: s.unit ?? 'kg',
                })),
              },
            })),
          },
        }),
      },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: {
            sets: { orderBy: { setNumber: 'asc' } },
          },
        },
      },
    });

    return template;
  });
}

export async function deleteTemplate(id: string, userId: string): Promise<void> {
  const existing = await prisma.workoutTemplate.findFirst({ where: { id, userId } });
  if (!existing) {
    const err = new Error('Template not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  await prisma.workoutTemplate.delete({ where: { id } });
}
