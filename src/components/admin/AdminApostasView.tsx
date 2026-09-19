import React, { useState } from 'react';
import { Bet } from '../../types.ts';
import {
  Target,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  DollarSign,
  Ticket,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AdminApostasViewProps {
  bets: Bet[];
  activeSubTab: 'todas' | 'pendentes' | 'vencedoras' | 'perdedoras' | 'anuladas';
  setActiveSubTab: (tab: 'todas' | 'pendentes' | 'vencedoras' | 'perdedoras' | 'anuladas') => void;
}

export const AdminApostasView: React.FC<AdminApostasViewProps> = ({
  bets,
  activeSubTab,
  setActiveSubTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);

  const pendingCount = bets.filter((b) => b.status === 'PENDING').length;
  const wonCount = bets.filter((b) => b.status === 'WON').length;
  const lostCount = bets.filter((b) => b.status === 'LOST').length;
  const voidCount = bets.filter((b) => b.status === 'VOID').length;

  const filteredBets = bets.filter((b) => {
    // Sub-tab filter
    if (activeSubTab === 'pendentes' && b.status !== 'PENDING') return false;
    if (activeSubTab === 'vencedoras' && b.status !== 'WON') return false;
    if (activeSubTab === 'perdedoras' && b.status !== 'LOST') return false;
    if (activeSubTab === 'anuladas' && b.status !== 'VOID') return false;

    // Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchId = b.id.toLowerCase().includes(term);
      const matchUser =
        b.userName?.toLowerCase().includes(term) ||
        b.userEmail?.toLowerCase().includes(term) ||
        b.userId?.toLowerCase().includes(term);
      const matchSelection = b.items?.some(
        (it) =>
          it.homeTeam?.toLowerCase().includes(term) ||
          it.awayTeam?.toLowerCase().includes(term) ||
          it.selection?.toLowerCase().includes(term)
      );
      if (!matchId && !matchUser && !matchSelection) return false;
    }

    return true;
  });

  const totalFilteredVolume = filteredBets.reduce((acc, b) => acc + (b.stake || 0), 0);
  const totalFilteredPayout = filteredBets
    .filter((b) => b.status === 'WON')
    .reduce((acc, b) => acc + (b.potentialReturn || 0), 0);

  return (
    <div className="space-y-5">
      {/* Sub-navigation bar matching tree hierarchy */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="font-mono text-amber-400 font-bold text-xs sm:text-sm">🎯 APOSTAS</span>
          <span className="text-slate-500">/</span>
          <span className="text-xs text-slate-300 font-semibold">
            {activeSubTab === 'todas' && `Todas as Apostas (${bets.length})`}
            {activeSubTab === 'pendentes' && `Apostas Pendentes (${pendingCount})`}
            {activeSubTab === 'vencedoras' && `Apostas Vencedoras (${wonCount})`}
            {activeSubTab === 'perdedoras' && `Apostas Perdedoras (${lostCount})`}
            {activeSubTab === 'anuladas' && `Apostas Anuladas (${voidCount})`}
          </span>
        </div>

        {/* Tree Sub-tabs buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveSubTab('todas')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'todas'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Todas as apostas ({bets.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pendentes')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'pendentes'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Apostas pendentes ({pendingCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('vencedoras')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'vencedoras'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Apostas vencedoras ({wonCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('perdedoras')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'perdedoras'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Apostas perdedoras ({lostCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('anuladas')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'anuladas'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Anuladas ({voidCount})</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar for active category */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Quantidade</span>
          <span className="text-xl font-black text-white">{filteredBets.length} bilhetes</span>
        </div>
        <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl">
          <span className="text-[10px] font-bold text-cyan-400 block uppercase">Volume Total</span>
          <span className="text-xl font-black text-cyan-400">
            {totalFilteredVolume.toFixed(2)} MT
          </span>
        </div>
        <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl">
          <span className="text-[10px] font-bold text-emerald-400 block uppercase">Retorno Pago</span>
          <span className="text-xl font-black text-emerald-400">
            {totalFilteredPayout.toFixed(2)} MT
          </span>
        </div>
        <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl">
          <span className="text-[10px] font-bold text-purple-400 block uppercase">Balanço Bruto</span>
          <span className={`text-xl font-black ${
            totalFilteredVolume - totalFilteredPayout >= 0 ? 'text-purple-400' : 'text-rose-400'
          }`}>
            {(totalFilteredVolume - totalFilteredPayout).toFixed(2)} MT
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar por ID do bilhete, apostador, equipa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Bets Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
            <tr>
              <th className="py-3 px-3.5">Bilhete / Data</th>
              <th className="py-3 px-3">Apostador</th>
              <th className="py-3 px-3">Tipo / Seleções</th>
              <th className="py-3 px-3 text-right">Stake (MZN)</th>
              <th className="py-3 px-3 text-right">Odd Total</th>
              <th className="py-3 px-3 text-right">Retorno</th>
              <th className="py-3 px-3 text-center">Estado</th>
              <th className="py-3 px-3 text-right">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-medium">
            {filteredBets.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  Nenhuma aposta encontrada nesta categoria.
                </td>
              </tr>
            ) : (
              filteredBets.map((b) => {
                const isExpanded = expandedBetId === b.id;
                return (
                  <React.Fragment key={b.id}>
                    <tr className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-mono text-white font-bold text-[11px]">{b.id}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(b.createdAt).toLocaleString('pt-PT')}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{b.userName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{b.userEmail}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-200">{b.type}</div>
                        <div className="text-[10px] text-slate-400">
                          {b.items?.length || 1} evento{(b.items?.length || 1) > 1 ? 's' : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-black text-white whitespace-nowrap">
                        {b.stake.toFixed(2)} MT
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {b.totalOdds.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-black text-emerald-400 whitespace-nowrap">
                        {b.potentialReturn.toFixed(2)} MT
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.status === 'WON'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : b.status === 'LOST'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : b.status === 'VOID'
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}>
                          {b.status === 'WON' && 'Vencedora'}
                          {b.status === 'LOST' && 'Perdedora'}
                          {b.status === 'VOID' && 'Anulada (VOID)'}
                          {b.status === 'PENDING' && 'Pendente'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setExpandedBetId(isExpanded ? null : b.id)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Fechar' : 'Jogos'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Bet Selections Row */}
                    {isExpanded && (
                      <tr className="bg-slate-900/80">
                        <td colSpan={8} className="p-3">
                          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                            <span className="text-[11px] font-bold text-slate-300 block uppercase">
                              Seleções do Bilhete #{b.id}:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {b.items?.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs"
                                >
                                  <div className="font-bold text-white">
                                    {item.homeTeam} vs {item.awayTeam}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                                    <span>Escolha: <strong className="text-amber-400">{item.selection}</strong></span>
                                    <span>Odd: <strong className="text-emerald-400">{item.odds?.toFixed(2)}</strong></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
