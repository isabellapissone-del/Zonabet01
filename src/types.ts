export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  balance: number;
  isBlocked?: boolean;
  referralCode?: string;
  referralLink?: string;
  referredBy?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  bonusPercentage: number;
  totalInvited: number;
  totalBonusEarned: number;
  invitedUsers: Referral[];
}

export interface Selection {
  id: string;
  marketId: string;
  outcome: '1' | 'X' | '2' | string;
  label: string;
  odds: number;
  status: 'ACTIVE' | 'SETTLED_WIN' | 'SETTLED_LOST' | 'VOID';
}

export type MarketType = '1X2' | 'CORRECT_SCORE' | string;

export interface Market {
  id: string;
  matchId: string;
  type: MarketType;
  name: string;
  status: 'OPEN' | 'SUSPENDED' | 'CLOSED' | 'SETTLED';
  maxStake?: number;
  maxPayout?: number;
  maxExposure?: number;
  selections: Selection[];
  odds?: any;
}

export type CompetitionCategory = 'MOCAMBOLA' | 'PROVINCIAL' | 'DISTRITAL';

export interface Match {
  id: string;
  competitionId: string;
  competitionName: string;
  competitionCategory?: CompetitionCategory;
  homeTeam: string;
  awayTeam: string;
  kickoffDate: string;
  kickoffTime: string;
  status: 'DRAFT' | 'OPEN' | 'SUSPENDED' | 'CLOSED' | 'FINISHED' | 'CANCELLED';
  homeScore?: number | null;
  awayScore?: number | null;
  description?: string;
  markets: Market[];
  createdAt: string;
  updatedAt: string;
}

export interface Competition {
  id: string;
  name: string;
  country: string;
  code: string;
  category?: CompetitionCategory;
}

export interface BetSlipItem {
  matchId: string;
  matchTitle: string;
  competitionName: string;
  kickoff: string;
  marketId: string;
  marketName: string;
  selectionId: string;
  outcome: '1' | 'X' | '2' | string;
  selectionLabel: string;
  odds: number;
}

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
  status: 'PENDING' | 'WON' | 'LOST' | 'VOID';
  selectionLabel?: string;
  homeTeam?: string;
  awayTeam?: string;
  selection?: string;
  odds?: number;
}

export interface Bet {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'SINGLE' | 'MULTIPLE';
  stake: number;
  totalOdds: number;
  potentialReturn: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'VOID';
  items: BetItem[];
  settledAt?: string | null;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'BET' | 'WIN' | 'REFUND' | 'ADJUSTMENT' | 'WINNING_PAYOUT';
  amount: number;
  previousBalance: number;
  nextBalance: number;
  reference: string;
  description: string;
  status: 'COMPLETED' | 'FAILED';
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
  entityType?: string;
  newData?: any;
  previousData?: any;
  ipAddress?: string;
}

export interface DailyReportItem {
  date: string;
  wagered: number;
  paidOut: number;
  profit: number;
  betsCount: number;
  deposits: number;
  withdrawals: number;
  newUsers: number;
}

export interface DashboardStats {
  totalUsers: number;
  activeMatches: number;
  finishedMatches: number;
  pendingBets: number;
  wonBets: number;
  lostBets: number;
  voidBets?: number;
  totalBetVolume: number;
  totalDisbursedPayout: number;
  totalBalanceMoved: number;
  totalTransactions: number;

  // Árvore solicitada pelo utilizador:
  houseBalance?: number;        // Saldo da casa (reserva líquida)
  totalUsersBalance?: number;   // Saldo dos jogadores
  wageredToday?: number;        // Total apostado hoje
  paidOutToday?: number;        // Total pago em prêmios hoje
  houseProfit?: number;         // Lucro da casa total
  houseProfitToday?: number;    // Lucro da casa hoje
  profitMarginPercent?: number; // Margem de lucro (%)
  betsTodayCount?: number;
  wonTodayCount?: number;
  totalDepositsVolume?: number;
  totalWithdrawalsVolume?: number;
  depositsToday?: number;
  withdrawalsToday?: number;
  dailyReports?: DailyReportItem[];
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
  highRiskCount?: number;
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
