import React from 'react';
import { DashboardStats, DepositProof } from '../../types.ts';
import {
  DollarSign,
  TrendingUp,
  Trophy,
  Award,
  Wallet,
  Users,
  Target,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  CheckCircle,
  FileCheck,
  FileSpreadsheet,
  Settings,
  Sparkles,
  ShieldCheck,
  Percent,
} from 'lucide-react';

interface AdminDashboardViewProps {
  stats: DashboardStats | null;
  depositProofs: DepositProof[];
  onNavigate: (section: any, subTab?: string) => void;
  onOpenCreateMatch: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stats,
  depositProofs,
  onNavigate,
  onOpenCreateMatch,
}) => {
  if (!stats) return null;

  const pendingProofsCount = depositProofs.filter((p) => p.status === 'PENDING').length;
  const houseBalance = stats.houseBalance ?? 0;
  const totalUsersBalance = stats.totalUsersBalance ?? 0;
  const wageredToday = stats.wageredToday ?? 0;
  const paidOutToday = stats.paidOutToday ?? 0;
  const houseProfit = stats.houseProfit ?? 0;
  const houseProfitToday = stats.houseProfitToday ?? 0;
  const profitMarginPercent = stats.profitMarginPercent ?? 0;

  return (
    <div className="space-y-6">
      {/* Visual Tree Breadcrumb Indicator */}
      <div className="p-3.5 bg-slate-800/60 border border-slate-700/80 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-amber-400 font-bold">🏠 DASHBOARD</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-300">Resumo Executivo da Plataforma</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Sistema Operacional</span>
          </span>
          <span>•</span>
          <span>Moeda: <strong className="text-white">MZN (Metical)</strong></span>
          <span>•</span>
          <span>Banca: <strong className="text-emerald-400">ZONABET MZ</strong></span>
        </div>
      </div>

      {/* 4 CORE HIGHLIGHT CARDS (AS REQUESTED IN THE TREE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Saldo da casa */}
        <div
          onClick={() => onNavigate('financeiro', 'depositos')}
          className="bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition-all group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Saldo da Casa</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Reserva Líquida
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
            {houseBalance.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-bold text-slate-400 ml-1.5">MZN</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Em contas de jogadores:</span>
            <span className="font-bold text-slate-200">
              {totalUsersBalance.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
            </span>
          </div>
        </div>

        {/* 2. Total apostado hoje */}
        <div
          onClick={() => onNavigate('apostas', 'todas')}
          className="bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-cyan-500/50 rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition-all group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Total Apostado Hoje</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              24 Horas
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 tracking-tight">
            {wageredToday.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-bold text-slate-400 ml-1.5">MZN</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Bilhetes hoje:</span>
            <span className="font-bold text-cyan-300">{stats.betsTodayCount ?? 0} apostas</span>
          </div>
        </div>

        {/* 3. Total pago em prêmios */}
        <div
          onClick={() => onNavigate('apostas', 'vencedoras')}
          className="bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-amber-500/50 rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition-all group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Total Pago em Prêmios</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Entregue
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
            {paidOutToday.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-bold text-slate-400 ml-1.5">MZN</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Acumulado histórico:</span>
            <span className="font-bold text-slate-200">
              {stats.totalDisbursedPayout.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
            </span>
          </div>
        </div>

        {/* 4. Lucro da casa */}
        <div
          onClick={() => onNavigate('relatorios', 'diario')}
          className="bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-purple-500/50 rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition-all group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/20 transition-all"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Lucro da Casa</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              houseProfitToday >= 0
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}>
              {houseProfitToday >= 0 ? 'Margem +' : 'Margem -'}
            </span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
            houseProfitToday >= 0 ? 'text-purple-400' : 'text-rose-400'
          }`}>
            {houseProfitToday >= 0 ? '+' : ''}
            {houseProfitToday.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-bold text-slate-400 ml-1.5">MZN</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Lucro Geral Acumulado:</span>
            <span className="font-bold text-purple-300">
              {houseProfit.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT ({profitMarginPercent}%)
            </span>
          </div>
        </div>

      </div>

      {/* SECONDARY PANELS: Financial Movement & Bets Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Financial Flow (Hoje) */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Fluxo de Caixa de Hoje</span>
            </h3>
            <span className="text-[10px] text-slate-400">Operações do dia</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Depósitos Hoje</span>
                  <span className="text-[10px] text-slate-400">Entrada e-Mola / Bancos</span>
                </div>
              </div>
              <span className="text-sm font-black text-emerald-400">
                +{(stats.depositsToday ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Levantamentos Hoje</span>
                  <span className="text-[10px] text-slate-400">Saídas pagas via e-Mola</span>
                </div>
              </div>
              <span className="text-sm font-black text-rose-400">
                -{(stats.withdrawalsToday ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Comprovativos Pendentes:</span>
              <button
                onClick={() => onNavigate('financeiro', 'depositos')}
                className="font-black text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>{pendingProofsCount} por validar</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bets Breakdown */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span>Estado das Apostas</span>
            </h3>
            <button
              onClick={() => onNavigate('apostas', 'todas')}
              className="text-[10px] text-cyan-400 hover:underline font-bold"
            >
              Ver todas
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div
              onClick={() => onNavigate('apostas', 'pendentes')}
              className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
            >
              <span className="text-[10px] font-bold text-amber-400 block uppercase">Pendentes</span>
              <span className="text-xl font-black text-amber-300 mt-1 block">{stats.pendingBets}</span>
              <span className="text-[10px] text-slate-400">Aguardam resultado</span>
            </div>

            <div
              onClick={() => onNavigate('apostas', 'vencedoras')}
              className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-colors"
            >
              <span className="text-[10px] font-bold text-emerald-400 block uppercase">Vencedoras</span>
              <span className="text-xl font-black text-emerald-300 mt-1 block">{stats.wonBets}</span>
              <span className="text-[10px] text-slate-400">Prémios creditados</span>
            </div>

            <div
              onClick={() => onNavigate('apostas', 'perdedoras')}
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 cursor-pointer hover:bg-rose-500/20 transition-colors"
            >
              <span className="text-[10px] font-bold text-rose-400 block uppercase">Perdedoras</span>
              <span className="text-xl font-black text-rose-300 mt-1 block">{stats.lostBets}</span>
              <span className="text-[10px] text-slate-400">Retidas na banca</span>
            </div>

            <div
              onClick={() => onNavigate('apostas', 'anuladas')}
              className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 cursor-pointer hover:bg-sky-500/20 transition-colors"
            >
              <span className="text-[10px] font-bold text-sky-400 block uppercase">Anuladas (VOID)</span>
              <span className="text-xl font-black text-sky-300 mt-1 block">{stats.voidBets ?? 0}</span>
              <span className="text-[10px] text-slate-400">100% reembolsadas</span>
            </div>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Ações Rápidas</span>
            </h3>
            <span className="text-[10px] text-slate-400">Acesso direto</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onNavigate('jogadores', 'cadastrar')}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>👥 Cadastrar Novo Jogador</span>
              </span>
              <span className="text-[10px] text-slate-400">+ Criar</span>
            </button>

            <button
              onClick={onOpenCreateMatch}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>⚽ Criar Novo Jogo</span>
              </span>
              <span className="text-[10px] text-emerald-400">1X2</span>
            </button>

            <button
              onClick={() => onNavigate('jogos', 'resultado')}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-400" />
                <span>⚽ Inserir Resultado & Liquidar</span>
              </span>
              <span className="text-[10px] text-cyan-400">{stats.activeMatches} abertos</span>
            </button>

            <button
              onClick={() => onNavigate('correct_score')}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>📊 Gerir Resultado Correto</span>
              </span>
              <span className="text-[10px] text-cyan-400">Novo Mercado</span>
            </button>

            <button
              onClick={() => onNavigate('relatorios', 'diario')}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                <span>📊 Relatório Diário Consolidado</span>
              </span>
              <span className="text-[10px] text-purple-300">Hoje</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
