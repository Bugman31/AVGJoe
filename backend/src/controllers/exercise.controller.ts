import { Request, Response } from 'express';
import { searchExercises } from '../data/exerciseLibrary';

export function listExercises(req: Request, res: Response): void {
  const { q, category, muscleGroup, equipment, movementPattern } = req.query as Record<string, string>;

  const results = searchExercises({ q, category, muscleGroup, equipment, movementPattern });
  res.json({ exercises: results, total: results.length });
}
