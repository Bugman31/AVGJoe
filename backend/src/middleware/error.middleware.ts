import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error('[Error]', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      fieldErrors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Error) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    // Sanitize Prisma / DB errors — never expose internal details to the client
    const isPrismaError =
      err.constructor.name.startsWith('Prisma') ||
      err.message.includes('prisma.') ||
      err.message.includes('localhost:5432') ||
      err.message.includes('database server');
    const message = isPrismaError
      ? statusCode >= 500
        ? 'Service temporarily unavailable. Please try again later.'
        : err.message
      : err.message;
    res.status(statusCode).json({ error: message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
