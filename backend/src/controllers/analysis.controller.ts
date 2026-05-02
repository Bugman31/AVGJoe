import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as analysisService from '../services/weekly.analysis.service';
import { getProgram, advanceProgramWeek } from '../services/program.service';
import { prisma } from '../utils/prisma';

const triggerSchema = z.object({
  weekNumber: z.number().int().min(1),
});

export async function listForProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const analyses = await analysisService.getAnalysesForProgram(req.user.id, req.params.programId);
    res.json({ analyses });
  } catch (err) {
    next(err);
  }
}

export async function triggerWeeklyAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { weekNumber } = triggerSchema.parse(req.body);
    const userId = req.user.id;
    const { programId } = req.params;

    const program = await getProgram(userId, programId);
    if (!program) {
      res.status(404).json({ error: 'Program not found' });
      return;
    }

    const plannedThisWeek = (program.plannedWorkouts as Array<{ id: string; weekNumber: number; name: string; exercises: unknown; isCompleted: boolean }>)
      .filter((pw) => pw.weekNumber === weekNumber);

    const completedSessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        programId,
        completedAt: { not: null },
      },
      select: {
        id: true,
        completedAt: true,
        completionScore: true,
        performanceScore: true,
        preEnergyLevel: true,
        postEnergyLevel: true,
        sorenessLevel: true,
        sets: {
          select: {
            exerciseName: true,
            setNumber: true,
            actualReps: true,
            actualWeight: true,
            rpe: true,
            unit: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    // Rule-based weekly analysis (no AI required)
    const completedCount = completedSessions.length;
    const plannedCount = plannedThisWeek.length || 1;
    const adherenceScore = Math.min(1, completedCount / plannedCount);

    const rpeValues = completedSessions
      .flatMap((s) => s.sets)
      .map((s) => s.rpe)
      .filter((r): r is number => r != null);
    const avgRpe = rpeValues.length > 0
      ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length
      : 6;
    const fatigueLevel = Math.round(avgRpe);

    const saved = await analysisService.saveAnalysis({
      userId,
      programId,
      weekNumber,
      adherenceScore,
      fatigueLevel,
      progressionNotes: adherenceScore >= 0.8
        ? 'Good week — consider increasing load by 2.5–5% next week.'
        : 'Missed sessions this week. Keep the same load and focus on consistency.',
      adjustments: [],
      recommendations: fatigueLevel >= 8
        ? ['Consider a deload next week to manage fatigue.']
        : ['Stay on track with the program as written.'],
      weekSummary: `Week ${weekNumber}: ${completedCount} of ${plannedThisWeek.length} sessions completed.`,
      rawAiOutput: undefined,
    });

    if ((program as { currentWeek: number }).currentWeek === weekNumber) {
      await advanceProgramWeek(programId);
    }

    res.json({ analysis: saved });
  } catch (err) {
    next(err);
  }
}
