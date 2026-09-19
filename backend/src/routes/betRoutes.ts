import { Router } from 'express';
import { BetController } from '../controllers/betController.ts';
import { authenticate } from '../middleware/auth.ts';

const router = Router();

router.post('/', authenticate, BetController.placeBet);
router.get('/', authenticate, BetController.getUserBets);
router.get('/:id', authenticate, BetController.getBetById);

export default router;
