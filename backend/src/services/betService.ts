import { db } from '../db/store.ts';
import type { Bet, BetItem, Match, Wallet } from '../types/index.ts';
import { WalletService } from './walletService.ts';
import { RiskService } from './riskService.ts';
import { firebaseService } from '../db/firebase.ts';
import { Mutex } from 'async-mutex';
import { MatchService } from './matchService.ts';

const betMutex = new Mutex();

export class BetService {
  /**
   * Places a new bet using Firebase and WalletService
   */
  static async placeBet(params: {
    userId: string;
    items: { matchId: string; marketId: string; selectionId: string }[];
    stake: number;
  }): Promise<{ bet: Bet; wallet: Wallet }> {
    const { userId, items, stake } = params;

    return await betMutex.runExclusive(async () => {
      const matches: Match[] = [];
      let totalOdds = 1.0;
      const betItems: BetItem[] = [];

      for (const reqItem of items) {
        const match = await MatchService.getMatchById(reqItem.matchId);
        if (!match) throw new Error(`Jogo ${reqItem.matchId} não encontrado`);
        
        const market = match.markets!.find((m) => m.id === reqItem.marketId);
        if (!market || market.status !== 'OPEN') {
          throw new Error(`Mercado ${reqItem.marketId} não está disponível para apostas`);
        }

        const selection = market.selections.find((s) => s.id === reqItem.selectionId);
        if (!selection || selection.status !== 'ACTIVE') {
          throw new Error('Seleção não disponível');
        }

        totalOdds = totalOdds * selection.odds;
        matches.push(match);

        betItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          betId: '',
          matchId: match.id,
          matchTitle: `${match.homeTeam} vs ${match.awayTeam}`,
          competitionName: match.competitionName,
          kickoff: `${match.kickoffDate} ${match.kickoffTime}`,
          marketId: market.id,
          marketName: market.name,
          selectionId: selection.id,
          outcome: selection.outcome,
          label: selection.label,
          oddsAtBetTime: selection.odds,
          status: 'PENDING',
        });
      }

      totalOdds = Math.round(totalOdds * 100) / 100;
      const potentialReturn = Math.round(stake * totalOdds * 100) / 100;

      await RiskService.checkBetRisk({
        userId,
        items,
        stake,
        potentialReturn,
      });

      const betId = `bet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      for (const item of betItems) {
        item.betId = betId;
      }

      const { wallet } = await WalletService.executeTransaction({
        userId,
        type: 'BET',
        amount: stake,
        reference: betId,
        description: `Aposta ${betItems.length > 1 ? 'Múltipla' : 'Simples'} #${betItems.length} seleções`,
      });

      const bet: Bet = {
        id: betId,
        userId,
        userName: '',
        userEmail: '',
        type: betItems.length > 1 ? 'MULTIPLE' : 'SINGLE',
        stake,
        totalOdds,
        potentialReturn,
        status: 'PENDING',
        items: betItems,
        createdAt: new Date().toISOString(),
      };

      // Persist to Firebase
      if (firebaseService.isAvailable()) {
        await firebaseService.syncBet(bet);
      }

      db.bets.set(bet.id, bet);
      return { bet, wallet };
    });
  }

  static async getUserBets(userId: string): Promise<Bet[]> {
    if (firebaseService.isAvailable()) {
      try {
        const dbFirestore = firebaseService.getDb()!;
        const snap = await dbFirestore.collection('bets').where('userId', '==', userId).orderBy('createdAt', 'desc').get();
        
        if (!snap.empty) {
          return snap.docs.map(doc => {
            const b = doc.data();
            return {
              id: b.id,
              userId: b.userId,
              userName: '',
              userEmail: '',
              type: (b.items || []).length > 1 ? 'MULTIPLE' : 'SINGLE',
              stake: Number(b.stake || 0),
              totalOdds: Number(b.totalOdds || 1),
              potentialReturn: Number(b.potentialReturn || 0),
              status: b.status || 'PENDING',
              items: (b.items || []).map((i: any) => ({
                ...i,
                oddsAtBetTime: Number(i.oddsAtBetTime || 1)
              })),
              createdAt: b.createdAt,
              settledAt: b.settledAt
            };
          });
        }
      } catch (err) {
        console.warn('[BetService] Firebase getUserBets fallback to local memory:', err);
      }
    }
    return Array.from(db.bets.values())
      .filter((b) => b.userId === userId)
      .reverse();
  }

  static async getAllBets(): Promise<Bet[]> {
    if (firebaseService.isAvailable()) {
      try {
        const dbFirestore = firebaseService.getDb()!;
        const snap = await dbFirestore.collection('bets').orderBy('createdAt', 'desc').limit(100).get();
        
        if (!snap.empty) {
          return snap.docs.map(doc => {
            const b = doc.data();
            return {
              id: b.id,
              userId: b.userId,
              userName: b.userName || 'Utilizador',
              userEmail: b.userEmail || '',
              type: (b.items || []).length > 1 ? 'MULTIPLE' : 'SINGLE',
              stake: Number(b.stake || 0),
              totalOdds: Number(b.totalOdds || 1),
              potentialReturn: Number(b.potentialReturn || 0),
              status: b.status || 'PENDING',
              items: (b.items || []).map((i: any) => ({
                ...i,
                oddsAtBetTime: Number(i.oddsAtBetTime || 1)
              })),
              createdAt: b.createdAt,
              settledAt: b.settledAt
            };
          });
        }
      } catch (err) {
        console.warn('[BetService] Firebase getAllBets fallback to local memory:', err);
      }
    }
    return Array.from(db.bets.values()).reverse();
  }

  static async getBetById(id: string): Promise<Bet | null> {
    if (firebaseService.isAvailable()) {
      try {
        const dbFirestore = firebaseService.getDb()!;
        const doc = await dbFirestore.collection('bets').doc(id).get();
        
        if (doc.exists) {
          const data = doc.data()!;
          return {
            id: data.id,
            userId: data.userId,
            userName: '',
            userEmail: '',
            type: data.items.length > 1 ? 'MULTIPLE' : 'SINGLE',
            stake: Number(data.stake),
            totalOdds: Number(data.totalOdds),
            potentialReturn: Number(data.potentialReturn),
            status: data.status,
            items: data.items.map((i: any) => ({
              ...i,
              oddsAtBetTime: Number(i.oddsAtBetTime)
            })),
            createdAt: data.createdAt,
            settledAt: data.settledAt
          };
        }
      } catch (err) {
        console.warn('[BetService] Firebase getBetById fallback to local memory:', err);
      }
    }
    return db.bets.get(id) || null;
  }
}
