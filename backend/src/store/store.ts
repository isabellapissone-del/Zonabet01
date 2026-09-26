import bcrypt from 'bcryptjs';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { firestore, validateFirestoreConnection } from '../lib/firebase.ts';
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
  responseBody?: any;
  createdAt: string;
}

function cleanFirestoreData(data: any): any {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(cleanFirestoreData);
  const cleaned: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = cleanFirestoreData(value);
    }
  }
  return cleaned;
}

export class DataStore {
  public users = new Map<string, User>();
  public wallets = new Map<string, Wallet>();
  public transactions = new Array<WalletTransaction>();
  public competitions = new Map<string, Competition>();
  public teams = new Map<string, Team>();
  public matches = new Map<string, Match>();
  public bets = new Map<string, Bet>();
  public auditLogs = new Array<AuditLog>();
  public idempotencyRecords = new Map<string, IdempotencyRecord>();
  public depositProofs = new Map<string, DepositProof>();
  public referrals = new Map<string, Referral>();
  public settings: any = {
    minStake: 20,
    maxStake: 50000,
    maxPotentialWin: 1000000,
    announcement: 'Bem-vindo ao ZONABET - A maior casa de apostas de Moçambique!',
  };

  private initialized = false;
  private initializePromise: Promise<void> | null = null;

  constructor() {
    this.initializePromise = this.initialize();
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      await validateFirestoreConnection();

      // 1. Settings
      try {
        const settingsDoc = await getDoc(doc(firestore, 'settings', 'global'));
        if (settingsDoc.exists()) {
          this.settings = { ...this.settings, ...settingsDoc.data() };
        } else {
          await setDoc(doc(firestore, 'settings', 'global'), cleanFirestoreData(this.settings));
        }
      } catch (e: any) {
        console.error('[Firestore init settings error]', e.message);
      }

      // 2. Competitions
      try {
        const compSnap = await getDocs(collection(firestore, 'competitions'));
        if (!compSnap.empty) {
          compSnap.forEach((d) => this.competitions.set(d.id, d.data() as Competition));
        } else {
          const comps: Competition[] = [
            { id: 'mocambola', name: 'Moçambola', category: 'MOCAMBOLA', country: 'Moçambique', code: 'MOC' },
            { id: 'provincial-maputo', name: 'Campeonato Provincial de Maputo', category: 'PROVINCIAL', country: 'Moçambique', code: 'PROV' },
            { id: 'distrital-beira', name: 'Campeonato Distrital da Beira', category: 'DISTRITAL', country: 'Moçambique', code: 'DIST' },
          ];
          for (const c of comps) {
            this.competitions.set(c.id, c);
            await setDoc(doc(firestore, 'competitions', c.id), cleanFirestoreData(c));
          }
        }
      } catch (e: any) {
        console.error('[Firestore init competitions error]', e.message);
      }

      // 3. Teams
      try {
        const teamsSnap = await getDocs(collection(firestore, 'teams'));
        if (!teamsSnap.empty) {
          teamsSnap.forEach((d) => this.teams.set(d.id, d.data() as Team));
        } else {
          const teams: Team[] = [
            { id: 'fer-maputo', name: 'Ferroviário de Maputo', shortName: 'FER' },
            { id: 'costa-sol', name: 'Costa do Sol', shortName: 'COS' },
            { id: 'black-bulls', name: 'Black Bulls', shortName: 'ABB' },
            { id: 'ud-songo', name: 'UD Songo', shortName: 'UDS' },
          ];
          for (const t of teams) {
            this.teams.set(t.id, t);
            await setDoc(doc(firestore, 'teams', t.id), cleanFirestoreData(t));
          }
        }
      } catch (e: any) {
        console.error('[Firestore init teams error]', e.message);
      }

      // 4. Users & Admin Accounts
      try {
        const usersSnap = await getDocs(collection(firestore, 'users'));
        const now = new Date().toISOString();
        const validAdminHash = bcrypt.hashSync('Admin123!ChangeMe', 10);

        if (!usersSnap.empty) {
          for (const d of usersSnap.docs) {
            const u = d.data() as User;
            if (u.role === 'ADMIN' && (!u.passwordHash || u.passwordHash.includes('6mI/q6/n6X567'))) {
              u.passwordHash = validAdminHash;
              await setDoc(doc(firestore, 'users', u.id), cleanFirestoreData(u)).catch(() => {});
            }
            this.users.set(u.id, u);
          }
        } else {
          const admins: User[] = [
            {
              id: 'admin-1',
              name: 'Administrador ZONABET',
              email: 'admin@example.com',
              phone: '840000000',
              passwordHash: validAdminHash,
              role: 'ADMIN',
              isBlocked: false,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: 'admin-jm',
              name: 'Joao Machesso',
              email: 'jmachesso@zonabet.co.mz',
              phone: '872344381',
              passwordHash: validAdminHash,
              role: 'ADMIN',
              isBlocked: false,
              createdAt: now,
              updatedAt: now,
            },
          ];
          for (const a of admins) {
            this.users.set(a.id, a);
            await setDoc(doc(firestore, 'users', a.id), cleanFirestoreData(a));

            const wallet: Wallet = {
              id: a.id,
              userId: a.id,
              balance: 1000000,
              lockedBalance: 0,
              updatedAt: now,
            };
            this.wallets.set(a.id, wallet);
            await setDoc(doc(firestore, 'wallets', a.id), cleanFirestoreData(wallet));
          }
        }
      } catch (e: any) {
        console.error('[Firestore init users error]', e.message);
      }

      // Ensure admin users always have valid bcrypt hashes in memory
      for (const u of this.users.values()) {
        if (u.role === 'ADMIN' && (!u.passwordHash || u.passwordHash.includes('6mI/q6/n6X567'))) {
          u.passwordHash = bcrypt.hashSync('Admin123!ChangeMe', 10);
        }
      }

      // 5. Load Wallets
      try {
        const walletsSnap = await getDocs(collection(firestore, 'wallets'));
        walletsSnap.forEach((d) => this.wallets.set(d.id, d.data() as Wallet));
      } catch (e: any) {
        console.error('[Firestore init wallets error]', e.message);
      }

      // 6. Load Matches
      try {
        const matchesSnap = await getDocs(collection(firestore, 'matches'));
        matchesSnap.forEach((d) => this.matches.set(d.id, d.data() as Match));
      } catch (e: any) {
        console.error('[Firestore init matches error]', e.message);
      }

      // 7. Load Bets
      try {
        const betsSnap = await getDocs(collection(firestore, 'bets'));
        betsSnap.forEach((d) => this.bets.set(d.id, d.data() as Bet));
      } catch (e: any) {
        console.error('[Firestore init bets error]', e.message);
      }

      // 8. Load Transactions
      try {
        const txSnap = await getDocs(collection(firestore, 'wallet_transactions'));
        const txs: WalletTransaction[] = [];
        txSnap.forEach((d) => txs.push(d.data() as WalletTransaction));
        this.transactions = txs;
      } catch (e: any) {
        console.error('[Firestore init transactions error]', e.message);
      }

      // 9. Load Deposit Proofs
      try {
        const proofsSnap = await getDocs(collection(firestore, 'deposit_proofs'));
        proofsSnap.forEach((d) => this.depositProofs.set(d.id, d.data() as DepositProof));
      } catch (e: any) {
        console.error('[Firestore init deposit proofs error]', e.message);
      }

      // 10. Load Referrals
      try {
        const refSnap = await getDocs(collection(firestore, 'referrals'));
        refSnap.forEach((d) => this.referrals.set(d.id, d.data() as Referral));
      } catch (e: any) {
        console.error('[Firestore init referrals error]', e.message);
      }

      // 11. Load Audit Logs
      try {
        const auditSnap = await getDocs(collection(firestore, 'audit_logs'));
        const logs: AuditLog[] = [];
        auditSnap.forEach((d) => logs.push(d.data() as AuditLog));
        this.auditLogs = logs;
      } catch (e: any) {
        console.error('[Firestore init audit logs error]', e.message);
      }

      console.log('[Firestore Store] Firestore inicializado e sincronizado com sucesso.');
    } catch (err: any) {
      console.error('[Firestore Store] Erro crítico na inicialização do Firestore:', err.message || err);
    }
  }

  private async ensureInitialized() {
    if (this.initializePromise) {
      await this.initializePromise;
    }
  }

  public async getUserByEmail(email: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const e = email.toLowerCase().trim();
    try {
      const q = query(collection(firestore, 'users'), where('email', '==', e));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const user = snap.docs[0].data() as User;
        if (user.role === 'ADMIN' && (!user.passwordHash || user.passwordHash.includes('6mI/q6/n6X567'))) {
          user.passwordHash = bcrypt.hashSync('Admin123!ChangeMe', 10);
        }
        this.users.set(user.id, user);
        return user;
      }
    } catch (err) {
      console.error('[Firestore] getUserByEmail query error:', err);
    }
    return Array.from(this.users.values()).find((u) => u.email.toLowerCase() === e);
  }

  public async getUserByPhone(phone: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const cleanDigits = phone.replace(/\D/g, '');
    let nineDigits = cleanDigits;
    if (cleanDigits.startsWith('258') && cleanDigits.length >= 11) {
      nineDigits = cleanDigits.slice(3);
    } else if (cleanDigits.length > 9) {
      nineDigits = cleanDigits.slice(-9);
    }

    try {
      const snap = await getDocs(collection(firestore, 'users'));
      for (const docSnap of snap.docs) {
        const user = docSnap.data() as User;
        const uPhoneDigits = user.phone.replace(/\D/g, '');
        if (uPhoneDigits === cleanDigits || uPhoneDigits.endsWith(nineDigits)) {
          this.users.set(user.id, user);
          return user;
        }
      }
    } catch (err) {
      console.error('[Firestore] getUserByPhone scan error:', err);
    }

    return Array.from(this.users.values()).find((u) => {
      const uPhoneDigits = u.phone.replace(/\D/g, '');
      return uPhoneDigits === cleanDigits || uPhoneDigits.endsWith(nineDigits);
    });
  }

  public async getUserByIdentifier(identifier: string): Promise<User | undefined> {
    if (identifier.includes('@')) return this.getUserByEmail(identifier);
    return this.getUserByPhone(identifier);
  }

  public async getUserById(id: string): Promise<User | undefined> {
    await this.ensureInitialized();
    try {
      const userDoc = await getDoc(doc(firestore, 'users', id));
      if (userDoc.exists()) {
        const user = userDoc.data() as User;
        if (user.role === 'ADMIN' && (!user.passwordHash || user.passwordHash.includes('6mI/q6/n6X567'))) {
          user.passwordHash = bcrypt.hashSync('Admin123!ChangeMe', 10);
        }
        this.users.set(id, user);
        return user;
      }
    } catch (err) {
      console.error('[Firestore] getUserById error:', err);
    }
    return this.users.get(id);
  }

  public async getUserByReferralCode(code: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const c = code.trim().toUpperCase();
    try {
      const q = query(collection(firestore, 'users'), where('referralCode', '==', c));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const user = snap.docs[0].data() as User;
        this.users.set(user.id, user);
        return user;
      }
    } catch (err) {
      console.error('[Firestore] getUserByReferralCode error:', err);
    }
    return Array.from(this.users.values()).find((u) => u.referralCode === c);
  }

  public async saveUser(user: User): Promise<User> {
    await this.ensureInitialized();
    this.users.set(user.id, user);
    try {
      await setDoc(doc(firestore, 'users', user.id), cleanFirestoreData(user));
    } catch (err) {
      console.error('[Firestore] saveUser error:', err);
    }
    return user;
  }

  public async deleteUser(id: string): Promise<void> {
    await this.ensureInitialized();
    this.users.delete(id);
    this.wallets.delete(id);
    try {
      await deleteDoc(doc(firestore, 'users', id));
      await deleteDoc(doc(firestore, 'wallets', id));
    } catch (err) {
      console.error('[Firestore] deleteUser error:', err);
    }
  }

  public async getWallet(userId: string): Promise<Wallet | undefined> {
    await this.ensureInitialized();
    try {
      const walletDoc = await getDoc(doc(firestore, 'wallets', userId));
      if (walletDoc.exists()) {
        const wallet = walletDoc.data() as Wallet;
        this.wallets.set(userId, wallet);
        return wallet;
      }
    } catch (err) {
      console.error('[Firestore] getWallet error:', err);
    }

    let localWallet = this.wallets.get(userId);
    if (!localWallet) {
      localWallet = {
        id: userId,
        userId,
        balance: 0,
        lockedBalance: 0,
        updatedAt: new Date().toISOString(),
      };
      await this.saveWallet(localWallet);
    }
    return localWallet;
  }

  public async saveWallet(wallet: Wallet): Promise<void> {
    await this.ensureInitialized();
    this.wallets.set(wallet.userId, wallet);
    try {
      await setDoc(doc(firestore, 'wallets', wallet.userId), cleanFirestoreData(wallet));
    } catch (err) {
      console.error('[Firestore] saveWallet error:', err);
    }
  }

  public async getTransactions(userId?: string): Promise<WalletTransaction[]> {
    await this.ensureInitialized();
    try {
      const snap = await getDocs(collection(firestore, 'wallet_transactions'));
      const list: WalletTransaction[] = [];
      snap.forEach((d) => list.push(d.data() as WalletTransaction));
      this.transactions = list;
    } catch (err) {
      console.error('[Firestore] getTransactions error:', err);
    }

    if (!userId) return [...this.transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return this.transactions.filter((t) => t.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async executeTransaction(params: {
    userId: string;
    type: string;
    amount: number;
    reference: string;
    description: string;
  }): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    await this.ensureInitialized();

    const walletRef = doc(firestore, 'wallets', params.userId);
    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const txRef = doc(firestore, 'wallet_transactions', txId);

    const isDeduction = params.type === 'BET' || params.type === 'WITHDRAWAL' || (params.type === 'ADJUSTMENT' && params.amount < 0);
    const amountVal = Math.abs(params.amount);
    const balanceChange = isDeduction ? -amountVal : amountVal;

    let updatedWallet: Wallet;
    let newTx: WalletTransaction;

    try {
      await runTransaction(firestore, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        const memoryWallet = this.wallets.get(params.userId);
        let walletData: Wallet;

        if (!walletDoc.exists()) {
          walletData = memoryWallet ? { ...memoryWallet } : {
            id: params.userId,
            userId: params.userId,
            balance: 0,
            lockedBalance: 0,
            updatedAt: new Date().toISOString(),
          };
        } else {
          walletData = walletDoc.data() as Wallet;
          // Synchronize local memory balance if memory holds the latest state
          if (memoryWallet && memoryWallet.balance !== undefined) {
            walletData.balance = memoryWallet.balance;
          }
        }

        const previousBalance = walletData.balance;
        const nextBalance = previousBalance + balanceChange;

        if (nextBalance < 0) {
          throw new Error('Saldo insuficiente');
        }

        walletData.balance = Math.round(nextBalance * 100) / 100;
        walletData.updatedAt = new Date().toISOString();

        newTx = {
          id: txId,
          walletId: walletData.id,
          userId: params.userId,
          type: params.type as any,
          amount: amountVal,
          previousBalance,
          nextBalance: walletData.balance,
          reference: params.reference,
          description: params.description,
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
        };

        transaction.set(walletRef, cleanFirestoreData(walletData));
        transaction.set(txRef, cleanFirestoreData(newTx));
        updatedWallet = walletData;
      });

      this.wallets.set(params.userId, updatedWallet!);
      this.transactions.push(newTx!);

      return { wallet: updatedWallet!, transaction: newTx! };
    } catch (err: any) {
      if (err.message && err.message.includes('insuficiente')) {
        throw err;
      }

      // Fallback
      let wallet = this.wallets.get(params.userId);
      if (!wallet) {
        wallet = {
          id: params.userId,
          userId: params.userId,
          balance: 0,
          lockedBalance: 0,
          updatedAt: new Date().toISOString(),
        };
      }

      const previousBalance = wallet.balance;
      const nextBalance = previousBalance + balanceChange;
      if (nextBalance < 0) throw new Error('Saldo insuficiente');

      wallet.balance = Math.round(nextBalance * 100) / 100;
      wallet.updatedAt = new Date().toISOString();

      const transaction: WalletTransaction = {
        id: txId,
        walletId: wallet.id,
        userId: params.userId,
        type: params.type as any,
        amount: amountVal,
        previousBalance,
        nextBalance: wallet.balance,
        reference: params.reference,
        description: params.description,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };

      this.wallets.set(params.userId, wallet);
      this.transactions.push(transaction);

      await setDoc(doc(firestore, 'wallets', params.userId), cleanFirestoreData(wallet)).catch(() => {});
      await setDoc(doc(firestore, 'wallet_transactions', txId), cleanFirestoreData(transaction)).catch(() => {});

      return { wallet, transaction };
    }
  }

  public async resetAllBalances(): Promise<number> {
    await this.ensureInitialized();
    let count = 0;
    try {
      const snap = await getDocs(collection(firestore, 'wallets'));
      const batch = writeBatch(firestore);
      snap.forEach((docSnap) => {
        const w = docSnap.data() as Wallet;
        if (w.balance > 0) {
          batch.update(doc(firestore, 'wallets', w.id), {
            balance: 0,
            updatedAt: new Date().toISOString(),
          });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.error('[Firestore] resetAllBalances error:', err);
    }

    for (const wallet of this.wallets.values()) {
      if (wallet.balance > 0) {
        wallet.balance = 0;
        wallet.updatedAt = new Date().toISOString();
      }
    }
    return count;
  }

  public async getMatches(filter?: { status?: string; competitionId?: string; category?: string }): Promise<Match[]> {
    await this.ensureInitialized();
    try {
      const snap = await getDocs(collection(firestore, 'matches'));
      const list: Match[] = [];
      snap.forEach((d) => {
        const m = d.data() as Match;
        list.push(m);
        this.matches.set(m.id, m);
      });
      let filtered = list;
      if (filter?.status) filtered = filtered.filter((m) => m.status === filter.status);
      if (filter?.competitionId) filtered = filtered.filter((m) => m.competitionId === filter.competitionId);
      if (filter?.category && filter.category !== 'ALL') {
        const compIds = Array.from(this.competitions.values())
          .filter((c) => c.category === filter.category)
          .map((c) => c.id);
        filtered = filtered.filter((m) => compIds.includes(m.competitionId));
      }
      return filtered.sort((a, b) => `${a.kickoffDate} ${a.kickoffTime}`.localeCompare(`${b.kickoffDate} ${b.kickoffTime}`));
    } catch (err) {
      console.error('[Firestore] getMatches error:', err);
    }

    let list = Array.from(this.matches.values());
    if (filter?.status) list = list.filter((m) => m.status === filter.status);
    if (filter?.competitionId) list = list.filter((m) => m.competitionId === filter.competitionId);
    if (filter?.category && filter.category !== 'ALL') {
      const compIds = Array.from(this.competitions.values())
        .filter((c) => c.category === filter.category)
        .map((c) => c.id);
      list = list.filter((m) => compIds.includes(m.competitionId));
    }
    return list.sort((a, b) => `${a.kickoffDate} ${a.kickoffTime}`.localeCompare(`${b.kickoffDate} ${b.kickoffTime}`));
  }

  public async getMatch(id: string): Promise<Match | undefined> {
    await this.ensureInitialized();
    try {
      const docSnap = await getDoc(doc(firestore, 'matches', id));
      if (docSnap.exists()) {
        const match = docSnap.data() as Match;
        this.matches.set(id, match);
        return match;
      }
    } catch (err) {
      console.error('[Firestore] getMatch error:', err);
    }
    return this.matches.get(id);
  }

  public async saveMatch(match: Match): Promise<Match> {
    await this.ensureInitialized();
    this.matches.set(match.id, match);
    try {
      await setDoc(doc(firestore, 'matches', match.id), cleanFirestoreData(match));
    } catch (err) {
      console.error('[Firestore] saveMatch error:', err);
    }
    return match;
  }

  public async deleteMatch(id: string): Promise<void> {
    await this.ensureInitialized();
    this.matches.delete(id);
    try {
      await deleteDoc(doc(firestore, 'matches', id));
    } catch (err) {
      console.error('[Firestore] deleteMatch error:', err);
    }
  }

  public async getBets(userId?: string): Promise<Bet[]> {
    await this.ensureInitialized();
    try {
      const snap = await getDocs(collection(firestore, 'bets'));
      const list: Bet[] = [];
      snap.forEach((d) => {
        const b = d.data() as Bet;
        list.push(b);
        this.bets.set(b.id, b);
      });
      if (!userId) return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return list.filter((b) => b.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      console.error('[Firestore] getBets error:', err);
    }

    const list = Array.from(this.bets.values());
    if (!userId) return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list.filter((b) => b.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async getBet(id: string): Promise<Bet | undefined> {
    await this.ensureInitialized();
    try {
      const docSnap = await getDoc(doc(firestore, 'bets', id));
      if (docSnap.exists()) {
        const bet = docSnap.data() as Bet;
        this.bets.set(id, bet);
        return bet;
      }
    } catch (err) {
      console.error('[Firestore] getBet error:', err);
    }
    return this.bets.get(id);
  }

  public async saveBet(bet: Bet): Promise<Bet> {
    await this.ensureInitialized();
    this.bets.set(bet.id, bet);
    try {
      await setDoc(doc(firestore, 'bets', bet.id), cleanFirestoreData(bet));
    } catch (err) {
      console.error('[Firestore] saveBet error:', err);
    }
    return bet;
  }

  public async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    await this.ensureInitialized();
    const newLog: AuditLog = {
      ...log,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.push(newLog);
    try {
      await setDoc(doc(firestore, 'audit_logs', newLog.id), cleanFirestoreData(newLog));
    } catch (err) {
      console.error('[Firestore] addAuditLog error:', err);
    }
    return newLog;
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    await this.ensureInitialized();
    try {
      const snap = await getDocs(collection(firestore, 'audit_logs'));
      const logs: AuditLog[] = [];
      snap.forEach((d) => logs.push(d.data() as AuditLog));
      this.auditLogs = logs;
    } catch (err) {
      console.error('[Firestore] getAuditLogs error:', err);
    }
    return [...this.auditLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  public async addDepositProof(proof: DepositProof): Promise<DepositProof> {
    await this.ensureInitialized();
    this.depositProofs.set(proof.id, proof);
    try {
      await setDoc(doc(firestore, 'deposit_proofs', proof.id), cleanFirestoreData(proof));
    } catch (err) {
      console.error('[Firestore] addDepositProof error:', err);
    }
    return proof;
  }

  public async getDepositProofs(userId?: string): Promise<DepositProof[]> {
    await this.ensureInitialized();
    try {
      const snap = await getDocs(collection(firestore, 'deposit_proofs'));
      const list: DepositProof[] = [];
      snap.forEach((d) => {
        const p = d.data() as DepositProof;
        list.push(p);
        this.depositProofs.set(p.id, p);
      });
      if (!userId) return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return list.filter((p) => p.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      console.error('[Firestore] getDepositProofs error:', err);
    }

    const list = Array.from(this.depositProofs.values());
    if (!userId) return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list.filter((p) => p.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async getDepositProof(id: string): Promise<DepositProof | undefined> {
    await this.ensureInitialized();
    try {
      const docSnap = await getDoc(doc(firestore, 'deposit_proofs', id));
      if (docSnap.exists()) {
        const proof = docSnap.data() as DepositProof;
        this.depositProofs.set(id, proof);
        return proof;
      }
    } catch (err) {
      console.error('[Firestore] getDepositProof error:', err);
    }
    return this.depositProofs.get(id);
  }

  public async updateDepositProofStatus(
    id: string,
    status: DepositProofStatus,
    reviewedBy?: string,
    reviewNotes?: string
  ): Promise<DepositProof | null> {
    await this.ensureInitialized();
    const proof = await this.getDepositProof(id);
    if (!proof) return null;

    proof.status = status;
    proof.reviewedBy = reviewedBy;
    proof.reviewNotes = reviewNotes;
    proof.updatedAt = new Date().toISOString();

    this.depositProofs.set(id, proof);
    try {
      await updateDoc(doc(firestore, 'deposit_proofs', id), cleanFirestoreData({
        status,
        reviewedBy: reviewedBy || null,
        reviewNotes: reviewNotes || null,
        updatedAt: proof.updatedAt,
      }));
    } catch (err) {
      console.error('[Firestore] updateDepositProofStatus error:', err);
    }
    return proof;
  }

  public async getReferralsByInviter(inviterId: string): Promise<Referral[]> {
    await this.ensureInitialized();
    try {
      const snap = await getDocs(collection(firestore, 'referrals'));
      const list: Referral[] = [];
      snap.forEach((d) => {
        const r = d.data() as Referral;
        list.push(r);
        this.referrals.set(r.id, r);
      });
      return list.filter((r) => r.inviterId === inviterId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      console.error('[Firestore] getReferralsByInviter error:', err);
    }
    return Array.from(this.referrals.values()).filter((r) => r.inviterId === inviterId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async getReferralByInvitedUser(invitedUserId: string): Promise<Referral | undefined> {
    await this.ensureInitialized();
    try {
      const q = query(collection(firestore, 'referrals'), where('invitedUserId', '==', invitedUserId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const ref = snap.docs[0].data() as Referral;
        this.referrals.set(ref.id, ref);
        return ref;
      }
    } catch (err) {
      console.error('[Firestore] getReferralByInvitedUser error:', err);
    }
    return Array.from(this.referrals.values()).find((r) => r.invitedUserId === invitedUserId);
  }

  public async addReferral(referral: Referral): Promise<Referral> {
    await this.ensureInitialized();
    this.referrals.set(referral.id, referral);
    try {
      await setDoc(doc(firestore, 'referrals', referral.id), cleanFirestoreData(referral));
    } catch (err) {
      console.error('[Firestore] addReferral error:', err);
    }
    return referral;
  }

  public async updateReferralBonus(invitedUserId: string, bonusAmount: number): Promise<void> {
    await this.ensureInitialized();
    const referral = await this.getReferralByInvitedUser(invitedUserId);
    if (referral) {
      referral.totalBonusEarned = Math.round((referral.totalBonusEarned + bonusAmount) * 100) / 100;
      referral.depositsCount++;
      referral.lastBonusAt = new Date().toISOString();
      this.referrals.set(referral.id, referral);
      try {
        await updateDoc(doc(firestore, 'referrals', referral.id), cleanFirestoreData({
          totalBonusEarned: referral.totalBonusEarned,
          depositsCount: referral.depositsCount,
          lastBonusAt: referral.lastBonusAt,
        }));
      } catch (err) {
        console.error('[Firestore] updateReferralBonus error:', err);
      }
    }
  }

  public async getIdempotencyRecord(key: string): Promise<IdempotencyRecord | undefined> {
    await this.ensureInitialized();
    try {
      const docSnap = await getDoc(doc(firestore, 'idempotency_records', key));
      if (docSnap.exists()) {
        const rec = docSnap.data() as IdempotencyRecord;
        this.idempotencyRecords.set(key, rec);
        return rec;
      }
    } catch (err) {
      console.error('[Firestore] getIdempotencyRecord error:', err);
    }
    return this.idempotencyRecords.get(key);
  }

  public async addIdempotencyRecord(record: IdempotencyRecord): Promise<void> {
    await this.ensureInitialized();
    this.idempotencyRecords.set(record.key, record);
    try {
      await setDoc(doc(firestore, 'idempotency_records', record.key), cleanFirestoreData(record));
    } catch (err) {
      console.error('[Firestore] addIdempotencyRecord error:', err);
    }
  }

  public async getCompetitions(): Promise<Competition[]> {
    await this.ensureInitialized();
    try {
      const snap = await getDocs(collection(firestore, 'competitions'));
      const list: Competition[] = [];
      snap.forEach((d) => {
        const c = d.data() as Competition;
        list.push(c);
        this.competitions.set(c.id, c);
      });
      if (list.length > 0) return list;
    } catch (err) {
      console.error('[Firestore] getCompetitions error:', err);
    }
    return Array.from(this.competitions.values());
  }

  public async getTeams(): Promise<Team[]> {
    await this.ensureInitialized();
    try {
      const snap = await getDocs(collection(firestore, 'teams'));
      const list: Team[] = [];
      snap.forEach((d) => {
        const t = d.data() as Team;
        list.push(t);
        this.teams.set(t.id, t);
      });
      if (list.length > 0) return list;
    } catch (err) {
      console.error('[Firestore] getTeams error:', err);
    }
    return Array.from(this.teams.values());
  }

  public async getPublicSettings(): Promise<any> {
    await this.ensureInitialized();
    try {
      const docSnap = await getDoc(doc(firestore, 'settings', 'global'));
      if (docSnap.exists()) {
        this.settings = { ...this.settings, ...docSnap.data() };
      }
    } catch (err) {
      console.error('[Firestore] getPublicSettings error:', err);
    }
    return this.settings;
  }

  public async saveSettings(settings: any): Promise<void> {
    await this.ensureInitialized();
    this.settings = { ...this.settings, ...settings };
    try {
      await setDoc(doc(firestore, 'settings', 'global'), cleanFirestoreData(this.settings), { merge: true });
    } catch (err) {
      console.error('[Firestore] saveSettings error:', err);
    }
  }
}

export const db = new DataStore();
export const dbStore = db;
export const store = db;
