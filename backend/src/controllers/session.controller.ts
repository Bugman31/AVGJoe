import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as sessionService from '../services/session.service';

const startSessionSchema = z.object({
  name: z.string().min(1, 'Session name is required').max(200),
  templateId: z.string().cuid().optional(),
});

const logSetSchema = z.object({
  exerciseId: z.string().cuid('Invalid exercise ID'),
  exerciseName: z.string().min(1, 'Exercise name is required'),
  setNumber: z.number().int().min(1),
  actualReps: z.number().int().min(0).optional(),
  actualWeight: z.number().min(0).optional(),
  unit: z.string().default('kg'),
});

const completeSessionSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export async function startSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = startSessionSchema.parse(req.body);
    const session = await sessionService.startSession(req.user.id, body);
    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
}

export async function listSessions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
    const offset = parseInt(String(req.query.offset ?? '0'), 10);
    const result = await sessionService.listSessions(req.user.id, limit, offset);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await sessionService.getSession(req.params.id, req.user.id);
    res.json({ session });
  } catch (err) {
    next(err);
  }
}

export async function logSet(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = logSetSchema.parse(req.body);
    const set = await sessionService.logSet(req.params.id, req.user.id, body);
    res.status(201).json({ set });
  } catch (err) {
    next(err);
  }
}

export async function completeSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = completeSessionSchema.parse(req.body);
    const session = await sessionService.completeSession(
      req.params.id,
      req.user.id,
      body.notes
    );
    res.json({ session });
  } catch (err) {
    next(err);
  }
}

export async function getProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const exerciseId = req.params.exerciseId;
    const weeks = Math.min(parseInt(String(req.query.weeks ?? '12'), 10), 52);
    const progress = await sessionService.getProgress(exerciseId, req.user.id, weeks);
    res.json({ progress, exerciseId, weeks });
  } catch (err) {
    next(err);
  }
}
