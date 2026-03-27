import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as workoutService from '../services/workout.service';

const exerciseSetSchema = z.object({
  setNumber: z.number().int().min(1),
  targetReps: z.number().int().min(1).optional(),
  targetWeight: z.number().min(0).optional(),
  unit: z.string().default('kg'),
});

const exerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  orderIndex: z.number().int().min(0),
  notes: z.string().optional(),
  sets: z.array(exerciseSetSchema).min(1, 'At least one set is required'),
});

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  description: z.string().max(1000).optional(),
  exercises: z.array(exerciseSchema).min(1, 'At least one exercise is required'),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  exercises: z.array(exerciseSchema).optional(),
});

export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const templates = await workoutService.listTemplates(req.user.id);
    res.json({ templates });
  } catch (err) {
    next(err);
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const template = await workoutService.getTemplate(req.params.id, req.user.id);
    res.json({ template });
  } catch (err) {
    next(err);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = createTemplateSchema.parse(req.body);
    const template = await workoutService.createTemplate(req.user.id, body);
    res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = updateTemplateSchema.parse(req.body);
    const template = await workoutService.updateTemplate(req.params.id, req.user.id, body);
    res.json({ template });
  } catch (err) {
    next(err);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await workoutService.deleteTemplate(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
