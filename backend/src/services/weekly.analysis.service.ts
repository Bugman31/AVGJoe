import { prisma } from '../utils/prisma';

export async function getAnalysesForProgram(userId: string, programId: string) {
  return prisma.weeklyAnalysis.findMany({
    where: { userId, programId },
    orderBy: { weekNumber: 'asc' },
  });
}

export async function saveAnalysis(params: {
  userId: string;
  programId: string;
  weekNumber: number;
  adherenceScore: number;
  fatigueLevel: number;
  progressionNotes: string;
  adjustments: unknown[];
  recommendations: string[];
  weekSummary: string;
  rawAiOutput?: string;
}) {
  return prisma.weeklyAnalysis.upsert({
    where: {
      // Use a composite approach — delete+create if needed
      id: `${params.programId}-week${params.weekNumber}`,
    },
    create: {
      id: `${params.programId}-week${params.weekNumber}`,
      userId: params.userId,
      programId: params.programId,
      weekNumber: params.weekNumber,
      adherenceScore: params.adherenceScore,
      fatigueLevel: params.fatigueLevel,
      progressionNotes: params.progressionNotes,
      adjustments: JSON.stringify(params.adjustments),
      recommendations: JSON.stringify(params.recommendations),
      weekSummary: params.weekSummary,
      rawAiOutput: params.rawAiOutput,
    },
    update: {
      adherenceScore: params.adherenceScore,
      fatigueLevel: params.fatigueLevel,
      progressionNotes: params.progressionNotes,
      adjustments: JSON.stringify(params.adjustments),
      recommendations: JSON.stringify(params.recommendations),
      weekSummary: params.weekSummary,
      rawAiOutput: params.rawAiOutput,
    },
  });
}
