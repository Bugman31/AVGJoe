import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as bodyController from '../controllers/body.controller';

const router = Router();

router.use(authMiddleware);

router.post('/', bodyController.logWeight);
router.get('/', bodyController.getBodyLogs);
router.delete('/:id', bodyController.deleteBodyLog);

export default router;
