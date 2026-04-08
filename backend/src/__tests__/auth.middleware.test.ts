import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as authService from '../services/auth.service';
import { prisma } from '../__mocks__/prisma';

// prisma is auto-mapped to __mocks__/prisma via moduleNameMapper in jest.config.js

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeRes(): { res: Response; status: jest.Mock; json: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  return { res, status, json };
}

const next: NextFunction = jest.fn();

const VALID_USER = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test',
  profile: null,
};

beforeEach(() => jest.clearAllMocks());

describe('authMiddleware', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const req = makeReq();
    const { res, status, json } = makeRes();

    await authMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is malformed', async () => {
    const req = makeReq({ authorization: 'Bearer not-a-jwt' });
    const { res, status, json } = makeRes();

    await authMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Invalid') }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when user no longer exists in DB', async () => {
    const token = authService.signToken('deleted-user');
    const req = makeReq({ authorization: `Bearer ${token}` });
    const { res, status, json } = makeRes();

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await authMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'User not found' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches user to req and calls next when token is valid', async () => {
    const token = authService.signToken('user-123');
    const req = makeReq({ authorization: `Bearer ${token}` }) as Request & { user?: unknown };
    const { res } = makeRes();

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(VALID_USER);

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).user).toMatchObject({ id: 'user-123', email: 'test@example.com' });
  });

  it('sets onboardingCompleted: false when user has no profile', async () => {
    const token = authService.signToken('user-123');
    const req = makeReq({ authorization: `Bearer ${token}` }) as Request & { user?: unknown };
    const { res } = makeRes();

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...VALID_USER, profile: null });

    await authMiddleware(req, res, next);

    expect((req as any).user.onboardingCompleted).toBe(false);
  });

  it('sets onboardingCompleted: true when profile is complete', async () => {
    const token = authService.signToken('user-123');
    const req = makeReq({ authorization: `Bearer ${token}` }) as Request & { user?: unknown };
    const { res } = makeRes();

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...VALID_USER,
      profile: { onboardingCompleted: true },
    });

    await authMiddleware(req, res, next);

    expect((req as any).user.onboardingCompleted).toBe(true);
  });
});
