import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as workoutController from '../controllers/workout.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', workoutController.list);
router.post('/', workoutController.create);
router.get('/:id', workoutController.get);
router.put('/:id', workoutController.update);
router.delete('/:id', workoutController.remove);

export default router;
