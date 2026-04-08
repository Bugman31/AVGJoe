import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as sessionService from '../services/session.service';

const startSessionSchema = z.object({
  name: z.string().min(1, 'Session name is required').max(200),
  templateId: z.string().cuid().optional(),
  plannedWorkoutId: z.string().optional(),
  programId: z.string().optional(),
  preEnergyLevel: z.number().int().min(1).max(10).optional(),
  startedAt: z.string().datetime().optional(),
});

const logSetSchema = z.object({
  exerciseId: z.string().cuid('Invalid exercise ID'),
  exerciseName: z.string().min(1, 'Exercise name is required'),
  setNumber: z.number().int().min(1),
  actualReps: z.number().int().min(0).optional(),
  actualWeight: z.number().min(0).optional(),
  unit: z.string().default('lbs'),
  rpe: z.number().int().min(1).max(10).optional(),
});

const completeSessionSchema = z.object({
  notes: z.string().max(2000).optional(),
  postEnergyLevel: z.number().int().min(1).max(10).optional(),
  sorenessLevel: z.number().int().min(1).max(10).optional(),
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
    const rawLimit = parseInt(String(req.query.limit ?? '20'), 10);
    const limit = isNaN(rawLimit) ? 20 : Math.max(1, Math.min(rawLimit, 100));
    const rawOffset = parseInt(String(req.query.offset ?? '0'), 10);
    const offset = isNaN(rawOffset) ? 0 : Math.max(0, rawOffset);
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
    const session = await sessionService.completeSession(req.params.id, req.user.id, body);
    res.json({ session });
  } catch (err) {
    next(err);
  }
}

export async function getLastExercise(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const exerciseName = decodeURIComponent(req.params.exerciseName);
    const excludeSessionId = req.query.excludeSession as string | undefined;
    const sets = await sessionService.getLastExerciseData(req.user.id, exerciseName, excludeSessionId);
    res.json({ sets, exerciseName });
  } catch (err) {
    next(err);
  }
}

export async function deleteSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await sessionService.deleteSession(req.params.id, req.user.id);
    res.status(204).send();
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
    const rawWeeks = parseInt(String(req.query.weeks ?? '12'), 10);
    const weeks = isNaN(rawWeeks) ? 12 : Math.max(1, Math.min(rawWeeks, 52));
    const progress = await sessionService.getProgress(exerciseId, req.user.id, weeks);
    res.json({ progress, exerciseId, weeks });
  } catch (err) {
    next(err);
  }
}
