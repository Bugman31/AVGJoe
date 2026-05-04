import { validateEnv } from '../config/env';

const baseEnv = {
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: 'file:./dev.db',
  JWT_SECRET: 'test-jwt-secret-key-min-32-chars-long',
  PORT: '8000',
  NODE_ENV: 'test',
  ENABLE_PAID_PROGRAMS: 'false',
} as const;

describe('validateEnv', () => {
  it('accepts SQLite local configuration', () => {
    const result = validateEnv(baseEnv);
    expect(result.success).toBe(true);
  });

  it('rejects SQLite provider with a Postgres URL', () => {
    const result = validateEnv({
      ...baseEnv,
      DATABASE_URL: 'postgresql://avgjoe:avgjoepass@localhost:5432/avgjoe',
    });

    expect(result.success).toBe(false);
  });

  it('accepts PostgreSQL production configuration', () => {
    const result = validateEnv({
      ...baseEnv,
      DATABASE_PROVIDER: 'postgresql',
      DATABASE_URL: 'postgresql://avgjoe:avgjoepass@localhost:5432/avgjoe',
    });

    expect(result.success).toBe(true);
  });
});
