import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as aiService from '../services/ai.service';
import * as programService from '../services/program.service';

const generateSchema = z.object({
  goal: z.string().min(10, 'Please describe your goal in at least 10 characters').max(500),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced', 'Beginner', 'Intermediate', 'Advanced']).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  equipment: z.string().max(500).optional(),
  preferredSplit: z.string().max(100).optional(),
  benchmarkBench: z.number().positive().optional(),
  benchmarkSquat: z.number().positive().optional(),
  benchmarkDeadlift: z.number().positive().optional(),
  benchmarkPress: z.number().positive().optional(),
  unitSystem: z.enum(['lbs', 'kg']).optional(),
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

const generateProgramSchema = z.object({
  customization: z.string().max(500).optional(),
});

/** Generate a program with AI and return the raw data WITHOUT saving it.
 *  Used by the Build wizard so the user can review/edit before committing. */
export async function previewProgram(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { customization } = generateProgramSchema.parse(req.body);
    const aiResult = await aiService.generateProgram(req.user.id, customization);
    res.json({ preview: aiResult });
  } catch (err) {
    next(err);
  }
}

export async function generateProgram(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { customization } = generateProgramSchema.parse(req.body);
    const aiResult = await aiService.generateProgram(req.user.id, customization);

    const program = await programService.createProgram(req.user.id, {
      name: aiResult.programName,
      description: aiResult.programDescription,
      totalWeeks: aiResult.totalWeeks,
      weeklyStructure: aiResult.weeklyStructure,
      progressionRules: aiResult.progressionRules,
      aiGoalSummary: aiResult.aiGoalSummary,
      workouts: aiResult.workouts.map((w) => ({
        weekNumber: w.weekNumber,
        dayOfWeek: w.dayOfWeek,
        name: w.name,
        focus: w.focus,
        estimatedDuration: w.estimatedDuration,
        warmup: w.warmup,
        exercises: w.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => ({
            ...s,
            rpeTarget: s.rpeTarget ?? undefined,
          })),
        })),
        conditioning: w.conditioning,
        coachNotes: w.coachNotes,
      })),
    });

    res.status(201).json({ program });
  } catch (err) {
    next(err);
  }
}
