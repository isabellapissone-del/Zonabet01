import { db } from '../store/store.ts';
import type { Match, Market, Selection } from '../types/index.ts';
import { AuditService } from './auditService.ts';

export class MatchService {
  /**
   * Retrieves all matches with their markets and selections from in-memory store
   */
  static async getAllMatches(filters?: { status?: string; competitionId?: string; category?: string }): Promise<Match[]> {
    let localMatches = Array.from(db.matches.values()).map(m => {
      const comp = db.competitions.find(c => c.id === m.competitionId);
      const compCategory = (m.competitionCategory && m.competitionCategory !== 'Futebol')
        ? m.competitionCategory
        : (comp?.category || (m.competitionId?.toLowerCase().includes('prov') || m.competitionName?.toLowerCase().includes('provincial') ? 'PROVINCIAL' : m.competitionId?.toLowerCase().includes('dist') || m.competitionName?.toLowerCase().includes('distrital') ? 'DISTRITAL' : 'MOCAMBOLA'));
      return { ...m, competitionCategory: compCategory as any };
    });

    if (filters?.competitionId) {
      localMatches = localMatches.filter(m => m.competitionId === filters.competitionId);
    }
    if (filters?.category && filters.category !== 'ALL') {
      localMatches = localMatches.filter(m => m.competitionCategory === filters.category);
    }
    if (filters?.status) {
      localMatches = localMatches.filter(m => m.status === filters.status);
    }
    return localMatches;
  }

  static async getMatchById(id: string): Promise<Match | null> {
    return db.matches.get(id) || null;
  }

  /**
   * Creates a new match and its default markets
   */
  static async createMatch(params: {
    adminId: string;
    adminEmail: string;
    competitionId: string;
    homeTeam: string;
    awayTeam: string;
    kickoffDate: string;
    kickoffTime: string;
    description?: string;
    odds: { home: number; draw: number; away: number };
    ip?: string;
  }): Promise<Match> {
    const { homeTeam, awayTeam, kickoffDate, kickoffTime, odds } = params;

    const comp = db.competitions.find(c => c.id === params.competitionId);
    let compCategory: 'MOCAMBOLA' | 'PROVINCIAL' | 'DISTRITAL' = 'MOCAMBOLA';
    if (comp?.category) {
      compCategory = comp.category as any;
    } else if (params.competitionId?.toLowerCase().includes('prov')) {
      compCategory = 'PROVINCIAL';
    } else if (params.competitionId?.toLowerCase().includes('dist')) {
      compCategory = 'DISTRITAL';
    }

    const compName = comp?.name || params.description || (compCategory === 'PROVINCIAL' ? 'Campeonato Provincial' : compCategory === 'DISTRITAL' ? 'Campeonato Distrital' : 'Moçambola');

    const match: Match = {
      id: `m-${Date.now()}`,
      competitionId: params.competitionId,
      competitionName: compName,
      competitionCategory: compCategory,
      homeTeam,
      awayTeam,
      kickoffDate,
      kickoffTime,
      status: 'OPEN',
      isFeatured: false,
      markets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create default markets
    const mainMarket: Market = {
      id: `mk-${Date.now()}-1`,
      name: 'Resultado Final (1X2)',
      type: '1X2',
      status: 'OPEN',
      selections: [
        { id: `s-${Date.now()}-1`, outcome: '1', label: homeTeam, odds: odds.home, status: 'ACTIVE' },
        { id: `s-${Date.now()}-2`, outcome: 'X', label: 'Empate', odds: odds.draw, status: 'ACTIVE' },
        { id: `s-${Date.now()}-3`, outcome: '2', label: awayTeam, odds: odds.away, status: 'ACTIVE' },
      ],
    };
    match.markets.push(mainMarket);

    const correctScoreMarket: Market = {
      id: `mk-${Date.now()}-cs`,
      name: 'Resultado Correto',
      type: 'CORRECT_SCORE',
      status: 'OPEN',
      maxExposure: 50000,
      selections: this.generateDefaultCorrectScores(homeTeam, awayTeam, odds),
    };
    match.markets.push(correctScoreMarket);

    db.matches.set(match.id, match);
    AuditService.log(params.adminId, params.adminEmail, 'CREATE_MATCH', 'Match', match.id, null, match, params.ip);

    return match;
  }

  static async updateOdds(params: {
    adminId: string;
    adminEmail: string;
    matchId: string;
    odds: { home: number; draw: number; away: number };
    ip?: string;
  }): Promise<Match> {
    const match = await this.getMatchById(params.matchId);
    if (!match) throw new Error('Jogo não encontrado');

    const mainMarket = match.markets.find((m) => m.type === '1X2');
    if (!mainMarket) throw new Error('Mercado principal não encontrado');

    const oldMatch = JSON.parse(JSON.stringify(match));

    mainMarket.selections.find((s) => s.outcome === '1')!.odds = params.odds.home;
    mainMarket.selections.find((s) => s.outcome === 'X')!.odds = params.odds.draw;
    mainMarket.selections.find((s) => s.outcome === '2')!.odds = params.odds.away;
    match.updatedAt = new Date().toISOString();

    // Auto-update Correct Score
    const csMarket = match.markets.find((m) => m.type === 'CORRECT_SCORE');
    if (csMarket) {
      const newSelections = this.generateDefaultCorrectScores(match.homeTeam, match.awayTeam, params.odds);
      for (const sel of csMarket.selections) {
        const matchingNew = newSelections.find(ns => ns.outcome === sel.outcome);
        if (matchingNew) sel.odds = matchingNew.odds;
      }
    }

    db.matches.set(match.id, match);
    AuditService.log(params.adminId, params.adminEmail, 'UPDATE_ODDS', 'Match', match.id, oldMatch, match, params.ip);
    return match;
  }

  static async updateStatus(params: {
    adminId: string;
    adminEmail: string;
    matchId: string;
    status: Match['status'];
    reason?: string;
    ip?: string;
  }): Promise<Match> {
    const match = await this.getMatchById(params.matchId);
    if (!match) throw new Error('Jogo não encontrado');

    const oldMatch = JSON.parse(JSON.stringify(match));
    match.status = params.status;
    match.updatedAt = new Date().toISOString();

    db.matches.set(match.id, match);
    AuditService.log(params.adminId, params.adminEmail, 'UPDATE_STATUS', 'Match', match.id, oldMatch, match, params.ip);
    return match;
  }

  static async updateMarketStatus(params: any): Promise<Market> {
    const match = await this.getMatchById(params.matchId);
    if (!match) throw new Error('Jogo não encontrado');

    const market = match.markets.find((m) => m.id === params.marketId);
    if (!market) throw new Error('Mercado não encontrado');

    market.status = params.status;
    
    db.matches.set(match.id, match);
    return market;
  }

  static async updateMarketOdds(params: any): Promise<Market> {
    const match = await this.getMatchById(params.matchId);
    if (!match) throw new Error('Jogo não encontrado');

    const market = match.markets.find((m) => m.id === params.marketId);
    if (!market) throw new Error('Mercado não encontrado');

    for (const selUpdate of params.selections) {
      const sel = market.selections.find((s) => s.id === selUpdate.id);
      if (sel) sel.odds = selUpdate.odds;
    }

    db.matches.set(match.id, match);
    return market;
  }

  static async addMarketSelection(params: any): Promise<Market> {
    const match = await this.getMatchById(params.matchId);
    if (!match) throw new Error('Jogo não encontrado');

    const market = match.markets.find((m) => m.id === params.marketId);
    if (!market) throw new Error('Mercado não encontrado');

    const newSelection: Selection = {
      id: `s-new-${Date.now()}`,
      marketId: market.id,
      outcome: params.outcome,
      label: params.label,
      odds: params.odds,
      status: 'ACTIVE',
    };

    market.selections.push(newSelection);

    db.matches.set(match.id, match);
    return market;
  }

  private static generateDefaultCorrectScores(
    home: string,
    away: string,
    matchOdds?: { home: number; draw: number; away: number }
  ): Selection[] {
    const baseId = `s-cs-${Date.now()}`;
    const scoreOptions = [
      '0-0', '1-0', '0-1', '1-1', '2-0', '0-2', '2-1', '1-2', '2-2',
      '3-0', '0-3', '3-1', '1-3', '3-2', '2-3', '3-3',
      '4-0', '0-4', '4-1', '1-4', '4-2', '2-4', '4-3', '3-4', '4-4',
      '5-0', '0-5', '5-1', '1-5', '5-2', '2-5', '5-3', '3-5', '5-4', '4-5', '5-5'
    ];

    const hOdd = matchOdds?.home && matchOdds.home > 1.0 ? matchOdds.home : 2.10;
    const dOdd = matchOdds?.draw && matchOdds.draw > 1.0 ? matchOdds.draw : 3.10;
    const aOdd = matchOdds?.away && matchOdds.away > 1.0 ? matchOdds.away : 3.40;

    return scoreOptions.map((score, idx) => {
      const [hgStr, agStr] = score.split('-');
      const hg = parseInt(hgStr, 10);
      const ag = parseInt(agStr, 10);
      const totalGoals = hg + ag;
      const diff = Math.abs(hg - ag);

      let calculatedOdds: number;

      if (hg > ag) {
        const factor = (hOdd / 2.0);
        if (score === '1-0') calculatedOdds = 5.2 * factor + 1.2;
        else if (score === '2-0') calculatedOdds = 7.5 * factor + 1.5;
        else if (score === '2-1') calculatedOdds = 7.0 * factor + 1.2;
        else if (score === '3-0') calculatedOdds = 12.0 * factor + 2.0;
        else if (score === '3-1') calculatedOdds = 13.0 * factor + 2.0;
        else if (score === '3-2') calculatedOdds = 18.0 * factor + 3.0;
        else if (score === '4-0') calculatedOdds = 22.0 * factor + 4.0;
        else if (score === '4-1') calculatedOdds = 24.0 * factor + 4.0;
        else if (score === '4-2') calculatedOdds = 30.0 * factor + 5.0;
        else if (score === '4-3') calculatedOdds = 45.0 * factor + 6.0;
        else calculatedOdds = 25.0 + (totalGoals * 5.5) + (diff * 3.0) * factor;
      } else if (ag > hg) {
        const factor = (aOdd / 2.0);
        if (score === '0-1') calculatedOdds = 5.6 * factor + 1.2;
        else if (score === '0-2') calculatedOdds = 8.2 * factor + 1.5;
        else if (score === '1-2') calculatedOdds = 7.8 * factor + 1.2;
        else if (score === '0-3') calculatedOdds = 14.0 * factor + 2.0;
        else if (score === '1-3') calculatedOdds = 15.0 * factor + 2.0;
        else if (score === '2-3') calculatedOdds = 20.0 * factor + 3.0;
        else if (score === '0-4') calculatedOdds = 26.0 * factor + 4.0;
        else if (score === '1-4') calculatedOdds = 28.0 * factor + 4.0;
        else if (score === '2-4') calculatedOdds = 35.0 * factor + 5.0;
        else if (score === '3-4') calculatedOdds = 50.0 * factor + 6.0;
        else calculatedOdds = 28.0 + (totalGoals * 6.0) + (diff * 3.5) * factor;
      } else {
        const factor = (dOdd / 3.0);
        if (score === '0-0') calculatedOdds = 7.5 * factor;
        else if (score === '1-1') calculatedOdds = 5.2 * factor;
        else if (score === '2-2') calculatedOdds = 11.5 * factor;
        else if (score === '3-3') calculatedOdds = 28.0 * factor;
        else if (score === '4-4') calculatedOdds = 60.0 * factor;
        else calculatedOdds = 80.0 * factor;
      }

      const finalOdd = Math.max(1.20, Math.min(120.0, Math.round(calculatedOdds * 100) / 100));

      return {
        id: `${baseId}-${idx}`,
        outcome: score,
        label: score,
        odds: finalOdd,
        status: 'ACTIVE'
      };
    });
  }

  static async recalculateCorrectScoreOdds(matchId: string): Promise<boolean> {
    const match = await this.getMatchById(matchId);
    if (!match) return false;

    const mainMarket = match.markets.find((m: any) => m.type === '1X2');
    if (!mainMarket) return false;

    const hOdd = mainMarket.selections.find((s: any) => s.outcome === '1')?.odds || 2.1;
    const dOdd = mainMarket.selections.find((s: any) => s.outcome === 'X')?.odds || 3.1;
    const aOdd = mainMarket.selections.find((s: any) => s.outcome === '2')?.odds || 3.4;

    const csMarket = match.markets.find((m: any) => m.type === 'CORRECT_SCORE');
    if (!csMarket) return false;

    csMarket.selections = this.generateDefaultCorrectScores(match.homeTeam, match.awayTeam, {
      home: hOdd,
      draw: dOdd,
      away: aOdd
    });

    db.matches.set(match.id, match);
    return true;
  }
}
