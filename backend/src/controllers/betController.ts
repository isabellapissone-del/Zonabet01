import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { placeBetSchema } from '../validators/schemas.ts';
import { BetService } from '../services/betService.ts';

export class BetController {
  static async placeBet(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const parseResult = placeBetSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { items, stake } = parseResult.data;

    try {
      const { bet, wallet } = await BetService.placeBet({
        userId: req.user.userId,
        items,
        stake,
      });

      res.status(201).json({
        message: 'Aposta registada com sucesso!',
        bet,
        wallet,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao processar a aposta' });
    }
  }

  static async getUserBets(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const bets = await BetService.getUserBets(req.user.userId);
    res.status(200).json({ bets });
  }

  static async getBetById(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;
    const bet = await BetService.getBetById(id);
    if (!bet) {
      res.status(404).json({ error: 'Aposta não encontrada' });
      return;
    }

    // Standard user can only see their own bets
    if (req.user.role !== 'ADMIN' && bet.userId !== req.user.userId) {
      res.status(403).json({ error: 'Acesso não autorizado a esta aposta' });
      return;
    }

    res.status(200).json({ bet });
  }
}
