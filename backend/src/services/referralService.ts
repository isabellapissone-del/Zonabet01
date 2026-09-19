import { db } from '../db/store.ts';
import { WalletService } from './walletService.ts';
import type { Referral } from '../types/index.ts';
import { supabaseService } from '../db/supabase.ts';

export class ReferralService {
  /**
   * Processes the 5% bonus on deposits made by an invited user.
   * Credits 5% of the deposited amount directly to the inviter's wallet.
   */
  static async processDepositBonus(
    invitedUserId: string,
    depositAmount: number
  ): Promise<{ bonusAmount: number; inviterId: string; inviterName: string } | null> {
    const client = supabaseService.getClient();
    if (!client) return null;

    // 1. Find the invited user profile
    const { data: invitedUser, error: invitedError } = await client
      .from('profiles')
      .select('id, name, phone, referred_by')
      .eq('id', invitedUserId)
      .single();
    
    if (invitedError || !invitedUser || !invitedUser.referred_by) {
      return null;
    }

    // 2. Find the inviter profile
    const { data: inviter, error: inviterError } = await client
      .from('profiles')
      .select('id, name, phone, status')
      .eq('id', invitedUser.referred_by)
      .single();
    
    if (inviterError || !inviter || inviter.status === 'BLOCKED') {
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
    const client = supabaseService.getClient();
    if (!client) throw new Error('Supabase indisponível');

    const { data: user, error: userError } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      throw new Error('Utilizador não encontrado');
    }

    // Get referrals (users invited by this user)
    const { data: referrals, error: refError } = await client
      .from('profiles')
      .select('id, name, phone, created_at')
      .eq('referred_by', userId);
    
    const referralList = referrals || [];
    
    // Get total bonuses from transaction history
    const { data: bonuses, error: bonusError } = await client
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .ilike('description', '%Bónus de Convite%');
    
    const totalBonusEarned = (bonuses || []).reduce((sum, b) => sum + Number(b.amount), 0);

    const referralCode = user.referral_code || `ZONA${user.phone.replace(/\D/g, '').slice(-9)}`;
    const referralLink = `/?ref=${referralCode}`;

    return {
      referralCode,
      referralLink,
      bonusPercentage: 5,
      totalInvited: referralList.length,
      totalBonusEarned: Math.round(totalBonusEarned * 100) / 100,
      invitedUsers: referralList,
    };
  }
}
