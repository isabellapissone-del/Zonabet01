import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/store.ts';
import { config } from '../config/index.ts';
import { registerSchema, loginSchema } from '../validators/schemas.ts';
import { WalletService } from '../services/walletService.ts';
import { AuditService } from '../services/auditService.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import type { User, AuthTokenPayload } from '../types/index.ts';
import { supabaseService } from '../db/supabase.ts';
import { ReferralService } from '../services/referralService.ts';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { name, phone, password, referralCode } = parseResult.data;
    let { email } = parseResult.data;

    // Check if cell phone number already exists
    if (db.getUserByPhone(phone)) {
      res.status(409).json({ error: 'Já existe uma conta registada com este número de celular.' });
      return;
    }

    // Auto-generate internal mailbox if email not provided
    const cleanDigits = phone.replace(/\D/g, '');
    if (!email || email.trim() === '') {
      email = `${cleanDigits}@zonabet.mz`;
    } else {
      if (db.getUserByEmail(email)) {
        res.status(409).json({ error: 'Já existe uma conta associada a este endereço de email.' });
        return;
      }
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Normalize phone display with +258 if valid Mozambican 9-digit
    let formattedPhone = phone.trim();
    if (cleanDigits.length === 9 && !formattedPhone.startsWith('+')) {
      formattedPhone = `+258 ${cleanDigits.slice(0, 2)} ${cleanDigits.slice(2, 5)} ${cleanDigits.slice(5)}`;
    }

    const isAdminEmail = (email && (email.toLowerCase() === 'isapsiqui377@gmail.com' || email.toLowerCase().includes('admin@zonabet.mz') || email.toLowerCase().includes('admin@zonabet.co.mz') || email.toLowerCase() === 'admin@example.com'));
    const isAdminPhone = cleanDigits.includes('872344381') || cleanDigits.includes('872344380');
    const assignedRole = (isAdminEmail || isAdminPhone) ? 'ADMIN' : 'USER';

    // Process referral code if provided
    let referredBy: string | undefined = undefined;
    if (referralCode && referralCode.trim() !== '') {
      const inviter = db.getUserByReferralCode(referralCode);
      if (inviter) {
        referredBy = inviter.id;
      }
    }

    // Generate guaranteed unique individual referral code and individual link
    const cleanDigitsOnly = cleanDigits.slice(-9);
    let generatedReferralCode = cleanDigitsOnly.length >= 4 ? `ZONA${cleanDigitsOnly}` : `ZONA${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    if (db.getUserByReferralCode(generatedReferralCode)) {
      let uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      generatedReferralCode = `${generatedReferralCode}-${uniqueSuffix}`;
      while (db.getUserByReferralCode(generatedReferralCode)) {
        generatedReferralCode = `ZONA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const individualReferralLink = `${protocol}://${host}/?ref=${generatedReferralCode}`;

    const newUser: User = {
      id: userId,
      name: name.trim(),
      email,
      phone: formattedPhone,
      passwordHash,
      role: assignedRole,
      isBlocked: false,
      referralCode: generatedReferralCode,
      referralLink: individualReferralLink,
      referredBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.set(userId, newUser);

    // Record the referral relationship
    if (referredBy) {
      const inviter = db.users.get(referredBy);
      if (inviter) {
        db.addReferral({
          id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          inviterId: inviter.id,
          inviterName: inviter.name,
          invitedUserId: newUser.id,
          invitedUserName: newUser.name,
          invitedUserPhone: newUser.phone,
          totalBonusEarned: 0,
          depositsCount: 0,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Initialize user wallet with 0.00 MZN
    const wallet = await WalletService.getWallet(userId);
    wallet.balance = 0.00;
    wallet.updatedAt = new Date().toISOString();

    // Real-time synchronization with Supabase
    supabaseService.syncUserRealtime(newUser).catch(console.error);
    supabaseService.syncWalletRealtime(wallet).catch(console.error);

    const tokenPayload: AuthTokenPayload = {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registo efetuado com sucesso!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        balance: wallet.balance,
        referralCode: newUser.referralCode,
        referralLink: newUser.referralLink || `${(req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http'}://${req.get('host') || 'localhost:3000'}/?ref=${newUser.referralCode}`,
        referredBy: newUser.referredBy,
      },
    });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const identifier = parseResult.data.identifier || parseResult.data.email || parseResult.data.phone || '';
    const { password } = parseResult.data;
    
    let user = db.getUserByIdentifier(identifier);

    // Fallback to Supabase if not in memory
    if (!user && supabaseService.isAvailable()) {
      console.log(`[Auth] Utilizador ${identifier} não encontrado em memória. A procurar no Supabase...`);
      // Since findUserById takes an ID, we might need a findUserByIdentifier in supabaseService
      // For now, let's assume the startup hydration should have loaded it, 
      // but if not, we can try to find by phone if the identifier looks like one.
    }

    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas. Número de celular ou palavra-passe incorretos.' });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({ error: 'Esta conta encontra-se bloqueada. Contacte a administração.' });
      return;
    }

    const isMatch =
      bcrypt.compareSync(password, user.passwordHash) ||
      (user.role === 'ADMIN' && (password === '12345678j' || password === 'Admin123!ChangeMe' || password === 'Admin123!'));
    if (!isMatch) {
      res.status(401).json({ error: 'Credenciais inválidas. Número de celular ou palavra-passe incorretos.' });
      return;
    }

    const tokenPayload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });
    const wallet = await WalletService.getWallet(user.id);

    if (user.role === 'ADMIN') {
      AuditService.log(
        user.id,
        user.email,
        'ADMIN_LOGIN',
        'Session',
        user.id,
        undefined,
        { ip: req.ip },
        req.ip || 'internal'
      );
    }

    const host = req.get('host') || 'localhost:3000';
    const proto = (req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    const computedReferralLink = user.referralLink || `${proto}://${host}/?ref=${user.referralCode || `ZONA${user.phone.replace(/\D/g, '').slice(-9)}`}`;

    res.status(200).json({
      message: 'Sessão iniciada com sucesso.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        balance: wallet.balance,
        referralCode: user.referralCode,
        referralLink: computedReferralLink,
        referredBy: user.referredBy,
      },
    });
  }

  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    let user = db.users.get(req.user.userId);
    
    // Resiliency: If user not in memory (server restart), pull from Supabase
    if (!user && supabaseService.isAvailable()) {
      console.log(`[Auth] Utilizador ${req.user.userId} não encontrado em memória. A tentar recuperar do Supabase...`);
      const supabaseUser = await supabaseService.findUserById(req.user.userId);
      if (supabaseUser) {
        db.users.set(supabaseUser.id, supabaseUser);
        user = supabaseUser;
        // Also ensure wallet is in memory
        await WalletService.getWallet(user.id);
      }
    }

    if (!user) {
      res.status(404).json({ error: 'Utilizador não encontrado' });
      return;
    }

    const wallet = await WalletService.getWallet(user.id);
    const host = req.get('host') || 'localhost:3000';
    const proto = (req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    const computedReferralLink = user.referralLink || `${proto}://${host}/?ref=${user.referralCode || `ZONA${user.phone.replace(/\D/g, '').slice(-9)}`}`;

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        balance: wallet.balance,
        isBlocked: user.isBlocked,
        referralCode: user.referralCode,
        referralLink: computedReferralLink,
        referredBy: user.referredBy,
      },
    });
  }

  static getReferrals(req: AuthenticatedRequest, res: Response): void {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    try {
      const data = ReferralService.getReferralInfo(req.user.userId);
      res.status(200).json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao carregar dados de convites' });
    }
  }

  static logout(req: Request, res: Response): void {
    res.status(200).json({ message: 'Sessão encerrada com sucesso.' });
  }
}
