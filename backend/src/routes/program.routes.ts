import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { list, getActive, getById, updateStatus } from '../controllers/program.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', list);
router.get('/active', getActive);
router.get('/:id', getById);
router.patch('/:id/status', updateStatus);

export default router;
