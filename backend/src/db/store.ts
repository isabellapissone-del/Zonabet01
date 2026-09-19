import bcrypt from 'bcryptjs';
import type {
  User,
  Wallet,
  WalletTransaction,
  Match,
  Competition,
  Team,
  Bet,
  AuditLog,
  DepositProof,
  DepositProofStatus,
  Referral,
} from '../types/index.ts';

export interface IdempotencyRecord {
  key: string;
  responseStatus: number;
  responseBody: any;
  createdAt: string;
}

class DatabaseStore {
  public users: Map<string, User> = new Map();
  public wallets: Map<string, Wallet> = new Map(); // keyed by userId
  public transactions: WalletTransaction[] = [];
  public competitions: Competition[] = [];
  public teams: Team[] = [];
  public matches: Map<string, Match> = new Map();
  public bets: Map<string, Bet> = new Map();
  public settings: any = null;
  public auditLogs: AuditLog[] = [];
  public idempotencyRecords: Map<string, IdempotencyRecord> = new Map();
  public depositProofs: DepositProof[] = [];
  public referrals: Referral[] = [];

  private initialized = false;

  constructor() {
    this.seed();
  }

  public seed() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Seed Competitions (Moçambola, Campeonatos Provinciais e Campeonatos Distritais)
    this.competitions = [
      {
        id: 'comp-mocambola',
        name: 'Moçambola',
        country: 'Moçambique (Nacional)',
        code: 'MOC',
        category: 'MOCAMBOLA',
      },
      {
        id: 'comp-prov-sofala',
        name: 'Campeonato Provincial de Sofala',
        country: 'Sofala, Moçambique',
        code: 'CPS',
        category: 'PROVINCIAL',
      },
      {
        id: 'comp-prov-manica',
        name: 'Campeonato Provincial de Manica',
        country: 'Manica, Moçambique',
        code: 'CPM',
        category: 'PROVINCIAL',
      },
      {
        id: 'comp-prov-nampula',
        name: 'Campeonato Provincial de Nampula',
        country: 'Nampula, Moçambique',
        code: 'CPN',
        category: 'PROVINCIAL',
      },
      {
        id: 'comp-prov-maputo',
        name: 'Campeonato Provincial de Maputo',
        country: 'Maputo, Moçambique',
        code: 'CPMP',
        category: 'PROVINCIAL',
      },
      {
        id: 'comp-dist-beira',
        name: 'Campeonato Distrital da Beira',
        country: 'Distrito da Beira, Sofala',
        code: 'CDB',
        category: 'DISTRITAL',
      },
      {
        id: 'comp-dist-dondo',
        name: 'Campeonato Distrital do Dondo',
        country: 'Distrito do Dondo, Sofala',
        code: 'CDD',
        category: 'DISTRITAL',
      },
      {
        id: 'comp-dist-nhamatanda',
        name: 'Campeonato Distrital de Nhamatanda',
        country: 'Distrito de Nhamatanda, Sofala',
        code: 'CDN',
        category: 'DISTRITAL',
      },
      {
        id: 'comp-dist-marromeu',
        name: 'Campeonato Distrital de Marromeu',
        country: 'Distrito de Marromeu, Sofala',
        code: 'CDM',
        category: 'DISTRITAL',
      },
      {
        id: 'comp-dist-muanza',
        name: 'Campeonato Distrital de Muanza',
        country: 'Distrito de Muanza, Sofala',
        code: 'CDMU',
        category: 'DISTRITAL',
      },
      {
        id: 'comp-dist-cheringoma',
        name: 'Campeonato Distrital de Cheringoma',
        country: 'Distrito de Cheringoma, Sofala',
        code: 'CDCH',
        category: 'DISTRITAL',
      },
    ];

    // 2. Seed Teams (Clubes Moçambicanos)
    this.teams = [
      // Moçambola
      { id: 'team-1', name: 'Black Bulls', shortName: 'ABB' },
      { id: 'team-2', name: 'Ferroviário de Maputo', shortName: 'CFM' },
      { id: 'team-3', name: 'Desportivo de Nacala', shortName: 'NAC' },
      { id: 'team-4', name: 'Costa do Sol', shortName: 'CDS' },
      { id: 'team-5', name: 'Ferroviário da Beira', shortName: 'CFB' },
      { id: 'team-6', name: 'Clube de Chibuto', shortName: 'CHI' },
      { id: 'team-7', name: 'UD Songo', shortName: 'UDS' },
      { id: 'team-8', name: 'Ferroviário de Nampula', shortName: 'CFN' },
      { id: 'team-9', name: 'Textáfrica de Chimoio', shortName: 'TEX' },
      { id: 'team-10', name: 'Baía de Pemba FC', shortName: 'BAP' },
      { id: 'team-11', name: 'Brera Tchumene FC', shortName: 'BRE' },
      // Campeonatos Provinciais
      { id: 'team-12', name: 'Angoche FC', shortName: 'ANG' },
      { id: 'team-13', name: 'Mecuburi FC', shortName: 'MEC' },
      { id: 'team-14', name: 'Liga Desportiva de Sofala', shortName: 'LDS' },
      { id: 'team-15', name: 'Sporting Clube da Beira', shortName: 'SCB' },
      { id: 'team-16', name: 'Pipeline da Beira', shortName: 'PIP' },
      { id: 'team-17', name: 'Estrela Vermelha da Beira', shortName: 'EVB' },
      { id: 'team-18', name: 'Palmeiras de Púnguè', shortName: 'PAL' },
      { id: 'team-19', name: 'Chingale de Tete', shortName: 'CHT' },
      // Campeonatos Distritais
      { id: 'team-20', name: 'Estrela Vermelha', shortName: 'EV' },
      { id: 'team-21', name: 'União de Beira', shortName: 'UB' },
      { id: 'team-22', name: 'Munhava Futebol Clube', shortName: 'MFC' },
      { id: 'team-23', name: 'Manga Sport Clube', shortName: 'MSC' },
      { id: 'team-24', name: 'Atlético Clube do Dondo', shortName: 'ACD' },
      { id: 'team-25', name: 'Desportivo de Nhamatanda', shortName: 'DNH' },
      { id: 'team-26', name: 'Marromeu FC', shortName: 'MAR' },
      { id: 'team-27', name: 'Búzi Futebol Clube', shortName: 'BFC' },
      // Distrito de Muanza
      { id: 'team-28', name: 'Ferroviário de Muanza', shortName: 'CFM-MZ' },
      { id: 'team-29', name: 'Desportivo de Muanza', shortName: 'DMU' },
      // Distrito de Cheringoma (Inhaminga)
      { id: 'team-30', name: 'Águias de Inhaminga', shortName: 'AIN' },
      { id: 'team-31', name: 'União Desportiva de Cheringoma', shortName: 'UDC' },
    ];

    // 3. Seed Users
    // Super Admin 1: 872344381 / 12345678j (Super Administrador ZONABET)
    const superAdminPasswordHash = '$2b$10$CpbLqPaBqO9ht/0BFSybaeVgk8AYOoUsbG.Khq0UGbLF31vNhRtpa'; // Admin123!
    const superAdminUser: User = {
      id: 'usr-superadmin-01',
      name: 'Super Administrador ZONABET',
      email: 'admin@zonabet.co.mz',
      phone: '+258872344381',
      passwordHash: superAdminPasswordHash,
      role: 'ADMIN',
      isBlocked: false,
      referralCode: 'ZONA872344381',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(superAdminUser.id, superAdminUser);

    const superAdminWallet: Wallet = {
      id: 'wal-superadmin-01',
      userId: superAdminUser.id,
      balance: 0.00,
      lockedBalance: 0,
      updatedAt: new Date().toISOString(),
    };
    this.wallets.set(superAdminUser.id, superAdminWallet);

    // Super Admin 2 (User account for isapsiqui377@gmail.com & admin@example.com)
    const admin2PasswordHash = bcrypt.hashSync('Admin123!ChangeMe', 10);
    const admin2User: User = {
      id: 'usr-superadmin-02',
      name: 'Gestor Geral ZONABET',
      email: 'admin@example.com',
      phone: '+258872344380',
      passwordHash: admin2PasswordHash,
      role: 'ADMIN',
      isBlocked: false,
      referralCode: 'ZONA872344380',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(admin2User.id, admin2User);

    const admin2Wallet: Wallet = {
      id: 'wal-superadmin-02',
      userId: admin2User.id,
      balance: 0.00,
      lockedBalance: 0,
      updatedAt: new Date().toISOString(),
    };
    this.wallets.set(admin2User.id, admin2Wallet);

    const userAdminAccount: User = {
      id: 'usr-superadmin-03',
      name: 'Administrador ZONABET (Isa)',
      email: 'isapsiqui377@gmail.com',
      phone: '+258872344382',
      passwordHash: superAdminPasswordHash,
      role: 'ADMIN',
      isBlocked: false,
      referralCode: 'ZONA872344382',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(userAdminAccount.id, userAdminAccount);
    this.wallets.set(userAdminAccount.id, {
      id: 'wal-superadmin-03',
      userId: userAdminAccount.id,
      balance: 0.00,
      lockedBalance: 0,
      updatedAt: new Date().toISOString(),
    });

    // 4. Jogos gerenciados manualmente pelo administrador (inicia limpo)
    // Sem jogos mock ou odds calculadas automaticamente.
  }

  // Helper getters
  public getUserByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  public getUserByPhone(phone: string): User | undefined {
    const targetDigits = phone.replace(/\D/g, '');
    if (!targetDigits) return undefined;

    for (const user of this.users.values()) {
      if (!user.phone) continue;
      const userDigits = user.phone.replace(/\D/g, '');
      // Match exact digits or suffix of 9 Mozambican digits (e.g. 841234567)
      if (
        userDigits === targetDigits ||
        (targetDigits.length >= 8 && userDigits.endsWith(targetDigits.slice(-9))) ||
        (userDigits.length >= 8 && targetDigits.endsWith(userDigits.slice(-9)))
      ) {
        return user;
      }
    }
    return undefined;
  }

  public getUserByIdentifier(identifier: string): User | undefined {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return this.getUserByEmail(trimmed);
    }
    // Try by phone first
    const byPhone = this.getUserByPhone(trimmed);
    if (byPhone) return byPhone;
    // Fallback to email in case identifier is an email without @ or username
    return this.getUserByEmail(trimmed);
  }

  public getWallet(userId: string): Wallet | undefined {
    return this.wallets.get(userId);
  }

  public getTransactions(userId?: string): WalletTransaction[] {
    if (userId) {
      return this.transactions.filter((tx) => tx.userId === userId).reverse();
    }
    return [...this.transactions].reverse();
  }

  public getMatches(filter?: { status?: string; competitionId?: string; category?: string }): Match[] {
    const list = Array.from(this.matches.values());
    return list.filter((m) => {
      if (filter?.status && m.status !== filter.status) return false;
      if (filter?.competitionId && m.competitionId !== filter.competitionId) return false;
      if (filter?.category && filter.category !== 'ALL') {
        const comp = this.competitions.find((c) => c.id === m.competitionId);
        if (comp?.category !== filter.category && m.competitionCategory !== filter.category) return false;
      }
      return true;
    });
  }

  public getMatch(id: string): Match | undefined {
    return this.matches.get(id);
  }

  public getBets(userId?: string): Bet[] {
    const list = Array.from(this.bets.values());
    if (userId) {
      return list.filter((b) => b.userId === userId).reverse();
    }
    return list.reverse();
  }

  public getBet(id: string): Bet | undefined {
    return this.bets.get(id);
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const fullLog: AuditLog = {
      ...log,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(fullLog);
    return fullLog;
  }

  public addDepositProof(proof: DepositProof): DepositProof {
    this.depositProofs.unshift(proof);
    return proof;
  }

  public getDepositProofs(userId?: string): DepositProof[] {
    if (userId) {
      return this.depositProofs.filter((d) => d.userId === userId);
    }
    return this.depositProofs;
  }

  public getDepositProof(id: string): DepositProof | undefined {
    return this.depositProofs.find((d) => d.id === id);
  }

  public updateDepositProofStatus(
    id: string,
    status: DepositProofStatus,
    reviewedBy?: string,
    reviewNotes?: string
  ): DepositProof | null {
    const proof = this.depositProofs.find((p) => p.id === id);
    if (!proof) return null;
    proof.status = status;
    if (reviewedBy) proof.reviewedBy = reviewedBy;
    if (reviewNotes !== undefined) proof.reviewNotes = reviewNotes;
    proof.updatedAt = new Date().toISOString();
    return proof;
  }

  public getUserByReferralCode(rawCode: string): User | undefined {
    if (!rawCode) return undefined;
    const clean = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    const cleanDigits = rawCode.replace(/\D/g, '');

    for (const user of this.users.values()) {
      if (user.referralCode && user.referralCode.toUpperCase() === clean) {
        return user;
      }
      if (user.phone) {
        const userDigits = user.phone.replace(/\D/g, '');
        if (cleanDigits && (userDigits === cleanDigits || (cleanDigits.length >= 8 && userDigits.endsWith(cleanDigits.slice(-9))))) {
          return user;
        }
      }
      if (user.id === rawCode.trim()) {
        return user;
      }
    }
    return undefined;
  }

  public getReferralsByInviter(inviterId: string): Referral[] {
    return this.referrals.filter((r) => r.inviterId === inviterId);
  }

  public getReferralByInvitedUser(invitedUserId: string): Referral | undefined {
    return this.referrals.find((r) => r.invitedUserId === invitedUserId);
  }

  public addReferral(referral: Referral): Referral {
    this.referrals.unshift(referral);
    return referral;
  }

  public updateReferralBonus(invitedUserId: string, bonusAmount: number): void {
    const referral = this.referrals.find((r) => r.invitedUserId === invitedUserId);
    if (referral) {
      referral.totalBonusEarned = Math.round((referral.totalBonusEarned + bonusAmount) * 100) / 100;
      referral.depositsCount += 1;
      referral.lastBonusAt = new Date().toISOString();
    }
  }
}

export const db = new DatabaseStore();
export const dbStore = db;
