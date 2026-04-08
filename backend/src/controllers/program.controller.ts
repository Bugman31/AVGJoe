import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as programService from '../services/program.service';

const statusSchema = z.object({
  status: z.enum(['active', 'completed', 'archived']),
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

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = statusSchema.parse(req.body);
    const program = await programService.updateProgramStatus(req.user.id, req.params.id, status);
    res.json({ program });
  } catch (err) {
    next(err);
  }
}
