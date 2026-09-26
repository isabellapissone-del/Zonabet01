import { db } from '../store/store.ts';
import type { Match, Bet } from '../types/index.ts';
import { WalletService } from './walletService.ts';
import { AuditService } from './auditService.ts';
import { Money } from '../utils/money.ts';
import { MatchService } from './matchService.ts';

export class SettlementService {
  /**
   * Settles a football match with official manual score and payouts
   */
  static async settleMatch(params: {
    adminId: string;
    adminEmail: string;
    matchId: string;
    homeScore: number;
    awayScore: number;
    ip?: string;
  }): Promise<{ match: Match; settledBetsCount: number; wonBetsCount: number; totalPayout: number }> {
    const { adminId, adminEmail, matchId, homeScore, awayScore, ip } = params;

    const match = await MatchService.getMatchById(matchId);
    if (!match) throw new Error('Jogo não encontrado');

    if (match.status === 'FINISHED') {
      throw new Error('Este jogo já foi finalizado e liquidado anteriormente.');
    }

    let winningOutcome: '1' | 'X' | '2';
    if (homeScore > awayScore) winningOutcome = '1';
    else if (homeScore === awayScore) winningOutcome = 'X';
    else winningOutcome = '2';

    const correctScoreStr = `${homeScore}-${awayScore}`;
    const previousStatus = match.status;

    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.status = 'FINISHED';
    match.updatedAt = new Date().toISOString();

    await db.saveMatch(match);

    for (const market of match.markets!) {
      market.status = 'SETTLED';
      if (market.type === 'CORRECT_SCORE') {
        let matched = false;
        for (const sel of market.selections) {
          if (sel.outcome === correctScoreStr) {
            sel.status = 'SETTLED_WIN';
            matched = true;
          } else sel.status = 'SETTLED_LOST';
        }
        if (!matched) {
          for (const sel of market.selections) {
            if (sel.outcome === 'OTHER' || sel.outcome === 'Outro' || sel.label.toLowerCase().includes('outro')) {
              sel.status = 'SETTLED_WIN';
            }
          }
        }
      } else {
        for (const sel of market.selections) {
          if (sel.outcome === winningOutcome) sel.status = 'SETTLED_WIN';
          else sel.status = 'SETTLED_LOST';
        }
      }
    }

    let settledBetsCount = 0;
    let wonBetsCount = 0;
    let totalPayout = 0;

    const allBets = await db.getBets();
    for (const bet of allBets) {
      if (bet.status !== 'PENDING') continue;
      const matchingItems = bet.items.filter((item: any) => item.matchId === matchId);
      if (matchingItems.length === 0) continue;

      for (const item of matchingItems) {
        const market = match.markets!.find((m: any) => m.id === item.marketId);
        const isCorrectScore = market?.type === 'CORRECT_SCORE' || item.marketName.toLowerCase().includes('correto');
        let isWon = false;
        if (isCorrectScore) {
          if (item.outcome === correctScoreStr) isWon = true;
          else if (item.outcome === 'OTHER' || item.outcome === 'Outro' || item.label.toLowerCase().includes('outro')) {
            const otherSelections = market?.selections.filter((s: any) => s.outcome !== 'OTHER' && s.outcome !== 'Outro' && !s.label.toLowerCase().includes('outro')) || [];
            const commonScores = otherSelections.map((s: any) => s.outcome);
            if (!commonScores.includes(correctScoreStr)) isWon = true;
          }
        } else isWon = item.outcome === winningOutcome;
        item.status = isWon ? 'WON' : 'LOST';
      }

      const hasLostItem = bet.items.some((item: any) => item.status === 'LOST');
      const allItemsDecided = bet.items.every((item: any) => item.status === 'WON' || item.status === 'VOID');

      if (hasLostItem) {
        bet.status = 'LOST';
        bet.settledAt = new Date().toISOString();
        await db.saveBet(bet);
        settledBetsCount++;
      } else if (allItemsDecided) {
        let activeOdds = 1.0;
        for (const item of bet.items) if (item.status === 'WON') activeOdds *= item.oddsAtBetTime;
        const finalOdds = Math.round(activeOdds * 100) / 100;
        const payout = Money.multiply(bet.stake, finalOdds);

        bet.status = 'WON';
        bet.settledAt = new Date().toISOString();
        await db.saveBet(bet);
        
        settledBetsCount++;
        wonBetsCount++;
        totalPayout = Money.add(totalPayout, payout);

        await WalletService.executeTransaction({
          userId: bet.userId,
          type: 'WIN',
          amount: payout,
          reference: bet.id,
          description: `Prémio de Aposta Vencedora #${bet.id.substring(0, 10)} (Odd ${finalOdds})`,
        });
      }
    }

    await AuditService.log(adminId, adminEmail, 'SETTLE_MATCH', 'Match', matchId, { status: previousStatus }, {
      status: 'FINISHED',
      homeScore,
      awayScore,
      winningOutcome,
      settledBetsCount,
      wonBetsCount,
      totalPayout,
    }, ip);

    return { match, settledBetsCount, wonBetsCount, totalPayout };
  }

  static async cancelMatch(params: {
    adminId: string;
    adminEmail: string;
    matchId: string;
    reason: string;
    ip?: string;
  }): Promise<{ match: Match; refundedBetsCount: number; totalRefunded: number }> {
    const { adminId, adminEmail, matchId, reason, ip } = params;
    const match = await MatchService.getMatchById(matchId);
    if (!match) throw new Error('Jogo não encontrado');

    if (match.status === 'FINISHED') throw new Error('Não é possível cancelar um jogo já finalizado');

    const previousStatus = match.status;
    match.status = 'CANCELLED';
    match.updatedAt = new Date().toISOString();

    for (const market of match.markets!) {
      market.status = 'CLOSED';
      for (const sel of market.selections) sel.status = 'VOID';
    }

    await db.saveMatch(match);

    let refundedBetsCount = 0;
    let totalRefunded = 0;

    const allBets = await db.getBets();
    for (const bet of allBets) {
      if (bet.status !== 'PENDING') continue;
      const item = bet.items.find((i: any) => i.matchId === matchId);
      if (!item) continue;
      item.status = 'VOID';

      if (bet.type === 'SINGLE') {
        bet.status = 'VOID';
        bet.settledAt = new Date().toISOString();
        await db.saveBet(bet);

        await WalletService.executeTransaction({
          userId: bet.userId,
          type: 'REFUND',
          amount: bet.stake,
          reference: bet.id,
          description: `Reembolso por jogo cancelado: ${match.homeTeam} vs ${match.awayTeam}`,
        });
        refundedBetsCount++;
        totalRefunded = Money.add(totalRefunded, bet.stake);
      } else {
        const allVoid = bet.items.every((i: any) => i.status === 'VOID');
        if (allVoid) {
          bet.status = 'VOID';
          bet.settledAt = new Date().toISOString();
          await db.saveBet(bet);

          await WalletService.executeTransaction({
            userId: bet.userId,
            type: 'REFUND',
            amount: bet.stake,
            reference: bet.id,
            description: `Reembolso de aposta múltipla totalmente anulada`,
          });
          refundedBetsCount++;
          totalRefunded = Money.add(totalRefunded, bet.stake);
        } else {
          // Multi-bet item voided, but bet still pending if other items exist
          await db.saveBet(bet);
        }
      }
    }

    await AuditService.log(adminId, adminEmail, 'CANCEL_MATCH', 'Match', matchId, { status: previousStatus }, { status: 'CANCELLED', reason, refundedBetsCount, totalRefunded }, ip);
    return { match, refundedBetsCount, totalRefunded };
  }
}
