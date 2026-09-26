import { db } from '../store/store.ts';
import type { Wallet, WalletTransaction, TransactionType } from '../types/index.ts';
import { Mutex } from 'async-mutex';

const walletMutex = new Mutex();

export class WalletService {
  /**
   * Retrieves user wallet from in-memory store
   */
  static async getWallet(userId: string): Promise<Wallet> {
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

      // Keep in-memory store in sync
      db.wallets.set(userId, wallet);
      db.transactions.push(transaction);

      return { wallet, transaction };
    });
  }

  /**
   * Resets all user balances to zero in in-memory store.
   */
  static async resetAllBalances(adminId: string, adminEmail: string): Promise<{ affectedRows: number }> {
    let affectedRows = 0;

    // Clear in-memory store
    for (const [userId, wallet] of db.wallets.entries()) {
      if (wallet.balance > 0) {
        affectedRows++;
        wallet.balance = 0;
        wallet.updatedAt = new Date().toISOString();
        db.wallets.set(userId, wallet);
      }
    }

    return { affectedRows };
  }
}
