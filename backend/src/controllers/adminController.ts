import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { db } from '../db/store.ts';
import { MatchService } from '../services/matchService.ts';
import { SettlementService } from '../services/settlementService.ts';
import { WalletService } from '../services/walletService.ts';
import { BetService } from '../services/betService.ts';
import { AuditService } from '../services/auditService.ts';
import {
  createMatchSchema,
  updateOddsSchema,
  updateMatchStatusSchema,
  matchResultSchema,
  balanceAdjustmentSchema,
} from '../validators/schemas.ts';
import { Money } from '../utils/money.ts';
import { firebaseService } from '../db/firebase.ts';
import { supabaseService } from '../db/supabase.ts';
import { settingsService } from '../services/settingsService.ts';
import { RiskService } from '../services/riskService.ts';
import { ReferralService } from '../services/referralService.ts';

import { AIService } from '../services/aiService.ts';

export class AdminController {
  static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!firebaseService.isAvailable()) {
      // In-memory fallback if Firebase is not available
      const users = Array.from(db.users.values()).filter((u) => u.role === 'USER');
      const matches = Array.from(db.matches.values());
      const activeMatches = matches.filter((m) => m.status === 'OPEN').length;
      const finishedMatches = matches.filter((m) => m.status === 'FINISHED').length;
      const bets = Array.from(db.bets.values());
      const pendingBets = bets.filter((b) => b.status === 'PENDING').length;
      const wonBets = bets.filter((b) => b.status === 'WON').length;
      const lostBets = bets.filter((b) => b.status === 'LOST').length;
      const voidBets = bets.filter((b) => b.status === 'VOID').length;
      const totalBetVolume = bets.reduce((acc, b) => acc + b.stake, 0);
      const totalDisbursedPayout = bets.filter((b) => b.status === 'WON').reduce((acc, b) => acc + b.potentialReturn, 0);
      const totalUsersBalance = Array.from(db.wallets.values()).reduce((acc, w) => acc + w.balance, 0);
      const allTransactions = db.transactions;
      const totalDepositsVolume = allTransactions.filter((tx) => tx.type === 'DEPOSIT').reduce((acc, tx) => acc + tx.amount, 0);
      const totalWithdrawalsVolume = allTransactions.filter((tx) => tx.type === 'WITHDRAWAL').reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
      const todayStr = new Date().toISOString().split('T')[0];
      const wageredToday = bets.filter((b) => b.createdAt.startsWith(todayStr)).reduce((acc, b) => acc + b.stake, 0);
      const paidOutToday = bets.filter((b) => b.status === 'WON' && b.settledAt?.startsWith(todayStr)).reduce((acc, b) => acc + b.potentialReturn, 0);
      const depositsToday = allTransactions.filter((tx) => tx.type === 'DEPOSIT' && tx.createdAt.startsWith(todayStr)).reduce((acc, tx) => acc + tx.amount, 0);
      const withdrawalsToday = allTransactions.filter((tx) => tx.type === 'WITHDRAWAL' && tx.createdAt.startsWith(todayStr)).reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
      const houseProfit = totalBetVolume - totalDisbursedPayout;
      const houseProfitToday = wageredToday - paidOutToday;
      const profitMarginPercent = totalBetVolume > 0 ? Math.round(((houseProfit / totalBetVolume) * 100) * 10) / 10 : 0;
      const houseLiquidBalance = Math.max(0, totalDepositsVolume - totalWithdrawalsVolume);

      res.status(200).json({
        stats: {
          totalUsers: users.length,
          activeMatches,
          finishedMatches,
          pendingBets,
          wonBets,
          lostBets,
          voidBets,
          totalBetVolume,
          totalDisbursedPayout,
          totalTransactions: allTransactions.length,
          houseBalance: houseLiquidBalance,
          totalUsersBalance,
          wageredToday,
          paidOutToday,
          houseProfit,
          houseProfitToday,
          profitMarginPercent,
          totalDepositsVolume,
          totalWithdrawalsVolume,
          depositsToday,
          withdrawalsToday,
          dailyReports: [],
        },
      });
      return;
    }

    const dbFirestore = firebaseService.getDb()!;

    try {
      // 1. Basic counts
      const usersSnap = await dbFirestore.collection('users').where('role', '==', 'USER').get();
      const totalUsers = usersSnap.size;
      
      const activeMatchesSnap = await dbFirestore.collection('matches').where('status', '==', 'OPEN').get();
      const activeMatches = activeMatchesSnap.size;

      const finishedMatchesSnap = await dbFirestore.collection('matches').where('status', '==', 'FINISHED').get();
      const finishedMatches = finishedMatchesSnap.size;

      // 2. Bet stats
      const betsSnap = await dbFirestore.collection('bets').get();
      const allBets = betsSnap.docs.map(doc => doc.data());
      
      const pendingBets = allBets.filter(b => b.status === 'PENDING').length;
      const wonBets = allBets.filter(b => b.status === 'WON').length;
      const lostBets = allBets.filter(b => b.status === 'LOST').length;
      const voidBets = allBets.filter(b => b.status === 'VOID').length;

      let totalBetVolume = allBets.reduce((acc, b) => acc + Number(b.stake), 0);
      let totalDisbursedPayout = allBets.filter(b => b.status === 'WON').reduce((acc, b) => acc + Number(b.potentialReturn), 0);

      // 3. Financial stats from users (total user balance)
      const totalUsersBalance = usersSnap.docs.reduce((acc, doc) => acc + Number(doc.data().balance || 0), 0);

      // 4. Transaction volumes
      const txSnap = await dbFirestore.collection('transactions').get();
      const allTransactions = txSnap.docs.map(doc => doc.data());

      let totalDepositsVolume = allTransactions.filter(tx => tx.type === 'DEPOSIT').reduce((acc, tx) => acc + Number(tx.amount), 0);
      let totalWithdrawalsVolume = allTransactions.filter(tx => tx.type === 'WITHDRAWAL').reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);

      const todayStr = new Date().toISOString().split('T')[0];
      
      // Today's metrics
      const wageredToday = allBets.filter(b => b.createdAt.startsWith(todayStr)).reduce((acc, b) => acc + Number(b.stake), 0);
      const paidOutToday = allBets.filter(b => b.status === 'WON' && b.settledAt?.startsWith(todayStr)).reduce((acc, b) => acc + Number(b.potentialReturn), 0);
      const depositsToday = allTransactions.filter(tx => tx.type === 'DEPOSIT' && tx.createdAt.startsWith(todayStr)).reduce((acc, tx) => acc + Number(tx.amount), 0);
      const withdrawalsToday = allTransactions.filter(tx => tx.type === 'WITHDRAWAL' && tx.createdAt.startsWith(todayStr)).reduce((acc, tx) => acc + Math.abs(Number(tx.amount)), 0);

      const houseProfit = totalBetVolume - totalDisbursedPayout;
      const houseProfitToday = wageredToday - paidOutToday;
      const profitMarginPercent = totalBetVolume > 0 ? Math.round(((houseProfit / totalBetVolume) * 100) * 10) / 10 : 0;
      const houseLiquidBalance = Math.max(0, totalDepositsVolume - totalWithdrawalsVolume);

      // Daily breakdown (last 14 days)
      const dailyMap = new Map<string, any>();
      for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        dailyMap.set(ds, { date: ds, wagered: 0, paidOut: 0, profit: 0, betsCount: 0, deposits: 0, withdrawals: 0, newUsers: 0 });
      }

      allBets.forEach(b => {
        const ds = b.createdAt.split('T')[0];
        if (dailyMap.has(ds)) {
          const item = dailyMap.get(ds);
          item.wagered += Number(b.stake);
          item.betsCount++;
          if (b.status === 'WON') item.paidOut += Number(b.potentialReturn);
          item.profit = item.wagered - item.paidOut;
        }
      });

      allTransactions.forEach(tx => {
        const ds = tx.createdAt.split('T')[0];
        if (dailyMap.has(ds)) {
          const item = dailyMap.get(ds);
          if (tx.type === 'DEPOSIT') item.deposits += Number(tx.amount);
          else if (tx.type === 'WITHDRAWAL') item.withdrawals += Math.abs(Number(tx.amount));
        }
      });

      const dailyReports = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

      res.status(200).json({
        stats: {
          totalUsers,
          activeMatches,
          finishedMatches,
          pendingBets,
          wonBets,
          lostBets,
          voidBets,
          totalBetVolume,
          totalDisbursedPayout,
          totalTransactions: allTransactions.length,
          houseBalance: houseLiquidBalance,
          totalUsersBalance,
          wageredToday,
          paidOutToday,
          houseProfit,
          houseProfitToday,
          profitMarginPercent,
          totalDepositsVolume,
          totalWithdrawalsVolume,
          depositsToday,
          withdrawalsToday,
          dailyReports,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao obter estatísticas do Firebase' });
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { name, phone, email, password, initialBalance, role } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'O nome completo do jogador é obrigatório.' });
      return;
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      res.status(400).json({ error: 'Número de telemóvel inválido (ex: +258 84 123 4567).' });
      return;
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email && typeof email === 'string' && email.includes('@')
      ? email.trim().toLowerCase()
      : `${cleanPhone.replace(/\D/g, '')}@zonabet.mz`;

    // Check if phone or email already exists
    const existingUser = Array.from(db.users.values()).find(
      (u) => u.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '') || u.email.toLowerCase() === cleanEmail
    );

    if (existingUser) {
      res.status(409).json({ error: 'Já existe um jogador registado com este telemóvel ou email.' });
      return;
    }

    const userPassword = password && typeof password === 'string' && password.length >= 6
      ? password
      : 'Zona123!';

    const userRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
    const initBalance = typeof initialBalance === 'number' && initialBalance > 0 ? initialBalance : 0;

    const digitsOnly = cleanPhone.replace(/\D/g, '');
    const nationalNumber = digitsOnly.startsWith('258') ? digitsOnly.slice(3) : digitsOnly;
    let referralCode = `ZONA${nationalNumber || Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    if (db.getUserByReferralCode(referralCode)) {
      let uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      referralCode = `${referralCode}-${uniqueSuffix}`;
      while (db.getUserByReferralCode(referralCode)) {
        referralCode = `ZONA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }
    }

    const host = req.get('host') || 'localhost:3000';
    const proto = (req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    const individualReferralLink = `${proto}://${host}/?ref=${referralCode}`;

    const newUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash: bcrypt.hashSync(userPassword, 10),
      role: userRole as any,
      isBlocked: false,
      referralCode,
      referralLink: individualReferralLink,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.set(newUser.id, newUser);

    // Initialize wallet and persist to Supabase
    const wallet = await WalletService.getWallet(newUser.id);
    if (initBalance > 0) {
      await WalletService.executeTransaction({
        userId: newUser.id,
        type: 'DEPOSIT',
        amount: initBalance,
        reference: `CAD-ADMIN-${Date.now().toString().slice(-6)}`,
        description: `Depósito inicial concedido no registo administrativo por ${req.user.email}`,
      });
    }

    AuditService.log(
      req.user.userId,
      req.user.email,
      'CREATE_USER',
      'User',
      newUser.id,
      {},
      { name: newUser.name, phone: newUser.phone, email: newUser.email, role: newUser.role, initialBalance: initBalance },
      req.ip
    );

    supabaseService.syncUserRealtime(newUser).catch(console.error);
    firebaseService.syncUser(newUser).catch(console.error);

    res.status(201).json({
      message: `Jogador "${newUser.name}" cadastrado com sucesso!`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        balance: initBalance,
        referralCode: newUser.referralCode,
        referralLink: newUser.referralLink,
        tempPassword: userPassword,
      },
    });
  }

  static async createMatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const parse = createMatchSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0].message });
      return;
    }

    try {
      const match = await MatchService.createMatch({
        adminId: req.user.userId,
        adminEmail: req.user.email,
        competitionId: parse.data.competitionId,
        homeTeam: parse.data.homeTeam,
        awayTeam: parse.data.awayTeam,
        kickoffDate: parse.data.kickoffDate,
        kickoffTime: parse.data.kickoffTime,
        description: parse.data.description,
        odds: parse.data.odds,
        ip: req.ip,
      });

      res.status(201).json({ message: 'Jogo criado com sucesso!', match });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateOdds(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { id } = req.params;
    const parse = updateOddsSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0].message });
      return;
    }

    try {
      const match = await MatchService.updateOdds({
        adminId: req.user.userId,
        adminEmail: req.user.email,
        matchId: id,
        odds: parse.data.odds,
        ip: req.ip,
      });

      res.status(200).json({ message: 'Odds atualizadas com sucesso!', match });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async recalculateCorrectScoreOdds(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { id } = req.params;

    try {
      const success = await MatchService.recalculateCorrectScoreOdds(id);
      if (success) {
        AuditService.log(
          req.user.userId,
          req.user.email,
          'RECALCULATE_CS_ODDS',
          'Match',
          id,
          {},
          { action: 'recalculate_correct_score_odds' },
          req.ip
        );
        res.status(200).json({ message: 'Odds de Resultado Correto recalculadas com base nas odds 1X2!' });
      } else {
        res.status(400).json({ error: 'Não foi possível recalcular as odds. Verifique se o mercado de Resultado Correto existe.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro interno ao recalcular odds' });
    }
  }

  static async updateMatchStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { id } = req.params;
    const parse = updateMatchStatusSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0].message });
      return;
    }

    try {
      const match = await MatchService.updateStatus({
        adminId: req.user.userId,
        adminEmail: req.user.email,
        matchId: id,
        status: parse.data.status,
        reason: parse.data.reason,
        ip: req.ip,
      });

      res.status(200).json({ message: `Estado do jogo atualizado para ${match.status}`, match });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async enterResult(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { id } = req.params;
    const parse = matchResultSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0].message });
      return;
    }

    try {
      const settlement = await SettlementService.settleMatch({
        adminId: req.user.userId,
        adminEmail: req.user.email,
        matchId: id,
        homeScore: parse.data.homeScore,
        awayScore: parse.data.awayScore,
        ip: req.ip,
      });

      res.status(200).json({
        message: 'Resultado registado e apostas liquidadas com sucesso!',
        settlement,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async cancelMatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { id } = req.params;
    const reason = req.body.reason || 'Jogo cancelado por decisão administrativa';

    try {
      const result = await SettlementService.cancelMatch({
        adminId: req.user.userId,
        adminEmail: req.user.email,
        matchId: id,
        reason,
        ip: req.ip,
      });

      res.status(200).json({
        message: 'Jogo cancelado e apostas reembolsadas!',
        result,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const host = req.get('host') || 'localhost:3000';
    const proto = (req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    
    if (firebaseService.isAvailable()) {
      try {
        const dbFirestore = firebaseService.getDb()!;
        const snap = await dbFirestore.collection('users').orderBy('createdAt', 'desc').get();

        if (!snap.empty) {
          const users = snap.docs.map((doc) => {
            const p = doc.data();
            const code = p.referralCode || `ZONA${(p.phone || '').replace(/\D/g, '').slice(-9)}`;
            const referralLink = p.referralLink || `${proto}://${host}/?ref=${code}`;
            return {
              id: p.id,
              name: p.name,
              email: p.email,
              phone: p.phone,
              role: p.role,
              isBlocked: p.status === 'BLOCKED',
              balance: Number(p.balance || 0),
              referralCode: code,
              referralLink,
              referredBy: p.referredBy,
              createdAt: p.createdAt,
            };
          });
          res.status(200).json({ users });
          return;
        }
      } catch (err) {
        console.warn('[Admin getUsers Firebase Error]:', err);
      }
    }

    const usersPromises = Array.from(db.users.values()).map(async (u) => {
      const wallet = await WalletService.getWallet(u.id);
      const code = u.referralCode || `ZONA${u.phone.replace(/\D/g, '').slice(-9)}`;
      const referralLink = u.referralLink || `${proto}://${host}/?ref=${code}`;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isBlocked: u.isBlocked,
        balance: wallet?.balance || 0,
        referralCode: code,
        referralLink,
        referredBy: u.referredBy,
        createdAt: u.createdAt,
      };
    });

    const users = await Promise.all(usersPromises);
    res.status(200).json({ users });
  }

  static async toggleUserBlock(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { id } = req.params;
    let targetUser = db.users.get(id);
    if (!targetUser) {
      const dbUser = await supabaseService.findUserById(id);
      if (dbUser) {
        targetUser = dbUser;
        db.users.set(targetUser.id, targetUser);
      }
    }

    if (!targetUser) {
      res.status(404).json({ error: 'Utilizador não encontrado' });
      return;
    }

    if (targetUser.role === 'ADMIN') {
      res.status(400).json({ error: 'Não é permitido bloquear uma conta de administrador' });
      return;
    }

    const previousStatus = targetUser.isBlocked;
    targetUser.isBlocked = !targetUser.isBlocked;
    targetUser.updatedAt = new Date().toISOString();

    AuditService.log(
      req.user.userId,
      req.user.email,
      targetUser.isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
      'User',
      targetUser.id,
      { isBlocked: previousStatus },
      { isBlocked: targetUser.isBlocked },
      req.ip
    );

    // Real-time synchronization
    supabaseService.syncUserRealtime(targetUser).catch(console.error);
    firebaseService.syncUser(targetUser).catch(console.error);

    res.status(200).json({
      message: `Utilizador ${targetUser.isBlocked ? 'bloqueado' : 'desbloqueado'} com sucesso.`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        isBlocked: targetUser.isBlocked,
      },
    });
  }

  static async adjustBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const parse = balanceAdjustmentSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0].message });
      return;
    }

    const { userId, amount, reason } = parse.data;
    const targetUser = db.users.get(userId);
    if (!targetUser) {
      res.status(404).json({ error: 'Utilizador não encontrado' });
      return;
    }

    try {
      const reference = `ADJ-${Date.now()}`;
      
      const outcome = await WalletService.executeTransaction({
        userId,
        type: 'ADJUSTMENT',
        amount, // Can be positive or negative
        reference,
        description: amount > 0 ? `Ajuste manual de crédito: ${reason}` : `Ajuste manual de débito: ${reason}`,
      });

      AuditService.log(
        req.user.userId,
        req.user.email,
        'MANUAL_BALANCE_ADJUSTMENT',
        'Wallet',
        outcome.wallet.id,
        { previousBalance: outcome.transaction.previousBalance },
        {
          newBalance: outcome.transaction.nextBalance,
          amount,
          reason,
          reference,
          targetUserId: userId,
        },
        req.ip
      );

      res.status(200).json({
        message: 'Ajuste de saldo efetuado e auditado com sucesso.',
        wallet: outcome.wallet,
        transaction: outcome.transaction,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const logs = await AuditService.getLogs(100);
    res.status(200).json({ logs });
  }

  static async getAllBets(req: AuthenticatedRequest, res: Response): Promise<void> {
    const bets = await BetService.getAllBets();
    res.status(200).json({ bets });
  }

  static async getAllTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (firebaseService.isAvailable()) {
      try {
        const dbFirestore = firebaseService.getDb()!;
        const snap = await dbFirestore.collection('transactions').orderBy('createdAt', 'desc').limit(100).get();
        
        if (!snap.empty) {
          const transactions = snap.docs.map(doc => {
            const tx = doc.data();
            return {
              id: tx.id,
              userId: tx.userId,
              type: tx.type,
              amount: Number(tx.amount),
              previousBalance: Number(tx.prevBalance || 0),
              nextBalance: Number(tx.nextBalance || 0),
              reference: tx.referenceId || '',
              description: tx.description || '',
              status: 'COMPLETED',
              createdAt: tx.createdAt,
            };
          });
          res.status(200).json({ transactions });
          return;
        }
      } catch (err) {
        console.warn('[Admin getAllTransactions Firebase Error]:', err);
      }
    }
    const transactions = [...db.transactions].reverse();
    res.status(200).json({ transactions });
  }

  static changeUserRole(req: AuthenticatedRequest, res: Response): void {
    if (!req.user) return;
    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'USER' && role !== 'ADMIN') {
      res.status(400).json({ error: 'Função inválida. Utilize USER ou ADMIN.' });
      return;
    }

    const targetUser = db.users.get(id);
    if (!targetUser) {
      res.status(404).json({ error: 'Utilizador não encontrado' });
      return;
    }

    if (targetUser.id === req.user.userId && role === 'USER') {
      res.status(400).json({ error: 'Não é possível revogar os seus próprios privilégios de administrador.' });
      return;
    }

    const previousRole = targetUser.role;
    targetUser.role = role;
    targetUser.updatedAt = new Date().toISOString();

    AuditService.log(
      req.user.userId,
      req.user.email,
      'CHANGE_USER_ROLE',
      'User',
      targetUser.id,
      { previousRole },
      { newRole: role },
      req.ip
    );

    res.status(200).json({
      message: `Função do utilizador alterada para ${role} com sucesso.`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  }

  static resetUserPassword(req: AuthenticatedRequest, res: Response): void {
    if (!req.user) return;
    const { id } = req.params;
    const newPassword = req.body.newPassword || 'Zona123!';

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
      return;
    }

    const targetUser = db.users.get(id);
    if (!targetUser) {
      res.status(404).json({ error: 'Utilizador não encontrado' });
      return;
    }

    targetUser.passwordHash = bcrypt.hashSync(newPassword, 10);
    targetUser.updatedAt = new Date().toISOString();

    AuditService.log(
      req.user.userId,
      req.user.email,
      'RESET_USER_PASSWORD',
      'User',
      targetUser.id,
      {},
      { resetByAdmin: req.user.email },
      req.ip
    );

    // Real-time synchronization
    supabaseService.syncUserRealtime(targetUser).catch(console.error);
    firebaseService.syncUser(targetUser).catch(console.error);

    res.status(200).json({
      message: `Palavra-passe do utilizador ${targetUser.email} redefinida com sucesso para "${newPassword}".`,
      tempPassword: newPassword,
    });
  }

  static async getUserBets(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const userBets = await BetService.getUserBets(id);
    res.status(200).json({ bets: userBets });
  }

  static async getUserTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    if (firebaseService.isAvailable()) {
      try {
        const dbFirestore = firebaseService.getDb()!;
        const snap = await dbFirestore.collection('transactions')
          .where('userId', '==', id)
          .orderBy('createdAt', 'desc')
          .get();
        
        if (!snap.empty) {
          const transactions = snap.docs.map(doc => {
            const tx = doc.data();
            return {
              id: tx.id,
              userId: tx.userId,
              type: tx.type,
              amount: Number(tx.amount),
              previousBalance: Number(tx.prevBalance || 0),
              nextBalance: Number(tx.nextBalance || 0),
              reference: tx.referenceId || '',
              description: tx.description || '',
              status: 'COMPLETED',
              createdAt: tx.createdAt,
            };
          });
          res.status(200).json({ transactions });
          return;
        }
      } catch (err) {
        console.warn('[Admin getUserTransactions Firebase Error]:', err);
      }
    }
    const userTransactions = db.transactions
      .filter((tx) => tx.userId === id)
      .reverse();
    res.status(200).json({ transactions: userTransactions });
  }

  static deleteUser(req: AuthenticatedRequest, res: Response): void {
    if (!req.user) return;
    const { id } = req.params;
    
    // Check if user is super admin and prevent self-deletion
    if (id === req.user.userId) {
      res.status(400).json({ error: 'Não é possível excluir a sua própria conta.' });
      return;
    }
    
    const userToDelete = db.users.get(id);
    if (!userToDelete) {
      res.status(404).json({ error: 'Utilizador não encontrado.' });
      return;
    }

    // Optional: could void active bets or just leave them. We'll leave them as is for history, but delete user.
    db.users.delete(id);
    db.wallets.delete(id); // delete wallet too

    AuditService.log(
      req.user.userId,
      req.user.email,
      'DELETE_USER',
      'User',
      id,
      { email: userToDelete.email },
      { deleted: true },
      req.ip
    );

    // Sync to frontend if using realtime (we don't have deleteUserRealtime in supabaseService right now, so we'll skip or just ignore)
    res.status(200).json({ message: `Utilizador ${userToDelete.name} excluído com sucesso.` });
  }

  static async deleteMatch(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { id } = req.params;
    const match = db.matches.get(id);
    if (!match) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }

    // Check if there are bets placed on this match
    const matchBets = Array.from(db.bets.values()).filter((b) =>
      b.items.some((item) => item.matchId === id)
    );

    // Auto-void bets to allow deletion
    if (matchBets.length > 0) {
      for (const bet of matchBets) {
        if (bet.status === 'PENDING') {
          // Refund user using WalletService
          await WalletService.executeTransaction({
            userId: bet.userId,
            type: 'REFUND',
            amount: bet.stake,
            reference: bet.id,
            description: `Reembolso por cancelamento/exclusão do Jogo (Aposta #${bet.id})`,
          });

          // Void the bet
          bet.status = 'VOID';
          bet.settledAt = new Date().toISOString();
          
          supabaseService.syncBetRealtime(bet).catch(console.error);
          firebaseService.syncBet(bet).catch(console.error);
        }
      }
    }

    db.matches.delete(id);

    AuditService.log(
      req.user.userId,
      req.user.email,
      'DELETE_MATCH',
      'Match',
      id,
      { homeTeam: match.homeTeam, awayTeam: match.awayTeam, competitionId: match.competitionId },
      { deleted: true },
      req.ip
    );

    // Real-time synchronization with Firebase
    // Note: firebaseService doesn't have deleteMatch yet, we can add it or just call db directly
    const dbFirestore = firebaseService.getDb();
    if (dbFirestore) {
      dbFirestore.collection('matches').doc(id).delete().catch(console.error);
    }

    res.status(200).json({
      message: `Jogo "${match.homeTeam} vs ${match.awayTeam}" excluído com sucesso do sistema.`,
    });
  }

  static getDepositProofs(req: AuthenticatedRequest, res: Response): void {
    const proofs = db.getDepositProofs();
    res.status(200).json({ proofs });
  }

  static async updateDepositProofStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      res.status(400).json({ error: 'Estado de comprovativo inválido.' });
      return;
    }

    const proof = db.getDepositProof(id);
    if (!proof) {
      res.status(404).json({ error: 'Comprovativo de depósito não encontrado.' });
      return;
    }

    const previousStatus = proof.status;
    
    // If status is changing to APPROVED, credit the user's wallet
    if (status === 'APPROVED' && previousStatus !== 'APPROVED') {
      try {
        await WalletService.executeTransaction({
          userId: proof.userId,
          type: 'DEPOSIT',
          amount: proof.amount,
          reference: proof.referenceCode,
          description: `Depósito via ${proof.method} aprovado por ${req.user.email}${proof.operatorTxId ? ` [Ref: ${proof.operatorTxId}]` : ''}`,
        });

        // Trigger 5% referral bonus if this user was invited by someone
        ReferralService.processDepositBonus(proof.userId, proof.amount).catch((err) => {
          console.error('[ReferralBonus] Erro ao creditar bónus de 5% na aprovação:', err);
        });
      } catch (err: any) {
        res.status(400).json({ error: `Erro ao creditar saldo: ${err.message}` });
        return;
      }
    }

    const updated = db.updateDepositProofStatus(
      id,
      status,
      req.user.email,
      reviewNotes || undefined
    );

    AuditService.log(
      req.user.userId,
      req.user.email,
      'UPDATE_DEPOSIT_PROOF',
      'DepositProof',
      id,
      { status: previousStatus },
      { status, reviewNotes },
      req.ip
    );

    // Real-time synchronization with Supabase
    if (updated) {
      supabaseService.syncDepositProofRealtime(updated).catch(console.error);
    }

    res.status(200).json({
      message: `Comprovativo de depósito atualizado para ${status}.`,
      proof: updated,
    });
  }

  static async resetAllBalances(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;

    try {
      const { affectedRows } = await WalletService.resetAllBalances(req.user.userId, req.user.email);

      AuditService.log(
        req.user.userId,
        req.user.email,
        'RESET_ALL_BALANCES',
        'System',
        'Global',
        {},
        { affectedUsers: affectedRows, reason: 'Limpeza de Dinheiro Virtual' },
        req.ip
      );

      res.status(200).json({
        message: `Limpeza de Dinheiro Virtual concluída. ${affectedRows} saldos de jogadores foram resetados para 0.00 MT.`,
        affectedRows,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao realizar limpeza de saldos' });
    }
  }

  static async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const settings = await settingsService.getSettings();
    res.status(200).json({ settings });
  }

  static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    try {
      const updated = settingsService.updateSettings(
        req.body,
        req.user.userId,
        req.user.email,
        req.ip
      );
      res.status(200).json({
        message: 'Configurações do sistema atualizadas e auditadas com sucesso!',
        settings: updated,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao atualizar configurações' });
    }
  }

  static async getPublicSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const publicSettings = await settingsService.getPublicSettings();
    res.status(200).json({ settings: publicSettings });
  }

  static async getRiskOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const risk = await RiskService.getRiskOverview();
      res.status(200).json({ risk });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao calcular gestão de risco' });
    }
  }

  static async updateMarketStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { matchId, marketId } = req.params;
    const { status, reason } = req.body;

    if (!['OPEN', 'SUSPENDED', 'CLOSED'].includes(status)) {
      res.status(400).json({ error: 'Estado de mercado inválido' });
      return;
    }

    try {
      const market = await MatchService.updateMarketStatus({
        adminId: req.user.userId,
        adminEmail: req.user.email,
        matchId,
        marketId,
        status,
        reason,
        ip: req.ip,
      });
      res.status(200).json({ message: `Estado do mercado alterado para ${status}`, market });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateMarketOdds(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { matchId, marketId } = req.params;
    const { selections } = req.body;

    if (!Array.isArray(selections)) {
      res.status(400).json({ error: 'Lista de seleções inválida' });
      return;
    }

    try {
      const market = await MatchService.updateMarketOdds({
        adminId: req.user.userId,
        adminEmail: req.user.email,
        matchId,
        marketId,
        selections,
        ip: req.ip,
      });
      res.status(200).json({ message: 'Odds do mercado atualizadas com sucesso', market });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async addMarketSelection(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { matchId, marketId } = req.params;
    const { outcome, label, odds } = req.body;

    if (!outcome || !label || !odds || odds <= 1.0) {
      res.status(400).json({ error: 'Dados da seleção inválidos. Odd deve ser maior que 1.00.' });
      return;
    }

    try {
      const market = await MatchService.addMarketSelection({
        adminId: req.user.userId,
        adminEmail: req.user.email,
        matchId,
        marketId,
        outcome,
        label,
        odds: Number(odds),
        ip: req.ip,
      });
      res.status(201).json({ message: 'Nova opção de resultado adicionada com sucesso!', market });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async analyzeMatches(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { image } = req.body;

    if (!image) {
      res.status(400).json({ error: 'Nenhuma imagem fornecida.' });
      return;
    }

    try {
      const data = await AIService.analyzeMatchesFromImage(image);
      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    try {
      const teams = db.teams;
      res.status(200).json({ teams });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) return;
    const { name, shortName, competitionId } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Nome da equipa é obrigatório.' });
      return;
    }

    try {
      const newTeam = {
        id: `team-${Date.now()}`,
        name,
        shortName: shortName || name.substring(0, 3).toUpperCase(),
        competitionId
      };
      db.teams.push(newTeam);
      res.status(201).json({ message: 'Equipa cadastrada com sucesso!', team: newTeam });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
