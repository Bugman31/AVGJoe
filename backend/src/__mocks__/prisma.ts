// Shared mock Prisma client — tests override methods per-test via jest.spyOn or direct assignment
export const prisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $disconnect: jest.fn(),
};
