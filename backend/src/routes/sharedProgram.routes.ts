import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as sharedProgramController from '../controllers/sharedProgram.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', sharedProgramController.list);
router.post('/', sharedProgramController.create);
router.get('/:id', sharedProgramController.getOne);
router.post('/:id/enroll', sharedProgramController.enroll);
router.post('/:id/rate', sharedProgramController.rate);

export default router;
