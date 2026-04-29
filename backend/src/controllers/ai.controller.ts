import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as aiService from '../services/ai.service';
import * as programService from '../services/program.service';

const coachChatSchema = z.object({
  sessionId: z.string(),
  message: z.string().min(1).max(500),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(1000),
  })).max(6).optional(),
});

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
  totalWeeks: z.number().int().min(1).max(16).optional(),
});

/** Generate a program with AI and return the raw data WITHOUT saving it.
 *  Used by the Build wizard so the user can review/edit before committing. */
export async function previewProgram(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { customization, totalWeeks } = generateProgramSchema.parse(req.body);
    const aiResult = await aiService.generateProgram(req.user.id, customization, totalWeeks);
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
    const { customization, totalWeeks } = generateProgramSchema.parse(req.body);
    const aiResult = await aiService.generateProgram(req.user.id, customization, totalWeeks);

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

const setFeedbackSchema = z.object({
  exerciseName: z.string().min(1).max(100),
  setNumber: z.number().int().min(1),
  targetSets: z.number().int().min(1),
  targetRepMin: z.number().int().min(1),
  targetRepMax: z.number().int().min(1),
  actualWeight: z.number().min(0),
  actualReps: z.number().int().min(0),
  rpe: z.number().min(1).max(10),
  previousSetSummary: z.string().max(200).optional(),
  recommendationReason: z.string().max(300),
  userGoal: z.string().max(100).optional(),
});

export async function coachChat(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = coachChatSchema.parse(req.body);
    const reply = await aiService.generateCoachChat({
      ...body,
      userId: req.user.id,
    });
    res.json({ reply });
  } catch (err) {
    next(err);
  }
}

export async function getSetFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = setFeedbackSchema.parse(req.body);
    const feedback = await aiService.generateSetFeedback(req.user.id, body);
    res.json({ feedback });
  } catch (err) {
    next(err);
  }
}
