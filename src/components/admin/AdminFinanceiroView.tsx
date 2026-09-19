import React, { useState } from 'react';
import { WalletTransaction, DepositProof, User } from '../../types.ts';
import {
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  FileCheck,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink,
  Download,
  AlertCircle,
  FileText,
  UserCog,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import { AdjustBalanceModal } from '../AdjustBalanceModal.tsx';

interface AdminFinanceiroViewProps {
  transactions: WalletTransaction[];
  depositProofs: DepositProof[];
  users?: User[];
  activeSubTab: 'depositos' | 'levantamentos' | 'transacoes' | 'saldos';
  setActiveSubTab: (tab: 'depositos' | 'levantamentos' | 'transacoes' | 'saldos') => void;
  onReviewDepositProof: (proofId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => Promise<void>;
  setSelectedProof: (proof: DepositProof | null) => void;
  onBalanceAdjusted?: () => void;
}

export const AdminFinanceiroView: React.FC<AdminFinanceiroViewProps> = ({
  transactions,
  depositProofs,
  users,
  activeSubTab,
  setActiveSubTab,
  onReviewDepositProof,
  setSelectedProof,
  onBalanceAdjusted,
}) => {
  // Deposit Proofs Filter
  const [proofFilter, setProofFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
  const [proofSearch, setProofSearch] = useState('');
  const [processingProofId, setProcessingProofId] = useState<string | null>(null);

  // Transactions Filter
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('ALL');

  // Withdrawals extracted from ledger
  const withdrawals = transactions.filter((t) => t.type === 'WITHDRAWAL');

  // Filtered proofs
  const filteredProofs = depositProofs.filter((p) => {
    if (proofFilter !== 'ALL' && p.status !== proofFilter) return false;
    if (proofSearch.trim()) {
      const term = proofSearch.toLowerCase();
      const matchName = p.userName?.toLowerCase().includes(term);
      const matchPhone = p.userPhone?.toLowerCase().includes(term);
      const matchRef = p.referenceCode?.toLowerCase().includes(term);
      const matchOp = p.operatorTxId?.toLowerCase().includes(term);
      if (!matchName && !matchPhone && !matchRef && !matchOp) return false;
    }
    return true;
  });

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    if (txTypeFilter !== 'ALL' && t.type !== txTypeFilter) return false;
    if (txSearch.trim()) {
      const term = txSearch.toLowerCase();
      const matchRef = t.reference?.toLowerCase().includes(term);
      const matchDesc = t.description?.toLowerCase().includes(term);
      const matchUser = t.userId?.toLowerCase().includes(term);
      if (!matchRef && !matchDesc && !matchUser) return false;
    }
    return true;
  });

  const totalDepositsVolume = transactions
    .filter((t) => t.type === 'DEPOSIT')
    .reduce((acc, t) => acc + Math.abs(t.amount || 0), 0);

  const totalWithdrawalsVolume = withdrawals.reduce(
    (acc, t) => acc + Math.abs(t.amount || 0),
    0
  );

  const pendingProofs = depositProofs.filter((p) => p.status === 'PENDING');

  return (
    <div className="space-y-5">
      {/* Sub-navigation bar matching tree hierarchy */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="font-mono text-emerald-400 font-bold text-xs sm:text-sm">💰 FINANCEIRO</span>
          <span className="text-slate-500">/</span>
          <span className="text-xs text-slate-300 font-semibold">
            {activeSubTab === 'depositos' && `Depósitos & Comprovativos (${depositProofs.length})`}
            {activeSubTab === 'levantamentos' && `Levantamentos (${withdrawals.length})`}
            {activeSubTab === 'transacoes' && `Histórico de Transações (${transactions.length})`}
          </span>
        </div>

        {/* Tree Sub-tabs buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveSubTab('depositos')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'depositos'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Depósitos ({depositProofs.length})</span>
            {pendingProofs.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('levantamentos')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'levantamentos'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Levantamentos ({withdrawals.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('transacoes')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'transacoes'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico de transações</span>
          </button>

          <button
            onClick={() => setActiveSubTab('saldos')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'saldos'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <UserCog className="w-3.5 h-3.5" />
            <span>Gestão Manual de Saldo</span>
          </button>
        </div>
      </div>

      {/* ================= SUB-VIEW 1: DEPÓSITOS & COMPROVATIVOS ================= */}
      {activeSubTab === 'depositos' && (
        <div className="space-y-4">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Volume de Depósitos</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {totalDepositsVolume.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
              </span>
              <span className="text-[10px] text-slate-400">Total creditado na plataforma</span>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl">
              <span className="text-[11px] font-bold text-amber-400 block uppercase">Pendentes de Validação</span>
              <span className="text-2xl font-black text-amber-300 mt-1 block">
                {pendingProofs.length} talões
              </span>
              <span className="text-[10px] text-slate-400">Requerem conferência manual</span>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Canal Oficial e-Mola</span>
              <span className="text-lg font-black text-white mt-1 block">867090687</span>
              <span className="text-[10px] text-orange-400 font-bold">Titular: Aninha Basto</span>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setProofFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                    proofFilter === filter
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {filter === 'ALL' && 'Todos os Comprovativos'}
                  {filter === 'PENDING' && `Pendentes (${pendingProofs.length})`}
                  {filter === 'APPROVED' && 'Aprovados'}
                  {filter === 'REJECTED' && 'Rejeitados'}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Pesquisar por apostador, ref..."
                value={proofSearch}
                onChange={(e) => setProofSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Proofs Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3.5">Data / Hora</th>
                  <th className="py-3 px-3">Apostador</th>
                  <th className="py-3 px-3">Montante</th>
                  <th className="py-3 px-3">Método</th>
                  <th className="py-3 px-3">Referência & Operadora</th>
                  <th className="py-3 px-3">Comprovativo</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {filteredProofs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Nenhum comprovativo encontrado para esta seleção.
                    </td>
                  </tr>
                ) : (
                  filteredProofs.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleString('pt-PT')}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{p.userName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{p.userPhone}</div>
                      </td>

                      <td className="py-3 px-3 font-black text-emerald-400 whitespace-nowrap text-sm">
                        +{p.amount.toFixed(2)} MT
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          p.method === 'EMOLA'
                            ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                            : p.method === 'MPESA'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                        }`}>
                          {p.method}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <div className="text-slate-300 font-bold">{p.referenceCode}</div>
                        {p.operatorTxId && (
                          <div className="text-[10px] text-emerald-400 font-bold">
                            Op: {p.operatorTxId}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {p.receiptDataUrl ? (
                          <button
                            onClick={() => setSelectedProof(p)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg border border-slate-700 text-[10px] font-bold flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver Talão</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Sem anexo</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : p.status === 'REJECTED'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}>
                          {p.status === 'APPROVED' && 'Aprovado'}
                          {p.status === 'REJECTED' && 'Rejeitado'}
                          {p.status === 'PENDING' && 'Pendente'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {p.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={processingProofId === p.id}
                              onClick={async () => {
                                setProcessingProofId(p.id);
                                await onReviewDepositProof(p.id, 'APPROVED', 'Aprovado pelo administrador');
                                setProcessingProofId(null);
                              }}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-[11px] shadow transition-colors"
                            >
                              Aprovar
                            </button>
                            <button
                              disabled={processingProofId === p.id}
                              onClick={async () => {
                                const reason = prompt('Motivo da rejeição:', 'Talão inválido ou valor não recebido na conta e-Mola');
                                if (reason) {
                                  setProcessingProofId(p.id);
                                  await onReviewDepositProof(p.id, 'REJECTED', reason);
                                  setProcessingProofId(null);
                                }
                              }}
                              className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 rounded-lg border border-rose-500/30 text-[11px] font-bold transition-colors"
                            >
                              Rejeitar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Concluído</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUB-VIEW 2: LEVANTAMENTOS ================= */}
      {activeSubTab === 'levantamentos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Total de Levantamentos</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block">
                {totalWithdrawalsVolume.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MT
              </span>
              <span className="text-[10px] text-slate-400">Total retirado via e-Mola</span>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Taxa de Levantamento</span>
              <span className="text-2xl font-black text-white mt-1 block">5.0%</span>
              <span className="text-[10px] text-emerald-400">Retida automaticamente pela banca</span>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Operações Registadas</span>
              <span className="text-2xl font-black text-cyan-400 mt-1 block">
                {withdrawals.length} pedidos
              </span>
              <span className="text-[10px] text-slate-400">Livro-razão sincronizado</span>
            </div>
          </div>

          {/* Withdrawals Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3.5">Data / Hora</th>
                  <th className="py-3 px-3">Apostador (ID)</th>
                  <th className="py-3 px-3">Referência & Detalhes</th>
                  <th className="py-3 px-3 text-right">Montante Retirado</th>
                  <th className="py-3 px-3 text-right">Saldo Restante</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhum levantamento registado até ao momento.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(w.createdAt).toLocaleString('pt-PT')}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">
                        {w.userId}
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        <div>{w.description}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{w.reference}</div>
                      </td>

                      <td className="py-3 px-3 text-right font-black text-rose-400 whitespace-nowrap">
                        {w.amount.toFixed(2)} MT
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-white whitespace-nowrap">
                        {w.nextBalance.toFixed(2)} MT
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          Processado
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUB-VIEW 3: HISTORICO DE TRANSACOES (LIVRO-RAZAO) ================= */}
      {activeSubTab === 'transacoes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(['ALL', 'DEPOSIT', 'WITHDRAWAL', 'BET', 'WIN', 'REFUND', 'ADJUSTMENT'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTxTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                    txTypeFilter === type
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {type === 'ALL' && 'Todas'}
                  {type === 'DEPOSIT' && 'Depósitos'}
                  {type === 'WITHDRAWAL' && 'Levantamentos'}
                  {type === 'BET' && 'Apostas'}
                  {type === 'WIN' && 'Prémios'}
                  {type === 'REFUND' && 'Reembolsos'}
                  {type === 'ADJUSTMENT' && 'Ajustes'}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Pesquisar por referência ou ID..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Transactions Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3.5">Data / Hora</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Utilizador (ID)</th>
                  <th className="py-3 px-3">Referência & Descrição</th>
                  <th className="py-3 px-3 text-right">Montante</th>
                  <th className="py-3 px-3 text-right">Saldo Anterior</th>
                  <th className="py-3 px-3 text-right">Novo Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Nenhuma movimentação financeira encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString('pt-PT')}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'WIN' || tx.type === 'DEPOSIT'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : tx.type === 'BET' || tx.type === 'WITHDRAWAL'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : tx.type === 'REFUND'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {tx.type}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                        {tx.userId}
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        <div>{tx.description}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{tx.reference}</div>
                      </td>

                      <td className={`py-3 px-3 text-right font-black whitespace-nowrap ${
                        tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {tx.amount >= 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} MT
                      </td>

                      <td className="py-3 px-3 text-right text-slate-400 whitespace-nowrap">
                        {tx.previousBalance.toFixed(2)} MT
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-white whitespace-nowrap">
                        {tx.nextBalance.toFixed(2)} MT
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUB-VIEW 4: GESTÃO MANUAL DE SALDO ================= */}
      {activeSubTab === 'saldos' && (
        <AdminSaldosView users={users || []} transactions={transactions} onBalanceAdjusted={onBalanceAdjusted} />
      )}

    </div>
  );
};

// Componente para Gestão Manual de Saldo
const AdminSaldosView: React.FC<{ users: User[], transactions: WalletTransaction[], onBalanceAdjusted?: () => void }> = ({ users, transactions, onBalanceAdjusted }) => {
  const [tab, setTab] = useState<'ajustar' | 'historico'>('ajustar');
  
  // Adjust Tab State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'BLOCKED' | 'WITH_BALANCE' | 'WITHOUT_BALANCE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Historico Tab State
  const [histSearch, setHistSearch] = useState('');

  // 1. Filter Users
  const filteredUsers = users.filter((u) => {
    // a. Text Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      if (
        !u.name.toLowerCase().includes(term) &&
        !(u.phone && u.phone.toLowerCase().includes(term)) &&
        !u.id.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    // b. Category Filters
    if (filterType === 'ACTIVE') return !u.isBlocked;
    if (filterType === 'BLOCKED') return u.isBlocked;
    if (filterType === 'WITH_BALANCE') return (u.balance || 0) > 0;
    if (filterType === 'WITHOUT_BALANCE') return (u.balance || 0) <= 0;
    
    return true;
  });

  // 2. Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const adjustmentTx = transactions.filter(t => t.type === 'ADJUSTMENT');
  const filteredTx = adjustmentTx.filter(t => {
    if (!histSearch.trim()) return true;
    const term = histSearch.toLowerCase();
    return (
      t.id.toLowerCase().includes(term) ||
      t.userId.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Tabs Internas */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setTab('ajustar')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            tab === 'ajustar' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Ajustar Saldo
        </button>
        <button
          onClick={() => setTab('historico')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            tab === 'historico' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Histórico
        </button>
      </div>

      {tab === 'ajustar' && (
        <div className="bg-slate-800/60 p-4 border border-slate-700/80 rounded-xl space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-amber-400" />
            Adicionar / Remover Saldo Manualmente
          </h3>
          <p className="text-xs text-slate-400">
            Pesquise e selecione qualquer utilizador da plataforma para ajustar o seu saldo. As operações gerarão um registo de auditoria imutável.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Pesquisar por nome, telefone ou ID do usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todos os Utilizadores</option>
              <option value="ACTIVE">Ativos</option>
              <option value="BLOCKED">Bloqueados</option>
              <option value="WITH_BALANCE">Com Saldo</option>
              <option value="WITHOUT_BALANCE">Sem Saldo</option>
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-3">Usuário</th>
                    <th className="py-3 px-3">Contato</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Saldo Atual</th>
                    <th className="py-3 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Nenhum usuário encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white text-sm">{u.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {u.id}</div>
                          {u.createdAt && (
                            <div className="text-[10px] text-slate-500">
                              Registo: {new Date(u.createdAt).toLocaleDateString('pt-PT')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {u.phone || '-'}
                        </td>
                        <td className="py-3 px-3">
                          {u.isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                              Bloqueado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              Ativo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-black text-emerald-400 text-sm">
                            {(u.balance || 0).toFixed(2)} MT
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsAdjustModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-bold text-[10px] rounded-lg transition-colors whitespace-nowrap"
                          >
                            SELECIONAR
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-t border-slate-700">
                <span className="text-xs text-slate-400">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredUsers.length)} de {filteredUsers.length}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'historico' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar histórico por ID da transação, ID do usuário, motivo..."
              value={histSearch}
              onChange={(e) => setHistSearch(e.target.value)}
              className="w-full sm:w-96 bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3">Data / Hora</th>
                  <th className="py-3 px-3">Transação</th>
                  <th className="py-3 px-3">ID Usuário</th>
                  <th className="py-3 px-3">Motivo</th>
                  <th className="py-3 px-3 text-right">Valor</th>
                  <th className="py-3 px-3 text-right">Saldo Ant.</th>
                  <th className="py-3 px-3 text-right">Saldo Pós.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Nenhum histórico de ajuste encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredTx.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString('pt-PT')}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                        {tx.id}
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-400">
                        {tx.userId}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {tx.description}
                      </td>
                      <td className={`py-3 px-3 text-right font-black whitespace-nowrap ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.amount >= 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} MT
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        {tx.previousBalance.toFixed(2)} MT
                      </td>
                      <td className="py-3 px-3 text-right text-white font-bold">
                        {tx.nextBalance.toFixed(2)} MT
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdjustModalOpen && selectedUser && (
        <AdjustBalanceModal
          user={selectedUser}
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          onSuccess={(msg) => {
            if (onBalanceAdjusted) onBalanceAdjusted();
          }}
        />
      )}
    </div>
  );
};

