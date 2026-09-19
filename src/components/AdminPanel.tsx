import React, { useState, useEffect } from 'react';
import {
  Match,
  User,
  AuditLog,
  Competition,
  DashboardStats,
  Bet,
  WalletTransaction,
  DepositProof,
  SystemSettings,
  RiskOverview,
} from '../types.ts';
import { api } from '../api.ts';
import { DEFAULT_MOZ_COMPETITIONS } from '../constants/competitions.ts';
import { AdjustBalanceModal } from './AdjustBalanceModal.tsx';
import { UserDetailModal } from './UserDetailModal.tsx';
import { broadcastSettlement } from '../utils/settlementEvents.ts';
import { AdminDashboardView } from './admin/AdminDashboardView.tsx';
import { AdminJogadoresView } from './admin/AdminJogadoresView.tsx';
import { AdminJogosView } from './admin/AdminJogosView.tsx';
import { AdminApostasView } from './admin/AdminApostasView.tsx';
import { AdminFinanceiroView } from './admin/AdminFinanceiroView.tsx';
import { AdminRelatoriosView } from './admin/AdminRelatoriosView.tsx';
import { AdminConfiguracoesView } from './admin/AdminConfiguracoesView.tsx';
import { AdminRiscoView } from './admin/AdminRiscoView.tsx';
import { AdminCorrectScoreView } from './admin/AdminCorrectScoreView.tsx';
import {
  Shield,
  Plus,
  Edit2,
  CheckCircle,
  AlertTriangle,
  Users,
  Trophy,
  History,
  Lock,
  Unlock,
  DollarSign,
  FileText,
  RefreshCw,
  X,
  Calendar,
  Clock,
  ArrowLeft,
  Eye,
  Trash2,
  Key,
  Search,
  ArrowDownLeft,
  FileCheck,
  ExternalLink,
  Download,
  Paperclip,
  Image as ImageIcon,
  Database,
  Copy,
  Check,
  Terminal,
  HardDrive,
  Sparkles,
} from 'lucide-react';

interface AdminPanelProps {
  onBackToSportsbook?: () => void;
}

export type AdminSection =
  | 'dashboard'
  | 'jogadores'
  | 'jogos'
  | 'apostas'
  | 'financeiro'
  | 'risco'
  | 'correct_score'
  | 'relatorios'
  | 'configuracoes';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToSportsbook }) => {
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [jogadoresSubTab, setJogadoresSubTab] = useState<'cadastrar' | 'lista' | 'saldo' | 'historico'>('lista');
  const [jogosSubTab, setJogosSubTab] = useState<'todos' | 'criar' | 'editar' | 'encerrar' | 'resultado'>('todos');
  const [apostasSubTab, setApostasSubTab] = useState<'todas' | 'pendentes' | 'vencedoras' | 'perdedoras' | 'anuladas'>('todas');
  const [financeiroSubTab, setFinanceiroSubTab] = useState<'depositos' | 'levantamentos' | 'transacoes' | 'saldos'>('depositos');

  // Dynamic system settings & Risk overview
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [totalFeeCollected, setTotalFeeCollected] = useState<number>(0);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [riskOverview, setRiskOverview] = useState<RiskOverview | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>(DEFAULT_MOZ_COMPETITIONS);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [depositProofs, setDepositProofs] = useState<DepositProof[]>([]);
  const [selectedProof, setSelectedProof] = useState<DepositProof | null>(null);
  const [depositFilter, setDepositFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
  const [proofSearch, setProofSearch] = useState('');
  const [reviewNotesInput, setReviewNotesInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [showOddsModal, setShowOddsModal] = useState<Match | null>(null);
  const [showResultModal, setShowResultModal] = useState<Match | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<Match | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState<User | null>(null);
  const [showUserDetailModal, setShowUserDetailModal] = useState<User | null>(null);

  // Filter states
  const [userFilter, setUserFilter] = useState<'ALL' | 'USER' | 'ADMIN' | 'BLOCKED' | 'ACTIVE'>('ALL');
  const [txSearch, setTxSearch] = useState('');

  // Form states: Create Match
  const [newCompetitionId, setNewCompetitionId] = useState('comp-mocambola');
  const [newHomeTeam, setNewHomeTeam] = useState('');
  const [newAwayTeam, setNewAwayTeam] = useState('');
  const [newKickoffDate, setNewKickoffDate] = useState(new Date().toISOString().split('T')[0]);
  const [newKickoffTime, setNewKickoffTime] = useState('18:00');
  const [newOddHome, setNewOddHome] = useState('2.00');
  const [newOddDraw, setNewOddDraw] = useState('3.10');
  const [newOddAway, setNewOddAway] = useState('3.50');
  const [newStatus, setNewStatus] = useState<'DRAFT' | 'OPEN'>('OPEN');
  const [newDescription, setNewDescription] = useState('');

  // Form states: Edit Odds
  const [editHome, setEditHome] = useState('2.00');
  const [editDraw, setEditDraw] = useState('3.00');
  const [editAway, setEditAway] = useState('3.00');

  // Form states: Settle Result
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);

  // Form states: Cancel Match
  const [cancelReason, setCancelReason] = useState('Condições meteorológicas adversas');

  // Form states: Adjust Balance
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState('Bonificação / Ajuste manual de teste');

  // User search
  const [userSearch, setUserSearch] = useState('');

  // Safe In-App Modals (replacing window.confirm and window.prompt)
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [tempPasswordInput, setTempPasswordInput] = useState('Zona123!');
  const [copiedTempPassword, setCopiedTempPassword] = useState(false);
  const [isDeletingMatch, setIsDeletingMatch] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Match filters
  const [matchSearch, setMatchSearch] = useState('');
  const [matchStatusFilter, setMatchStatusFilter] = useState<'ALL' | 'OPEN' | 'SUSPENDED' | 'FINISHED' | 'CANCELLED'>('ALL');
  const [matchCategoryFilter, setMatchCategoryFilter] = useState<'ALL' | 'MOCAMBOLA' | 'PROVINCIAL' | 'DISTRITAL'>('ALL');

  // Supabase states
  const [supabaseStatus, setSupabaseStatus] = useState<{
    isConfigured: boolean;
    connected: boolean;
    url: string | null;
    hasServiceKey: boolean;
    hasAnonKey: boolean;
    error?: string | null;
    tables?: any;
  } | null>(null);
  const [supabaseSchemaSql, setSupabaseSchemaSql] = useState<string>('');
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [pullingSupabase, setPullingSupabase] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const fetchSupabaseInfo = async () => {
    try {
      const [statusRes, schemaRes] = await Promise.all([
        api.getSupabaseStatus(),
        api.getSupabaseSchema().catch(() => ({ sql: '' })),
      ]);
      setSupabaseStatus(statusRes);
      if (schemaRes?.sql) {
        setSupabaseSchemaSql(schemaRes.sql);
      }
    } catch (e: any) {
      console.warn('Erro ao obter info do Supabase:', e);
    }
  };

  const handleSyncToSupabase = async () => {
    setSyncingSupabase(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.syncSupabase();
      if (res.success) {
        notifySuccess(res.message);
        await fetchSupabaseInfo();
      } else {
        notifyError(res.message);
      }
    } catch (err: any) {
      notifyError(err.message || 'Falha ao sincronizar dados com o Supabase');
    } finally {
      setSyncingSupabase(false);
    }
  };

  const handlePullFromSupabase = async () => {
    setPullingSupabase(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await api.pullSupabase();
      if (res.success) {
        notifySuccess(res.message);
        await loadData();
      } else {
        notifyError(res.message);
      }
    } catch (err: any) {
      notifyError(err.message || 'Falha ao puxar dados do Supabase');
    } finally {
      setPullingSupabase(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(supabaseSchemaSql);
      setCopiedSql(true);
      notifySuccess('Script SQL copiado com sucesso! Cole-o no SQL Editor do seu projeto Supabase.');
      setTimeout(() => setCopiedSql(false), 4000);
    } catch {
      notifyError('Não foi possível copiar para a área de transferência');
    }
  };

  const loadSettingsData = async () => {
    setLoadingSettings(true);
    try {
      const res = await api.getAdminSettings();
      if (res.settings) {
        setSettings(res.settings);
        setTotalFeeCollected(res.totalFeeCollected || 0);
      }
    } catch (e: any) {
      console.warn('Erro ao carregar configurações do sistema:', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadRiskData = async () => {
    setLoadingRisk(true);
    try {
      const res = await api.getRiskOverview();
      if (res) {
        setRiskOverview(res);
      }
    } catch (e: any) {
      console.warn('Erro ao carregar dados de risco:', e);
    } finally {
      setLoadingRisk(false);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const res = await api.updateAdminSettings(newSettings);
      if (res.success && res.settings) {
        setSettings(res.settings);
        notifySuccess('Configurações salvas e aplicadas em tempo real!');
        await loadSettingsData();
      } else {
        notifyError(res.message || 'Erro ao atualizar configurações');
      }
    } catch (e: any) {
      notifyError(e.message || 'Erro ao comunicar com o servidor');
    }
  };

  const handleToggleMarketStatus = async (matchId: string, marketId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'SUSPENDED' ? 'OPEN' : 'SUSPENDED';
      const res = await api.updateMarket(matchId, marketId, { status: newStatus });
      if (res.success) {
        notifySuccess(`Mercado ${newStatus === 'OPEN' ? 'reaberto' : 'suspenso'} com sucesso!`);
        await loadRiskData();
        await loadData();
      } else {
        notifyError(res.message || 'Falha ao alterar estado do mercado');
      }
    } catch (e: any) {
      notifyError(e.message || 'Erro ao alterar estado do mercado');
    }
  };

  const handleUpdateRiskSettings = async (riskSettings: any) => {
    try {
      const res = await api.updateRiskSettings(riskSettings);
      if (res.success) {
        notifySuccess('Parâmetros de controlo de risco atualizados com sucesso!');
        await loadRiskData();
      } else {
        notifyError(res.message || 'Falha ao atualizar parâmetros de risco');
      }
    } catch (e: any) {
      notifyError(e.message || 'Erro ao atualizar parâmetros de risco');
    }
  };

  const loadData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const results = await Promise.allSettled([
        api.getAdminDashboard(),
        api.getMatches(),
        api.getCompetitions(),
        api.getUsers(),
        api.getAdminAuditLogs(),
        api.getAdminBets(),
        api.getAdminTransactions(),
        api.getAdminDepositProofs(),
        fetchSupabaseInfo(),
        loadSettingsData(),
        loadRiskData(),
      ]);

      const [
        dashSettled,
        matchSettled,
        compSettled,
        userSettled,
        auditSettled,
        betsSettled,
        txSettled,
        proofsSettled,
      ] = results;

      if (dashSettled.status === 'fulfilled') setStats(dashSettled.value.stats);
      if (matchSettled.status === 'fulfilled') setMatches(matchSettled.value.matches || []);
      if (compSettled.status === 'fulfilled' && compSettled.value?.competitions?.length > 0) {
        setCompetitions(compSettled.value.competitions);
      }
      if (userSettled.status === 'fulfilled') setUsers(userSettled.value.users);
      if (auditSettled.status === 'fulfilled') setAuditLogs(auditSettled.value.logs);
      if (betsSettled.status === 'fulfilled') setBets(betsSettled.value.bets);
      if (txSettled.status === 'fulfilled') setTransactions(txSettled.value.transactions);
      if (proofsSettled.status === 'fulfilled') setDepositProofs(proofsSettled.value.proofs || []);

      // Check if any critical API rejected
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn(`[AdminPanel] ${failed.length} chamadas de dados falharam no carregamento isolado.`);
      }
    } catch (err: any) {
      setActionError(err.message || 'Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [section]);

  const notifySuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const notifyError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 4000);
  };

  const handleDeleteUser = async (u: User) => {
    if (window.confirm(`Tem certeza que deseja excluir o utilizador "${u.name}"? Esta ação é irreversível.`)) {
      try {
        const res = await api.deleteUser(u.id);
        notifySuccess(res.message);
        await loadData();
      } catch (err: any) {
        notifyError(err.message || 'Erro ao excluir utilizador');
      }
    }
  };

  // 1. Create Match Handler
  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        competitionId: newCompetitionId,
        homeTeam: newHomeTeam,
        awayTeam: newAwayTeam,
        kickoffDate: newKickoffDate,
        kickoffTime: newKickoffTime,
        status: newStatus,
        description: newDescription,
        odds: {
          home: parseFloat(newOddHome),
          draw: parseFloat(newOddDraw),
          away: parseFloat(newOddAway),
        },
      };
      await api.createMatch(payload);
      setShowCreateMatch(false);
      notifySuccess(`Jogo "${newHomeTeam} vs ${newAwayTeam}" criado com sucesso!`);
      // Reset form
      setNewHomeTeam('');
      setNewAwayTeam('');
      await loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao criar jogo');
    }
  };

  // 2. Update Odds Handler
  const handleUpdateOdds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showOddsModal) return;
    try {
      await api.updateOdds(showOddsModal.id, {
        home: parseFloat(editHome),
        draw: parseFloat(editDraw),
        away: parseFloat(editAway),
      });
      setShowOddsModal(null);
      notifySuccess('Odds do jogo atualizadas com sucesso!');
      await loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao alterar odds');
    }
  };

  // 3. Update Match Status
  const handleStatusChange = async (matchId: string, status: string) => {
    try {
      await api.updateMatchStatus(matchId, status);
      notifySuccess(`Estado do jogo alterado para ${status}`);
      await loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao alterar estado');
    }
  };

  // 4. Settle Match Result
  const handleSettleResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResultModal) return;
    try {
      const res = await api.enterResult(showResultModal.id, homeScore, awayScore);
      broadcastSettlement({
        matchId: showResultModal.id,
        homeScore,
        awayScore,
        settlement: res.settlement,
      });
      setShowResultModal(null);
      const paidCount = res.settlement?.wonBetsCount ?? res.settlement?.totalWonBets ?? 0;
      notifySuccess(`Jogo liquidado com sucesso! Placar: ${homeScore} - ${awayScore}. Vencedores pagos: ${paidCount}.`);
      await loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao liquidar jogo');
    }
  };

  // 5. Cancel Match
  const handleCancelMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCancelModal) return;
    try {
      const res = await api.cancelMatch(showCancelModal.id, cancelReason);
      setShowCancelModal(null);
      notifySuccess(`Jogo cancelado com sucesso. ${res.result.voidedBetsCount} apostas foram anuladas (VOID) e reembolsadas.`);
      await loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao cancelar jogo');
    }
  };

  // 6. Toggle User Block
  const handleToggleBlock = async (userId: string) => {
    try {
      const res = await api.toggleUserBlock(userId);
      notifySuccess(res.message);
      await loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao alterar bloqueio');
    }
  };

  // 7. Delete Match (Safe In-App Action)
  const handleConfirmDeleteMatch = async () => {
    if (!matchToDelete) return;
    setIsDeletingMatch(true);
    try {
      const res = await api.deleteMatch(matchToDelete.id);
      notifySuccess(res.message);
      setMatchToDelete(null);
      await loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao excluir jogo');
    } finally {
      setIsDeletingMatch(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'USER' | 'ADMIN') => {
    try {
      const res = await api.changeUserRole(userId, newRole);
      notifySuccess(res.message);
      await loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao alterar função do utilizador');
    }
  };

  // 8. Reset Password (Safe In-App Modal)
  const handleConfirmResetPassword = async () => {
    if (!userToResetPassword) return;
    if (!tempPasswordInput.trim()) {
      notifyError('Por favor introduza a nova palavra-passe temporária.');
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await api.resetUserPassword(userToResetPassword.id, tempPasswordInput.trim());
      notifySuccess(`Palavra-passe alterada com sucesso! Nova senha: "${res.tempPassword}"`);
      setUserToResetPassword(null);
      await loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao redefinir senha');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleResetAllBalances = async () => {
    setLoading(true);
    try {
      const res = await api.resetAllBalances();
      notifySuccess(res.message);
      await loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao realizar limpeza de saldos');
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter((m) => {
    const term = matchSearch.toLowerCase().trim();
    const matchesQuery =
      !term ||
      m.homeTeam.toLowerCase().includes(term) ||
      m.awayTeam.toLowerCase().includes(term) ||
      m.competitionName.toLowerCase().includes(term);

    if (!matchesQuery) return false;
    if (matchStatusFilter !== 'ALL' && m.status !== matchStatusFilter) return false;
    if (matchCategoryFilter !== 'ALL') {
      const isMocambola = m.competitionCategory === 'MOCAMBOLA' || m.competitionName.toLowerCase().includes('moçambola');
      const isProvincial = m.competitionCategory === 'PROVINCIAL' || m.competitionName.toLowerCase().includes('provincial');
      const isDistrital = m.competitionCategory === 'DISTRITAL' || m.competitionName.toLowerCase().includes('distrital');
      if (matchCategoryFilter === 'MOCAMBOLA' && !isMocambola) return false;
      if (matchCategoryFilter === 'PROVINCIAL' && !isProvincial) return false;
      if (matchCategoryFilter === 'DISTRITAL' && !isDistrital) return false;
    }
    return true;
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch);

    if (!matchesSearch) return false;

    if (userFilter === 'USER') return u.role === 'USER';
    if (userFilter === 'ADMIN') return u.role === 'ADMIN';
    if (userFilter === 'BLOCKED') return u.isBlocked;
    if (userFilter === 'ACTIVE') return !u.isBlocked;
    return true;
  });

  const filteredTransactions = transactions.filter((tx) =>
    tx.reference.toLowerCase().includes(txSearch.toLowerCase()) ||
    tx.description.toLowerCase().includes(txSearch.toLowerCase()) ||
    tx.userId.toLowerCase().includes(txSearch.toLowerCase())
  );

  const handleUpdateProofStatus = async (id: string, newStatus: 'APPROVED' | 'REJECTED' | 'PENDING', notes?: string) => {
    try {
      const res = await api.updateDepositProofStatus(id, newStatus, notes);
      notifySuccess(res.message);
      if (selectedProof?.id === id) {
        setSelectedProof(res.proof);
      }
      await loadData();
    } catch (err: any) {
      notifyError(err.message || 'Erro ao atualizar estado do comprovativo');
    }
  };

  const filteredDepositProofs = depositProofs.filter((p) => {
    const matchesSearch =
      p.userName.toLowerCase().includes(proofSearch.toLowerCase()) ||
      p.userPhone.includes(proofSearch) ||
      p.referenceCode.toLowerCase().includes(proofSearch.toLowerCase()) ||
      (p.operatorTxId && p.operatorTxId.toLowerCase().includes(proofSearch.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(proofSearch.toLowerCase()));

    if (!matchesSearch) return false;
    if (depositFilter === 'ALL') return true;
    return p.status === depositFilter;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-white space-y-6">
      
      {/* Top Banner */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white">Painel do Super Administrador</h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950 shadow-sm">
                CONTROLO TOTAL
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestão integral: criação de jogos, odds em tempo real, adição/dedução de saldo, bloqueio de contas e auditoria.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onBackToSportsbook && (
            <button
              onClick={onBackToSportsbook}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Sportsbook</span>
            </button>
          )}
          <button
            id="admin-create-match-trigger"
            onClick={() => setShowCreateMatch(true)}
            className="px-3.5 sm:px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ CRIAR NOVO JOGO</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <a
            id="admin-download-project-btn"
            href="/zonabet-projeto-completo.tar.gz"
            download="zonabet-projeto-completo.tar.gz"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1.5"
            title="Baixar Pacote do Código (.tar.gz)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Baixar Código</span>
          </a>
        </div>
      </div>

      {/* Notifications */}
      <div className="px-4 sm:px-6">
        {actionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs: 7 Strict Hierarchy Pillars */}
      <div className="flex border-b border-slate-800 bg-slate-900/90 px-3 sm:px-6 overflow-x-auto scrollbar-none sticky top-0 z-10 backdrop-blur-md">
        {[
          { id: 'dashboard', label: '🏠 DASHBOARD', count: null },
          { id: 'jogadores', label: '👥 JOGADORES', count: users.length },
          { id: 'jogos', label: '⚽ JOGOS', count: matches.length },
          { id: 'apostas', label: '🎯 APOSTAS', count: bets.length },
          {
            id: 'financeiro',
            label: '💰 FINANCEIRO',
            count: depositProofs.filter((p) => p.status === 'PENDING').length || null,
            isAlert: depositProofs.some((p) => p.status === 'PENDING'),
          },
          {
            id: 'risco',
            label: '🛡️ RISCO & EXPOSIÇÃO',
            count: riskOverview?.highRiskCount || null,
            isAlert: !!riskOverview && riskOverview.highRiskCount > 0,
          },
          { id: 'correct_score', label: '📊 RESULTADO CORRETO', count: null },
          { id: 'relatorios', label: '📊 RELATÓRIOS', count: null },
          { id: 'configuracoes', label: '⚙️ CONFIGURAÇÕES', count: null },
        ].map((tab) => {
          const isActive = section === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSection(tab.id as AdminSection)}
              className={`py-3.5 px-4 font-black text-xs sm:text-sm border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    tab.isAlert
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : isActive
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Container Rendering Active Section */}
      <div className="p-4 sm:p-6">
        {/* 1. 🏠 DASHBOARD */}
        {section === 'dashboard' && (
          <AdminDashboardView
            stats={stats}
            depositProofs={depositProofs}
            onNavigate={(newSection, newSubTab) => {
              setSection(newSection);
              if (newSection === 'jogadores' && newSubTab) setJogadoresSubTab(newSubTab as any);
              if (newSection === 'jogos' && newSubTab) setJogosSubTab(newSubTab as any);
              if (newSection === 'apostas' && newSubTab) setApostasSubTab(newSubTab as any);
              if (newSection === 'financeiro' && newSubTab) setFinanceiroSubTab(newSubTab as any);
            }}
            onOpenCreateMatch={() => setShowCreateMatch(true)}
          />
        )}

        {/* 2. 👥 JOGADORES */}
        {section === 'jogadores' && (
          <AdminJogadoresView
            users={users}
            activeSubTab={jogadoresSubTab}
            setActiveSubTab={setJogadoresSubTab}
            onOpenAdjustBalance={(u) => setShowAdjustModal(u)}
            onOpenUserDetail={(u) => setShowUserDetailModal(u)}
            onToggleUserBlock={handleToggleBlock}
            onOpenResetPassword={(u) => {
              setUserToResetPassword(u);
              setTempPasswordInput('Zona123!');
            }}
            onDeleteUser={handleDeleteUser}
            onUserCreated={loadData}
            notifySuccess={notifySuccess}
            notifyError={notifyError}
          />
        )}

        {/* 3. ⚽ JOGOS */}
        {section === 'jogos' && (
          <AdminJogosView
            matches={matches}
            competitions={competitions}
            activeSubTab={jogosSubTab}
            setActiveSubTab={setJogosSubTab}
            onOpenCreateMatchModal={() => setShowCreateMatch(true)}
            onOpenOddsModal={(m) => {
              setShowOddsModal(m);
              const mkt = m.markets?.find((mk) => mk.type === '1X2');
              const h = mkt?.selections?.find((s) => s.outcome === '1')?.odds || (Array.isArray(mkt?.odds) ? mkt?.odds?.find((o: any) => o.name === '1')?.value : 2.0) || 2.0;
              const d = mkt?.selections?.find((s) => s.outcome === 'X')?.odds || (Array.isArray(mkt?.odds) ? mkt?.odds?.find((o: any) => o.name === 'X')?.value : 3.0) || 3.0;
              const a = mkt?.selections?.find((s) => s.outcome === '2')?.odds || (Array.isArray(mkt?.odds) ? mkt?.odds?.find((o: any) => o.name === '2')?.value : 3.0) || 3.0;
              setEditHome(h.toFixed(2));
              setEditDraw(d.toFixed(2));
              setEditAway(a.toFixed(2));
            }}
            onOpenResultModal={(m) => {
              setShowResultModal(m);
              setHomeScore(0);
              setAwayScore(0);
            }}
            onOpenCancelModal={(m) => setShowCancelModal(m)}
            onDeleteMatch={(m) => setMatchToDelete(m)}
            onStatusChange={(matchId, status) => handleStatusChange(matchId, status)}
          />
        )}

        {/* 4. 🎯 APOSTAS */}
        {section === 'apostas' && (
          <AdminApostasView
            bets={bets}
            activeSubTab={apostasSubTab}
            setActiveSubTab={setApostasSubTab}
          />
        )}

        {/* 5. 💰 FINANCEIRO */}
        {section === 'financeiro' && (
          <AdminFinanceiroView
            transactions={transactions}
            depositProofs={depositProofs}
            users={users}
            activeSubTab={financeiroSubTab}
            setActiveSubTab={setFinanceiroSubTab}
            onReviewDepositProof={async (proofId, status, notes) => {
              await handleUpdateProofStatus(proofId, status, notes);
            }}
            setSelectedProof={setSelectedProof}
            onBalanceAdjusted={loadData}
          />
        )}

        {/* 6. 🛡️ GESTÃO DE RISCO */}
        {section === 'risco' && (
          <AdminRiscoView
            riskData={riskOverview}
            loading={loadingRisk}
            onRefresh={loadRiskData}
            onToggleMarketStatus={handleToggleMarketStatus}
            onUpdateRiskSettings={handleUpdateRiskSettings}
          />
        )}

        {/* 6.5 📊 RESULTADO CORRETO */}
        {section === 'correct_score' && (
          <AdminCorrectScoreView
            matches={matches}
            onRefresh={loadData}
          />
        )}

        {/* 7. 📊 RELATÓRIOS */}
        {section === 'relatorios' && (
          <AdminRelatoriosView stats={stats} />
        )}

        {/* 8. ⚙️ CONFIGURAÇÕES */}
        {section === 'configuracoes' && (
          <AdminConfiguracoesView
            settings={settings}
            totalFeeCollected={totalFeeCollected}
            onUpdateSettings={handleUpdateSettings}
            loadingSettings={loadingSettings}
            auditLogs={auditLogs}
            supabaseStatus={supabaseStatus}
            supabaseSchemaSql={supabaseSchemaSql}
            syncingSupabase={syncingSupabase}
            pullingSupabase={pullingSupabase}
            copiedSql={copiedSql}
            handleSyncToSupabase={handleSyncToSupabase}
            handlePullFromSupabase={handlePullFromSupabase}
            handleCopySql={handleCopySql}
            onResetAllBalances={handleResetAllBalances}
            onRefreshSupabaseStatus={fetchSupabaseInfo}
          />
        )}
      </div>

      {/* ================= MODAL: DETAILED PROOF INSPECTION ================= */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-white max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-extrabold text-white">
                  Auditoria de Comprovativo de Depósito
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Proof Image / Document View */}
            {selectedProof.receiptDataUrl ? (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-2">
                <span className="text-[11px] text-slate-400 block font-semibold">
                  Arquivo Anexado: {selectedProof.receiptFileName || 'Comprovativo de Pagamento'}
                </span>
                <div className="max-h-[50vh] overflow-auto flex items-center justify-center rounded-lg bg-black/40 p-2">
                  <img
                    src={selectedProof.receiptDataUrl}
                    alt="Comprovativo original"
                    className="max-h-[45vh] w-auto object-contain rounded border border-slate-800 shadow"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <a
                    href={selectedProof.receiptDataUrl}
                    download={selectedProof.receiptFileName || 'comprovativo-zonabet.png'}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Descarregar Comprovativo</span>
                  </a>
                  <a
                    href={selectedProof.receiptDataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Abrir em Nova Aba</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <span>Nenhuma imagem ou talão digitalizado anexado. O depósito foi efetuado via canal de débito móvel instantâneo.</span>
              </div>
            )}

            {/* Detailed Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Apostador:</span>
                <strong className="text-white font-sans">{selectedProof.userName}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Contacto Celular:</span>
                <strong className="text-white">{selectedProof.userPhone}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Montante Depositado:</span>
                <strong className="text-emerald-400 text-sm font-sans">
                  +{selectedProof.amount.toFixed(2)} MZN
                </strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Método / Canal:</span>
                <strong className="text-amber-400 font-sans">{selectedProof.method}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Referência do Sistema:</span>
                <strong className="text-slate-300">{selectedProof.referenceCode}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Ref / ID da Operadora:</span>
                <strong className="text-emerald-300">{selectedProof.operatorTxId || 'Não informado'}</strong>
              </div>
            </div>

            {/* Notes submitted by user */}
            {selectedProof.notes && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">
                  Observação enviada pelo Apostador:
                </span>
                <p className="text-slate-200 italic font-sans">"{selectedProof.notes}"</p>
              </div>
            )}

            {/* Admin Review Notes & Actions */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Notas de Revisão da Administração:
                </label>
                <input
                  type="text"
                  value={reviewNotesInput}
                  onChange={(e) => setReviewNotesInput(e.target.value)}
                  placeholder="Ex: Talão verificado no extrato do Millennium BIM..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Estado Atual:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedProof.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : selectedProof.status === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {selectedProof.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateProofStatus(selectedProof.id, 'APPROVED', reviewNotesInput)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition-all shadow"
                  >
                    Aprovar Comprovativo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateProofStatus(selectedProof.id, 'REJECTED', reviewNotesInput)}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold rounded-lg text-xs transition-all border border-rose-500/30"
                  >
                    Rejeitar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateProofStatus(selectedProof.id, 'PENDING', reviewNotesInput)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-lg text-xs transition-all border border-slate-700"
                  >
                    Marcar Pendente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: CREATE MATCH ================= */}
      {showCreateMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Criar Novo Jogo de Futebol
              </h2>
              <button onClick={() => setShowCreateMatch(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Competição / Campeonato (Exclusivo Moçambique)</label>
                <select
                  value={newCompetitionId}
                  onChange={(e) => setNewCompetitionId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <optgroup label="🇲🇿 Campeonato Nacional">
                    {competitions.filter((c) => c.category === 'MOCAMBOLA' || c.code === 'MOC' || c.name.includes('Moçambola')).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.country})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📍 Campeonatos Provinciais">
                    {competitions.filter((c) => c.category === 'PROVINCIAL' || c.name.includes('Provincial')).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.country})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🏟️ Campeonatos Distritais">
                    {competitions.filter((c) => c.category === 'DISTRITAL' || c.name.includes('Distrital')).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.country})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Equipa da Casa (1)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ferroviário da Beira"
                    value={newHomeTeam}
                    onChange={(e) => setNewHomeTeam(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Equipa Visitante (2)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Black Bulls"
                    value={newAwayTeam}
                    onChange={(e) => setNewAwayTeam(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Club Suggestions */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-400">Sugestões de Clubes Populares:</span>
                  <span className="text-[10px] text-slate-500">Clique para preencher</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                  {[
                    'Costa do Sol',
                    'Ferroviário de Maputo',
                    'Ferroviário da Beira',
                    'Black Bulls',
                    'UD Songo',
                    'Desportivo de Nacala',
                    'Textáfrica',
                    'Ferroviário de Nampula',
                    'Brera Tchumene',
                    'Baía de Pemba',
                    'Ferroviário de Lichinga',
                    'Ferroviário de Muanza',
                  ].map((team) => (
                    <button
                      key={team}
                      type="button"
                      onClick={() => {
                        if (!newHomeTeam) {
                          setNewHomeTeam(team);
                        } else if (!newAwayTeam && newHomeTeam !== team) {
                          setNewAwayTeam(team);
                        } else {
                          setNewHomeTeam(team);
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] transition-colors"
                    >
                      + {team}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Data do Jogo</label>
                  <input
                    type="date"
                    required
                    value={newKickoffDate}
                    onChange={(e) => setNewKickoffDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                  {/* Quick date presets */}
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setNewKickoffDate(new Date().toISOString().split('T')[0])}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-700"
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        setNewKickoffDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-700"
                    >
                      Amanhã
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const day = d.getDay();
                        const diff = (6 - day + 7) % 7 || 7;
                        d.setDate(d.getDate() + diff);
                        setNewKickoffDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-700"
                    >
                      Sábado
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Hora de Início</label>
                  <input
                    type="time"
                    required
                    value={newKickoffTime}
                    onChange={(e) => setNewKickoffTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 1X2 Odds */}
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
                <span className="font-extrabold text-white block">Odds Iniciais 1X2</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Vitória Casa (1)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1.01"
                      max="100.0"
                      required
                      value={newOddHome}
                      onChange={(e) => setNewOddHome(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Empate (X)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1.01"
                      max="100.0"
                      required
                      value={newOddDraw}
                      onChange={(e) => setNewOddDraw(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 font-bold text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Vitória Fora (2)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1.01"
                      max="100.0"
                      required
                      value={newOddAway}
                      onChange={(e) => setNewOddAway(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 font-bold text-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Estado Inicial</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="OPEN">ABERTO (Apostas disponíveis imediatamente)</option>
                  <option value="DRAFT">RASCUNHO (Não visível aos apostadores)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Observações (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Estádio do Chiveve, Beira"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
              >
                REGISTAR & PUBLICAR JOGO
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EDIT ODDS ================= */}
      {showOddsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-white max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-extrabold">Alterar Odds: {showOddsModal.homeTeam} vs {showOddsModal.awayTeam}</h2>
              <button onClick={() => setShowOddsModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOdds} className="space-y-4">
              <p className="text-xs text-slate-400">
                Aviso: As novas odds serão aplicadas apenas a novas apostas. As apostas já registadas mantêm as odds congeladas do momento da aposta.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Casa (1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    value={editHome}
                    onChange={(e) => setEditHome(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-black text-emerald-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Empate (X)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    value={editDraw}
                    onChange={(e) => setEditDraw(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-black text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fora (2)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    value={editAway}
                    onChange={(e) => setEditAway(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-black text-cyan-400 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm"
              >
                GRAVAR NOVAS ODDS
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: SETTLE RESULT ================= */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-white max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-cyan-400" />
                Liquidar Jogo & Pagar Apostas
              </h2>
              <button onClick={() => setShowResultModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleResult} className="space-y-4">
              <p className="text-xs text-slate-300">
                Confronto: <strong>{showResultModal.homeTeam}</strong> vs <strong>{showResultModal.awayTeam}</strong>
              </p>

              <div className="grid grid-cols-2 gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1">Golos {showResultModal.homeTeam}</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    required
                    value={homeScore}
                    onChange={(e) => setHomeScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-center text-2xl font-black text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-cyan-400 mb-1">Golos {showResultModal.awayTeam}</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    required
                    value={awayScore}
                    onChange={(e) => setAwayScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-center text-2xl font-black text-white"
                  />
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-300">
                <p className="font-bold">Aviso de Liquidação Atómica:</p>
                <p className="text-[11px] mt-0.5">
                  Ao confirmar, o sistema liquidará todas as apostas correspondentes, creditando imediatamente os valores ganhos nas carteiras dos utilizadores de forma irreversível.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20"
              >
                CONFIRMAR RESULTADO E LIQUIDAR APOSTAS
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: CANCEL MATCH ================= */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-white max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-extrabold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Cancelar Jogo & Anular Apostas (VOID)
              </h2>
              <button onClick={() => setShowCancelModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCancelMatch} className="space-y-4">
              <p className="text-xs text-slate-300">
                Deseja cancelar <strong>{showCancelModal.homeTeam} vs {showCancelModal.awayTeam}</strong>? Todas as apostas simples serão marcadas como <em>VOID</em> e os montantes investidos serão 100% devolvidos aos utilizadores.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Motivo do Cancelamento (Obrigatório)</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-500 hover:bg-rose-400 text-white font-black rounded-xl text-sm"
              >
                CONFIRMAR CANCELAMENTO E REEMBOLSO
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: ADJUST BALANCE (SUPER ADMIN) ================= */}
      <AdjustBalanceModal
        user={showAdjustModal}
        isOpen={!!showAdjustModal}
        onClose={() => setShowAdjustModal(null)}
        onSuccess={(msg) => {
          notifySuccess(msg);
          loadData();
        }}
      />

      {/* ================= MODAL 6: USER DETAIL & RISK CONTROL ================= */}
      <UserDetailModal
        user={showUserDetailModal}
        isOpen={!!showUserDetailModal}
        onClose={() => setShowUserDetailModal(null)}
        onAdjustBalance={(u) => {
          setShowUserDetailModal(null);
          setShowAdjustModal(u);
        }}
        onUserUpdated={loadData}
      />

      {/* ================= MODAL 7: CONFIRM DELETE MATCH ================= */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-white">Excluir Jogo Permanentemente</h3>
              </div>
              <button
                onClick={() => setMatchToDelete(null)}
                disabled={isDeletingMatch}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Tem a certeza que deseja remover este jogo da base de dados? Esta ação é irreversível e o confronto não estará mais visível para apostas.
              </p>

              <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1.5">
                <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
                  {matchToDelete.competitionName}
                </div>
                <div className="text-sm font-extrabold text-white">
                  {matchToDelete.homeTeam} <span className="text-slate-400 font-normal">vs</span> {matchToDelete.awayTeam}
                </div>
                <div className="text-[11px] text-slate-400">
                  Data: {matchToDelete.kickoffDate} às {matchToDelete.kickoffTime} • Estado: <span className="font-bold text-slate-300">{matchToDelete.status}</span>
                </div>
              </div>

              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-300">
                <strong>Atenção:</strong> Se existirem apostas pendentes neste jogo, elas serão mantidas no histórico mas o mercado não poderá ser liquidado automaticamente.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMatchToDelete(null)}
                disabled={isDeletingMatch}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMatch}
                disabled={isDeletingMatch}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-1.5 transition-all"
              >
                {isDeletingMatch ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>A Excluir...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 8: RESET PASSWORD ================= */}
      {userToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400">
                <Key className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-white">Redefinir Palavra-passe</h3>
              </div>
              <button
                onClick={() => setUserToResetPassword(null)}
                disabled={isResettingPassword}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Defina uma nova palavra-passe temporária para o apostador aceder à sua conta.
              </p>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Utilizador:</span>
                  <span className="font-bold text-white">{userToResetPassword.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-mono text-slate-200">{userToResetPassword.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Telemóvel:</span>
                  <span className="font-mono text-slate-200">{userToResetPassword.phone}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nova Palavra-passe Temporária:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempPasswordInput}
                    onChange={(e) => setTempPasswordInput(e.target.value)}
                    placeholder="Ex: Zona123!"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPasswordInput);
                      setCopiedTempPassword(true);
                      setTimeout(() => setCopiedTempPassword(false), 2500);
                    }}
                    title="Copiar para partilhar com o cliente"
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors flex-shrink-0"
                  >
                    {copiedTempPassword ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                  <span>Sugestões rápidas:</span>
                  <button
                    type="button"
                    onClick={() => setTempPasswordInput('Zona123!')}
                    className="hover:text-cyan-400 underline"
                  >
                    Zona123!
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setTempPasswordInput('Mocambique2025!')}
                    className="hover:text-cyan-400 underline"
                  >
                    Mocambique2025!
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setTempPasswordInput('BeiraWinner99#')}
                    className="hover:text-cyan-400 underline"
                  >
                    BeiraWinner99#
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUserToResetPassword(null)}
                disabled={isResettingPassword}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                disabled={isResettingPassword}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
              >
                {isResettingPassword ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>A Gravar...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    <span>Gravar Nova Palavra-passe</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
