import { db } from '../db/store.ts';
import type { Wallet, WalletTransaction, TransactionType } from '../types/index.ts';
import { supabaseService } from '../db/supabase.ts';
import { Mutex } from 'async-mutex';

const walletMutex = new Mutex();

export class WalletService {
  /**
   * Retrieves user wallet from Supabase profile
   */
  static async getWallet(userId: string): Promise<Wallet> {
    const client = supabaseService.getClient();
    if (client) {
      const { data, error } = await client
        .from('profiles')
        .select('id, balance, updated_at')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        return {
          id: data.id,
          userId: data.id,
          balance: Number(data.balance),
          lockedBalance: 0,
          updatedAt: data.updated_at,
        };
      }
    }

    // Fallback to in-memory for testing if Supabase is down
    let wallet = db.wallets.get(userId);
    if (!wallet) {
      wallet = {
        id: userId,
        userId,
        balance: 0,
        lockedBalance: 0,
        updatedAt: new Date().toISOString(),
      };
      db.wallets.set(userId, wallet);
    }
    return wallet;
  }

  /**
   * Executes an atomic financial transaction (Deposit, Withdrawal, Bet Placement, Win, Refund)
   */
  static async executeTransaction(params: {
    userId: string;
    type: TransactionType;
    amount: number;
    reference: string;
    description: string;
    adminId?: string;
  }): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    const { userId, type, amount, reference, description, adminId } = params;

    return await walletMutex.runExclusive(async () => {
      const wallet = await this.getWallet(userId);
      const previousBalance = wallet.balance;
      let nextBalance = previousBalance;

      // Calculate next balance based on transaction type
      switch (type) {
        case 'DEPOSIT':
        case 'WIN':
        case 'REFUND':
          nextBalance = Math.round((previousBalance + amount) * 100) / 100;
          break;
        case 'WITHDRAWAL':
        case 'BET':
          if (previousBalance < amount) {
            throw new Error('Saldo insuficiente para realizar esta operação.');
          }
          nextBalance = Math.round((previousBalance - amount) * 100) / 100;
          break;
        case 'ADJUSTMENT':
          // For adjustments, amount can be positive (credit) or negative (debit)
          nextBalance = Math.round((previousBalance + amount) * 100) / 100;
          if (nextBalance < 0) {
            throw new Error('O ajuste resultaria em saldo negativo.');
          }
          break;
        default:
          throw new Error('Tipo de transação inválido.');
      }

      const transaction: WalletTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        walletId: userId,
        userId,
        type,
        amount,
        previousBalance,
        nextBalance,
        reference,
        description,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };

      // Update wallet state
      wallet.balance = nextBalance;
      wallet.updatedAt = new Date().toISOString();

      // Persist to Supabase if available
      const client = supabaseService.getClient();
      if (client) {
        try {
          // Update profile balance
          const { error: profileError } = await client
            .from('profiles')
            .update({
              balance: nextBalance,
              updated_at: wallet.updatedAt
            })
            .eq('id', userId);

          if (profileError) throw profileError;

          // Map types to DDL enum
          const ddlType = type === 'DEPOSIT' ? 'DEPOSIT' :
                         type === 'WITHDRAWAL' ? 'WITHDRAWAL' :
                         type === 'BET' ? 'BET_PLACEMENT' :
                         type === 'WIN' ? 'BET_WIN' :
                         type === 'REFUND' ? 'REFUND' : 'MANUAL_ADJUSTMENT';

          // Create transaction record
          const { error: txError } = await client
            .from('transactions')
            .insert({
              id: transaction.id,
              user_id: userId,
              type: ddlType,
              amount: amount,
              prev_balance: previousBalance,
              next_balance: nextBalance,
              description: description,
              reference_id: reference,
              admin_id: adminId || null,
              created_at: transaction.createdAt
            });

          if (txError) throw txError;
          
        } catch (err: any) {
          console.error('[Supabase Transaction Error]:', err.message);
          // We still return the local state update to prevent UI freezing, 
          // but logging the error is crucial for debugging.
        }
      }

      // Keep in-memory store in sync as a secondary local cache
      db.wallets.set(userId, wallet);
      db.transactions.push(transaction);

      return { wallet, transaction };
    });
  }

  /**
   * Resets all user balances to zero in Supabase and in-memory store.
   * This is used for "cleaning up" virtual/test money.
   */
  static async resetAllBalances(adminId: string, adminEmail: string): Promise<{ affectedRows: number }> {
    const client = supabaseService.getClient();
    let affectedRows = 0;

    if (client) {
      try {
        // 1. Get all profiles with balance > 0
        const { data: profiles, error: fetchError } = await client
          .from('profiles')
          .select('id, balance')
          .gt('balance', 0);
        
        if (fetchError) throw fetchError;

        if (profiles && profiles.length > 0) {
          affectedRows = profiles.length;
          
          // 2. Set all balances to 0 in Supabase
          const { error: updateError } = await client
            .from('profiles')
            .update({ balance: 0, updated_at: new Date().toISOString() })
            .gt('balance', 0);

          if (updateError) throw updateError;

          // 3. Create cleanup transaction records for each user
          const cleanupTransactions = profiles.map(p => ({
            user_id: p.id,
            type: 'MANUAL_ADJUSTMENT',
            amount: -Number(p.balance),
            prev_balance: Number(p.balance),
            next_balance: 0,
            description: 'Limpeza de Saldo Virtual / Reset Administrativo',
            reference_id: `RESET-${Date.now()}`,
            admin_id: adminId,
            created_at: new Date().toISOString()
          }));

          const { error: txError } = await client
            .from('transactions')
            .insert(cleanupTransactions);

          if (txError) {
            console.error('[ResetBalances] Error inserting cleanup transactions:', txError.message);
          }
        }
      } catch (err: any) {
        console.error('[ResetBalances] Supabase error:', err.message);
        throw new Error(`Erro ao resetar saldos no Supabase: ${err.message}`);
      }
    }

    // Always clear in-memory store
    for (const [userId, wallet] of db.wallets.entries()) {
      if (wallet.balance > 0) {
        wallet.balance = 0;
        wallet.updatedAt = new Date().toISOString();
        db.wallets.set(userId, wallet);
      }
    }

    return { affectedRows };
  }
}
