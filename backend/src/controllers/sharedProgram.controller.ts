import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as sharedProgramService from '../services/sharedProgram.service';
import { env } from '../config/env';

const createSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  durationWeeks: z.number().int().positive().optional(),
  daysPerWeek: z.number().int().positive().optional(),
  equipment: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  workoutPlan: z.record(z.unknown()).optional(),
  price: z.number().min(0).default(0),
  currency: z.string().default('USD'),
});

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().optional(),
});

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, q, difficulty, sort } = req.query as Record<string, string | undefined>;
    const programs = await sharedProgramService.listSharedPrograms({
      category,
      q,
      difficulty,
      sort,
    });
    res.json({ programs });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createSchema.parse(req.body);
    const user = req.user;
    const program = await sharedProgramService.createSharedProgram(user.id, {
      ...body,
      creatorName: user.name ?? user.email ?? '',
      creatorAvatar: (user as { avatarUrl?: string }).avatarUrl ?? undefined,
    });
    res.status(201).json({ program });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const program = await sharedProgramService.getSharedProgram(req.params.id);
    res.json({ program });
  } catch (err) {
    next(err);
  }
}

export async function enroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sharedProgram = await sharedProgramService.getSharedProgram(req.params.id);

    // Paid programs gate — enrolling in a paid program is blocked until payment is live
    if ((sharedProgram.price ?? 0) > 0 && env.ENABLE_PAID_PROGRAMS === 'true') {
      res.status(402).json({ error: 'Payment required — paid program purchasing is not yet available.' });
      return;
    }

    const result = await sharedProgramService.enrollInProgram(
      req.user.id,
      req.params.id,
      sharedProgram as Parameters<typeof sharedProgramService.enrollInProgram>[2],
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function rate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = rateSchema.parse(req.body);
    const result = await sharedProgramService.rateProgram(
      req.user.id,
      req.params.id,
      body.rating,
      body.review,
    );
    res.json({ rating: result });
  } catch (err) {
    next(err);
  }
}
