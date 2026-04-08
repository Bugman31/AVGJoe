import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as profileService from '../services/profile.service';

const onboardingSchema = z.object({
  primaryGoal: z.string(),
  secondaryGoals: z.array(z.string()).default([]),
  experienceLevel: z.string(),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionDurationMins: z.number().int().min(20).max(180),
  preferredSplit: z.string(),
  availableEquipment: z.array(z.string()).default([]),
  restrictions: z.array(z.string()).default([]),
  injuryFlags: z.array(z.string()).default([]),
  workoutEnvironment: z.string().default('commercial_gym'),
  priorityAreas: z.array(z.string()).default([]),
  programStyle: z.string().default('structured'),
  benchmarkSquat: z.number().positive().optional(),
  benchmarkDeadlift: z.number().positive().optional(),
  benchmarkBench: z.number().positive().optional(),
  benchmarkPress: z.number().positive().optional(),
  benchmarkPullups: z.number().int().min(0).optional(),
  benchmarkMileTime: z.string().optional(),
  bodyweight: z.number().positive().optional(),
  bodyFatPercent: z.number().min(1).max(60).optional(),
  unitSystem: z.enum(['lbs', 'kg']).default('lbs'),
});

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await profileService.getProfile(req.user.id);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}

export async function completeOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = onboardingSchema.parse(req.body);
    const profile = await profileService.saveOnboarding(req.user.id, data);
    res.status(201).json({ profile });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = onboardingSchema.partial().parse(req.body);
    const profile = await profileService.updateProfile(req.user.id, data);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}
