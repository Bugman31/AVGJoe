import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { encrypt } from '../utils/crypto';

interface SignupData {
  email: string;
  password: string;
  name?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface UpdateProfileData {
  name?: string;
  anthropicApiKey?: string;
}

interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthResult {
  token: string;
  user: SafeUser;
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

  const token = signToken(user.id);
  return { token, user };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });
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

  const token = signToken(user.id);
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileData
): Promise<SafeUser> {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.anthropicApiKey !== undefined) {
    updateData.anthropicApiKey = encrypt(data.anthropicApiKey);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
  });

  return user;
}
