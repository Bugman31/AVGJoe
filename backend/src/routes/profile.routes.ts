import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getMe, completeOnboarding, updateMe } from '../controllers/profile.controller';

const router = Router();

router.use(authMiddleware);

router.get('/me', getMe);
router.post('/onboarding', completeOnboarding);
router.put('/me', updateMe);

export default router;
