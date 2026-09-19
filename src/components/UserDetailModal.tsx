import React, { useState, useEffect } from 'react';
import { User, Bet, WalletTransaction } from '../types.ts';
import { api } from '../api.ts';
import {
  X,
  User as UserIcon,
  Shield,
  Lock,
  Unlock,
  Key,
  DollarSign,
  History,
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Copy,
  Gift,
} from 'lucide-react';

interface UserDetailModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onAdjustBalance: (user: User) => void;
  onUserUpdated: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  isOpen,
  onClose,
  onAdjustBalance,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'bets' | 'transactions'>('bets');
  const [bets, setBets] = useState<Bet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [newPassword, setNewPassword] = useState('Zona123!');

  const loadUserData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [betsRes, txRes] = await Promise.all([
        api.getAdminUserBets(user.id),
        api.getAdminUserTransactions(user.id),
      ]);
      setBets(betsRes.bets);
      setTransactions(txRes.transactions);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do utilizador');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      loadUserData();
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleToggleBlock = async () => {
    setActionLoading(true);
    try {
      const res = await api.toggleUserBlock(user.id);
      notifySuccess(res.message);
      onUserUpdated();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar bloqueio');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async (newRole: 'USER' | 'ADMIN') => {
    setActionLoading(true);
    try {
      const res = await api.changeUserRole(user.id, newRole);
      notifySuccess(res.message);
      onUserUpdated();
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar permissões');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.resetUserPassword(user.id, newPassword);
      setShowPasswordPrompt(false);
      notifySuccess(`Palavra-passe redefinida com sucesso! Nova senha temporária: "${res.tempPassword}"`);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir palavra-passe');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-full sm:max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[94vh]">
        
        {/* Top Header */}
        <div className="p-3.5 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{user.name}</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  user.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                }`}>
                  {user.role === 'ADMIN' ? 'SUPER ADMIN' : 'APOSTADOR'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  user.isBlocked ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {user.isBlocked ? 'BLOQUEADO' : 'ATIVO'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user.email} • {user.phone} • Cadastrado em: {new Date(user.createdAt).toLocaleDateString('pt-PT')}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action feedback banners */}
        {successMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Super Admin Action Bar */}
        <div className="p-4 mx-5 my-4 bg-slate-800/60 rounded-xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Saldo Atual em Carteira:</span>
            <span className="text-lg font-black text-emerald-400">{user.balance.toFixed(2)} MZN</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Balance Button */}
            <button
              onClick={() => onAdjustBalance(user)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Adicionar / Ajustar Saldo</span>
            </button>

            {/* Block / Unblock Button */}
            {user.role !== 'ADMIN' && (
              <button
                onClick={handleToggleBlock}
                disabled={actionLoading}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  user.isBlocked
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {user.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{user.isBlocked ? 'Desbloquear Conta' : 'Bloquear Conta'}</span>
              </button>
            )}

            {/* Role Switch */}
            <button
              onClick={() => handleChangeRole(user.role === 'ADMIN' ? 'USER' : 'ADMIN')}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>{user.role === 'ADMIN' ? 'Remover Admin' : 'Promover a Admin'}</span>
            </button>

            {/* Reset Password */}
            <button
              onClick={() => setShowPasswordPrompt(!showPasswordPrompt)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>Redefinir Senha</span>
            </button>
          </div>
        </div>

        {/* User's Individual Referral Link */}
        <div className="mx-5 mb-4 p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Link de Registo Individual (5% Bónus)</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                  {user.referralCode || `ZONA${user.phone?.replace(/\D/g, '').slice(-9)}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                {user.referralLink || `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${user.referralCode || `ZONA${user.phone?.replace(/\D/g, '').slice(-9)}`}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const origin = typeof window !== 'undefined' ? window.location.origin : '';
              const link = user.referralLink || `${origin}/?ref=${user.referralCode || `ZONA${user.phone?.replace(/\D/g, '').slice(-9)}`}`;
              navigator.clipboard.writeText(link);
              notifySuccess('Link individual de registo do jogador copiado com sucesso!');
            }}
            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar Link Individual</span>
          </button>
        </div>

        {/* Reset Password Form dropdown */}
        {showPasswordPrompt && (
          <form onSubmit={handleResetPassword} className="mx-5 mb-4 p-4 bg-slate-800 border border-cyan-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Key className="w-4 h-4" /> Definir Nova Palavra-passe para {user.email}
              </span>
              <button type="button" onClick={() => setShowPasswordPrompt(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                placeholder="Introduza a nova senha temporária..."
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-lg text-xs"
              >
                Aplicar Nova Senha
              </button>
            </div>
          </form>
        )}

        {/* Subtabs for User Bets & Ledger */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-900">
          <button
            onClick={() => setActiveTab('bets')}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 ${
              activeTab === 'bets' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Boletins de Apostas ({bets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2.5 px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 ${
              activeTab === 'transactions' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Extrato Financeiro / Ledger ({transactions.length})</span>
          </button>
        </div>

        {/* Content area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>A carregar registos do utilizador...</span>
            </div>
          ) : activeTab === 'bets' ? (
            bets.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">Este utilizador ainda não realizou apostas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Tipo / Seleções</th>
                      <th className="py-2 px-3 text-right">Stake</th>
                      <th className="py-2 px-3 text-right">Odd Total</th>
                      <th className="py-2 px-3 text-right">Retorno</th>
                      <th className="py-2 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bets.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {new Date(b.createdAt).toLocaleString('pt-PT')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-white">{b.type}</span>
                          <span className="text-slate-400 ml-1">({b.items.length} jogo(s))</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">{b.stake.toFixed(2)} MZN</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{b.totalOdds.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-400">{b.potentialReturn.toFixed(2)} MZN</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.status === 'WON'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : b.status === 'LOST'
                              ? 'bg-rose-500/20 text-rose-300'
                              : b.status === 'VOID'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            transactions.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">Nenhuma transação registada na carteira.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3">Descrição / Referência</th>
                      <th className="py-2 px-3 text-right">Montante</th>
                      <th className="py-2 px-3 text-right">Saldo Anterior</th>
                      <th className="py-2 px-3 text-right">Novo Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString('pt-PT')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'WIN' || tx.type === 'DEPOSIT'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : tx.type === 'BET'
                              ? 'bg-amber-500/20 text-amber-300'
                              : tx.type === 'REFUND'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <div>{tx.description}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{tx.reference}</div>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black ${
                          tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {tx.amount >= 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} MZN
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">{tx.previousBalance.toFixed(2)} MZN</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">{tx.nextBalance.toFixed(2)} MZN</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
};
