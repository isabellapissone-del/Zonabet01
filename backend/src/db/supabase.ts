import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dbStore } from './store.ts';
import type { User, Wallet, WalletTransaction, Match, Bet, DepositProof, AuditLog } from '../types/index.ts';

dotenv.config();

export interface SupabaseStatus {
  isConfigured: boolean;
  connected: boolean;
  realtimeEnabled: boolean;
  autoSyncActive: boolean;
  url: string | null;
  hasServiceKey: boolean;
  hasAnonKey: boolean;
  error?: string | null;
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private url: string | null = null;
  private key: string | null = null;

  constructor() {
    this.init();
  }

  public init() {
    const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null;
    this.url = rawUrl
      ? rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
      : null;

    const rawKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      null;
    this.key = rawKey ? rawKey.trim() : null;

    if (this.url && this.key && this.url.startsWith('http')) {
      try {
        this.client = createClient(this.url, this.key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        console.log(`[Supabase] Conectado ao endpoint: ${this.url}`);
      } catch (err) {
        console.error('[Supabase] Erro ao inicializar cliente:', err);
        this.client = null;
      }
    } else {
      console.log('[Supabase] Modo local/em memória ativo. Configure as chaves no .env para persistência real.');
    }
  }

  public getClient(): SupabaseClient | null {
    if (!this.client) {
      this.init();
    }
    return this.client;
  }

  public isAvailable(): boolean {
    return Boolean(this.getClient());
  }

  public async getStatus(): Promise<SupabaseStatus> {
    const isConfigured = Boolean(this.url && this.key && this.url.startsWith('http'));
    if (!isConfigured || !this.client) {
      return {
        isConfigured: false,
        connected: false,
        realtimeEnabled: true,
        autoSyncActive: false,
        url: this.url || null,
        hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
        error: 'Chaves de ligação ao Supabase não configuradas.',
      };
    }

    try {
      const { error } = await this.client.from('profiles').select('id').limit(1);
      if (error) {
        return {
          isConfigured: true,
          connected: false,
          realtimeEnabled: true,
          autoSyncActive: false,
          url: this.url,
          hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
          error: error.message.includes('not find') || error.code === 'PGRST205'
            ? 'As tabelas ainda não foram criadas no Supabase. Por favor, execute o script SQL DDL no SQL Editor do Supabase.'
            : `Erro ao aceder à tabela 'profiles': ${error.message}.`,
        };
      }

      return {
        isConfigured: true,
        connected: true,
        realtimeEnabled: true,
        autoSyncActive: true,
        url: this.url,
        hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      };
    } catch (err: any) {
      return {
        isConfigured: true,
        connected: false,
        realtimeEnabled: true,
        autoSyncActive: false,
        url: this.url,
        hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        hasAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
        error: err.message || 'Falha ao ligar ao Supabase',
      };
    }
  }

  // =========================================================================
  // GATILHOS DE SINCRONIZAÇÃO EM TEMPO REAL (MANTIDOS PARA COMPATIBILIDADE)
  // =========================================================================

  public async syncUserRealtime(user: User): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('profiles').upsert({
        id: user.id,
        phone: user.phone,
        email: user.email,
        password_hash: user.passwordHash,
        name: user.name,
        role: user.role,
        status: user.isBlocked ? 'BLOCKED' : 'ACTIVE',
        referral_code: user.referralCode,
        referred_by: user.referredBy || null,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('[Supabase Sync] Erro ao sincronizar perfil:', err);
    }
  }

  public async syncWalletRealtime(wallet: Wallet): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('profiles').update({
        balance: wallet.balance,
        updated_at: wallet.updatedAt,
      }).eq('id', wallet.userId);
    } catch (err) {
      console.warn('[Supabase Sync] Erro ao sincronizar saldo:', err);
    }
  }

  public async syncTransactionRealtime(tx: WalletTransaction): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('transactions').upsert({
        id: tx.id,
        user_id: tx.userId,
        type: tx.type === 'DEPOSIT' ? 'DEPOSIT' : 
              tx.type === 'WITHDRAWAL' ? 'WITHDRAWAL' : 
              tx.type === 'BET' ? 'BET_PLACEMENT' : 
              tx.type === 'WIN' ? 'BET_WIN' : 
              tx.type === 'REFUND' ? 'REFUND' : 'MANUAL_ADJUSTMENT',
        amount: tx.amount,
        prev_balance: tx.previousBalance,
        next_balance: tx.nextBalance,
        reference_id: tx.reference,
        description: tx.description || null,
        created_at: tx.createdAt,
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('[Supabase Sync] Erro ao sincronizar transação:', err);
    }
  }

  public async syncMatchRealtime(match: Match): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('matches').upsert({
        id: match.id,
        competition_id: match.competitionId,
        competition_name: match.competitionName,
        competition_category: match.competitionCategory,
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        start_time: `${match.kickoffDate}T${match.kickoffTime}:00Z`,
        status: match.status === 'OPEN' ? 'PRE_MATCH' : 
                match.status === 'FINISHED' ? 'FINISHED' : 
                match.status === 'CANCELLED' ? 'CANCELLED' : 'PRE_MATCH',
        home_score: match.homeScore ?? 0,
        away_score: match.awayScore ?? 0,
        created_at: match.createdAt,
      }, { onConflict: 'id' });

      // Sync markets and selections if present
      if (match.markets && match.markets.length > 0) {
        for (const market of match.markets) {
          await this.client.from('markets').upsert({
            id: market.id,
            match_id: match.id,
            name: market.name,
            type: market.type,
            status: market.status,
            max_exposure: market.maxExposure ?? null,
            max_stake: market.maxStake ?? null,
            created_at: match.createdAt,
          }, { onConflict: 'id' });

          if (market.selections && market.selections.length > 0) {
            const selectionsData = market.selections.map((sel) => ({
              id: sel.id,
              market_id: market.id,
              outcome: sel.outcome,
              label: sel.label,
              odds: sel.odds,
              status: sel.status,
              result: sel.status === 'SETTLED_WIN' ? 'WIN' : sel.status === 'SETTLED_LOST' ? 'LOSS' : sel.status === 'VOID' ? 'VOID' : 'PENDING',
              created_at: match.createdAt,
            }));
            await this.client.from('selections').upsert(selectionsData, { onConflict: 'id' });
          }
        }
      }
    } catch (err) {
      console.warn('[Supabase Sync] Erro ao sincronizar jogo:', err);
    }
  }

  public async deleteMatchRealtime(matchId: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('matches').delete().eq('id', matchId);
    } catch (err) {
      console.warn('[Supabase Sync] Erro ao excluir jogo:', err);
    }
  }

  public async syncBetRealtime(bet: Bet): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('bets').upsert({
        id: bet.id,
        user_id: bet.userId,
        total_stake: bet.stake,
        total_odds: bet.totalOdds,
        potential_return: bet.potentialReturn,
        status: bet.status,
        created_at: bet.createdAt,
      }, { onConflict: 'id' });
      
      // Sync items
      if (bet.items && bet.items.length > 0) {
        const items = bet.items.map(item => ({
          id: item.id,
          bet_id: bet.id,
          match_id: item.matchId,
          market_id: item.marketId,
          selection_id: item.selectionId,
          odds_at_bet_time: item.oddsAtBetTime,
          status: item.status,
          created_at: bet.createdAt
        }));
        await this.client.from('bet_items').upsert(items, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('[Supabase Sync] Erro ao sincronizar aposta:', err);
    }
  }

  public async syncAuditLogRealtime(log: AuditLog): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('audit_logs').upsert({
        id: log.id,
        admin_id: log.adminId || null,
        admin_email: log.adminEmail,
        action: log.action,
        entity_type: log.entity,
        entity_id: log.entityId || '0',
        old_value: log.oldValue,
        new_value: log.newValue,
        ip_address: log.ip,
        created_at: log.timestamp,
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('[Supabase Sync] Erro ao sincronizar auditoria:', err);
    }
  }

  public async findUserById(id: string): Promise<User | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        phone: data.phone,
        name: data.name,
        email: data.email || `${data.phone}@zonabet.co.mz`,
        passwordHash: data.password_hash || '',
        role: data.role as 'USER' | 'ADMIN',
        isBlocked: data.status === 'BLOCKED',
        referralCode: data.referral_code || '',
        referredBy: data.referred_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error('[Supabase] Erro ao buscar usuário por ID:', err);
      return null;
    }
  }

  public async syncDepositProofRealtime(proof: DepositProof): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('withdrawals').upsert({
        id: proof.id,
        user_id: proof.userId,
        amount: proof.amount,
        fee: 0.00,
        net_amount: proof.amount,
        method: proof.method,
        account_number: proof.referenceCode || '',
        status: proof.status === 'APPROVED' ? 'COMPLETED' : proof.status === 'REJECTED' ? 'REJECTED' : 'PENDING',
        created_at: proof.createdAt,
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('[Supabase Sync] Erro ao sincronizar comprovativo:', err);
    }
  }

  public async syncSettingsRealtime(settings: any): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('system_settings').upsert({
        id: 'default',
        config: settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('[Supabase Sync] Erro ao sincronizar configurações:', err);
    }
  }

  public async syncLocalDataToSupabase(): Promise<{ success: boolean; results: any }> {
    if (!this.client) throw new Error('Supabase client not initialized');
    
    const results = {
      users: 0,
      matches: 0,
      bets: 0,
      settings: 0,
    };

    for (const user of dbStore.users.values()) {
      await this.syncUserRealtime(user);
      results.users++;
    }
    for (const match of dbStore.matches.values()) {
      await this.syncMatchRealtime(match);
      results.matches++;
    }
    for (const bet of dbStore.bets.values()) {
      await this.syncBetRealtime(bet);
      results.bets++;
    }
    if (dbStore.settings) {
      await this.syncSettingsRealtime(dbStore.settings);
      results.settings = 1;
    }

    return { success: true, results };
  }

  public async pullDataFromSupabase(): Promise<{ success: boolean; results?: any }> {
    if (!this.client) throw new Error('Supabase client não está inicializado.');
    
    const results = { users: 0, matches: 0, settings: 0 };
    try {
      // 1. Fetch profiles
      const { data: profiles, error: pErr } = await this.client.from('profiles').select('*');
      if (!pErr && profiles && profiles.length > 0) {
        for (const p of profiles) {
          const existing = dbStore.users.get(p.id);
          if (existing) {
            existing.name = p.name || existing.name;
            existing.email = p.email || existing.email;
            existing.passwordHash = p.password_hash || existing.passwordHash;
            existing.role = p.role || existing.role;
            existing.isBlocked = p.status === 'BLOCKED';
            const wallet = dbStore.wallets.get(p.id);
            if (wallet) {
              wallet.balance = Number(p.balance) || 0;
            }
          }
          results.users++;
        }
      }

      // 2. System settings
      const { data: settingsData } = await this.client
        .from('system_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (settingsData && settingsData.config) {
        dbStore.settings = { ...dbStore.settings, ...settingsData.config };
        results.settings = 1;
      }

      // 3. Matches & Markets
      const { data: matchesData, error: mErr } = await this.client
        .from('matches')
        .select(`
          *,
          markets (
            *,
            selections (*)
          )
        `);
      if (!mErr && matchesData && matchesData.length > 0) {
        for (const m of matchesData) {
          const rawTime = m.start_time || '';
          const dateParts = rawTime.includes('T') ? rawTime.split('T') : [rawTime || 'Hoje', '15:00'];
          const comp = dbStore.competitions.find(c => c.id === m.competition_id);
          const compCategory = (m.competition_category && m.competition_category !== 'Futebol')
            ? m.competition_category
            : (comp?.category || (m.competition_id?.toLowerCase().includes('prov') || m.competition_name?.toLowerCase().includes('provincial') ? 'PROVINCIAL' : m.competition_id?.toLowerCase().includes('dist') || m.competition_name?.toLowerCase().includes('distrital') ? 'DISTRITAL' : 'MOCAMBOLA'));

          const matchObj: Match = {
            id: m.id,
            competitionId: m.competition_id,
            competitionName: m.competition_name || comp?.name || 'Moçambola',
            competitionCategory: compCategory as any,
            homeTeam: m.home_team,
            awayTeam: m.away_team,
            kickoffDate: dateParts[0] || 'Hoje',
            kickoffTime: (dateParts[1] || '15:00').substring(0, 5),
            status: m.status === 'PRE_MATCH' ? 'OPEN' : m.status || 'OPEN',
            homeScore: m.home_score,
            awayScore: m.away_score,
            isFeatured: m.is_featured ?? false,
            markets: (m.markets || []).map((mk: any) => ({
              id: mk.id,
              name: mk.name,
              type: mk.type,
              status: mk.status || 'ACTIVE',
              maxExposure: mk.max_exposure,
              maxStake: mk.max_stake,
              selections: (mk.selections || []).map((s: any) => ({
                id: s.id,
                outcome: s.outcome,
                label: s.label,
                odds: Number(s.odds || 1.01),
                status: s.status || 'ACTIVE'
              }))
            })),
            createdAt: m.created_at || new Date().toISOString(),
            updatedAt: m.created_at || new Date().toISOString()
          };
          dbStore.matches.set(m.id, matchObj);
          results.matches++;
        }
      }

      return { success: true, results };
    } catch (err: any) {
      console.error('[Supabase Pull] Erro ao importar dados:', err);
      return { success: false, results };
    }
  }
}

export const supabaseService = new SupabaseService();
