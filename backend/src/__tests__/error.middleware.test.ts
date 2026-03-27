import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { errorMiddleware } from '../middleware/error.middleware';

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const req = {} as Request;
const next = jest.fn() as unknown as NextFunction;

describe('errorMiddleware', () => {
  it('returns 400 with field errors for ZodError', () => {
    const schema = z.object({ email: z.string().email() });
    let zodErr: ZodError | undefined;
    try { schema.parse({ email: 'not-an-email' }); } catch (e) { zodErr = e as ZodError; }

    const res = makeRes();
    errorMiddleware(zodErr!, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error).toBe('Validation failed');
    expect(body.fieldErrors).toBeDefined();
  });

  it('returns correct statusCode for errors with statusCode property', () => {
    const err = Object.assign(new Error('Email already in use'), { statusCode: 409 });
    const res = makeRes();
    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect((res.json as jest.Mock).mock.calls[0][0]).toEqual({ error: 'Email already in use' });
  });

  it('sanitizes Prisma connection errors — no stack trace in response', () => {
    const prismaErr = new Error(
      "Invalid `prisma.user.findUnique()` invocation\nCan't reach database server at `localhost:5432`"
    );
    (prismaErr as any).statusCode = undefined;

    const res = makeRes();
    errorMiddleware(prismaErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error).toBe('Service temporarily unavailable. Please try again later.');
    expect(body.error).not.toContain('prisma');
    expect(body.error).not.toContain('localhost:5432');
  });

  it('returns 500 for unknown errors', () => {
    const res = makeRes();
    errorMiddleware('some string error', req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect((res.json as jest.Mock).mock.calls[0][0]).toEqual({ error: 'Internal server error' });
  });
});
