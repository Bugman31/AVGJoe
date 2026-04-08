import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as analysisService from '../services/weekly.analysis.service';
import { generateWeeklyAnalysis } from '../services/ai.service';
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

    // Gather sessions for this week's planned workouts
    const plannedThisWeek = (program.plannedWorkouts as Array<{ id: string; weekNumber: number; name: string; exercises: unknown; isCompleted: boolean }>)
      .filter((pw) => pw.weekNumber === weekNumber);

    const completedSessionIds = await prisma.workoutSession.findMany({
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
        aiSummary: true,
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

    const analysisResult = await generateWeeklyAnalysis(userId, {
      program,
      plannedWorkouts: plannedThisWeek,
      completedSessions: completedSessionIds,
      weekNumber,
    });

    const saved = await analysisService.saveAnalysis({
      userId,
      programId,
      weekNumber,
      adherenceScore: analysisResult.adherenceScore,
      fatigueLevel: analysisResult.fatigueLevel,
      progressionNotes: analysisResult.progressionNotes,
      adjustments: analysisResult.adjustments,
      recommendations: analysisResult.recommendations,
      weekSummary: analysisResult.weekSummary,
      rawAiOutput: JSON.stringify(analysisResult),
    });

    // Advance to next week if not already there
    if ((program as { currentWeek: number }).currentWeek === weekNumber) {
      await advanceProgramWeek(programId);
    }

    res.json({ analysis: saved });
  } catch (err) {
    next(err);
  }
}
