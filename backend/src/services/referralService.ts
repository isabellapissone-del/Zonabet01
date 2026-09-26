import { db } from '../store/store.ts';
import { WalletService } from './walletService.ts';

export class ReferralService {
  /**
   * Processes the 5% bonus on deposits made by an invited user.
   * Credits 5% of the deposited amount directly to the inviter's wallet.
   */
  static async processDepositBonus(
    invitedUserId: string,
    depositAmount: number
  ): Promise<{ bonusAmount: number; inviterId: string; inviterName: string } | null> {
    // 1. Find the invited user profile
    const invitedUser = db.users.get(invitedUserId);
    
    if (!invitedUser || !invitedUser.referredBy) {
      return null;
    }

    // 2. Find the inviter profile
    const inviter = db.users.get(invitedUser.referredBy);
    
    if (!inviter || inviter.isBlocked) {
      return null;
    }

    // 5% bonus calculation
    const BONUS_PERCENT = 0.05;
    const bonusAmount = Math.round(depositAmount * BONUS_PERCENT * 100) / 100;

    if (bonusAmount < 0.01) {
      return null;
    }

    const refCode = `BONUS-REF-${Date.now().toString().slice(-6)}`;
    const description = `Bónus de Convite (5%) - Depósito de ${invitedUser.name} (${depositAmount.toFixed(2)} MT)`;

    try {
      await WalletService.executeTransaction({
        userId: inviter.id,
        type: 'DEPOSIT',
        amount: bonusAmount,
        reference: refCode,
        description,
      });

      console.log(
        `[ReferralService] Bónus de 5% (${bonusAmount} MT) creditado com sucesso a ${inviter.name} (${inviter.phone}) pelo depósito de ${invitedUser.name} (${depositAmount} MT).`
      );

      return {
        bonusAmount,
        inviterId: inviter.id,
        inviterName: inviter.name,
      };
    } catch (err: any) {
      console.error('[ReferralService] Erro ao creditar bónus de convite:', err.message);
      return null;
    }
  }

  /**
   * Retrieves complete referral dashboard info for a user
   */
  static async getReferralInfo(userId: string) {
    const user = db.users.get(userId);
    
    if (!user) {
      throw new Error('Utilizador não encontrado');
    }

    // Get referrals (users invited by this user)
    const referrals = Array.from(db.users.values()).filter(u => u.referredBy === userId);
    
    // Get total bonuses from transaction history
    const bonuses = db.transactions.filter(tx => 
      tx.userId === userId && 
      tx.description.includes('Bónus de Convite')
    );
    
    const totalBonusEarned = bonuses.reduce((sum, b) => sum + Number(b.amount), 0);

    const referralCode = user.referralCode || `ZONA${user.phone.replace(/\D/g, '').slice(-9)}`;
    const referralLink = `/?ref=${referralCode}`;

    return {
      referralCode,
      referralLink,
      bonusPercentage: 5,
      totalInvited: referrals.length,
      totalBonusEarned: Math.round(totalBonusEarned * 100) / 100,
      invitedUsers: referrals.map(u => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        createdAt: u.createdAt
      })),
    };
  }
}
