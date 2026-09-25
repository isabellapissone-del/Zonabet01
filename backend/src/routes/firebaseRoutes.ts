import { Router, type Request, type Response } from 'express';
import { firebaseService } from '../db/firebase.ts';

const router = Router();

// Obter estado da ligação ao Firebase
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await firebaseService.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({
      isConfigured: false,
      connected: false,
      error: error.message || 'Erro ao verificar estado do Firebase',
    });
  }
});

// Importar e hidratar dados do Firebase para a aplicação (Pull)
router.post('/pull', async (req: Request, res: Response) => {
  try {
    const result = await firebaseService.pullData();
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Falha ao importar dados do Firebase',
    });
  }
});

export default router;
