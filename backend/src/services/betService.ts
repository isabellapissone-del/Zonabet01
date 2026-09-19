import { db } from '../db/store.ts';
import type { Bet, BetItem, Match, Wallet } from '../types/index.ts';
import { WalletService } from './walletService.ts';
import { RiskService } from './riskService.ts';
import { supabaseService } from '../db/supabase.ts';
import { Mutex } from 'async-mutex';
import { MatchService } from './matchService.ts';

const betMutex = new Mutex();

export class BetService {
  /**
   * Places a new bet (Single or Multiple) using Supabase and WalletService
   */
  static async placeBet(params: {
    userId: string;
    items: { matchId: string; marketId: string; selectionId: string }[];
    stake: number;
  }): Promise<{ bet: Bet; wallet: Wallet }> {
    const { userId, items, stake } = params;

    return await betMutex.runExclusive(async () => {
      // 1. Fetch matches and calculate total odds
      const matches: Match[] = [];
      let totalOdds = 1.0;
      const betItems: BetItem[] = [];

      for (const reqItem of items) {
        const match = await MatchService.getMatchById(reqItem.matchId);
        if (!match) throw new Error(`Jogo ${reqItem.matchId} não encontrado`);
        
        const market = match.markets.find((m) => m.id === reqItem.marketId);
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
          betId: '', // Will be set after bet creation
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

      // 2. Risk check
      await RiskService.checkBetRisk({
        userId,
        items,
        stake,
        potentialReturn,
      });

      // 3. Generate bet ID
      const betId = `bet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      for (const item of betItems) {
        item.betId = betId;
      }

      // 4. Financial execution (Atomic balance check and update)
      const { wallet } = await WalletService.executeTransaction({
        userId,
        type: 'BET',
        amount: stake,
        reference: betId,
        description: `Aposta ${betItems.length > 1 ? 'Múltipla' : 'Simples'} #${betItems.length} seleções`,
      });

      // 5. Create bet record
      const bet: Bet = {
        id: betId,
        userId,
        userName: '', // Will be hydrated by frontend if needed
        userEmail: '',
        type: betItems.length > 1 ? 'MULTIPLE' : 'SINGLE',
        stake,
        totalOdds,
        potentialReturn,
        status: 'PENDING',
        items: betItems,
        createdAt: new Date().toISOString(),
      };

      // 5. Persist to Supabase
      const client = supabaseService.getClient();
      if (client) {
        const { data: betData, error: betError } = await client
          .from('bets')
          .insert({
            id: bet.id,
            user_id: userId,
            total_stake: stake,
            total_odds: totalOdds,
            potential_return: potentialReturn,
            status: 'PENDING',
            created_at: bet.createdAt
          })
          .select()
          .single();

        if (betError) throw betError;

        // Insert items into bet_items table
        const itemsToInsert = betItems.map(item => ({
          id: item.id,
          bet_id: bet.id,
          match_id: item.matchId,
          market_id: item.marketId,
          selection_id: item.selectionId,
          odds_at_bet_time: item.oddsAtBetTime,
          status: 'PENDING',
          created_at: bet.createdAt
        }));

        const { error: itemsError } = await client
          .from('bet_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Keep in local store for redundancy
      db.bets.set(bet.id, bet);

      return { bet, wallet };
    });
  }

  static async getUserBets(userId: string): Promise<Bet[]> {
    const client = supabaseService.getClient();
    if (client) {
      const { data, error } = await client
        .from('bets')
        .select(`
          *,
          bet_items (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        return data.map(b => ({
          id: b.id,
          userId: b.user_id,
          userName: '',
          userEmail: '',
          type: b.bet_items.length > 1 ? 'MULTIPLE' : 'SINGLE',
          stake: Number(b.total_stake),
          totalOdds: Number(b.total_odds),
          potentialReturn: Number(b.potential_return),
          status: b.status,
          items: b.bet_items.map((i: any) => ({
            id: i.id,
            matchId: i.match_id,
            marketId: i.market_id,
            selectionId: i.selection_id,
            oddsAtBetTime: Number(i.odds_at_bet_time),
            status: i.status
          })),
          createdAt: b.created_at,
          settledAt: b.settled_at
        }));
      }
    }
    return Array.from(db.bets.values())
      .filter((b) => b.userId === userId)
      .reverse();
  }

  static async getAllBets(): Promise<Bet[]> {
    const client = supabaseService.getClient();
    if (client) {
      const { data, error } = await client
        .from('bets')
        .select(`
          *,
          profiles (name, phone),
          bet_items (*)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (!error && data) {
        return data.map(b => ({
          id: b.id,
          userId: b.user_id,
          userName: b.profiles?.name || 'Utilizador',
          userEmail: b.profiles?.phone || '',
          type: b.bet_items.length > 1 ? 'MULTIPLE' : 'SINGLE',
          stake: Number(b.total_stake),
          totalOdds: Number(b.total_odds),
          potentialReturn: Number(b.potential_return),
          status: b.status,
          items: b.bet_items.map((i: any) => ({
            id: i.id,
            matchId: i.match_id,
            marketId: i.market_id,
            selectionId: i.selection_id,
            oddsAtBetTime: Number(i.odds_at_bet_time),
            status: i.status
          })),
          createdAt: b.created_at,
          settledAt: b.settled_at
        }));
      }
    }
    return Array.from(db.bets.values()).reverse();
  }

  static async getBetById(id: string): Promise<Bet | null> {
    const client = supabaseService.getClient();
    if (client) {
      const { data, error } = await client
        .from('bets')
        .select(`
          *,
          bet_items (*)
        `)
        .eq('id', id)
        .single();
      
      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          userName: '',
          userEmail: '',
          type: data.bet_items.length > 1 ? 'MULTIPLE' : 'SINGLE',
          stake: Number(data.total_stake),
          totalOdds: Number(data.total_odds),
          potentialReturn: Number(data.potential_return),
          status: data.status,
          items: data.bet_items.map((i: any) => ({
            id: i.id,
            matchId: i.match_id,
            marketId: i.market_id,
            selectionId: i.selection_id,
            oddsAtBetTime: Number(i.odds_at_bet_time),
            status: i.status
          })),
          createdAt: data.created_at,
          settledAt: data.settled_at
        };
      }
    }
    return db.bets.get(id) || null;
  }
}
