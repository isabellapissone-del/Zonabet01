export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  isBlocked: boolean;
  referralCode?: string;
  referralLink?: string;
  referredBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Referral {
  id: string;
  inviterId: string;
  inviterName: string;
  invitedUserId: string;
  invitedUserName: string;
  invitedUserPhone: string;
  totalBonusEarned: number;
  depositsCount: number;
  createdAt: string;
  lastBonusAt?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number; // Stored in 2-decimal format (MZN)
  lockedBalance: number;
  updatedAt: string;
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'BET' | 'WIN' | 'REFUND' | 'ADJUSTMENT';
export type TransactionStatus = 'COMPLETED' | 'FAILED';

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  previousBalance: number;
  nextBalance: number;
  reference: string;
  description: string;
  status: TransactionStatus;
  createdAt: string;
}

export type DepositProofStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DepositProof {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  amount: number;
  method: 'MPESA' | 'EMOLA' | 'MKESH' | 'BANK';
  referenceCode: string;
  operatorTxId?: string;
  receiptFileName?: string;
  receiptDataUrl?: string;
  receiptFileSize?: number;
  notes?: string;
  status: DepositProofStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type MatchStatus = 'DRAFT' | 'OPEN' | 'SUSPENDED' | 'CLOSED' | 'FINISHED' | 'CANCELLED';
export type CompetitionCategory = 'MOCAMBOLA' | 'PROVINCIAL' | 'DISTRITAL' | 'Futebol' | string;

export interface Competition {
  id: string;
  name: string;
  country: string;
  code: string;
  category?: CompetitionCategory;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
}

export interface Selection {
  id: string;
  marketId?: string;
  outcome: '1' | 'X' | '2' | string;
  label: string;
  odds: number;
  status: 'ACTIVE' | 'SETTLED_WIN' | 'SETTLED_LOST' | 'VOID';
}

export type MarketType = '1X2' | 'CORRECT_SCORE' | string;

export interface Market {
  id: string;
  matchId?: string;
  type: MarketType;
  name: string;
  status: 'OPEN' | 'SUSPENDED' | 'CLOSED' | 'SETTLED';
  maxStake?: number;
  maxPayout?: number;
  maxExposure?: number;
  selections: Selection[];
}

export interface Match {
  id: string;
  competitionId: string;
  competitionName: string;
  competitionCategory?: CompetitionCategory;
  homeTeam: string;
  awayTeam: string;
  kickoffDate: string; // YYYY-MM-DD
  kickoffTime: string; // HH:mm
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  isFeatured?: boolean;
  description?: string;
  markets: Market[];
  createdAt: string;
  updatedAt: string;
}

export type BetType = 'SINGLE' | 'MULTIPLE';
export type BetStatus = 'PENDING' | 'WON' | 'LOST' | 'VOID';

export interface BetItem {
  id: string;
  betId: string;
  matchId: string;
  matchTitle: string;
  competitionName: string;
  kickoff: string;
  marketId: string;
  marketName: string;
  selectionId: string;
  outcome: '1' | 'X' | '2' | string;
  oddsAtBetTime: number;
  label: string;
  status: 'PENDING' | 'WON' | 'LOST' | 'VOID';
}

export interface Bet {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: BetType;
  stake: number;
  totalOdds: number;
  potentialReturn: number;
  status: BetStatus;
  items: BetItem[];
  idempotencyKey?: string;
  settledAt?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  ip: string;
  timestamp: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface SystemSettings {
  // Apostas
  minStake: number;
  maxStake: number;
  maxDailyStakePerUser: number;
  maxPotentialWin: number;
  maxPayoutPerEvent: number;

  // Taxas
  withdrawalFeePercentage: number;
  withdrawalFeeActive: boolean;
  minWithdrawal: number;
  maxWithdrawal: number;
  minDeposit: number;
  maxDeposit: number;

  // Risco
  maxExposurePerMarket: number;
  maxExposurePerOutcome: number;
  riskMediumThresholdPct: number;
  riskHighThresholdPct: number;
  autoSuspendHighRisk: boolean;
  riskAlertsEnabled: boolean;

  // Mercados
  enabledMarkets: {
    '1X2': boolean;
    'CORRECT_SCORE': boolean;
    [key: string]: boolean;
  };

  // WhatsApp / Apoio
  whatsapp: {
    enabled: boolean;
    phone: string;
    message: string;
    buttonText: string;
    position: 'bottom-right' | 'bottom-left';
  };

  // Interface & Branding
  platformName: string;
  announcementNotice: string;
  announcementActive: boolean;
  supportEmail: string;
  currencySymbol: string;
  currencyCode: string;
}

export interface OutcomeRisk {
  outcome: string;
  label: string;
  odds: number;
  betsCount: number;
  totalStake: number;
  potentialPayout: number;
  netExposure: number;
}

export interface MarketRisk {
  marketId: string;
  marketName: string;
  marketType: MarketType;
  matchId: string;
  matchTitle: string;
  competitionName: string;
  status: 'OPEN' | 'SUSPENDED' | 'CLOSED' | 'SETTLED';
  totalBets: number;
  totalStake: number;
  highestPossiblePayout: number;
  netExposure: number;
  exposureLimit: number;
  exposurePercentage: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  topRiskOutcome: string;
  outcomes: OutcomeRisk[];
}

export interface RiskOverview {
  totalActiveBets: number;
  totalTurnover: number;
  totalPossiblePayout: number;
  totalNetExposure: number;
  highRiskMarketsCount: number;
  mediumRiskMarketsCount: number;
  markets: MarketRisk[];
  alerts: {
    id: string;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    marketId: string;
    matchTitle: string;
    createdAt: string;
  }[];
  settings: {
    maxExposurePerMarket: number;
    autoSuspendHighRisk: boolean;
    riskHighThresholdPct: number;
  };
}
