import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as sessionController from '../controllers/session.controller';

const router = Router();

router.use(authMiddleware);

router.post('/start', sessionController.startSession);
router.post('/', sessionController.startSession); // alias used by home screen
router.get('/', sessionController.listSessions);

// IMPORTANT: named sub-routes must come before /:id to avoid route conflicts
router.get('/progress/:exerciseId', sessionController.getProgress);
router.get('/last-exercise/:exerciseName', sessionController.getLastExercise);

router.get('/:id', sessionController.getSession);
router.post('/:id/sets', sessionController.logSet);
router.patch('/:id/complete', sessionController.completeSession);

export default router;
