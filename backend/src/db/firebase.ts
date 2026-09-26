import { initializeApp, cert, getApps, getApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { dbStore } from './store.ts';
import type { User, Wallet, WalletTransaction, Match, Bet, AuditLog } from '../types/index.ts';

dotenv.config();

// Attempt to read local firebase-applet-config.json if available
let localFirebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    localFirebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  // Ignore
}

export interface FirebaseStatus {
  isConfigured: boolean;
  connected: boolean;
  projectId: string | null;
  error?: string | null;
}

class FirebaseService {
  private app: App | null = null;
  public db: Firestore | null = null;
  private auth: Auth | null = null;
  private hasAdminCredentials = false;
  private initialized = false;

  public get enabled(): boolean {
    return this.isAvailable();
  }

  constructor() {
    this.init();
  }

  public init() {
    if (this.initialized) return;

    try {
      const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || localFirebaseConfig.projectId;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const databaseId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || localFirebaseConfig.firestoreDatabaseId;

      let app: App | null = null;
      const existingApps = getApps();

      if (existingApps.length > 0) {
        app = existingApps[0];
      } else if (serviceAccountVar) {
        let serviceAccount: any;
        try {
          if (serviceAccountVar.trim().startsWith('{')) {
            serviceAccount = JSON.parse(serviceAccountVar);
          } else {
            serviceAccount = JSON.parse(Buffer.from(serviceAccountVar, 'base64').toString('utf-8'));
          }
        } catch (e) {
          console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e);
        }

        if (serviceAccount) {
          app = initializeApp({
            credential: cert(serviceAccount),
            databaseURL: `https://${serviceAccount.project_id || projectId}.firebaseio.com`
          });
          this.hasAdminCredentials = true;
          console.log(`[Firebase] initialized with service account for project: ${serviceAccount.project_id || projectId}`);
        }
      } else if (clientEmail && privateKey) {
        app = initializeApp({
          credential: cert({
            projectId: projectId || 'careful-yew-464707-b1',
            clientEmail,
            privateKey,
          }),
          databaseURL: `https://${projectId}.firebaseio.com`
        });
        this.hasAdminCredentials = true;
        console.log(`[Firebase] initialized with clientEmail/privateKey for project: ${projectId}`);
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        app = initializeApp({
          projectId: projectId || undefined
        });
        this.hasAdminCredentials = true;
        console.log(`[Firebase] initialized with GOOGLE_APPLICATION_CREDENTIALS for project: ${projectId}`);
      } else if (projectId) {
        // Limited initialization with project ID only (no server admin credentials)
        try {
          app = initializeApp({
            projectId: projectId
          });
          console.log(`[Firebase] initialized with project ID: ${projectId} (default credentials)`);
        } catch (e) {
          console.warn('[Firebase] Default credentials initialization failed:', e);
        }
      }

      if (app) {
        this.app = app;
        try {
          this.db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
          console.log('[Firebase] Firestore initialized successfully.');
        } catch (dbErr) {
          console.error('[Firebase] Failed to initialize Firestore:', dbErr);
          this.db = getFirestore(app);
        }
        try {
          this.auth = getAuth(app);
          console.log('[Firebase] Auth initialized successfully.');
        } catch (authErr) {
          console.error('[Firebase] Failed to initialize Auth:', authErr);
        }
        this.initialized = true;
      } else {
        console.warn('[Firebase] Not initialized: Credenciais de serviço Firebase não configuradas.');
      }
    } catch (err) {
      console.error('[Firebase] Initialization error:', err);
    }
  }

  public getDb(): Firestore | null {
    return this.db;
  }

  public getAuth(): Auth | null {
    return this.auth;
  }

  public isAvailable(): boolean {
    return this.initialized && this.hasAdminCredentials && this.db !== null;
  }

  public async getStatus(): Promise<FirebaseStatus> {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || localFirebaseConfig.projectId || null;
    if (!this.initialized || !this.hasAdminCredentials || !this.db) {
      return {
        isConfigured: false,
        connected: false,
        projectId,
        error: 'Credenciais de serviço Firebase (FIREBASE_SERVICE_ACCOUNT ou FIREBASE_PRIVATE_KEY) ainda não configuradas nas variáveis de ambiente do servidor.'
      };
    }

    try {
      // Test connection by trying to read a dummy document
      await this.db.collection('settings').doc('healthcheck').get();
      return {
        isConfigured: true,
        connected: true,
        projectId
      };
    } catch (err: any) {
      return {
        isConfigured: true,
        connected: false,
        projectId,
        error: err.message || 'Erro ao ligar ao Firebase Firestore'
      };
    }
  }

  // --- SYNC METHODS ---

  public async syncUser(user: User): Promise<void> {
    if (!this.db) return;
    try {
      const wallet = dbStore.wallets.get(user.id);
      await this.db.collection('users').doc(user.id).set({
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        status: user.isBlocked ? 'BLOCKED' : 'ACTIVE',
        balance: wallet?.balance || 0,
        referralCode: user.referralCode || null,
        referredBy: user.referredBy || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }, { merge: true });
    } catch (err) {
      console.error('[Firebase Sync] User error:', err);
    }
  }

  public async getUserByIdentifier(identifier: string): Promise<User | null> {
    if (!this.db) return null;
    try {
      const cleanDigits = identifier.replace(/\D/g, '');
      let query;
      if (identifier.includes('@')) {
        query = this.db.collection('users').where('email', '==', identifier.toLowerCase().trim()).limit(1);
      } else if (cleanDigits.length >= 8) {
        const nineDigits = cleanDigits.slice(-9);
        const variants = [
          identifier,
          cleanDigits,
          `+258${nineDigits}`,
          `+258 ${nineDigits.slice(0, 2)} ${nineDigits.slice(2, 5)} ${nineDigits.slice(5)}`
        ];
        query = this.db.collection('users').where('phone', 'in', variants).limit(1);
      } else {
        query = this.db.collection('users').where('id', '==', identifier).limit(1);
      }

      const snap = await query.get();
      if (snap.empty) return null;
      const data = snap.docs[0].data();
      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        passwordHash: data.passwordHash || '',
        role: data.role || 'USER',
        isBlocked: data.status === 'BLOCKED',
        referralCode: data.referralCode,
        referredBy: data.referredBy,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } catch (err) {
      console.error('[Firebase] Error in getUserByIdentifier:', err);
      return null;
    }
  }

  public async createUserAtomic(user: User): Promise<User> {
    if (!this.db) return user;
    const cleanDigits = user.phone.replace(/\D/g, '');
    const nineDigits = cleanDigits.slice(-9);
    const variants = [
      user.phone,
      cleanDigits,
      `+258${nineDigits}`,
      `+258 ${nineDigits.slice(0, 2)} ${nineDigits.slice(2, 5)} ${nineDigits.slice(5)}`
    ];

    const usersRef = this.db.collection('users');
    const existingSnap = await usersRef.where('phone', 'in', variants).limit(1).get();
    if (!existingSnap.empty) {
      throw new Error('PHONE_ALREADY_EXISTS');
    }

    await this.syncUser(user);
    return user;
  }

  public async syncWallet(wallet: Wallet): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.collection('users').doc(wallet.userId).set({
        balance: wallet.balance,
        updatedAt: wallet.updatedAt,
      }, { merge: true });
    } catch (err) {
      console.error('[Firebase Sync] Wallet error:', err);
    }
  }

  public async syncTransaction(tx: WalletTransaction): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.collection('transactions').doc(tx.id).set({
        id: tx.id,
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        prevBalance: tx.previousBalance,
        nextBalance: tx.nextBalance,
        referenceId: tx.reference,
        description: tx.description || null,
        createdAt: tx.createdAt,
      });
    } catch (err) {
      console.error('[Firebase Sync] Transaction error:', err);
    }
  }

  public async syncMatch(match: Match): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.collection('matches').doc(match.id).set({
        id: match.id,
        competitionId: match.competitionId,
        competitionName: match.competitionName,
        competitionCategory: match.competitionCategory,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        startTime: `${match.kickoffDate}T${match.kickoffTime}:00Z`,
        status: match.status,
        homeScore: match.homeScore ?? 0,
        awayScore: match.awayScore ?? 0,
        isFeatured: match.isFeatured ?? false,
        createdAt: match.createdAt,
        updatedAt: new Date().toISOString(),
      });

      // Sync markets as subcollection
      if (match.markets) {
        for (const market of match.markets) {
          const marketRef = this.db.collection('matches').doc(match.id).collection('markets').doc(market.id);
          await marketRef.set({
            id: market.id,
            name: market.name,
            type: market.type,
            status: market.status,
            createdAt: match.createdAt,
          });

          if (market.selections) {
            for (const sel of market.selections) {
              await marketRef.collection('selections').doc(sel.id).set({
                id: sel.id,
                outcome: sel.outcome,
                label: sel.label,
                odds: sel.odds,
                status: sel.status,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[Firebase Sync] Match error:', err);
    }
  }

  public async syncBet(bet: Bet): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.collection('bets').doc(bet.id).set({
        id: bet.id,
        userId: bet.userId,
        stake: bet.stake,
        totalOdds: bet.totalOdds,
        potentialReturn: bet.potentialReturn,
        status: bet.status,
        createdAt: bet.createdAt,
      });
    } catch (err) {
      console.error('[Firebase Sync] Bet error:', err);
    }
  }

  public async syncSettings(settings: any): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.collection('settings').doc('global').set({
        config: settings,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Firebase Sync] Settings error:', err);
    }
  }

  public async pullData(): Promise<{ success: boolean; results: any }> {
    if (!this.db) throw new Error('Firebase não inicializado');
    
    const results = { users: 0, matches: 0, settings: 0 };
    try {
      // Pull Users
      const usersSnap = await this.db.collection('users').get();
      usersSnap.forEach(doc => {
        const data = doc.data();
        const user: User = {
          id: data.id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          passwordHash: data.passwordHash || '',
          role: data.role || 'USER',
          isBlocked: data.status === 'BLOCKED',
          referralCode: data.referralCode,
          referredBy: data.referredBy,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        dbStore.users.set(user.id, user);
        
        if (!dbStore.wallets.has(user.id)) {
          dbStore.wallets.set(user.id, {
            id: `wal-${user.id}`,
            userId: user.id,
            balance: data.balance || 0,
            lockedBalance: 0,
            updatedAt: data.updatedAt,
          });
        }
        results.users++;
      });

      // Pull Settings
      const settingsDoc = await this.db.collection('settings').doc('global').get();
      if (settingsDoc.exists) {
        dbStore.settings = settingsDoc.data()?.config || dbStore.settings;
        results.settings = 1;
      }

      // Pull Matches
      const matchesSnap = await this.db.collection('matches').get();
      for (const matchDoc of matchesSnap.docs) {
        const m = matchDoc.data();
        const match: Match = {
          id: m.id,
          competitionId: m.competitionId,
          competitionName: m.competitionName,
          competitionCategory: m.competitionCategory,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          kickoffDate: m.startTime.split('T')[0],
          kickoffTime: m.startTime.split('T')[1].substring(0, 5),
          status: m.status,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          isFeatured: m.isFeatured,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          markets: []
        };
        
        // Pull markets
        const marketsSnap = await matchDoc.ref.collection('markets').get();
        for (const marketDoc of marketsSnap.docs) {
          const mk = marketDoc.data();
          const market: any = {
            id: mk.id,
            name: mk.name,
            type: mk.type,
            status: mk.status,
            selections: []
          };
          
          const selectionsSnap = await marketDoc.ref.collection('selections').get();
          selectionsSnap.forEach(selDoc => {
            market.selections.push(selDoc.data());
          });
          
          match.markets!.push(market);
        }
        
        dbStore.matches.set(match.id, match);
        results.matches++;
      }

      return { success: true, results };
    } catch (err) {
      console.error('[Firebase Pull] Error:', err);
      return { success: false, results };
    }
  }
}

export const firebaseService = new FirebaseService();
