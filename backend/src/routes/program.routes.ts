import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { list, getActive, getById, updateStatus, createCustom, listCurrent, listPast, skipPlannedWorkout, restorePlannedWorkout } from '../controllers/program.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', list);
router.get('/active', getActive);
router.get('/current', listCurrent);
router.get('/past', listPast);
router.post('/custom', createCustom);
router.get('/:id', getById);
router.patch('/:id/status', updateStatus);
router.patch('/planned-workouts/:id/skip', skipPlannedWorkout);
router.patch('/planned-workouts/:id/restore', restorePlannedWorkout);

export default router;
