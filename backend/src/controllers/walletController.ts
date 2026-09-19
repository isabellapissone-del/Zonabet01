import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { db } from '../db/store.ts';
import { WalletService } from '../services/walletService.ts';
import { ReferralService } from '../services/referralService.ts';
import { config } from '../config/index.ts';
import { supabaseService } from '../db/supabase.ts';

import { settingsService } from '../services/settingsService.ts';

export class WalletController {
  static async getWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const wallet = await WalletService.getWallet(req.user.userId);
    res.status(200).json({
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        currency: config.currency,
        isTestMode: config.isTestMode,
      },
    });
  }

  static async getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const client = supabaseService.getClient();
    if (client) {
      let { data, error } = await client
        .from('transactions')
        .select('*')
        .eq('user_id', req.user.userId)
        .order('created_at', { ascending: false });

      if (error) {
        const alt = await client
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', req.user.userId)
          .order('created_at', { ascending: false });
        data = alt.data;
        error = alt.error;
      }
      
      if (!error && data) {
        const transactions = data.map(tx => ({
          id: tx.id,
          userId: tx.user_id,
          type: tx.type === 'BET_PLACEMENT' ? 'BET' : tx.type === 'BET_WIN' ? 'WIN' : tx.type,
          amount: Number(tx.amount),
          previousBalance: Number(tx.prev_balance ?? tx.balance_before ?? 0),
          nextBalance: Number(tx.next_balance ?? tx.balance_after ?? 0),
          reference: tx.reference_id ?? tx.reference ?? '',
          description: tx.description ?? tx.notes ?? '',
          status: 'COMPLETED',
          createdAt: tx.created_at,
        }));
        res.status(200).json({ transactions });
        return;
      }
    }

    const transactions = db.getTransactions(req.user.userId);
    res.status(200).json({ transactions });
  }

  // Process deposit request (M-Pesa, e-Mola, mKesh, Bank Transfer)
  static async deposit(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const amount = Number(req.body.amount);
    const method = (req.body.method || 'EMOLA').toUpperCase();
    const phone = req.body.phoneNumber ? String(req.body.phoneNumber).trim() : '';

    if (isNaN(amount) || amount < 10) {
      res.status(400).json({ error: 'Montante mínimo de depósito é de 10,00 MT.' });
      return;
    }

    if (amount > 100000) {
      res.status(400).json({ error: 'Montante máximo de depósito por operação é de 100.000,00 MT.' });
      return;
    }

    if (!method.includes('EMOLA') && !method.includes('E-MOLA')) {
      res.status(400).json({ error: 'O único canal de depósito aceite na plataforma é e-Mola (Movitel).' });
      return;
    }

    const methodLabel = 'e-Mola (Movitel)';
    const shortCode = 'EMOLA';

    const user = db.users.get(req.user.userId);
    const targetPhone = phone || user?.phone || 'Celular da Conta';
    const refCode = `DEP-${shortCode}-${Date.now().toString().slice(-6)}`;

    const receiptImage = req.body.receiptImage ? String(req.body.receiptImage) : undefined;
    const receiptFileName = req.body.receiptFileName ? String(req.body.receiptFileName) : undefined;
    const receiptFileSize = req.body.receiptFileSize ? Number(req.body.receiptFileSize) : undefined;
    const receiptReference = req.body.receiptReference ? String(req.body.receiptReference).trim() : undefined;
    const notes = req.body.notes ? String(req.body.notes).trim() : undefined;

    try {
      // Register deposit proof for administration review & audit trail
      const depositProof = db.addDepositProof({
        id: `proof-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: req.user.userId,
        userName: user?.name || 'Apostador ZONABET',
        userPhone: targetPhone,
        userEmail: user?.email || '',
        amount,
        method: shortCode as any,
        referenceCode: refCode,
        operatorTxId: receiptReference,
        receiptFileName,
        receiptDataUrl: receiptImage,
        receiptFileSize,
        notes,
        status: 'PENDING',
        reviewedBy: '',
        reviewNotes: receiptFileName
          ? `Comprovativo enviado pelo apostador (${receiptFileName}). Aguardando conferência administrativa.`
          : 'Depósito registrado. Aguardando validação manual.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Real-time synchronization with Supabase
      supabaseService.syncDepositProofRealtime(depositProof).catch(console.error);

      res.status(200).json({
        message: `Pedido de depósito de ${amount.toFixed(2)} MZN via ${methodLabel} submetido! Aguarde a validação administrativa.`,
        depositProof,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao processar depósito' });
    }
  }

  // Process withdrawal request exclusively via e-Mola (Movitel)
  static async withdraw(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const amount = Number(req.body.amount);
    const method = (req.body.method || 'EMOLA').toUpperCase();
    const phone = req.body.phoneNumber ? String(req.body.phoneNumber).trim() : '';

    const settings = await settingsService.getSettings();
    const minWithdrawal = settings.minWithdrawal || 20;
    const maxWithdrawal = settings.maxWithdrawal || 100000;

    if (isNaN(amount) || amount < minWithdrawal) {
      res.status(400).json({ error: `Montante mínimo de levantamento é de ${minWithdrawal.toFixed(2)} MT.` });
      return;
    }

    if (amount > maxWithdrawal) {
      res.status(400).json({ error: `Montante máximo de levantamento por pedido é de ${maxWithdrawal.toFixed(2)} MT.` });
      return;
    }

    if (!method.includes('EMOLA') && !method.includes('E-MOLA')) {
      res.status(400).json({ error: 'O único canal de levantamento aceite na plataforma é e-Mola (Movitel).' });
      return;
    }

    const wallet = await WalletService.getWallet(req.user.userId);
    if (wallet.balance < amount) {
      res.status(400).json({
        error: `Saldo insuficiente. O seu saldo disponível é de ${wallet.balance.toFixed(2)} MT.`,
      });
      return;
    }

    const methodLabel = 'e-Mola (Movitel)';
    const shortCode = 'EMOLA';
    const user = db.users.get(req.user.userId);
    const target = phone || user?.phone || 'Celular Movitel';

    // Calculate dynamic withdrawal fee configured by administrator
    const isFeeActive = settings.withdrawalFeeActive;
    const feePct = isFeeActive ? settings.withdrawalFeePercentage : 0;
    const feeRate = feePct / 100;
    const fee = Math.round(amount * feeRate * 100) / 100;
    const netAmount = Math.round((amount - fee) * 100) / 100;

    const refCode = `LEV-${shortCode}-${Date.now().toString().slice(-6)}`;

    try {
      const feeText = isFeeActive ? `Taxa ${feePct}%: ${fee.toFixed(2)} MT` : 'Isento de taxa';
      const { wallet: updatedWallet, transaction } = await WalletService.executeTransaction({
        userId: req.user.userId,
        type: 'WITHDRAWAL',
        amount,
        reference: refCode,
        description: `Levantamento via ${methodLabel} para ${target} (Bruto: ${amount.toFixed(2)} MT | ${feeText} | Líquido enviado: ${netAmount.toFixed(2)} MT)`,
      });

      res.status(200).json({
        message: `Levantamento de ${amount.toFixed(2)} MT processado com sucesso! ${isFeeActive ? `Taxa (${feePct}%): ${fee.toFixed(2)} MT | ` : ''}Líquido enviado: ${netAmount.toFixed(2)} MT`,
        wallet: updatedWallet,
        transaction,
        fee,
        feeRate: feePct,
        feeActive: isFeeActive,
        netAmount,
        grossAmount: amount,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao processar levantamento' });
    }
  }

  // Prepared endpoint for sandbox/virtual deposit (simulating M-Pesa / e-Mola top-up in test mode)
  static async requestVirtualTopup(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const amount = Number(req.body.amount || 500);
    const method = req.body.method || 'M-Pesa (Virtual Test)';

    if (amount <= 0 || amount > 10000) {
      res.status(400).json({ error: 'Montante de recarga de teste deve ser entre 10 e 10.000 MZN' });
      return;
    }

    try {
      const { wallet, transaction } = await WalletService.executeTransaction({
        userId: req.user.userId,
        type: 'DEPOSIT',
        amount,
        reference: `TOPUP-${Date.now()}`,
        description: `Recarga de saldo (${method})`,
      });

      // Trigger 5% referral bonus if this user was invited by someone
      ReferralService.processDepositBonus(req.user.userId, amount).catch((err) => {
        console.error('[ReferralBonus] Erro ao creditar bónus de 5% no topup:', err);
      });

      res.status(200).json({
        message: `Depósito de ${amount} MZN processado com sucesso!`,
        wallet,
        transaction,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao processar recarga' });
    }
  }

  static async getUserDepositProofs(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    const client = supabaseService.getClient();
    if (client) {
      const { data, error } = await client
        .from('deposit_proofs')
        .select('*')
        .eq('user_id', req.user.userId)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const proofs = data.map(p => ({
          id: p.id,
          userId: p.user_id,
          userName: p.user_name,
          userPhone: p.user_phone,
          amount: Number(p.amount),
          method: p.method,
          referenceCode: p.reference_code,
          operatorTxId: p.operator_tx_id,
          receiptDataUrl: p.receipt_data_url,
          receiptFileName: p.receipt_file_name,
          notes: p.notes,
          status: p.status,
          reviewNotes: p.review_notes,
          createdAt: p.created_at,
          updatedAt: p.reviewed_at || p.created_at,
        }));
        res.status(200).json({ proofs });
        return;
      }
    }
    const proofs = db.getDepositProofs(req.user.userId);
    res.status(200).json({ proofs });
  }
}
