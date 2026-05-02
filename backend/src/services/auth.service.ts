import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { ensureReviewerDemoData, isReviewerEmail } from './reviewer.service';

interface UpdateProfileData {
  name?: string;
  avatarUrl?: string;
}

interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
  paidProgramsEnabled: boolean;
}

interface AuthUser extends SafeUser {
  onboardingCompleted: boolean;
}

interface AuthResult {
  token: string;
  user: AuthUser;
}

function toSafeUser(u: {
  id: string; email: string; name: string | null;
  createdAt: Date; updatedAt: Date;
}): SafeUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    paidProgramsEnabled: env.ENABLE_PAID_PROGRAMS === 'true',
  };
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
}

export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email already in use') as Error & { statusCode: number };
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
  });

  if (isReviewerEmail(user.email)) {
    await ensureReviewerDemoData(user.id, user.email, user.name);
  }

  const token = signToken(user.id);
  return {
    token,
    user: {
      ...toSafeUser(user),
      onboardingCompleted: isReviewerEmail(user.email),
    },
  };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: { select: { onboardingCompleted: true } } },
  });
  if (!user) {
    const err = new Error('Invalid email or password') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid email or password') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  if (isReviewerEmail(user.email)) {
    await ensureReviewerDemoData(user.id, user.email, user.name);
  }

  const token = signToken(user.id);
  return {
    token,
    user: {
      ...toSafeUser(user),
      onboardingCompleted:
        isReviewerEmail(user.email) || (user.profile?.onboardingCompleted ?? false),
    },
  };
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileData
): Promise<SafeUser> {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
  });

  return toSafeUser(user);
}
