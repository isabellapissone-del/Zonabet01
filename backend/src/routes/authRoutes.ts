import { Router } from 'express';
import { AuthController } from '../controllers/authController.ts';
import { authenticate } from '../middleware/auth.ts';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.get('/referrals', authenticate, AuthController.getReferrals);
router.post('/logout', AuthController.logout);

export default router;
