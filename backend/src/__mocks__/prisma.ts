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
  $disconnect: jest.fn(),
};
