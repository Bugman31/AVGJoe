import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  anthropicApiKey: z.string().min(1).optional(),
});

export async function signup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = signupSchema.parse(req.body);
    const result = await authService.signup(body.email, body.password, body.name);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.user.id, body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
