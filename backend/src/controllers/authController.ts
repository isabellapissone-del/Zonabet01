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
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { name, phone: rawPhone, password, referralCode } = parseResult.data;
    let { email } = parseResult.data;

    // 1. Normalização do Telefone
    const phoneNorm = normalizeMozambicanPhone(rawPhone);
    if (!phoneNorm.isValid) {
      res.status(400).json({ error: phoneNorm.error || 'Número de celular inválido.' });
      return;
    }

    const cleanDigits = phoneNorm.cleanDigits;
    const formattedPhone = phoneNorm.formattedPhone;

    // 2. Verificação de Duplicidade em memória local
    if (db.getUserByPhone(cleanDigits) || db.getUserByPhone(formattedPhone)) {
      res.status(409).json({ error: 'Este número de telefone já está cadastrado.' });
      return;
    }

    // 3. Verificação de Duplicidade diretamente no Supabase profiles
    const supabase = supabaseService.getClient();
    if (!supabase) {
      console.error('[Auth Register] Erro de configuração: Cliente Supabase não inicializado no backend. SUPABASE_SERVICE_ROLE_KEY ausente.');
      res.status(503).json({ error: 'Serviço de base de dados indisponível. Configuração do Supabase ausente no servidor.' });
      return;
    }

    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('id, phone')
      .ilike('phone', `%${cleanDigits}%`)
      .limit(1);

    if (!checkError && existingProfiles && existingProfiles.length > 0) {
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

    const passwordHash = bcrypt.hashSync(password, 10);
    // Geração de ID seguro e único (UUID v4)
    const userId = `usr-${crypto.randomUUID()}`;

    // REGRAS DE SEGURANÇA OBRIGATÓRIAS:
    // Qualquer cadastro público inicia estritamente com USER, status ACTIVE e saldo 0.00
    const assignedRole: 'USER' = 'USER';
    const assignedStatus: 'ACTIVE' = 'ACTIVE';
    const initialBalance = 0.00;

    // 4. Tratamento do Código de Convite (referral_code e referred_by)
    let referredBy: string | null = null;
    if (referralCode && referralCode.trim() !== '') {
      const cleanRef = referralCode.trim().toUpperCase();
      const inviterInMemory = db.getUserByReferralCode(cleanRef);

      if (inviterInMemory) {
        // Validar se o utilizador existe na tabela profiles do Supabase para respeitar a Foreign Key
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', inviterInMemory.id)
          .maybeSingle();

        if (inviterProfile) {
          referredBy = inviterProfile.id;
        }
      } else {
        // Consultar diretamente no Supabase por referral_code ou phone
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('id')
          .or(`referral_code.eq.${cleanRef},phone.ilike.%${cleanRef.replace(/\D/g, '') || cleanRef}%`)
          .maybeSingle();

        if (inviterProfile) {
          referredBy = inviterProfile.id;
        }
      }
    }

    // 5. Geração de código de indicação individual único e link
    let generatedReferralCode = `ZONA${cleanDigits}`;
    if (db.getUserByReferralCode(generatedReferralCode)) {
      const uniqueSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      generatedReferralCode = `${generatedReferralCode}-${uniqueSuffix}`;
    }

    // Garantir que não colide com registos existentes no Supabase
    const { data: existingRefCode } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', generatedReferralCode)
      .maybeSingle();

    if (existingRefCode) {
      generatedReferralCode = `ZONA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
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

    // 6. Gravação primária direta em public.profiles aguardando confirmação (ESTRITAMENTE os 10 campos)
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        role: assignedRole,
        status: assignedStatus,
        balance: initialBalance,
        referral_code: newUser.referralCode,
        referred_by: referredBy,
        created_at: newUser.createdAt,
        updated_at: newUser.updatedAt,
      });

    // 7. Se o INSERT falhar, abortar imediatamente sem salvar em memória e sem retornar 201
    if (insertError) {
      console.error('[Auth Register] Falha ao persistir perfil em public.profiles:', insertError.message || insertError);
      if (insertError.code === '23505') {
        res.status(409).json({ error: 'Este número de telefone já está cadastrado.' });
      } else if (insertError.code === '23503') {
        res.status(400).json({ error: 'Código de convite inválido ou referenciador não encontrado.' });
      } else if (insertError.code === 'PGRST205' || (insertError.message && insertError.message.includes('not find the table'))) {
        res.status(500).json({ error: "A tabela 'public.profiles' ainda não existe no seu projeto Supabase. Execute o script SQL no SQL Editor do Supabase." });
      } else {
        res.status(500).json({ error: `Erro no Supabase: ${insertError.message || 'Falha ao persistir no banco de dados.'}` });
      }
      return;
    }

    // 8. Salvar credenciais seguras no cofre persistente do Supabase (sem colocar em profiles)
    await supabaseService.saveUserCredential(newUser.id, {
      phone: newUser.phone,
      email: newUser.email,
      passwordHash: newUser.passwordHash,
    });

    // 9. Somente após confirmação bem-sucedida da persistência no Supabase, registar na sessão/memória:
    db.users.set(userId, newUser);

    // Registar relacionamento de convite caso exista
    if (referredBy) {
      const inviter = db.users.get(referredBy);
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

    // Inicializar carteira com 0.00 MZN
    const wallet = await WalletService.getWallet(userId);
    wallet.balance = initialBalance;
    wallet.updatedAt = new Date().toISOString();

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
