import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth.middleware';
import * as aiController from '../controllers/ai.controller';

const router = Router();

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per user + IP combination
    const userId = req.user?.id ?? 'anonymous';
    const ip = req.ip ?? 'unknown';
    return `${ip}:${userId}`;
  },
  message: {
    error: 'Too many workout generation requests. Please try again in an hour.',
  },
});

const programRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?.id ?? 'anonymous';
    const ip = req.ip ?? 'unknown';
    return `${ip}:${userId}:program`;
  },
  message: { error: 'Too many program generation requests. Please try again in an hour.' },
});

router.post('/generate', authMiddleware, aiRateLimiter, aiController.generate);
router.post('/generate-program', authMiddleware, programRateLimiter, aiController.generateProgram);

export default router;
