import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as programService from '../services/program.service';

const statusSchema = z.object({
  status: z.enum(['active', 'completed', 'archived']),
});

const setSchema = z.object({
  setNumber: z.number().int().min(1),
  targetReps: z.number().int().min(0).nullable(),
  targetWeight: z.number().min(0).nullable(),
  unit: z.string().default('lbs'),
  percentOfMax: z.number().min(0).max(200).nullable().optional(),
  percentBasis: z.string().nullable().optional(),
  customOneRepMax: z.number().positive().nullable().optional(),
});

const exerciseSchema = z.object({
  name: z.string().min(1),
  orderIndex: z.number().int().min(0),
  notes: z.string().optional(),
  sets: z.array(setSchema).min(1),
});

const workoutSchema = z.object({
  dayOfWeek: z.string().min(1),
  name: z.string().min(1),
  focus: z.string().optional(),
  estimatedDuration: z.number().int().positive().optional(),
  exercises: z.array(exerciseSchema),
});

const weekSchema = z.object({
  weekNumber: z.number().int().min(1),
  workouts: z.array(workoutSchema).min(1),
});

const createCustomProgramSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  totalWeeks: z.number().int().min(1).max(16),
  weeks: z.array(weekSchema).min(1),
});

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const programs = await programService.listPrograms(req.user.id);
    res.json({ programs });
  } catch (err) {
    next(err);
  }
}

export async function getActive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const program = await programService.getActiveProgram(req.user.id);
    res.json({ program });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const program = await programService.getProgram(req.user.id, req.params.id);
    if (!program) {
      res.status(404).json({ error: 'Program not found' });
      return;
    }
    res.json({ program });
  } catch (err) {
    next(err);
  }
}

export async function createCustom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createCustomProgramSchema.parse(req.body);
    // Flatten weeks × workouts into the format createProgram expects
    const workouts = body.weeks.flatMap((week) =>
      week.workouts.map((w) => ({
        weekNumber: week.weekNumber,
        dayOfWeek: w.dayOfWeek,
        name: w.name,
        focus: w.focus,
        estimatedDuration: w.estimatedDuration,
        exercises: w.exercises,
        warmup: [],
      }))
    );
    const program = await programService.createProgram(req.user.id, {
      name: body.name,
      description: body.description,
      totalWeeks: body.totalWeeks,
      workouts,
    });
    res.status(201).json({ program });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = statusSchema.parse(req.body);
    const program = await programService.updateProgramStatus(req.user.id, req.params.id, status);
    res.json({ program });
  } catch (err) {
    next(err);
  }
}
