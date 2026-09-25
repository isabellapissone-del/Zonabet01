import { db } from '../db/store.ts';
import type { Wallet, WalletTransaction, TransactionType } from '../types/index.ts';
import { firebaseService } from '../db/firebase.ts';
import { Mutex } from 'async-mutex';

const walletMutex = new Mutex();

export class WalletService {
  /**
   * Retrieves user wallet from Firebase profile
   */
  static async getWallet(userId: string): Promise<Wallet> {
    if (firebaseService.isAvailable()) {
      try {
        const dbFirestore = firebaseService.getDb()!;
        const doc = await dbFirestore.collection('users').doc(userId).get();
        
        if (doc.exists) {
          const data = doc.data()!;
          return {
            id: userId,
            userId: userId,
            balance: Number(data.balance || 0),
            lockedBalance: 0,
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
        }
      } catch (err: any) {
        console.warn(`[WalletService] Aviso ao obter carteira do Firestore para ${userId}:`, err?.message || err);
      }
    }

    // Fallback to in-memory for testing if Firebase is down or not configured
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

      // Persist to Firebase if available
      if (firebaseService.isAvailable()) {
        try {
          await firebaseService.syncWallet(wallet);
          await firebaseService.syncTransaction(transaction);
        } catch (err: any) {
          console.error('[Firebase Transaction Error]:', err.message);
        }
      }

      // Keep in-memory store in sync as a secondary local cache
      db.wallets.set(userId, wallet);
      db.transactions.push(transaction);

      return { wallet, transaction };
    });
  }

  /**
   * Resets all user balances to zero in Firebase and in-memory store.
   */
  static async resetAllBalances(adminId: string, adminEmail: string): Promise<{ affectedRows: number }> {
    let affectedRows = 0;

    if (firebaseService.isAvailable()) {
      const dbFirestore = firebaseService.getDb()!;
      try {
        const usersSnap = await dbFirestore.collection('users').where('balance', '>', 0).get();
        affectedRows = usersSnap.size;

        if (!usersSnap.empty) {
          const batch = dbFirestore.batch();
          const timestamp = new Date().toISOString();

          usersSnap.forEach(doc => {
            const userId = doc.id;
            const prevBalance = doc.data().balance;
            
            // Update user balance
            batch.update(doc.ref, { balance: 0, updatedAt: timestamp });

            // Create transaction record
            const txRef = dbFirestore.collection('transactions').doc(`tx-reset-${userId}-${Date.now()}`);
            batch.set(txRef, {
              id: txRef.id,
              userId: userId,
              type: 'ADJUSTMENT',
              amount: -prevBalance,
              prevBalance: prevBalance,
              nextBalance: 0,
              description: 'Limpeza de Saldo Virtual / Reset Administrativo',
              referenceId: `RESET-${Date.now()}`,
              adminId: adminId,
              createdAt: timestamp
            });
          });

          await batch.commit();
        }
      } catch (err: any) {
        console.error('[ResetBalances] Firebase error:', err.message);
        throw new Error(`Erro ao resetar saldos no Firebase: ${err.message}`);
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
