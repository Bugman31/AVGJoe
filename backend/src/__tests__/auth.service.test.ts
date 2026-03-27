import bcrypt from 'bcryptjs';
import { prisma } from '../__mocks__/prisma';
import * as authService from '../services/auth.service';

const ADMIN_EMAIL = 'admin@avgjoe.com';
const ADMIN_PASSWORD = 'Admin1234!';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── signToken / verifyToken ────────────────────────────────────────────────

describe('signToken / verifyToken', () => {
  it('issues a JWT that round-trips through verifyToken', () => {
    const token = authService.signToken('user-123');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = authService.verifyToken(token);
    expect(payload.sub).toBe('user-123');
  });

  it('throws on a tampered token', () => {
    const token = authService.signToken('user-456');
    const tampered = token.slice(0, -4) + 'xxxx';
    expect(() => authService.verifyToken(tampered)).toThrow();
  });
});

// ─── signup ─────────────────────────────────────────────────────────────────

describe('signup — create a new user', () => {
  it('returns a token and user when email is not taken', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'new-user-id',
      email: 'newuser@test.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await authService.signup('newuser@test.com', 'Test1234!', 'Test User');

    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe('newuser@test.com');
    expect(result.user.name).toBe('Test User');
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    // password must be hashed — never stored raw
    const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0].data;
    expect(createCall.passwordHash).not.toBe('Test1234!');
    expect(createCall.passwordHash.startsWith('$2')).toBe(true);
  });

  it('throws 409 when email is already registered', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

    await expect(authService.signup('taken@test.com', 'Test1234!')).rejects.toMatchObject({
      message: 'Email already in use',
      statusCode: 409,
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

// ─── login ───────────────────────────────────────────────────────────────────

describe('login — admin account', () => {
  it('returns token when admin credentials are correct', async () => {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'admin-id',
      email: ADMIN_EMAIL,
      name: 'Admin',
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await authService.login(ADMIN_EMAIL, ADMIN_PASSWORD);

    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe(ADMIN_EMAIL);

    // token must be verifiable
    const payload = authService.verifyToken(result.token);
    expect(payload.sub).toBe('admin-id');
  });

  it('throws 401 when admin password is wrong', async () => {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'admin-id',
      email: ADMIN_EMAIL,
      passwordHash,
    });

    await expect(authService.login(ADMIN_EMAIL, 'WrongPassword!')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws 401 when user does not exist', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(authService.login('nobody@avgjoe.com', 'whatever')).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
