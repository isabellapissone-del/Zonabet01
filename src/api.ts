import { safeStorage } from './utils/storage.ts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getAuthToken(): string | null {
  return safeStorage.getItem('zonabet_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    safeStorage.setItem('zonabet_token', token);
  } else {
    safeStorage.removeItem('zonabet_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkError: any) {
    console.error(`[API Network Error] ${options.method || 'GET'} ${endpoint}:`, networkError);
    throw new Error('Falha de ligação ao servidor. Por favor, tente novamente.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint} -> ${response.status}:`, data);
    const message =
      data.error ||
      (response.status === 404
        ? 'Serviço temporariamente indisponível (404).'
        : response.status === 504
        ? 'O servidor demorou muito a responder. Tente novamente.'
        : 'Ocorreu um erro no pedido.');
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ user: any }>('/auth/me'),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  getReferrals: () =>
    request<{
      referralCode: string;
      bonusPercentage: number;
      totalInvited: number;
      totalBonusEarned: number;
      invitedUsers: any[];
    }>('/auth/referrals'),

  // Matches
  getMatches: (params?: { status?: string; competitionId?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.competitionId) query.append('competitionId', params.competitionId);
    if (params?.category) query.append('category', params.category);
    return request<{ matches: any[] }>(`/matches?${query.toString()}`);
  },
  getCompetitions: () => request<{ competitions: any[] }>('/matches/competitions'),

  // Bets
  placeBet: (body: { items: any[]; stake: number; idempotencyKey?: string }) =>
    request<{ message: string; bet: any }>('/bets', { method: 'POST', body: JSON.stringify(body) }),
  getUserBets: () => request<{ bets: any[] }>('/bets'),
  getBetById: (id: string) => request<{ bet: any }>(`/bets/${id}`),

  // Wallet
  getWallet: () => request<{ wallet: any }>('/wallet'),
  getTransactions: () => request<{ transactions: any[] }>('/wallet/transactions'),
  getUserDepositProofs: () => request<{ proofs: any[] }>('/wallet/deposit-proofs'),
  deposit: (body: {
    amount: number;
    method: string;
    phoneNumber?: string;
    receiptImage?: string;
    receiptFileName?: string;
    receiptFileSize?: number;
    receiptReference?: string;
    notes?: string;
  }) =>
    request<{ message: string; wallet: any; transaction: any; depositProof?: any }>('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  withdraw: (body: { amount: number; method: string; phoneNumber?: string; bankDetails?: string }) =>
    request<{
      message: string;
      wallet: any;
      transaction: any;
      fee?: number;
      feeRate?: number;
      netAmount?: number;
      grossAmount?: number;
    }>('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  virtualTopup: (amount: number, method: string) =>
    request<{ message: string; wallet: any; transaction: any }>('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, method }),
    }),

  // Admin
  getAdminDashboard: () => request<{ stats: any }>('/admin/dashboard'),
  createMatch: (body: any) => request<{ message: string; match: any }>('/admin/matches', { method: 'POST', body: JSON.stringify(body) }),
  updateOdds: (matchId: string, odds: { home: number; draw: number; away: number }) =>
    request<{ message: string; match: any }>(`/admin/matches/${matchId}/odds`, { method: 'PUT', body: JSON.stringify({ odds }) }),
  updateMatchStatus: (matchId: string, status: string, reason?: string) =>
    request<{ message: string; match: any }>(`/admin/matches/${matchId}/status`, { method: 'PUT', body: JSON.stringify({ status, reason }) }),
  enterResult: (matchId: string, homeScore: number, awayScore: number) =>
    request<{ message: string; settlement: any }>(`/admin/matches/${matchId}/result`, {
      method: 'POST',
      body: JSON.stringify({ homeScore, awayScore }),
    }),
  cancelMatch: (matchId: string, reason: string) =>
    request<{ message: string; result: any }>(`/admin/matches/${matchId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getUsers: () => request<{ users: any[] }>('/admin/users'),
  adminCreateUser: (body: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    initialBalance?: number;
    role?: 'USER' | 'ADMIN';
  }) =>
    request<{ message: string; user: any }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  toggleUserBlock: (userId: string) =>
    request<{ message: string; user: any }>(`/admin/users/${userId}/block`, { method: 'PATCH' }),
  changeUserRole: (userId: string, role: 'USER' | 'ADMIN') =>
    request<{ message: string; user: any }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  resetUserPassword: (userId: string, newPassword?: string) =>
    request<{ message: string; tempPassword?: string }>(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  deleteUser: (userId: string) =>
    request<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    }),
  getAdminUserBets: (userId: string) =>
    request<{ bets: any[] }>(`/admin/users/${userId}/bets`),
  getAdminUserTransactions: (userId: string) =>
    request<{ transactions: any[] }>(`/admin/users/${userId}/transactions`),
  deleteMatch: (matchId: string) =>
    request<{ message: string }>(`/admin/matches/${matchId}`, { method: 'DELETE' }),
  adjustBalance: (body: { userId: string; amount: number; reason: string }) =>
    request<{ message: string; wallet: any; transaction: any }>('/admin/users/adjust-balance', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  resetAllBalances: () =>
    request<{ message: string; affectedRows: number }>('/admin/users/reset-all-balances', {
      method: 'POST',
    }),
  getAdminAuditLogs: () => request<{ logs: any[] }>('/admin/audit-logs'),
  getAdminBets: () => request<{ bets: any[] }>('/admin/bets'),
  getAdminTransactions: () => request<{ transactions: any[] }>('/admin/transactions'),
  getAdminDepositProofs: () => request<{ proofs: any[] }>('/admin/deposit-proofs'),
  updateDepositProofStatus: (id: string, status: string, reviewNotes?: string) =>
    request<{ message: string; proof: any }>(`/admin/deposit-proofs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNotes }),
    }),
  getSupabaseStatus: () =>
    request<{
      isConfigured: boolean;
      connected: boolean;
      url: string | null;
      hasServiceKey: boolean;
      hasAnonKey: boolean;
      error?: string | null;
      tables?: any;
    }>('/supabase/status'),
  syncSupabase: () =>
    request<{ success: boolean; message: string; details?: any }>('/supabase/sync', {
      method: 'POST',
    }),
  pullSupabase: () =>
    request<{ success: boolean; message: string; details?: any }>('/supabase/pull', {
      method: 'POST',
    }),
  getSupabaseSchema: () =>
    request<{ sql: string }>('/supabase/schema'),

  // Public Settings
  getPublicSettings: () => request<{ settings: any }>('/settings/public'),

  // Admin Settings & Risk Management
  getAdminSettings: () => request<{ settings: any; totalFeeCollected?: number }>('/admin/settings'),
  updateAdminSettings: (body: any) =>
    request<{ success?: boolean; message: string; settings: any }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  getAdminRiskOverview: () => request<{ risk: any }>('/admin/risk'),
  getRiskOverview: () =>
    request<{ risk: any }>('/admin/risk').then((r) => r.risk),
  updateRiskSettings: (body: any) =>
    request<{ success: boolean; message: string; settings: any }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ riskManagement: body }),
    }),

  // Granular Market Controls
  updateMarket: (matchId: string, marketId: string, data: { status?: string; reason?: string }) =>
    request<{ success: boolean; message: string; market: any }>(
      `/admin/matches/${matchId}/markets/${marketId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    ),
  updateMarketStatus: (matchId: string, marketId: string, status: string, reason?: string) =>
    request<{ message: string; market: any }>(
      `/admin/matches/${matchId}/markets/${marketId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }
    ),
  updateMarketOdds: (matchId: string, marketId: string, selections: { selectionId: string; odds: number }[]) =>
    request<{ message: string; market: any }>(
      `/admin/matches/${matchId}/markets/${marketId}/odds`,
      {
        method: 'PUT',
        body: JSON.stringify({ selections }),
      }
    ),
  addMarketSelection: (matchId: string, marketId: string, outcome: string, label: string, odds: number) =>
    request<{ message: string; market: any }>(
      `/admin/matches/${matchId}/markets/${marketId}/selections`,
      {
        method: 'POST',
        body: JSON.stringify({ outcome, label, odds }),
      }
    ),
};
