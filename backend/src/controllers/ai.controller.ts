import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as aiService from '../services/ai.service';

const generateSchema = z.object({
  goal: z.string().min(10, 'Please describe your goal in at least 10 characters').max(500),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced', 'Beginner', 'Intermediate', 'Advanced']).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  equipment: z.string().max(500).optional(),
});

export async function generate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = generateSchema.parse(req.body);
    const program = await aiService.generateWorkout(req.user.id, {
      ...body,
      fitnessLevel: body.fitnessLevel?.toLowerCase(),
    });
    res.status(201).json({ program });
  } catch (err) {
    next(err);
  }
}
