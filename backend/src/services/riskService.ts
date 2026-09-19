import { db } from '../db/store.ts';
import type { MarketRisk, OutcomeRisk, RiskOverview } from '../types/index.ts';
import { settingsService } from './settingsService.ts';
import { supabaseService } from '../db/supabase.ts';
import { MatchService } from './matchService.ts';

export class RiskService {
  /**
   * Generates a real-time risk overview by aggregating all pending bets from Supabase
   */
  static async getRiskOverview(): Promise<RiskOverview> {
    const settings = await settingsService.getSettings();
    const globalExposureLimit = settings.maxExposurePerMarket || 200000;
    const highThresholdPct = settings.riskHighThresholdPct || 80;
    const mediumThresholdPct = settings.riskMediumThresholdPct || 50;

    const client = supabaseService.getClient();
    let pendingBets: any[] = [];
    
    if (client) {
      const { data } = await client
        .from('bets')
        .select('*')
        .eq('status', 'PENDING');
      if (data) pendingBets = data;
    }

    let totalTurnover = 0;
    let totalPossiblePayout = 0;

    const marketMap = new Map<
      string,
      {
        marketId: string;
        matchId: string;
        bets: { stake: number; odds: number; outcome: string }[];
      }
    >();

    // Process bets from Supabase
    for (const b of pendingBets) {
      totalTurnover += Number(b.stake);
      totalPossiblePayout += Number(b.potential_win);

      const selections = b.selections || [];
      for (const item of selections) {
        let entry = marketMap.get(item.marketId);
        if (!entry) {
          entry = {
            marketId: item.marketId,
            matchId: item.matchId,
            bets: [],
          };
          marketMap.set(item.marketId, entry);
        }

        entry.bets.push({
          stake: Number(b.stake),
          odds: item.oddsAtBetTime,
          outcome: item.outcome,
        });
      }
    }

    const marketRisks: MarketRisk[] = [];
    const alerts: RiskOverview['alerts'] = [];

    for (const [marketId, data] of marketMap.entries()) {
      const match = await MatchService.getMatchById(data.matchId);
      if (!match) continue;

      const market = match.markets.find((m) => m.id === marketId);
      if (!market) continue;

      const exposureLimit = market.maxExposure || globalExposureLimit;
      const totalStake = data.bets.reduce((acc, b) => acc + b.stake, 0);

      const outcomeMap = new Map<string, { count: number; stake: number; payout: number }>();
      for (const sel of market.selections) {
        outcomeMap.set(sel.outcome, { count: 0, stake: 0, payout: 0 });
      }

      for (const bet of data.bets) {
        const curr = outcomeMap.get(bet.outcome) || { count: 0, stake: 0, payout: 0 };
        curr.count += 1;
        curr.stake += bet.stake;
        curr.payout += Math.round(bet.stake * bet.odds * 100) / 100;
        outcomeMap.set(bet.outcome, curr);
      }

      const outcomeRisks: OutcomeRisk[] = [];
      let highestPossiblePayout = 0;
      let topRiskOutcome = 'Nenhum';

      for (const [outcome, stats] of outcomeMap.entries()) {
        const selection = market.selections.find((s) => s.outcome === outcome);
        const label = selection?.label || outcome;
        const odds = selection?.odds || 1.0;
        const netExposure = Math.max(0, stats.payout - totalStake);

        if (stats.payout > highestPossiblePayout) {
          highestPossiblePayout = stats.payout;
          topRiskOutcome = `${label} (${outcome})`;
        }

        outcomeRisks.push({
          outcome,
          label,
          odds,
          betsCount: stats.count,
          totalStake: Math.round(stats.stake * 100) / 100,
          potentialPayout: Math.round(stats.payout * 100) / 100,
          netExposure: Math.round(netExposure * 100) / 100,
        });
      }

      const netExposure = Math.max(0, highestPossiblePayout - totalStake);
      const exposurePercentage =
        exposureLimit > 0 ? Math.min(100, Math.round((netExposure / exposureLimit) * 100)) : 0;

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (exposurePercentage >= highThresholdPct) {
        riskLevel = 'HIGH';
      } else if (exposurePercentage >= mediumThresholdPct) {
        riskLevel = 'MEDIUM';
      }

      if (riskLevel === 'HIGH') {
        alerts.push({
          id: `alert-high-${market.id}`,
          level: 'HIGH',
          message: `Alta concentração de risco no resultado "${topRiskOutcome}" do mercado "${market.name}". Exposição em ${exposurePercentage}% do limite máximo.`,
          marketId: market.id,
          matchTitle: `${match.homeTeam} vs ${match.awayTeam}`,
          createdAt: new Date().toISOString(),
        });
      }

      marketRisks.push({
        marketId: market.id,
        marketName: market.name,
        marketType: market.type,
        matchId: match.id,
        matchTitle: `${match.homeTeam} vs ${match.awayTeam}`,
        competitionName: match.competitionName,
        status: market.status,
        totalBets: data.bets.length,
        totalStake: Math.round(totalStake * 100) / 100,
        highestPossiblePayout: Math.round(highestPossiblePayout * 100) / 100,
        netExposure: Math.round(netExposure * 100) / 100,
        exposureLimit,
        exposurePercentage,
        riskLevel,
        topRiskOutcome,
        outcomes: outcomeRisks,
      });
    }

    marketRisks.sort((a, b) => {
      const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (order[b.riskLevel] !== order[a.riskLevel]) return order[b.riskLevel] - order[a.riskLevel];
      return b.exposurePercentage - a.exposurePercentage;
    });

    const highRiskMarketsCount = marketRisks.filter((m) => m.riskLevel === 'HIGH').length;
    const mediumRiskMarketsCount = marketRisks.filter((m) => m.riskLevel === 'MEDIUM').length;
    const totalNetExposure = marketRisks.reduce((acc, m) => acc + m.netExposure, 0);

    return {
      totalActiveBets: pendingBets.length,
      totalTurnover: Math.round(totalTurnover * 100) / 100,
      totalPossiblePayout: Math.round(totalPossiblePayout * 100) / 100,
      totalNetExposure: Math.round(totalNetExposure * 100) / 100,
      highRiskMarketsCount,
      mediumRiskMarketsCount,
      markets: marketRisks,
      alerts,
      settings: {
        maxExposurePerMarket: globalExposureLimit,
        autoSuspendHighRisk: settings.autoSuspendHighRisk,
        riskHighThresholdPct: highThresholdPct,
      },
    };
  }

  static async checkBetRisk(params: {
    userId: string;
    items: { matchId: string; marketId: string; selectionId: string }[];
    stake: number;
    potentialReturn: number;
  }): Promise<void> {
    const settings = await settingsService.getSettings();

    if (params.stake > settings.maxStake) {
      throw new Error(`O montante máximo por aposta é de ${settings.maxStake.toLocaleString()} MT.`);
    }
    if (params.stake < settings.minStake) {
      throw new Error(`O montante mínimo por aposta é de ${settings.minStake.toLocaleString()} MT.`);
    }
    if (params.potentialReturn > settings.maxPotentialWin) {
      throw new Error(`O retorno potencial excede o limite máximo permitido de ${settings.maxPotentialWin.toLocaleString()} MT.`);
    }

    const today = new Date().toISOString().split('T')[0];
    const client = supabaseService.getClient();
    let userTotalStakeToday = 0;
    
    if (client) {
      const { data } = await client
        .from('bets')
        .select('stake')
        .eq('user_id', params.userId)
        .gte('placed_at', `${today}T00:00:00Z`);
      
      if (data) {
        userTotalStakeToday = data.reduce((acc, b) => acc + Number(b.stake), 0);
      }
    }

    if (userTotalStakeToday + params.stake > settings.maxDailyStakePerUser) {
      throw new Error(`Atingiu o limite diário de apostas por usuário (${settings.maxDailyStakePerUser.toLocaleString()} MT). Stake atual hoje: ${userTotalStakeToday.toLocaleString()} MT.`);
    }

    for (const item of params.items) {
      const match = await MatchService.getMatchById(item.matchId);
      if (!match) continue;

      const market = match.markets.find((m) => m.id === item.marketId);
      if (!market) continue;

      if (market.status !== 'OPEN') {
        throw new Error(`O mercado "${market.name}" encontra-se suspenso devido a controlo de risco da casa.`);
      }

      if (market.maxStake && params.stake > market.maxStake) {
        throw new Error(`O limite máximo de aposta específico para o mercado "${market.name}" é de ${market.maxStake.toLocaleString()} MT.`);
      }
    }
  }
}
