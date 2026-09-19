import React, { useState, useEffect } from 'react';
import { Match, Competition, CompetitionCategory } from '../types.ts';
import { api } from '../api.ts';
import { useBetSlip } from '../context/BetSlipContext.tsx';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { TeamBadge } from './TeamBadge.tsx';
import { Trophy, Clock, RefreshCw, AlertCircle, Award, Shield, Radio, Lock, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { isMatchBettingOpen, isMatchStarted } from '../utils/matchUtils.ts';
import { subscribeToSettlement } from '../utils/settlementEvents.ts';
import { safeStorage } from '../utils/storage.ts';
import { DEFAULT_MOZ_COMPETITIONS } from '../constants/competitions.ts';

export { DEFAULT_MOZ_COMPETITIONS };

export const MatchList: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const cached = safeStorage.getSessionItem('zonabet_matches_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [competitions, setCompetitions] = useState<Competition[]>(() => {
    try {
      const cached = safeStorage.getSessionItem('zonabet_comp_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_MOZ_COMPETITIONS;
  });
  const [selectedTier, setSelectedTier] = useState<'ALL' | CompetitionCategory>('ALL');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [loading, setLoading] = useState(() => {
    try {
      return !safeStorage.getSessionItem('zonabet_matches_cache');
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [pulsingMatchId, setPulsingMatchId] = useState<string | null>(null);
  const [expandedCorrectScore, setExpandedCorrectScore] = useState<Record<string, boolean>>({});

  const { items: slipItems, toggleSelection, updateSelectionOdds } = useBetSlip();
  const { onMatchChange } = useRealtime();

  const fetchMatches = async (silent = false, retryCount = 0) => {
    if (!silent && matches.length === 0) setLoading(true);
    setError(null);
    try {
      const params: { competitionId?: string; category?: string } = {};
      if (selectedCompetition !== 'all') {
        params.competitionId = selectedCompetition;
      } else if (selectedTier !== 'ALL') {
        params.category = selectedTier;
      }

      const [matchRes, compRes] = await Promise.all([
        api.getMatches(Object.keys(params).length > 0 ? params : undefined),
        api.getCompetitions(),
      ]);
      const fetchedMatches = matchRes?.matches || [];
      const fetchedComps = compRes?.competitions || [];

      setMatches(fetchedMatches);
      setCompetitions(fetchedComps);

      try {
        if (fetchedMatches.length > 0) {
          safeStorage.setSessionItem('zonabet_matches_cache', JSON.stringify(fetchedMatches));
        }
        if (fetchedComps.length > 0) {
          safeStorage.setSessionItem('zonabet_comp_cache', JSON.stringify(fetchedComps));
        }
      } catch {}
    } catch (err: any) {
      console.warn('[MatchList] Falha ao carregar jogos:', err);
      // Auto-retry uma vez se a lista estiver vazia (cold-start da Vercel)
      if (retryCount === 0) {
        setTimeout(() => {
          fetchMatches(true, retryCount + 1);
        }, 1200);
        return;
      }
      if (!silent) setError(err.message || 'Erro ao carregar os jogos');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [selectedCompetition, selectedTier]);

  // Subscrição a alterações de jogos
  useEffect(() => {
    const unsubscribe = onMatchChange((updatedMatch, eventType) => {
      // Efeito visual de destaque na partida atualizada
      setPulsingMatchId(updatedMatch.id);
      setTimeout(() => {
        setPulsingMatchId((curr) => (curr === updatedMatch.id ? null : curr));
      }, 3000);

      // Atualizar odds de seleções que estejam abertas no boletim de apostas
      if (updatedMatch.markets) {
        for (const market of updatedMatch.markets) {
          if (market.selections) {
            for (const sel of market.selections) {
              updateSelectionOdds(updatedMatch.id, sel.id, sel.odds);
            }
          }
        }
      }

      // Atualizar a lista local de jogos sem recarregar a página
      setMatches((prevMatches) => {
        if (eventType === 'DELETE') {
          return prevMatches.filter((m) => m.id !== updatedMatch.id);
        }
        const index = prevMatches.findIndex((m) => m.id === updatedMatch.id);
        if (index >= 0) {
          const next = [...prevMatches];
          next[index] = updatedMatch;
          return next;
        } else {
          // Novo jogo inserido
          return [updatedMatch, ...prevMatches];
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [onMatchChange, updateSelectionOdds]);

  // Subscrição a eventos de liquidação de resultados inseridos pelo administrador
  useEffect(() => {
    const unsubscribe = subscribeToSettlement((payload) => {
      console.log('[MatchList] Notificação de liquidação de partida recebida:', payload);
      setPulsingMatchId(payload.matchId);
      setTimeout(() => {
        setPulsingMatchId((curr) => (curr === payload.matchId ? null : curr));
      }, 4000);

      // Atualiza imediatamente o jogo para FINISHED com os respetivos golos
      setMatches((prevMatches) =>
        prevMatches.map((m) => {
          if (m.id === payload.matchId) {
            return {
              ...m,
              status: 'FINISHED',
              homeScore: payload.homeScore,
              awayScore: payload.awayScore,
            };
          }
          return m;
        })
      );
      // Recarrega em plano de fundo para sincronizar dados adicionais
      fetchMatches(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleTierChange = (tier: 'ALL' | CompetitionCategory) => {
    setSelectedTier(tier);
    setSelectedCompetition('all');
  };

  const isSelectionInSlip = (selectionId: string) => {
    return slipItems.some((i) => i.selectionId === selectionId);
  };

  // Filter competitions matching the selected tier
  const visibleCompetitions = competitions.filter((comp) => {
    if (selectedTier === 'ALL') return true;
    return comp.category === selectedTier;
  });

  return (
    <div className="space-y-3">
      {/* 1. Header: Futebol Moçambicano */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0">
          ⚽
        </div>
        <h1 className="text-xl font-extrabold text-white flex-1 flex items-center gap-2">
          Futebol Moçambicano <span>🇲🇿</span>
        </h1>
        <button
          onClick={() => fetchMatches(false)}
          disabled={loading}
          className="p-1 rounded-lg text-slate-500 hover:text-white"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

      {/* 2. Category Navigation Tabs: Todos | Moçambola | Provinciais | Distritais */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full pb-1">
        <button
          onClick={() => handleTierChange('ALL')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold transition-all ${
            selectedTier === 'ALL'
              ? 'bg-emerald-400 text-slate-950'
              : 'bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => handleTierChange('MOCAMBOLA')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold transition-all ${
            selectedTier === 'MOCAMBOLA'
              ? 'bg-emerald-400 text-slate-950'
              : 'bg-[#101827] border border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Moçambola
        </button>
        <button
          onClick={() => handleTierChange('PROVINCIAL')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold transition-all ${
            selectedTier === 'PROVINCIAL'
              ? 'bg-emerald-400 text-slate-950'
              : 'bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Provinciais
        </button>
        <button
          onClick={() => handleTierChange('DISTRITAL')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-bold transition-all ${
            selectedTier === 'DISTRITAL'
              ? 'bg-emerald-400 text-slate-950'
              : 'bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Distritais
        </button>
      </div>

      {/* Specific Competition Pills Filter (e.g. Maputo, Beira, Nampula) */}
      {selectedTier !== 'ALL' && visibleCompetitions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none w-full py-1">
          <button
            onClick={() => setSelectedCompetition('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedCompetition === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-transparent border border-slate-800 text-slate-400 hover:bg-slate-800/80'
            }`}
          >
            Todas ({selectedTier === 'MOCAMBOLA' ? 'Moçambola' : selectedTier === 'PROVINCIAL' ? 'Provinciais' : 'Distritais'})
          </button>
          {visibleCompetitions.map((comp) => (
            <button
              key={comp.id}
              onClick={() => setSelectedCompetition(comp.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCompetition === comp.id
                  ? 'bg-slate-700 text-white'
                  : 'bg-transparent border border-slate-800 text-slate-400 hover:bg-slate-800/80'
              }`}
            >
              {comp.name.replace('Campeonato Provincial de ', '').replace('Campeonato Distrital d', 'Distrito d')}
            </button>
          ))}
        </div>
      )}

      {/* 3. Section Title: Jogos de Hoje */}
      <div className="flex items-center justify-between pt-1 px-0.5">
        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Jogos de Hoje</span>
        </h2>
        <span className="text-xs text-slate-400 font-medium">
          {matches.length} {matches.length === 1 ? 'partida' : 'partidas'}
        </span>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchMatches(false)}
            className="px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold transition-all text-xs flex-shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-slate-400">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto text-emerald-500 mb-2" />
          <p className="text-xs font-medium">A carregar jogos e odds...</p>
        </div>
      )}

      {!loading && matches.length === 0 && (
        <div className="py-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">Não existem jogos cadastrados.</p>
          <p className="text-xs text-slate-500 mt-1">
            Novos jogos serão agendados pelo administrador manualmente.
          </p>
        </div>
      )}

      {/* Match Cards List */}
      <div className="space-y-2.5">
        {matches.map((match) => {
          const market = match.markets.find((m) => m.type === '1X2');
          const homeSelection = market?.selections.find((s) => s.outcome === '1');
          const drawSelection = market?.selections.find((s) => s.outcome === 'X');
          const awaySelection = market?.selections.find((s) => s.outcome === '2');

          const isBettingOpen = isMatchBettingOpen(match);
          const started = isMatchStarted(match);
          const isFinished = match.status === 'FINISHED';
          const isJustUpdated = pulsingMatchId === match.id;

                    return (
            <div
              key={match.id}
              className={`w-full max-w-full overflow-hidden bg-slate-900 border rounded-2xl p-3 sm:p-3.5 transition-all duration-500 shadow-sm ${
                isJustUpdated
                  ? 'border-emerald-400/80 shadow-md shadow-emerald-500/20 bg-emerald-950/20 ring-1 ring-emerald-500/40'
                  : !isBettingOpen
                  ? 'border-slate-800/70 bg-slate-900/70'
                  : 'border-slate-800 hover:border-slate-700/80'
              }`}
            >
              {/* Card Header: League Name & Kickoff Date/Time & Status */}
              <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-800/80 text-xs flex-wrap w-full">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                  <span className="font-black text-[11px] text-emerald-400 uppercase tracking-wide truncate">
                    {match.competitionName}
                  </span>
                  {isFinished ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 shrink-0">
                      🏁 Encerrado ({match.homeScore ?? 0} - {match.awayScore ?? 0})
                    </span>
                  ) : started || !isBettingOpen ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shrink-0">
                      <Lock className="w-3 h-3 text-rose-400" /> Partida Iniciada • Apostas Bloqueadas
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      Apostas Abertas
                    </span>
                  )}
                  {isJustUpdated && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse shrink-0">
                      Atualizado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-[11px] font-medium shrink-0 ml-auto">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{match.kickoffDate}, {match.kickoffTime}</span>
                </div>
              </div>

              {/* Match Teams + 1X2 Odds Layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center w-full">
                
                {/* Teams Info with Badges and Names */}
                <div className="md:col-span-6 space-y-2 min-w-0 w-full">
                  {/* Home Team */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <TeamBadge teamName={match.homeTeam} className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
                      <span className="font-extrabold text-sm text-white tracking-tight truncate" title={match.homeTeam}>
                        {match.homeTeam}
                      </span>
                    </div>
                    {match.homeScore !== null && match.homeScore !== undefined && (
                      <span className="font-black text-base text-emerald-400 shrink-0 ml-1">{match.homeScore}</span>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <TeamBadge teamName={match.awayTeam} className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
                      <span className="font-extrabold text-sm text-slate-200 tracking-tight truncate" title={match.awayTeam}>
                        {match.awayTeam}
                      </span>
                    </div>
                    {match.awayScore !== null && match.awayScore !== undefined && (
                      <span className="font-black text-base text-emerald-400 shrink-0 ml-1">{match.awayScore}</span>
                    )}
                  </div>
                </div>

                {/* 1X2 Odds Buttons */}
                <div className="md:col-span-6 grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                  {/* 1: Home Win */}
                  {homeSelection && (
                    <button
                      disabled={!isBettingOpen}
                      onClick={() =>
                        toggleSelection({
                          matchId: match.id,
                          matchTitle: `${match.homeTeam} vs ${match.awayTeam}`,
                          competitionName: match.competitionName,
                          kickoff: `${match.kickoffDate} ${match.kickoffTime}`,
                          marketId: market!.id,
                          marketName: market!.name,
                          selectionId: homeSelection.id,
                          outcome: '1',
                          selectionLabel: match.homeTeam,
                          odds: homeSelection.odds,
                        })
                      }
                      className={`group relative py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center transition-all touch-manipulation min-h-[46px] ${
                        isSelectionInSlip(homeSelection.id)
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                          : isBettingOpen
                          ? 'bg-slate-800/80 hover:bg-slate-750 border-slate-700/80 text-white active:scale-95'
                          : 'bg-slate-900/60 border-slate-800/60 opacity-40 cursor-not-allowed text-slate-500'
                      }`}
                    >
                      <span className={`text-[10px] font-bold mb-0.5 ${
                        isSelectionInSlip(homeSelection.id) ? 'text-slate-950' : 'text-slate-400'
                      }`}>
                        1
                      </span>
                      <span className="text-xs sm:text-sm font-black tracking-tight leading-none">
                        {homeSelection.odds && homeSelection.odds > 0 ? homeSelection.odds.toFixed(2) : '-'}
                      </span>
                      {!isBettingOpen && (
                        <span className="text-[8px] font-bold text-slate-500 flex items-center gap-0.5 mt-0.5">
                          <Lock className="w-2.5 h-2.5" /> Bloqueado
                        </span>
                      )}
                      {isBettingOpen && (!homeSelection.odds || homeSelection.odds <= 0) && (
                        <span className="text-[8px] font-bold text-slate-500 mt-0.5">
                          Sem odd
                        </span>
                      )}
                    </button>
                  )}

                  {/* X: Draw */}
                  {drawSelection && (
                    <button
                      disabled={!isBettingOpen || !drawSelection.odds || drawSelection.odds <= 0}
                      onClick={() =>
                        toggleSelection({
                          matchId: match.id,
                          matchTitle: `${match.homeTeam} vs ${match.awayTeam}`,
                          competitionName: match.competitionName,
                          kickoff: `${match.kickoffDate} ${match.kickoffTime}`,
                          marketId: market!.id,
                          marketName: market!.name,
                          selectionId: drawSelection.id,
                          outcome: 'X',
                          selectionLabel: 'Empate',
                          odds: drawSelection.odds,
                        })
                      }
                      className={`group relative py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center transition-all touch-manipulation min-h-[46px] ${
                        isSelectionInSlip(drawSelection.id)
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                          : isBettingOpen && drawSelection.odds && drawSelection.odds > 0
                          ? 'bg-slate-800/80 hover:bg-slate-750 border-slate-700/80 text-white active:scale-95'
                          : 'bg-slate-900/60 border-slate-800/60 opacity-40 cursor-not-allowed text-slate-500'
                      }`}
                    >
                      <span className={`text-[10px] font-bold mb-0.5 ${
                        isSelectionInSlip(drawSelection.id) ? 'text-slate-950' : 'text-slate-400'
                      }`}>
                        X
                      </span>
                      <span className="text-xs sm:text-sm font-black tracking-tight leading-none">
                        {drawSelection.odds && drawSelection.odds > 0 ? drawSelection.odds.toFixed(2) : '-'}
                      </span>
                      {!isBettingOpen && (
                        <span className="text-[8px] font-bold text-slate-500 flex items-center gap-0.5 mt-0.5">
                          <Lock className="w-2.5 h-2.5" /> Bloqueado
                        </span>
                      )}
                      {isBettingOpen && (!drawSelection.odds || drawSelection.odds <= 0) && (
                        <span className="text-[8px] font-bold text-slate-500 mt-0.5">
                          Sem odd
                        </span>
                      )}
                    </button>
                  )}

                  {/* 2: Away Win */}
                  {awaySelection && (
                    <button
                      disabled={!isBettingOpen || !awaySelection.odds || awaySelection.odds <= 0}
                      onClick={() =>
                        toggleSelection({
                          matchId: match.id,
                          matchTitle: `${match.homeTeam} vs ${match.awayTeam}`,
                          competitionName: match.competitionName,
                          kickoff: `${match.kickoffDate} ${match.kickoffTime}`,
                          marketId: market!.id,
                          marketName: market!.name,
                          selectionId: awaySelection.id,
                          outcome: '2',
                          selectionLabel: match.awayTeam,
                          odds: awaySelection.odds,
                        })
                      }
                      className={`group relative py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center transition-all touch-manipulation min-h-[46px] ${
                        isSelectionInSlip(awaySelection.id)
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                          : isBettingOpen && awaySelection.odds && awaySelection.odds > 0
                          ? 'bg-slate-800/80 hover:bg-slate-750 border-slate-700/80 text-white active:scale-95'
                          : 'bg-slate-900/60 border-slate-800/60 opacity-40 cursor-not-allowed text-slate-500'
                      }`}
                    >
                      <span className={`text-[10px] font-bold mb-0.5 ${
                        isSelectionInSlip(awaySelection.id) ? 'text-slate-950' : 'text-slate-400'
                      }`}>
                        2
                      </span>
                      <span className="text-xs sm:text-sm font-black tracking-tight leading-none">
                        {awaySelection.odds && awaySelection.odds > 0 ? awaySelection.odds.toFixed(2) : '-'}
                      </span>
                      {!isBettingOpen && (
                        <span className="text-[8px] font-bold text-slate-500 flex items-center gap-0.5 mt-0.5">
                          <Lock className="w-2.5 h-2.5" /> Bloqueado
                        </span>
                      )}
                      {isBettingOpen && (!awaySelection.odds || awaySelection.odds <= 0) && (
                        <span className="text-[8px] font-bold text-slate-500 mt-0.5">
                          Sem odd
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Correct Score Market (Resultado Correto / Placar Exato) */}
              {(() => {
                const correctScoreMarket = match.markets.find((m) => m.type === 'CORRECT_SCORE');
                if (!correctScoreMarket || !correctScoreMarket.selections || correctScoreMarket.selections.length === 0) {
                  return null;
                }
                const isExpanded = !!expandedCorrectScore[match.id];

                return (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCorrectScore((prev) => ({
                          ...prev,
                          [match.id]: !prev[match.id],
                        }))
                      }
                      className="flex items-center justify-between w-full text-xs font-bold text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <Target className="w-3.5 h-3.5" />
                        <span>Resultado Correto ({correctScoreMarket.selections.length} opções)</span>
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span>{isExpanded ? 'Ocultar cotações' : 'Ver Placares Exatos'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                          <span>Selecione o resultado exato da partida:</span>
                          <span className="font-mono text-cyan-400">Odd de Pagamento</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                          {correctScoreMarket.selections.map((sel) => {
                            const inSlip = isSelectionInSlip(sel.id);
                            return (
                              <button
                                key={sel.id}
                                disabled={!isBettingOpen || !sel.odds || sel.odds <= 0}
                                onClick={() =>
                                  toggleSelection({
                                    matchId: match.id,
                                    matchTitle: `${match.homeTeam} vs ${match.awayTeam}`,
                                    competitionName: match.competitionName,
                                    kickoff: `${match.kickoffDate} ${match.kickoffTime}`,
                                    marketId: correctScoreMarket.id,
                                    marketName: 'Resultado Correto',
                                    selectionId: sel.id,
                                    outcome: sel.outcome,
                                    selectionLabel: `Placar ${sel.label}`,
                                    odds: sel.odds,
                                  })
                                }
                                className={`py-2 px-2.5 rounded-xl border flex items-center justify-between transition-all ${
                                  inSlip
                                    ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-black shadow-md'
                                    : isBettingOpen && sel.odds && sel.odds > 0
                                    ? 'bg-slate-800/80 hover:bg-slate-750 border-slate-700/70 text-white active:scale-95'
                                    : 'bg-slate-900/60 border-slate-800/60 opacity-40 cursor-not-allowed text-slate-500'
                                }`}
                              >
                                <span className={`text-xs font-extrabold ${inSlip ? 'text-slate-950' : 'text-slate-200'}`}>
                                  {sel.label}
                                </span>
                                <span className={`text-xs font-mono font-black ${inSlip ? 'text-slate-950' : sel.odds && sel.odds > 0 ? 'text-cyan-400' : 'text-slate-500 text-[10px]'}`}>
                                  {sel.odds && sel.odds > 0 ? `@${sel.odds.toFixed(2)}` : 'Sem odd'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
};
