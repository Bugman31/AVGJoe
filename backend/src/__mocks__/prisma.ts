// Shared mock Prisma client — tests override methods per-test via jest.spyOn or direct assignment
export const prisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userProfile: {
    findUnique: jest.fn(),
  },
  workoutSession: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  plannedWorkout: {
    findUnique: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
  },
  workoutTemplate: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  exercise: {
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  program: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  sharedProgram: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  programEnrollment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  programRating: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $disconnect: jest.fn(),
};
