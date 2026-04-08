import { prisma } from '../utils/prisma';

interface LogWeightData {
  weight: number;
  unit: string;
  bodyFat?: number;
  notes?: string;
  loggedAt?: string;
}

export async function logWeight(userId: string, data: LogWeightData) {
  return prisma.bodyLog.create({
    data: {
      userId,
      weight: data.weight,
      unit: data.unit,
      bodyFat: data.bodyFat,
      notes: data.notes,
      loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
    },
  });
}

export async function getBodyLogs(userId: string, limit = 30) {
  return prisma.bodyLog.findMany({
    where: { userId },
    orderBy: { loggedAt: 'desc' },
    take: limit,
  });
}

export async function deleteBodyLog(id: string, userId: string) {
  const log = await prisma.bodyLog.findFirst({ where: { id, userId } });
  if (!log) {
    const err = new Error('Log not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  await prisma.bodyLog.delete({ where: { id } });
}
