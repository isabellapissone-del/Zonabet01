import React, { useState, useEffect } from 'react';
import { Match, Market, Selection } from '../../types.ts';
import { api } from '../../api.ts';
import {
  Trophy,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  TrendingUp,
  Target,
  Search,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface AdminCorrectScoreViewProps {
  matches: Match[];
  onRefresh: () => void;
}

export const AdminCorrectScoreView: React.FC<AdminCorrectScoreViewProps> = ({ matches, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editingSelection, setEditingSelection] = useState<{ marketId: string, selection: Selection } | null>(null);
  const [isAddingScore, setIsAddingScore] = useState(false);
  const [newScore, setNewScore] = useState({ outcome: '', label: '', odds: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter matches that have a correct score market
  const csMatches = matches.filter(m => 
    m.status === 'OPEN' || m.status === 'SUSPENDED'
  ).filter(m => {
    const term = searchTerm.toLowerCase();
    return m.homeTeam.toLowerCase().includes(term) || 
           m.awayTeam.toLowerCase().includes(term) ||
           m.competitionName.toLowerCase().includes(term);
  });

  const handleUpdateOdds = async (matchId: string, marketId: string, selectionId: string, newOdds: number) => {
    setLoading(true);
    setError(null);
    try {
      // Use the correct API method for updating odds
      await api.updateMarketOdds(matchId, marketId, [{ selectionId, odds: newOdds }]);
      
      setSuccess('Odds atualizadas com sucesso!');
      setEditingSelection(null);
      onRefresh();
      
      // Re-fetch match data to ensure UI sync
      const updatedMatchRes = await api.getMatches();
      const updatedMatch = updatedMatchRes.matches.find((m: Match) => m.id === matchId);
      if (updatedMatch) setSelectedMatch(updatedMatch);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar odds');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleAddScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;
    
    const market = selectedMatch.markets.find(m => m.type === 'CORRECT_SCORE');
    if (!market) return;

    setLoading(true);
    setError(null);
    try {
      // Use positional arguments as defined in api.ts
      await api.addMarketSelection(
        selectedMatch.id, 
        market.id, 
        newScore.outcome, 
        newScore.label || newScore.outcome, 
        parseFloat(newScore.odds)
      );
      
      setSuccess('Novo resultado adicionado com sucesso!');
      setIsAddingScore(false);
      setNewScore({ outcome: '', label: '', odds: '' });
      onRefresh();
      
      // We'll need to re-fetch or find the updated match
      const updatedMatchRes = await api.getMatches();
      const updatedMatch = updatedMatchRes.matches.find((m: Match) => m.id === selectedMatch.id);
      if (updatedMatch) setSelectedMatch(updatedMatch);
      
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar resultado');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const getMarketExposure = (market: Market) => {
    // This would ideally come from the RiskService via API
    // For now we'll simulate or sum up potential payouts if we had bet data
    return 0; 
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">Gestão de Resultado Correto</h2>
            <p className="text-[11px] text-slate-400">Configure odds e limites para o mercado de placar exato.</p>
          </div>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar partida..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Matches List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Jogos Disponíveis</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {csMatches.length === 0 ? (
              <div className="p-8 text-center bg-slate-800/40 border border-slate-700/50 rounded-2xl text-slate-500 text-xs">
                Nenhum jogo aberto encontrado.
              </div>
            ) : (
              csMatches.map(m => {
                const isSelected = selectedMatch?.id === m.id;
                const csMarket = m.markets?.find(mk => mk.type === 'CORRECT_SCORE');
                
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMatch(m);
                      setIsAddingScore(false);
                      setEditingSelection(null);
                    }}
                    className={`w-full p-3.5 text-left rounded-2xl border transition-all flex flex-col gap-2 ${
                      isSelected 
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/5' 
                        : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase">{m.competitionName}</span>
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold ${
                        m.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-white">
                      {m.homeTeam} vs {m.awayTeam}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <TrendingUp className="w-3 h-3 text-cyan-400" />
                        <span>{csMarket?.selections.length || 0} Resultados</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{m.kickoffDate} {m.kickoffTime}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Market Details */}
        <div className="lg:col-span-8">
          {selectedMatch ? (
            <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-6 space-y-6 animate-in fade-in slide-in-from-right-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/50 pb-5">
                <div>
                  <h3 className="text-xl font-black text-white">{selectedMatch.homeTeam} vs {selectedMatch.awayTeam}</h3>
                  <p className="text-xs text-slate-400 mt-1">Gestão de Resultados e Odds para o mercado "Resultado Correto"</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddingScore(true)}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Placar</span>
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Total Apostado</span>
                  <span className="text-base font-black text-white">0.00 MT</span>
                </div>
                <div className="p-3 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Possível Payout</span>
                  <span className="text-base font-black text-white text-rose-400">0.00 MT</span>
                </div>
                <div className="p-3 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Risco Atual</span>
                  <span className="text-base font-black text-emerald-400">BAIXO</span>
                </div>
                <div className="p-3 bg-slate-900/60 border border-slate-700/50 rounded-2xl">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Exposição Máx.</span>
                  <span className="text-base font-black text-white">50,000 MT</span>
                </div>
              </div>

              {/* Selections Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Placares Disponíveis</h4>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {selectedMatch.markets.find(m => m.type === 'CORRECT_SCORE')?.id}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedMatch.markets.find(m => m.type === 'CORRECT_SCORE')?.selections.map(s => {
                    const isEditing = editingSelection?.selection.id === s.id;
                    
                    return (
                      <div 
                        key={s.id} 
                        className={`p-3.5 rounded-2xl border transition-all group ${
                          isEditing ? 'bg-slate-900 border-amber-500/50 shadow-xl' : 'bg-slate-900/40 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-black text-white">{s.label}</span>
                          {!isEditing && (
                            <button 
                              onClick={() => setEditingSelection({ marketId: selectedMatch.markets.find(m => m.type === 'CORRECT_SCORE')!.id, selection: { ...s } })}
                              className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] text-slate-500 font-bold block mb-1">ODD ATUAL</label>
                              <input 
                                type="number"
                                step="0.01"
                                value={editingSelection.selection.odds}
                                onChange={(e) => setEditingSelection({
                                  ...editingSelection,
                                  selection: { ...editingSelection.selection, odds: parseFloat(e.target.value) }
                                })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateOdds(selectedMatch.id, editingSelection.marketId, s.id, editingSelection.selection.odds)}
                                disabled={loading}
                                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black rounded-lg transition-all disabled:opacity-50"
                              >
                                {loading ? <RefreshCw className="w-3 h-3 animate-spin mx-auto" /> : 'SALVAR'}
                              </button>
                              <button
                                onClick={() => setEditingSelection(null)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-slate-700"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-black text-cyan-400">{s.odds.toFixed(2)}</div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 block">Exposição</span>
                              <span className="text-xs font-bold text-slate-300">0.00 MT</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-800/20 border border-dashed border-slate-700 rounded-3xl p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-600 mb-4">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-400">Selecione um Jogo</h3>
              <p className="text-sm text-slate-500 max-w-xs mt-2">Escolha uma partida na lista ao lado para gerir o mercado de Resultado Correto.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Score Modal */}
      {isAddingScore && selectedMatch && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-white overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Novo Resultado Possível
              </h3>
              <button onClick={() => setIsAddingScore(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddScore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Placar (ex: 4-0)</label>
                <input
                  type="text"
                  required
                  placeholder="0-0"
                  value={newScore.outcome}
                  onChange={(e) => setNewScore({ ...newScore, outcome: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Rótulo / Label (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Empate sem golos"
                  value={newScore.label}
                  onChange={(e) => setNewScore({ ...newScore, label: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Odd (Cotação)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="5.50"
                  value={newScore.odds}
                  onChange={(e) => setNewScore({ ...newScore, odds: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'PROCESSANDO...' : 'ADICIONAR RESULTADO'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingScore(false)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors"
                >
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
