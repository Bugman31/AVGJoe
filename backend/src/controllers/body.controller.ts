import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as bodyService from '../services/body.service';

const logWeightSchema = z.object({
  weight: z.number().positive(),
  unit: z.enum(['lbs', 'kg']).default('lbs'),
  bodyFat: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
  loggedAt: z.string().datetime().optional(),
});

export async function logWeight(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = logWeightSchema.parse(req.body);
    const log = await bodyService.logWeight(req.user.id, data);
    res.status(201).json({ log });
  } catch (err) {
    next(err);
  }
}

export async function getBodyLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawLimit = parseInt(String(req.query.limit ?? '30'), 10);
    const limit = isNaN(rawLimit) ? 30 : Math.max(1, Math.min(rawLimit, 100));
    const logs = await bodyService.getBodyLogs(req.user.id, limit);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

export async function deleteBodyLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await bodyService.deleteBodyLog(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
