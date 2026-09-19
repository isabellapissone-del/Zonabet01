import { Router } from 'express';
import { WalletController } from '../controllers/walletController.ts';
import { authenticate } from '../middleware/auth.ts';

const router = Router();

router.get('/', authenticate, WalletController.getWallet);
router.get('/transactions', authenticate, WalletController.getTransactions);
router.get('/deposit-proofs', authenticate, WalletController.getUserDepositProofs);
router.post('/deposit', authenticate, WalletController.deposit);
router.post('/withdraw', authenticate, WalletController.withdraw);
router.post('/topup', authenticate, WalletController.requestVirtualTopup);

export default router;
