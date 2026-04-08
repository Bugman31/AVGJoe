import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { listForProgram, triggerWeeklyAnalysis } from '../controllers/analysis.controller';

const router = Router();

router.use(authMiddleware);

router.get('/programs/:programId', listForProgram);
router.post('/programs/:programId/analyze-week', triggerWeeklyAnalysis);

export default router;
