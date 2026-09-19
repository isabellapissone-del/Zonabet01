import React, { useState } from 'react';
import { Match, Competition } from '../../types.ts';
import {
  Trophy,
  Plus,
  Edit2,
  CheckCircle,
  AlertTriangle,
  Search,
  Trash2,
  Calendar,
  Clock,
  Sliders,
  XCircle,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface AdminJogosViewProps {
  matches: Match[];
  competitions: Competition[];
  activeSubTab: 'todos' | 'criar' | 'editar' | 'encerrar' | 'resultado';
  setActiveSubTab: (tab: 'todos' | 'criar' | 'editar' | 'encerrar' | 'resultado') => void;
  onOpenCreateMatchModal: () => void;
  onOpenOddsModal: (m: Match) => void;
  onOpenResultModal: (m: Match) => void;
  onOpenCancelModal: (m: Match) => void;
  onDeleteMatch: (m: Match) => void;
  onStatusChange: (matchId: string, status: 'OPEN' | 'SUSPENDED') => void;
}

export const AdminJogosView: React.FC<AdminJogosViewProps> = ({
  matches,
  competitions,
  activeSubTab,
  setActiveSubTab,
  onOpenCreateMatchModal,
  onOpenOddsModal,
  onOpenResultModal,
  onOpenCancelModal,
  onDeleteMatch,
  onStatusChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MOCAMBOLA' | 'PROVINCIAL' | 'DISTRITAL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'SUSPENDED' | 'FINISHED' | 'CANCELLED'>('ALL');

  // Filter matches
  const filteredMatches = matches.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      m.homeTeam.toLowerCase().includes(term) ||
      m.awayTeam.toLowerCase().includes(term) ||
      m.competitionName.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    // Sub-tab specific status defaults
    if (activeSubTab === 'resultado') {
      if (m.status !== 'OPEN' && m.status !== 'SUSPENDED') return false;
    } else if (activeSubTab === 'encerrar') {
      if (m.status === 'FINISHED' || m.status === 'CANCELLED') return false;
    } else if (activeSubTab === 'editar') {
      if (m.status === 'FINISHED' || m.status === 'CANCELLED') return false;
    } else if (statusFilter !== 'ALL') {
      if (m.status !== statusFilter) return false;
    }

    if (categoryFilter !== 'ALL') {
      if (m.competitionCategory !== categoryFilter) return false;
    }

    return true;
  });

  return (
    <div className="space-y-5">
      {/* Sub-navigation bar matching tree hierarchy */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="font-mono text-cyan-400 font-bold text-xs sm:text-sm">⚽ JOGOS</span>
          <span className="text-slate-500">/</span>
          <span className="text-xs text-slate-300 font-semibold">
            {activeSubTab === 'todos' && `Todos os Jogos (${matches.length})`}
            {activeSubTab === 'criar' && 'Criar Novo Jogo'}
            {activeSubTab === 'editar' && 'Editar Jogo & Odds'}
            {activeSubTab === 'encerrar' && 'Encerrar / Trancar / Cancelar Jogo'}
            {activeSubTab === 'resultado' && 'Inserir Resultado & Liquidar Apostas'}
          </span>
        </div>

        {/* Tree Sub-tabs buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveSubTab('todos')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'todos'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Todos</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('criar');
              onOpenCreateMatchModal();
            }}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'criar'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar jogo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('editar')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'editar'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Editar jogo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('encerrar')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'encerrar'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Encerrar jogo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('resultado')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'resultado'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Inserir resultado</span>
          </button>
        </div>
      </div>

      {/* Sub-tab instruction notices */}
      {activeSubTab === 'resultado' && (
        <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs text-cyan-300">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-cyan-400" />
            <span>Modo de Liquidação de Resultados: Escolha o jogo terminado, insira os golos e confirme para pagar instantaneamente todos os apostadores vencedores.</span>
          </span>
        </div>
      )}

      {activeSubTab === 'encerrar' && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Modo de Encerramento: Suspenda apostas temporariamente antes do início ou Cancele o jogo para anular (VOID) e reembolsar 100% dos valores apostados aos utilizadores.</span>
          </span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Todas as Competições</option>
            <option value="MOCAMBOLA">Moçambola (Nacional)</option>
            <option value="PROVINCIAL">Campeonatos Provinciais</option>
            <option value="DISTRITAL">Torneios Distritais</option>
          </select>

          {activeSubTab === 'todos' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos os Estados</option>
              <option value="OPEN">Abertos (OPEN)</option>
              <option value="SUSPENDED">Suspensos (SUSPENDED)</option>
              <option value="FINISHED">Terminados (FINISHED)</option>
              <option value="CANCELLED">Cancelados (CANCELLED)</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar equipa ou torneio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={onOpenCreateMatchModal}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 whitespace-nowrap shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Novo Jogo</span>
          </button>
        </div>
      </div>

      {/* Matches Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
            <tr>
              <th className="py-3 px-3.5">Competição</th>
              <th className="py-3 px-3">Partida (Equipas)</th>
              <th className="py-3 px-3">Data / Hora</th>
              <th className="py-3 px-3 text-center">Odds 1X2</th>
              <th className="py-3 px-3 text-center">Estado</th>
              <th className="py-3 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-medium">
            {filteredMatches.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Nenhum jogo encontrado para os critérios selecionados.
                </td>
              </tr>
            ) : (
              filteredMatches.map((m) => {
                const mkt = m.markets?.find((mk) => mk.type === '1X2');
                const h = mkt?.selections?.find((s) => s.outcome === '1')?.odds || (Array.isArray(mkt?.odds) ? mkt?.odds?.find((o: any) => o.name === '1')?.value : undefined);
                const d = mkt?.selections?.find((s) => s.outcome === 'X')?.odds || (Array.isArray(mkt?.odds) ? mkt?.odds?.find((o: any) => o.name === 'X')?.value : undefined);
                const a = mkt?.selections?.find((s) => s.outcome === '2')?.odds || (Array.isArray(mkt?.odds) ? mkt?.odds?.find((o: any) => o.name === '2')?.value : undefined);

                return (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-white">{m.competitionName}</div>
                      <span className={`text-[10px] ${
                        m.competitionCategory === 'MOCAMBOLA' ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {m.competitionCategory}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-bold text-white">
                      <span>{m.homeTeam} vs {m.awayTeam}</span>
                      {m.homeScore !== null && m.homeScore !== undefined && (
                        <span className="ml-2 text-emerald-400 font-black">
                          ({m.homeScore} - {m.awayScore})
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {m.kickoffDate} {m.kickoffTime}
                    </td>

                    <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                      <span className="text-emerald-400 font-bold">{h?.toFixed(2) || '2.00'}</span> /{' '}
                      <span className="text-slate-300 font-bold">{d?.toFixed(2) || '3.00'}</span> /{' '}
                      <span className="text-cyan-400 font-bold">{a?.toFixed(2) || '3.00'}</span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === 'OPEN'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : m.status === 'FINISHED'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : m.status === 'SUSPENDED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {m.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* EDITAR JOGO: Odds */}
                        {(activeSubTab === 'todos' || activeSubTab === 'editar') && m.status === 'OPEN' && (
                          <button
                            onClick={() => onOpenOddsModal(m)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg border border-slate-700 text-[11px] font-bold flex items-center gap-1"
                            title="Editar Odds"
                          >
                            <Edit2 className="w-3 h-3 text-amber-400" />
                            <span>Odds</span>
                          </button>
                        )}

                        {/* ENCERRAR JOGO: Suspender / Reabrir / Cancelar */}
                        {(activeSubTab === 'todos' || activeSubTab === 'encerrar') && (
                          <>
                            {m.status === 'OPEN' && (
                              <button
                                onClick={() => onStatusChange(m.id, 'SUSPENDED')}
                                className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg border border-amber-500/30 text-[11px] font-bold"
                                title="Trancar/Suspender apostas"
                              >
                                Suspender
                              </button>
                            )}

                            {m.status === 'SUSPENDED' && (
                              <button
                                onClick={() => onStatusChange(m.id, 'OPEN')}
                                className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-lg border border-emerald-500/30 text-[11px] font-bold"
                                title="Reabrir apostas"
                              >
                                Reabrir
                              </button>
                            )}

                            {m.status !== 'FINISHED' && m.status !== 'CANCELLED' && (
                              <button
                                onClick={() => onOpenCancelModal(m)}
                                className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 rounded-lg border border-rose-500/30 text-[11px] font-bold"
                                title="Cancelar jogo e reembolsar apostadores"
                              >
                                Cancelar (VOID)
                              </button>
                            )}
                          </>
                        )}

                        {/* INSERIR RESULTADO: Placar e liquidação */}
                        {(activeSubTab === 'todos' || activeSubTab === 'resultado') && m.status !== 'FINISHED' && m.status !== 'CANCELLED' && (
                          <button
                            onClick={() => onOpenResultModal(m)}
                            className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-lg text-[11px] flex items-center gap-1 shadow-md shadow-cyan-500/20"
                            title="Inserir resultado e liquidar bilhetes"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Resultado</span>
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => onDeleteMatch(m)}
                          className="p-1 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition-colors"
                          title="Excluir Jogo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
