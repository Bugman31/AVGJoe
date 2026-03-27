/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^../utils/prisma$': '<rootDir>/src/__mocks__/prisma.ts',
    '^../../utils/prisma$': '<rootDir>/src/__mocks__/prisma.ts',
  },
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
};
