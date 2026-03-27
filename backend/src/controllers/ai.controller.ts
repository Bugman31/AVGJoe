import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as aiService from '../services/ai.service';

const generateSchema = z.object({
  goal: z.string().min(10, 'Please describe your goal in at least 10 characters').max(500),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  equipment: z.string().max(200).optional(),
});

export async function generate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = generateSchema.parse(req.body);
    const template = await aiService.generateWorkout(req.user.id, body);
    res.status(201).json({ template });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    if (error.statusCode === 400 || error.statusCode === 422) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    next(err);
  }
}
