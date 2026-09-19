import type { Request, Response } from 'express';
import { db } from '../db/store.ts';
import { MatchService } from '../services/matchService.ts';

export class MatchController {
  static async listMatches(req: Request, res: Response): Promise<void> {
    const { status, competitionId, category } = req.query;
    const matches = await MatchService.getAllMatches({
      status: typeof status === 'string' ? status : undefined,
      competitionId: typeof competitionId === 'string' ? competitionId : undefined,
      category: typeof category === 'string' ? category : undefined,
    });
    res.status(200).json({ matches });
  }

  static async getMatch(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const match = await MatchService.getMatchById(id);
    if (!match) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }
    res.status(200).json({ match });
  }

  static getCompetitions(req: Request, res: Response): void {
    const fallbackCompetitions = [
      { id: 'comp-mocambola', name: 'Moçambola', country: 'Moçambique (Nacional)', code: 'MOC', category: 'MOCAMBOLA' },
      { id: 'comp-prov-sofala', name: 'Campeonato Provincial de Sofala', country: 'Sofala, Moçambique', code: 'CPS', category: 'PROVINCIAL' },
      { id: 'comp-prov-manica', name: 'Campeonato Provincial de Manica', country: 'Manica, Moçambique', code: 'CPM', category: 'PROVINCIAL' },
      { id: 'comp-prov-nampula', name: 'Campeonato Provincial de Nampula', country: 'Nampula, Moçambique', code: 'CPN', category: 'PROVINCIAL' },
      { id: 'comp-prov-maputo', name: 'Campeonato Provincial de Maputo', country: 'Maputo, Moçambique', code: 'CPMP', category: 'PROVINCIAL' },
      { id: 'comp-dist-beira', name: 'Campeonato Distrital da Beira', country: 'Distrito da Beira, Sofala', code: 'CDB', category: 'DISTRITAL' },
      { id: 'comp-dist-dondo', name: 'Campeonato Distrital do Dondo', country: 'Distrito do Dondo, Sofala', code: 'CDD', category: 'DISTRITAL' },
      { id: 'comp-dist-nhamatanda', name: 'Campeonato Distrital de Nhamatanda', country: 'Distrito de Nhamatanda, Sofala', code: 'CDN', category: 'DISTRITAL' },
    ];
    const competitions = db.competitions && db.competitions.length > 0 ? db.competitions : fallbackCompetitions;
    res.status(200).json({ competitions });
  }

  static getTeams(req: Request, res: Response): void {
    res.status(200).json({ teams: db.teams });
  }
}
