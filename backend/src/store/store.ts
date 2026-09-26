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

export class DataStore {
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
    ];

    // 2. Seed Times
    this.teams = [
      // Moçambola
      { id: 'team-costa-do-sol', name: 'Costa do Sol', shortName: 'CDS' },
      { id: 'team-ferroviario-maputo', name: 'Ferroviário de Maputo', shortName: 'FMA' },
      { id: 'team-ferroviario-beira', name: 'Ferroviário da Beira', shortName: 'FBE' },
      { id: 'team-black-bulls', name: 'Associação Black Bulls', shortName: 'ABB' },
      { id: 'team-ud-songo', name: 'UD Songo', shortName: 'UDS' },
      { id: 'team-ferroviario-nampula', name: 'Ferroviário de Nampula', shortName: 'FNA' },
      { id: 'team-baia-pemba', name: 'Baía de Pemba FC', shortName: 'BAP' },
      { id: 'team-brera-tchumene', name: 'Brera Tchumene FC', shortName: 'BRE' },

      // Sofala
      { id: 'team-estevao-beira', name: 'Estêvão Futebol Clube da Beira', shortName: 'EFB' },
      { id: 'team-textafrica-chimoio', name: 'Textáfrica de Chimoio', shortName: 'TEX' },
      { id: 'team-liga-desportiva-sofal', name: 'Liga Desportiva de Sofala', shortName: 'LDS' },
      { id: 'team-pipas-beira', name: 'Pipas FC da Beira', shortName: 'PIP' },
      { id: 'team-palmeiras-beira', name: 'Palmeiras de Beira', shortName: 'PAL' },
      { id: 'team-têxtil-púnguè', name: 'Clube Desportivo Têxtil do Púnguè', shortName: 'TEX' },

      // Manica
      { id: 'team-manica-fc', name: 'Manica Futebol Clube', shortName: 'MFC' },
      { id: 'team-soalpo-fc', name: 'Soalpo FC de Chimoio', shortName: 'SOA' },

      // Nampula
      { id: 'team-sporting-nampula', name: 'Sporting Clube de Nampula', shortName: 'SCN' },
      { id: 'team-desportivo-nampula', name: 'Desportivo de Nampula', shortName: 'DEN' },

      // Maputo Provincial
      { id: 'team-desportivo-maputo', name: 'Grupo Desportivo de Maputo', shortName: 'GDM' },
      { id: 'team-maxaquene', name: 'Clube de Desportos do Maxaquene', shortName: 'MAX' },

      // Distrital Beira
      { id: 'team-munhava-fc', name: 'Munhava FC da Beira', shortName: 'MUN' },
      { id: 'team-manga-sporting', name: 'Manga Sporting da Beira', shortName: 'MAN' },
      { id: 'team-chota-fc', name: 'Chota Futebol Clube', shortName: 'CHO' },
      { id: 'team-estoril-beira', name: 'Estoril FC da Beira', shortName: 'EST' },

      // Distrital Dondo
      { id: 'team-dondo-united', name: 'Dondo United', shortName: 'DOU' },
      { id: 'team-mafadzi-dondo', name: 'Mafadzi FC do Dondo', shortName: 'MAF' },

      // Distrital Nhamatanda
      { id: 'team-nhamatanda-clube', name: 'Clube Municipal de Nhamatanda', shortName: 'CMN' },
      { id: 'team-lamego-fc', name: 'Lamego FC de Nhamatanda', shortName: 'LAM' },
    ];

    // 3. Seed Users & Wallets
    const adminPasswordHash = bcrypt.hashSync('Admin123!ChangeMe', 10);
    const superAdminPasswordHash = bcrypt.hashSync('872344381', 10);
    const admin2PasswordHash = bcrypt.hashSync('872344381', 10);

    const adminUser: User = {
      id: 'usr-admin-01',
      name: 'Administrador ZONABET',
      email: 'admin@example.com',
      phone: '+258840000001',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isBlocked: false,
      referralCode: 'ZONAADMIN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(adminUser.id, adminUser);

    const adminWallet: Wallet = {
      id: 'wal-admin-01',
      userId: adminUser.id,
      balance: 0.00,
      lockedBalance: 0,
      updatedAt: new Date().toISOString(),
    };
    this.wallets.set(adminUser.id, adminWallet);

    const superAdminUser: User = {
      id: 'usr-superadmin-01',
      name: 'Super Administrador (Jaime Machesso)',
      email: 'jmachesso@zonabet.co.mz',
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

    const admin2User: User = {
      id: 'usr-superadmin-02',
      name: 'Administrador Secundário ZONABET',
      email: 'admin2@zonabet.co.mz',
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
    const byPhone = this.getUserByPhone(trimmed);
    if (byPhone) return byPhone;

    for (const user of this.users.values()) {
      if (user.name && user.name.toLowerCase() === trimmed.toLowerCase()) {
        return user;
      }
    }

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

  public clear(): void {
    this.users.clear();
    this.wallets.clear();
    this.transactions = [];
    this.matches.clear();
    this.bets.clear();
    this.auditLogs = [];
    this.depositProofs = [];
    this.referrals = [];
    this.idempotencyRecords.clear();
    this.initialized = false;
    this.seed();
  }
}

export const db = new DataStore();
export const dbStore = db;
export const store = db;
