import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/authController.ts';
import { authenticate } from '../middleware/auth.ts';

const router = Router();

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: process.env.NODE_ENV === 'test' ? 1000 : 15, // 15 tentativas por IP (generoso em testes)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas tentativas. Tente novamente mais tarde.' },
});

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.get('/referrals', authenticate, AuthController.getReferrals);
router.post('/logout', AuthController.logout);

export default router;
