import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.put('/me', authMiddleware, authController.updateProfile);

export default router;
