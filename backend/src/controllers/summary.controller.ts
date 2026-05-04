import { Request, Response, NextFunction } from 'express';
import { getDashboardSummary, getProgressSummary } from '../services/summary.service';

export async function dashboardSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await getDashboardSummary(req.user.id);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

const VALID_RANGES = new Set(['1w', '1m', '3m', '1y', 'all']);

export async function progressSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const range = typeof req.query.range === 'string' && VALID_RANGES.has(req.query.range)
      ? req.query.range
      : '1m';
    const summary = await getProgressSummary(req.user.id, range);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}
