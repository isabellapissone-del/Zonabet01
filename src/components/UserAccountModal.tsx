import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { Bet, WalletTransaction } from '../types.ts';
import { api } from '../api.ts';
import { DepositPanel } from './DepositPanel.tsx';
import { WithdrawalPanel } from './WithdrawalPanel.tsx';
import { subscribeToSettlement } from '../utils/settlementEvents.ts';
import {
  Wallet,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CreditCard,
  RefreshCw,
  Shield,
  Plus,
  Radio,
  Search,
  Filter,
  Check,
  Gift,
  Share2,
  Percent,
} from 'lucide-react';
import { ReferralPanel } from './ReferralPanel.tsx';

interface UserAccountModalProps {
  onClose?: () => void;
  defaultTab?: 'wallet' | 'deposit' | 'withdraw' | 'bets' | 'transactions' | 'referrals';
  initialTab?: 'wallet' | 'deposit' | 'withdraw' | 'bets' | 'transactions' | 'referrals';
  onNavigateToAdmin?: () => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({ defaultTab = 'wallet', initialTab, onNavigateToAdmin }) => {
  const { user, refreshUserData } = useAuth();
  const { isLiveConnected, onBetChange } = useRealtime();
  const [activeTab, setActiveTab] = useState<'wallet' | 'deposit' | 'withdraw' | 'bets' | 'transactions' | 'referrals'>(
    initialTab || defaultTab
  );

  const [bets, setBets] = useState<Bet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentUpdatedBetId, setRecentUpdatedBetId] = useState<string | null>(null);

  // Filtros da aba de histórico de apostas
  const [betStatusFilter, setBetStatusFilter] = useState<'ALL' | 'PENDING' | 'WON' | 'LOST' | 'VOID'>('ALL');
  const [betSearch, setBetSearch] = useState('');
  const [feePercentage, setFeePercentage] = useState<number>(5.0);
  const [feeActive, setFeeActive] = useState<boolean>(true);

  // Sincroniza tab padrão caso prop externa mude (ex: clique em "Minhas Apostas" no Header)
  useEffect(() => {
    const target = initialTab || defaultTab;
    if (target) {
      setActiveTab(target);
    }
  }, [defaultTab, initialTab]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [betsRes, txRes, settingsRes] = await Promise.all([
        api.getUserBets(),
        api.getTransactions(),
        api.getPublicSettings().catch(() => null),
      ]);
      setBets(betsRes.bets);
      setTransactions(txRes.transactions);
      if (settingsRes?.settings) {
        if (typeof settingsRes.settings.withdrawalFeePercentage === 'number') {
          setFeePercentage(settingsRes.settings.withdrawalFeePercentage);
        }
        if (typeof settingsRes.settings.withdrawalFeeActive === 'boolean') {
          setFeeActive(settingsRes.settings.withdrawalFeeActive);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, activeTab]);

  // Listener para atualização automática quando o administrador insere o resultado e liquida a partida
  useEffect(() => {
    const unsubscribe = subscribeToSettlement((payload) => {
      console.log('[UserAccountModal] Evento de liquidação recebido:', payload);
      fetchData();
      refreshUserData().catch(console.error);
    });

    return () => {
      unsubscribe();
    };
  }, [refreshUserData]);

  // Listener em tempo real para atualização automática de apostas e estados (WON, LOST, PENDING, VOID)
  useEffect(() => {
    const unsubscribe = onBetChange((updatedBet, eventType) => {
      console.log('[UserAccountModal Realtime] Aposta atualizada via Supabase:', updatedBet.id, updatedBet.status);

      // Se a aposta pertencer a este utilizador
      if (user && updatedBet.userId === user.id) {
        setRecentUpdatedBetId(updatedBet.id);
        setTimeout(() => {
          setRecentUpdatedBetId((curr) => (curr === updatedBet.id ? null : curr));
        }, 4000);

        setBets((prevBets) => {
          if (eventType === 'DELETE') {
            return prevBets.filter((b) => b.id !== updatedBet.id);
          }
          const index = prevBets.findIndex((b) => b.id === updatedBet.id);
          if (index >= 0) {
            const next = [...prevBets];
            next[index] = updatedBet;
            return next;
          } else {
            return [updatedBet, ...prevBets];
          }
        });

        // Recarregar carteira e transações se a aposta foi resolvida
        refreshUserData().catch(console.error);
        api.getTransactions().then((txRes) => setTransactions(txRes.transactions)).catch(console.error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, onBetChange, refreshUserData]);

  // Estatísticas calculadas do histórico de apostas
  const betStats = useMemo(() => {
    const totalCount = bets.length;
    const pendingCount = bets.filter((b) => b.status === 'PENDING').length;
    const wonCount = bets.filter((b) => b.status === 'WON').length;
    const lostCount = bets.filter((b) => b.status === 'LOST').length;

    const totalStaked = bets.reduce((sum, b) => sum + b.stake, 0);
    const totalWonPayout = bets
      .filter((b) => b.status === 'WON')
      .reduce((sum, b) => sum + b.potentialReturn, 0);

    const winRate = totalCount > 0 && (wonCount + lostCount) > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100)
      : 0;

    return {
      totalCount,
      pendingCount,
      wonCount,
      lostCount,
      totalStaked,
      totalWonPayout,
      winRate,
    };
  }, [bets]);

  // Apostas filtradas por busca e status
  const filteredBets = useMemo(() => {
    return bets.filter((bet) => {
      if (betStatusFilter !== 'ALL' && bet.status !== betStatusFilter) {
        return false;
      }
      if (betSearch.trim()) {
        const query = betSearch.toLowerCase();
        const matchesId = bet.id.toLowerCase().includes(query);
        const matchesMatch = bet.items.some(
          (item) =>
            item.matchTitle.toLowerCase().includes(query) ||
            item.competitionName.toLowerCase().includes(query) ||
            item.selectionLabel.toLowerCase().includes(query)
        );
        return matchesId || matchesMatch;
      }
      return true;
    });
  }, [bets, betStatusFilter, betSearch]);

  if (!user) return null;

  return (
    <div className="w-full max-w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-white">
      {/* Account Profile Header */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-2xl text-emerald-400">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">{user.name}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{user.email} • {user.phone}</p>
            </div>
          </div>

          {/* Balance card & Quick Actions */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Saldo Disponível</span>
              <span className="text-2xl font-black text-emerald-400 tracking-tight">
                {user.balance.toFixed(2)} <span className="text-sm font-bold text-slate-400">MZN</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="account-quick-deposit-btn"
                onClick={() => setActiveTab('deposit')}
                className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-98"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Depositar</span>
              </button>
              <button
                id="account-quick-withdraw-btn"
                onClick={() => setActiveTab('withdraw')}
                className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-black transition-all flex items-center gap-1.5 active:scale-98"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Levantar</span>
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className="px-2.5 py-2 rounded-xl bg-slate-855 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5 hidden md:flex"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Extrato</span>
              </button>
            </div>
          </div>
        </div>

        {/* Super Admin Access Banner */}
        {user.role === 'ADMIN' && onNavigateToAdmin && (
          <div className="mt-4 p-3 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-slate-900 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-white block">Privilégios de Administrador Ativos</span>
                <span className="text-[11px] text-amber-300/80 block">Acesso total à gestão de jogos, odds, apostas e auditoria</span>
              </div>
            </div>
            <button
              id="account-admin-panel-btn"
              onClick={onNavigateToAdmin}
              className="w-full sm:w-auto px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 shrink-0 transition-all active:scale-98"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Painel Admin</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 px-2 sm:px-6 overflow-x-auto scrollbar-none w-full max-w-full">
        <button
          id="tab-wallet-overview"
          onClick={() => setActiveTab('wallet')}
          className={`py-3 sm:py-3.5 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'wallet'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Carteira & Resumo</span>
        </button>

        <button
          id="tab-deposit"
          onClick={() => setActiveTab('deposit')}
          className={`py-3 sm:py-3.5 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'deposit'
              ? 'border-orange-500 text-orange-400 bg-orange-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-orange-400" />
          <span>Depósito e-Mola</span>
        </button>

        <button
          id="tab-withdraw"
          onClick={() => setActiveTab('withdraw')}
          className={`py-3 sm:py-3.5 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'withdraw'
              ? 'border-orange-500 text-orange-400 bg-orange-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-orange-400" />
          <span>Levantamento e-Mola</span>
        </button>

        <button
          id="tab-bets"
          onClick={() => setActiveTab('bets')}
          className={`py-3 sm:py-3.5 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'bets'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Minhas Apostas ({bets.length})</span>
        </button>

        <button
          id="tab-transactions"
          onClick={() => setActiveTab('transactions')}
          className={`py-3 sm:py-3.5 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Extrato (Ledger)</span>
        </button>

        <button
          id="tab-referrals"
          onClick={() => setActiveTab('referrals')}
          className={`py-3 sm:py-3.5 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
            activeTab === 'referrals'
              ? 'border-amber-500 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-slate-400 hover:text-amber-300'
          }`}
        >
          <Gift className="w-4 h-4 text-amber-400" />
          <span>Convide & Ganhe (5%)</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="p-3 sm:p-6">
        {/* ================= TAB: WALLET OVERVIEW ================= */}
        {activeTab === 'wallet' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Wallet Balance & Financial Summary */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-extrabold text-base text-white">Saldo da Conta Principal</h3>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Conta Ativa
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-medium text-slate-400 block">Saldo Real em Caixa</span>
                    <div className="text-3xl font-black text-emerald-400 tracking-tight mt-0.5">
                      {user.balance.toFixed(2)} <span className="text-base font-bold text-slate-400">MZN</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      id="account-wallet-deposit-btn"
                      onClick={() => setActiveTab('deposit')}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-98"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Fazer Depósito</span>
                    </button>
                    <button
                      id="account-wallet-withdraw-btn"
                      onClick={() => setActiveTab('withdraw')}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 active:scale-98"
                    >
                      <ArrowUpRight className="w-4 h-4 text-amber-400" />
                      <span>Levantar Fundos</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Extrato</span>
                    </button>
                  </div>
                </div>

                {/* Transparent Withdrawal Fee Notice when checking balance */}
                <div className="mt-3 p-3 rounded-xl bg-orange-950/25 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                      <Percent className="w-3 h-3" />
                    </span>
                    <span>
                      Taxa de levantamento e-Mola: <strong className="text-orange-400 font-bold">{feeActive ? feePercentage : 0}%</strong>
                    </span>
                  </div>
                  <div className="text-emerald-300 font-medium sm:text-right">
                    <span>Líquido disponível para saque: </span>
                    <span className="font-mono font-black text-white">
                      +{feeActive ? (user.balance * (1 - feePercentage / 100)).toFixed(2) : user.balance.toFixed(2)} MZN
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
                    <span className="text-[11px] text-slate-400 block">Total de Apostas</span>
                    <span className="text-base font-bold text-white mt-1 block">{bets.length}</span>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
                    <span className="text-[11px] text-slate-400 block">Apostas Abertas</span>
                    <span className="text-base font-bold text-amber-400 mt-1 block">
                      {bets.filter((b) => b.status === 'PENDING').length}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-slate-400 block">Moeda do Sistema</span>
                    <span className="text-base font-bold text-emerald-400 mt-1 block">MZN (Metical)</span>
                  </div>
                </div>
              </div>

              {/* Referral Bonus Promotion Card */}
              <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-amber-950/50 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    <Gift className="w-3 h-3" />
                    <span>Programa de Convite • Bónus 5%</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-white">Convide Amigos e Ganhe 5% de Bónus</h4>
                  <p className="text-xs text-slate-300">
                    Receba 5% de bónus real a cada depósito feito pelos amigos que convidar.
                  </p>
                </div>
                <button
                  id="wallet-open-referrals-btn"
                  onClick={() => setActiveTab('referrals')}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Ver Meu Código & Bónus</span>
                </button>
              </div>

              {/* Recent Ledger Transactions Preview */}
              <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Últimas Movimentações Financeiras</span>
                  </h4>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs text-emerald-400 hover:underline font-semibold"
                  >
                    Ver Todas &rarr;
                  </button>
                </div>
                {transactions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">Sem movimentações financeiras registadas.</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.slice(0, 3).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          {tx.type === 'DEPOSIT' || tx.type === 'WINNING_PAYOUT' ? (
                            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-rose-400" />
                          )}
                          <div>
                            <span className="font-bold text-white block">{tx.description}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(tx.createdAt).toLocaleDateString('pt-MZ')}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`font-black ${
                            tx.type === 'DEPOSIT' || tx.type === 'WINNING_PAYOUT'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'DEPOSIT' || tx.type === 'WINNING_PAYOUT' ? '+' : '-'}
                          {tx.amount.toFixed(2)} MZN
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Account Financial Parameters & Operations */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-5 space-y-3">
                <h3 className="font-extrabold text-sm text-white">Parâmetros Financeiros</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Moeda Oficial:</span>
                    <span className="font-bold text-white">Metical Moçambicano (MZN)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Tipo de Liquidação:</span>
                    <span className="font-bold text-emerald-400">Atómica & Auditável (Ledger)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Aposta Mínima:</span>
                    <span className="font-bold text-amber-400">20.00 MT</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Aposta Máxima:</span>
                    <span className="font-bold text-white">50,000.00 MT</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Proteção Saldo Negativo:</span>
                    <span className="font-bold text-emerald-400">Garantida 100%</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/30 border border-slate-700/60 rounded-2xl p-4 text-xs text-slate-300">
                <p className="font-bold text-white mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Depósitos e Levantamentos:</span>
                </p>
                <p className="text-slate-400 leading-relaxed">
                  As creditações de saldo, prémios de vitórias e levantamentos de fundos em MT (MZN) são auditados e validados pelo Super Administrador da ZONABET através do sistema oficial de tesouraria.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: DEPOSIT PANEL ================= */}
        {activeTab === 'deposit' && (
          <div className="max-w-2xl mx-auto bg-slate-850/60 border border-slate-800 rounded-2xl p-4 sm:p-7 shadow-xl">
            <DepositPanel
              onSuccess={() => {
                fetchData();
              }}
            />
          </div>
        )}

        {/* ================= TAB: WITHDRAWAL PANEL ================= */}
        {activeTab === 'withdraw' && (
          <div className="max-w-2xl mx-auto bg-slate-850/60 border border-slate-800 rounded-2xl p-4 sm:p-7 shadow-xl">
            <WithdrawalPanel
              onSuccess={() => {
                fetchData();
              }}
            />
          </div>
        )}

        {/* ================= TAB: BETS HISTORY ================= */}
        {activeTab === 'bets' && (
          <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>Histórico de Apostas da Conta</span>
                  <span className="text-[11px] font-normal text-slate-400">({bets.length} registadas)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acompanhe os resultados das suas apostas, prémios ganhos e bilhetes pendentes.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {isLiveConnected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 animate-pulse">
                    <Radio className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Tempo Real</span>
                  </span>
                )}
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-400 font-semibold flex items-center gap-1 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>
            </div>

            {/* Performance Metric Cards */}
            {bets.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block font-medium">Total Apostado</span>
                  <span className="text-base font-black text-white mt-0.5 block">
                    {betStats.totalStaked.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">MT</span>
                  </span>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block font-medium">Prémios Ganhos</span>
                  <span className="text-base font-black text-emerald-400 mt-0.5 block">
                    {betStats.totalWonPayout.toFixed(2)} <span className="text-[10px] font-normal text-emerald-400">MT</span>
                  </span>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block font-medium">Em Aberto / Pendentes</span>
                  <span className="text-base font-black text-amber-400 mt-0.5 block">
                    {betStats.pendingCount} <span className="text-[10px] font-normal text-slate-400">bilhetes</span>
                  </span>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block font-medium">Taxa de Acerto</span>
                  <span className="text-base font-black text-teal-300 mt-0.5 block">
                    {betStats.winRate}% <span className="text-[10px] font-normal text-slate-400">({betStats.wonCount}V / {betStats.lostCount}D)</span>
                  </span>
                </div>
              </div>
            )}

            {/* Filter & Search Bar */}
            {bets.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-850/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                    <Filter className="w-3 h-3 text-slate-400" />
                    Filtrar:
                  </span>
                  {(
                    [
                      { key: 'ALL', label: 'Todas' },
                      { key: 'PENDING', label: 'Pendentes' },
                      { key: 'WON', label: 'Ganhas' },
                      { key: 'LOST', label: 'Perdidas' },
                      { key: 'VOID', label: 'Anuladas' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setBetStatusFilter(tab.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        betStatusFilter === tab.key
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={betSearch}
                    onChange={(e) => setBetSearch(e.target.value)}
                    placeholder="Pesquisar time, código..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {betSearch && (
                    <button
                      onClick={() => setBetSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bet List Container */}
            {bets.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-800/20 rounded-2xl border border-slate-800">
                <Clock className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">Ainda não realizou nenhuma aposta</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Consulte os jogos disponíveis na página inicial e selecione as suas equipas favoritas para colocar a primeira aposta (mínimo de 20 MT).
                </p>
              </div>
            ) : filteredBets.length === 0 ? (
              <div className="py-8 text-center text-slate-400 bg-slate-800/20 rounded-xl border border-slate-800">
                <p className="text-xs font-semibold">Nenhuma aposta encontrada com os filtros selecionados.</p>
                <button
                  onClick={() => {
                    setBetStatusFilter('ALL');
                    setBetSearch('');
                  }}
                  className="mt-2 text-xs text-emerald-400 hover:underline font-bold"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBets.map((bet) => {
                  const isJustUpdated = recentUpdatedBetId === bet.id;
                  return (
                    <div
                      key={bet.id}
                      className={`bg-slate-800/70 border rounded-2xl p-4 space-y-3 transition-all duration-500 ${
                        isJustUpdated
                          ? 'border-emerald-400/80 shadow-lg shadow-emerald-500/20 bg-slate-800/95 ring-1 ring-emerald-400/50'
                          : 'border-slate-700/80 hover:border-slate-650'
                      }`}
                    >
                      {/* Bet Top bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 text-[11px] font-bold">#{bet.id.substring(0, 12)}</span>
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-700 text-slate-300">
                            {bet.type}
                          </span>
                          {isJustUpdated && (
                            <span className="px-1.5 py-0.5 rounded font-black text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                              RESOLVIDA AGORA
                            </span>
                          )}
                          <span className="text-slate-400 text-[11px]">
                            {new Date(bet.createdAt).toLocaleString('pt-PT')}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {bet.status === 'PENDING' && (
                            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> PENDENTE
                            </span>
                          )}
                          {bet.status === 'WON' && (
                            <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm shadow-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> GANHA (+{bet.potentialReturn.toFixed(2)} MT)
                            </span>
                          )}
                          {bet.status === 'LOST' && (
                            <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-400" /> PERDIDA
                            </span>
                          )}
                          {bet.status === 'VOID' && (
                            <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md flex items-center gap-1">
                              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> ANULADA (REEMBOLSADA)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bet items */}
                      <div className="space-y-1.5">
                        {bet.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900/60 rounded-xl p-2.5 text-xs flex items-center justify-between border border-slate-800"
                          >
                            <div>
                              <p className="font-bold text-white">{item.matchTitle}</p>
                              <p className="text-[11px] text-slate-400">
                                {item.marketName} • Seleção: <strong className="text-emerald-400">{item.outcome}</strong> ({item.selectionLabel})
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-emerald-400">Odd {item.oddsAtBetTime.toFixed(2)}</span>
                              <span className={`block text-[10px] font-bold ${
                                item.status === 'WON' ? 'text-emerald-400' : item.status === 'LOST' ? 'text-rose-400' : 'text-slate-400'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bet Financial Footer */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-700/50 text-xs">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <div>
                            <span className="text-slate-400">Apostado: </span>
                            <strong className="text-white">{bet.stake.toFixed(2)} MT</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Odd Total: </span>
                            <strong className="text-emerald-400">{bet.totalOdds.toFixed(2)}</strong>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 bg-slate-900/60 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                          <span className="text-slate-400">Possível Retorno: </span>
                          <strong className="text-emerald-400 font-black text-sm">{bet.potentialReturn.toFixed(2)} MT</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: FINANCIAL LEDGER TRANSACTIONS ================= */}
        {activeTab === 'transactions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs text-slate-400">
                Extrato imutável de todas as movimentações financeiras da carteira
              </p>
              <button
                onClick={fetchData}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            {transactions.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm">Nenhuma transação registada.</p>
            ) : (
              <>
                {/* Mobile Cards View (< sm) */}
                <div className="block sm:hidden space-y-2.5">
                  {transactions.map((tx) => {
                    const isCredit = tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'REFUND' || (tx.type === 'ADJUSTMENT' && tx.amount > 0);
                    return (
                      <div key={tx.id} className="p-3 bg-slate-800/70 border border-slate-700/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCredit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {tx.type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(tx.createdAt).toLocaleDateString('pt-PT')} {new Date(tx.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="text-xs text-slate-200">
                          <p className="font-semibold">{tx.description}</p>
                          <p className="font-mono text-[10px] text-slate-500 mt-0.5">Ref: {tx.reference}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-xs">
                          <div className="text-[10px] text-slate-400">
                            <span>Saldo: </span>
                            <span className="font-medium text-slate-300">{tx.previousBalance.toFixed(2)}</span>
                            <span className="mx-1">→</span>
                            <span className="font-bold text-white">{tx.nextBalance.toFixed(2)} MZN</span>
                          </div>
                          <span className={`font-black text-sm ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isCredit ? '+' : '-'}{Math.abs(tx.amount).toFixed(2)} MZN
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tablet / Desktop Table View (>= sm) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 whitespace-nowrap">Data / Hora</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Descrição & Ref</th>
                        <th className="py-2.5 px-3 text-right">Valor</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Saldo Anterior</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Saldo Posterior</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-medium">
                      {transactions.map((tx) => {
                        const isCredit = tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'REFUND' || (tx.type === 'ADJUSTMENT' && tx.amount > 0);
                        return (
                          <tr key={tx.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleString('pt-PT')}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCredit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <div>{tx.description}</div>
                              <div className="font-mono text-[10px] text-slate-500">Ref: {tx.reference}</div>
                            </td>
                            <td className={`py-3 px-3 text-right font-bold whitespace-nowrap ${
                              isCredit ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {isCredit ? '+' : '-'}{Math.abs(tx.amount).toFixed(2)} MZN
                            </td>
                            <td className="py-3 px-3 text-right text-slate-400 whitespace-nowrap">
                              {tx.previousBalance.toFixed(2)} MZN
                            </td>
                            <td className="py-3 px-3 text-right text-slate-200 font-bold whitespace-nowrap">
                              {tx.nextBalance.toFixed(2)} MZN
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================= TAB: REFERRALS (5% BONUS) ================= */}
        {activeTab === 'referrals' && <ReferralPanel />}
      </div>
    </div>
  );
};
