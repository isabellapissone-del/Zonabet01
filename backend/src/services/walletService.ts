import { db } from '../store/store.ts';
import type { Wallet, WalletTransaction, TransactionType } from '../types/index.ts';

export class WalletService {
  /**
   * Retrieves user wallet from in-memory store
   */
  static async getWallet(userId: string): Promise<Wallet> {
    let wallet = await db.getWallet(userId);
    if (!wallet) {
      // Create wallet if doesn't exist
      wallet = {
        id: userId,
        userId: userId,
        balance: 0,
        lockedBalance: 0,
        updatedAt: new Date().toISOString(),
      };
      await db.saveWallet(wallet);
    }
    return wallet;
  }

  /**
   * Executes an atomic financial transaction using in-memory store
   */
  static async executeTransaction(params: {
    userId: string;
    type: TransactionType;
    amount: number;
    reference: string;
    description: string;
    adminId?: string;
  }): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    const { userId, type, amount, reference, description } = params;

    const result = await db.executeTransaction({
      userId,
      type,
      amount,
      reference,
      description
    });

    return result;
  }

  /**
   * Resets all user balances to zero (Admin operation)
   */
  static async resetAllBalances(adminId: string, adminEmail: string): Promise<{ affectedRows: number }> {
    const affectedRows = await db.resetAllBalances();
    return { affectedRows };
  }
}
