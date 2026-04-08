import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { listExercises } from '../controllers/exercise.controller';

const router = Router();

router.use(authMiddleware);

// GET /api/exercises?q=squat&category=strength&muscleGroup=quads
router.get('/', listExercises);

export default router;
