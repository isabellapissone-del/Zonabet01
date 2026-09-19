import React, { useState } from 'react';
import { User } from '../../types.ts';
import { api } from '../../api.ts';
import {
  Users,
  UserPlus,
  Search,
  Lock,
  Unlock,
  Key,
  DollarSign,
  History,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Wallet,
  Shield,
  Eye,
  Phone,
  Mail,
  UserCheck,
  Copy,
  Link as LinkIcon,
} from 'lucide-react';

interface AdminJogadoresViewProps {
  users: User[];
  activeSubTab: 'cadastrar' | 'lista' | 'saldo' | 'historico';
  setActiveSubTab: (tab: 'cadastrar' | 'lista' | 'saldo' | 'historico') => void;
  onOpenAdjustBalance: (user: User) => void;
  onOpenUserDetail: (user: User) => void;
  onToggleUserBlock: (userId: string) => void;
  onOpenResetPassword: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onUserCreated: () => Promise<void> | void;
  notifySuccess: (msg: string) => void;
  notifyError: (msg: string) => void;
}

export const AdminJogadoresView: React.FC<AdminJogadoresViewProps> = ({
  users,
  activeSubTab,
  setActiveSubTab,
  onOpenAdjustBalance,
  onOpenUserDetail,
  onToggleUserBlock,
  onOpenResetPassword,
  onDeleteUser,
  onUserCreated,
  notifySuccess,
  notifyError,
}) => {
  // Form State for Cadastrar Jogador
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+258 ');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Zona123!');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter state for Lista
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'USER' | 'ADMIN' | 'BLOCKED' | 'ACTIVE'>('ALL');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notifyError('O nome do jogador é obrigatório.');
      return;
    }
    if (!phone.trim() || phone.trim() === '+258') {
      notifyError('O número de telemóvel é obrigatório (+258...).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.adminCreateUser({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password: password.trim() || 'Zona123!',
        initialBalance: Number(initialBalance) || 0,
        role,
      });

      notifySuccess(res.message || 'Jogador cadastrado com sucesso!');
      setName('');
      setPhone('+258 ');
      setEmail('');
      setPassword('Zona123!');
      setInitialBalance(0);
      setRole('USER');
      await onUserCreated();
      setActiveSubTab('lista');
    } catch (err: any) {
      notifyError(err.message || 'Erro ao cadastrar jogador');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered users for table
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.referralCode && u.referralCode.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterRole === 'USER') return u.role === 'USER';
    if (filterRole === 'ADMIN') return u.role === 'ADMIN';
    if (filterRole === 'BLOCKED') return u.isBlocked === true;
    if (filterRole === 'ACTIVE') return !u.isBlocked;
    return true;
  });

  const totalUserBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
  const activeCount = users.filter((u) => !u.isBlocked).length;
  const blockedCount = users.filter((u) => u.isBlocked).length;

  return (
    <div className="space-y-5">
      {/* Sub-navigation bar matching tree hierarchy */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="font-mono text-emerald-400 font-bold text-xs sm:text-sm">👥 JOGADORES</span>
          <span className="text-slate-500">/</span>
          <span className="text-xs text-slate-300 font-semibold">
            {activeSubTab === 'cadastrar' && 'Cadastrar Jogador'}
            {activeSubTab === 'lista' && `Lista de Jogadores (${users.length})`}
            {activeSubTab === 'saldo' && 'Gestão de Saldos'}
            {activeSubTab === 'historico' && 'Histórico do Jogador'}
          </span>
        </div>

        {/* Tree Sub-tabs buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveSubTab('cadastrar')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'cadastrar'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cadastrar jogador</span>
          </button>

          <button
            onClick={() => setActiveSubTab('lista')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'lista'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Lista de jogadores</span>
          </button>

          <button
            onClick={() => setActiveSubTab('saldo')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'saldo'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Saldo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('historico')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'historico'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico</span>
          </button>
        </div>
      </div>

      {/* ================= SUB-VIEW 1: CADASTRAR JOGADOR ================= */}
      {activeSubTab === 'cadastrar' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 sm:p-7 max-w-2xl mx-auto shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Cadastrar Novo Jogador</h3>
                <p className="text-xs text-slate-400">
                  Registo administrativo imediato com criação de carteira e saldo inicial opcional.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('lista')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Voltar à lista
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alberto Chissano"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Telemóvel (Moçambique) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+258 84 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Email (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="apostador@zonabet.mz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Palavra-passe Inicial
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword(`Zona${Math.floor(1000 + Math.random() * 9000)}!`)}
                    className="absolute right-2 top-2 text-[10px] text-emerald-400 hover:underline px-2 py-0.5 bg-slate-800 rounded font-bold"
                  >
                    Gerar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Saldo Inicial a Creditar (MZN)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                    MT
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Função na Plataforma
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="USER">Apostador (USER)</option>
                  <option value="ADMIN">Administrador (ADMIN)</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
              💡 O sistema gerará automaticamente um <strong>Código de Convite individual e exclusivo</strong> para o novo jogador partilhar com a sua rede e receber 5% de bónus.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setActiveSubTab('lista')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>A Criar Jogador...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Concluir Cadastro do Jogador</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= SUB-VIEW 2: LISTA DE JOGADORES ================= */}
      {activeSubTab === 'lista' && (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Registados</span>
              <span className="text-xl font-black text-white">{users.length}</span>
            </div>
            <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-400 block uppercase">Contas Ativas</span>
              <span className="text-xl font-black text-emerald-400">{activeCount}</span>
            </div>
            <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl">
              <span className="text-[10px] font-bold text-rose-400 block uppercase">Contas Bloqueadas</span>
              <span className="text-xl font-black text-rose-400">{blockedCount}</span>
            </div>
            <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl">
              <span className="text-[10px] font-bold text-cyan-400 block uppercase">Total em Carteiras</span>
              <span className="text-xl font-black text-cyan-400">
                {totalUserBalance.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(['ALL', 'ACTIVE', 'BLOCKED', 'USER', 'ADMIN'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterRole(filter)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                    filterRole === filter
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {filter === 'ALL' && 'Todos'}
                  {filter === 'ACTIVE' && 'Ativos'}
                  {filter === 'BLOCKED' && 'Bloqueados'}
                  {filter === 'USER' && 'Apostadores'}
                  {filter === 'ADMIN' && 'Administradores'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, celular, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={() => setActiveSubTab('cadastrar')}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 whitespace-nowrap shadow-lg shadow-emerald-500/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Cadastrar</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3.5">Jogador</th>
                  <th className="py-3 px-3">Contacto</th>
                  <th className="py-3 px-3">Código Convite</th>
                  <th className="py-3 px-3 text-right">Saldo</th>
                  <th className="py-3 px-3 text-center">Tipo</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Nenhum jogador encontrado para os critérios pesquisados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{u.name}</span>
                          {u.role === 'ADMIN' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/30">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {u.id.substring(0, 10)}...</div>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <div className="text-slate-300">{u.phone}</div>
                        <div className="text-[10px] text-slate-500">{u.email}</div>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        {u.referralCode ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                              {u.referralCode}
                            </span>
                            <button
                              onClick={() => {
                                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                const link = u.referralLink || `${origin}/?ref=${u.referralCode}`;
                                navigator.clipboard.writeText(link);
                                notifySuccess(`Link individual de registo de "${u.name}" copiado!`);
                              }}
                              title="Copiar link de convite único deste jogador"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 border border-slate-700 transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="font-black text-emerald-400 text-sm">
                          {(u.balance || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">MZN</span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.isBlocked
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {u.isBlocked ? 'Bloqueado' : 'Ativo'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Saldo Direct Button */}
                          <button
                            onClick={() => onOpenAdjustBalance(u)}
                            className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                            title="Ajustar saldo deste jogador"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Saldo</span>
                          </button>

                          {/* Histórico Direct Button */}
                          <button
                            onClick={() => onOpenUserDetail(u)}
                            className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                            title="Ver histórico de apostas e transações"
                          >
                            <History className="w-3 h-3" />
                            <span>Histórico</span>
                          </button>

                          {/* Block/Unblock */}
                          <button
                            onClick={() => onToggleUserBlock(u.id)}
                            className={`p-1 rounded-lg border transition-colors ${
                              u.isBlocked
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border-slate-700'
                            }`}
                            title={u.isBlocked ? 'Desbloquear utilizador' : 'Bloquear utilizador'}
                          >
                            {u.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => onOpenResetPassword(u)}
                            className="p-1 bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 rounded-lg border border-slate-700 transition-colors"
                            title="Redefinir palavra-passe"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteUser(u)}
                            className="p-1 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition-colors"
                            title="Excluir utilizador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUB-VIEW 3: SALDO (GESTAO DE SALDOS) ================= */}
      {activeSubTab === 'saldo' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span>Painel de Gestão de Saldos dos Jogadores</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulte os saldos em custódia na banca e faça ajustes, bonificações ou correções auditadas.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-semibold">Total em Carteiras</span>
                <span className="text-2xl font-black text-emerald-400">
                  {totalUserBalance.toFixed(2)} MZN
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-semibold">Maior Saldo Individual</span>
                <div className="mt-2">
                  {(() => {
                    const top = [...users].sort((a, b) => (b.balance || 0) - (a.balance || 0))[0];
                    if (!top) return <span className="text-slate-500">Sem jogadores</span>;
                    return (
                      <div>
                        <div className="text-lg font-black text-emerald-400">{top.balance.toFixed(2)} MZN</div>
                        <div className="text-xs text-white font-bold">{top.name}</div>
                        <div className="text-[10px] text-slate-400">{top.phone}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block font-semibold">Saldo Médio por Jogador</span>
                <div className="text-2xl font-black text-cyan-400 mt-2">
                  {(users.length > 0 ? totalUserBalance / users.length : 0).toFixed(2)} MZN
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Distribuição em {users.length} contas
                </span>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">Ação Rápida de Saldo</span>
                  <span className="text-xs text-slate-300 block mt-1">
                    Selecione qualquer jogador na lista para creditar ou debitar saldo com motivo registado no livro-razão.
                  </span>
                </div>
                <button
                  onClick={() => setActiveSubTab('lista')}
                  className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition-all"
                >
                  Ir para Lista de Jogadores ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-VIEW 4: HISTORICO DO JOGADOR ================= */}
      {activeSubTab === 'historico' && (
        <div className="p-5 sm:p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <span>Histórico Completo do Jogador</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulte todos os bilhetes de apostas, depósitos, levantamentos e operações financeiras de cada jogador.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => onOpenUserDetail(u)}
                className="p-3.5 bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 rounded-xl cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white group-hover:text-cyan-400 transition-colors text-xs">
                    {u.name}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {u.balance.toFixed(2)} MT
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1">{u.phone}</div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Ref: {u.referralCode || 'Sem ref'}</span>
                  <span className="text-cyan-400 group-hover:underline font-bold">Ver Histórico ➔</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
