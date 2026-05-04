import { z } from 'zod';
import 'dotenv/config';

const schema = z.object({
  DATABASE_PROVIDER: z.enum(['sqlite', 'postgresql']),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  PORT: z.string().default('8000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ENABLE_PAID_PROGRAMS: z.string().default('false'),
}).superRefine((value, ctx) => {
  if (value.DATABASE_PROVIDER === 'sqlite' && !value.DATABASE_URL.startsWith('file:')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DATABASE_URL'],
      message: 'SQLite DATABASE_URL must start with file:',
    });
  }

  if (
    value.DATABASE_PROVIDER === 'postgresql' &&
    !/^postgres(ql)?:\/\//.test(value.DATABASE_URL)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DATABASE_URL'],
      message: 'PostgreSQL DATABASE_URL must start with postgres:// or postgresql://',
    });
  }
});

export type Env = z.infer<typeof schema>;

export function validateEnv(input: NodeJS.ProcessEnv) {
  return schema.safeParse(input);
}

const parsed = validateEnv(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
