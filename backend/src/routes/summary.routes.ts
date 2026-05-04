import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { dashboardSummary, progressSummary } from '../controllers/summary.controller';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', dashboardSummary);
router.get('/progress', progressSummary);

export default router;
