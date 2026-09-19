import React, { useState } from 'react';
import { RiskOverview, MarketRisk } from '../../types.ts';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Sliders,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AdminRiscoViewProps {
  riskData: RiskOverview | null;
  loading: boolean;
  onRefresh: () => void;
  onToggleMarketStatus: (matchId: string, marketId: string, currentStatus: string) => Promise<void>;
  onUpdateRiskSettings: (settings: {
    maxExposurePerMarket?: number;
    maxStake?: number;
    maxPotentialWin?: number;
    maxDailyStakePerUser?: number;
    autoSuspendHighRisk?: boolean;
    riskHighThresholdPct?: number;
    riskMediumThresholdPct?: number;
  }) => Promise<void>;
}

export const AdminRiscoView: React.FC<AdminRiscoViewProps> = ({
  riskData,
  loading,
  onRefresh,
  onToggleMarketStatus,
  onUpdateRiskSettings,
}) => {
  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Form states for settings
  const [exposureLimitInput, setExposureLimitInput] = useState(
    riskData?.settings?.maxExposurePerMarket?.toString() || '200000'
  );
  const [autoSuspendInput, setAutoSuspendInput] = useState(
    riskData?.settings?.autoSuspendHighRisk ?? true
  );
  const [highThresholdInput, setHighThresholdInput] = useState(
    riskData?.settings?.riskHighThresholdPct?.toString() || '80'
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveRiskConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onUpdateRiskSettings({
        maxExposurePerMarket: Number(exposureLimitInput) || 200000,
        autoSuspendHighRisk: autoSuspendInput,
        riskHighThresholdPct: Number(highThresholdInput) || 80,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setShowConfigModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredMarkets = (riskData?.markets || []).filter((m) => {
    if (filterLevel === 'ALL') return true;
    return m.riskLevel === filterLevel;
  });

  return (
    <div className="space-y-5">
      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h2 className="text-base font-black text-white">Central de Gestão de Risco & Exposição</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoramento em tempo real do passivo financeiro da casa, concentração de apostas e suspensão automática.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(!showConfigModal)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-650 text-slate-200 border border-slate-600 flex items-center gap-1.5 transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Limites de Risco</span>
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Config Drawer / Modal */}
      {showConfigModal && (
        <div className="p-5 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Configuração Global de Parâmetros de Risco</span>
            </h3>
            <button
              onClick={() => setShowConfigModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Fechar
            </button>
          </div>

          <form onSubmit={handleSaveRiskConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Limite Máximo de Exposição por Mercado (MZN)
              </label>
              <input
                type="number"
                value={exposureLimitInput}
                onChange={(e) => setExposureLimitInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                placeholder="200000"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                A banca bloqueará novas apostas quando o passivo líquido atingir este valor.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Gatilho de Risco Alto (% do Limite)
              </label>
              <input
                type="number"
                value={highThresholdInput}
                onChange={(e) => setHighThresholdInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                placeholder="80"
                min="10"
                max="100"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Percentual que ativa o alerta vermelho (🔴) para intervenção do gestor.
              </p>
            </div>

            <div className="flex flex-col justify-between">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Suspensão Automática por Risco
              </label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="checkbox"
                  id="autoSuspendRisk"
                  checked={autoSuspendInput}
                  onChange={(e) => setAutoSuspendInput(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-800 border-slate-700"
                />
                <label htmlFor="autoSuspendRisk" className="text-xs text-slate-200 cursor-pointer">
                  Suspender mercado imediatamente se atingir 100% da exposição
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow"
                >
                  {savingSettings ? 'A guardar...' : 'Guardar Parâmetros'}
                </button>
              </div>
            </div>
          </form>
          {saveSuccess && (
            <p className="text-xs text-emerald-400 font-semibold text-center">
              ✓ Parâmetros de risco atualizados com sucesso!
            </p>
          )}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Turnover */}
        <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Apostado</span>
          <div className="font-mono font-black text-white text-base sm:text-lg">
            {(riskData?.totalTurnover || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>{riskData?.totalActiveBets || 0} bilhetes ativos</span>
          </span>
        </div>

        {/* Possible Payout */}
        <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pagamento Potencial</span>
          <div className="font-mono font-black text-amber-400 text-base sm:text-lg">
            {(riskData?.totalPossiblePayout || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Se todas seleções vencerem</span>
        </div>

        {/* Net House Exposure */}
        <div className="p-3.5 bg-slate-800/80 border border-rose-500/40 rounded-2xl bg-rose-500/5">
          <span className="text-[10px] uppercase font-bold text-rose-300 block mb-1">Exposição Líquida</span>
          <div className="font-mono font-black text-rose-400 text-base sm:text-lg">
            {(riskData?.totalNetExposure || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
          </div>
          <span className="text-[10px] text-rose-300/80 mt-1 block">Risco total calculado da casa</span>
        </div>

        {/* High Risk Count */}
        <div className="p-3.5 bg-slate-800/80 border border-rose-900/60 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Risco Alto (🔴)</span>
          <div className="font-mono font-black text-rose-500 text-base sm:text-lg">
            {riskData?.highRiskMarketsCount || 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">≥ 80% do limite</span>
        </div>

        {/* Medium Risk Count */}
        <div className="p-3.5 bg-slate-800/80 border border-amber-900/60 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Risco Médio (🟡)</span>
          <div className="font-mono font-black text-amber-400 text-base sm:text-lg">
            {riskData?.mediumRiskMarketsCount || 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">50% a 79%</span>
        </div>

        {/* Exposure Limit */}
        <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Limite p/ Mercado</span>
          <div className="font-mono font-black text-slate-200 text-base sm:text-lg">
            {(riskData?.settings?.maxExposurePerMarket || 200000).toLocaleString('pt-MZ')} MT
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">
            {riskData?.settings?.autoSuspendHighRisk ? 'Auto-suspensão: ON' : 'Auto-suspensão: OFF'}
          </span>
        </div>
      </div>

      {/* Active Alerts Banner */}
      {riskData?.alerts && riskData.alerts.length > 0 && (
        <div className="space-y-2">
          {riskData.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                alert.level === 'HIGH'
                  ? 'bg-rose-950/40 border-rose-700/80 text-rose-200'
                  : 'bg-amber-950/40 border-amber-700/80 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <div>
                  <span className="font-bold">{alert.matchTitle}:</span> {alert.message}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                {new Date(alert.createdAt).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-xs font-semibold mr-1">Filtrar por nível:</span>
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((level) => {
            const labels = {
              ALL: `Todos (${riskData?.markets?.length || 0})`,
              HIGH: `🔴 Alto (${riskData?.highRiskMarketsCount || 0})`,
              MEDIUM: `🟡 Médio (${riskData?.mediumRiskMarketsCount || 0})`,
              LOW: `🟢 Baixo (${(riskData?.markets?.length || 0) - (riskData?.highRiskMarketsCount || 0) - (riskData?.mediumRiskMarketsCount || 0)})`,
            };
            return (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterLevel === level
                    ? 'bg-slate-200 text-slate-900 shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                }`}
              >
                {labels[level]}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-slate-400">
          Mostrando <strong className="text-white">{filteredMarkets.length}</strong> mercados monitorizados
        </span>
      </div>

      {/* Markets List */}
      <div className="space-y-3">
        {filteredMarkets.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/40 border border-slate-800 rounded-2xl text-slate-400 text-xs">
            Nenhum mercado com o filtro de risco selecionado.
          </div>
        ) : (
          filteredMarkets.map((market) => {
            const isExpanded = expandedMarketId === market.marketId;
            const isHighRisk = market.riskLevel === 'HIGH';
            const isMediumRisk = market.riskLevel === 'MEDIUM';

            return (
              <div
                key={market.marketId}
                className={`p-4 rounded-2xl border transition-all ${
                  isHighRisk
                    ? 'bg-rose-950/20 border-rose-700/60'
                    : isMediumRisk
                    ? 'bg-amber-950/20 border-amber-700/60'
                    : 'bg-slate-800/80 border-slate-700/80'
                }`}
              >
                {/* Header Summary */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Risk Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isHighRisk
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isMediumRisk
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isHighRisk ? '🔴 Risco Alto' : isMediumRisk ? '🟡 Risco Médio' : '🟢 Risco Baixo'}
                      </span>

                      {/* Market Type Badge */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
                        {market.marketType === 'CORRECT_SCORE' ? 'Resultado Correto' : market.marketType}
                      </span>

                      {/* Status */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          market.status === 'OPEN'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : market.status === 'SUSPENDED'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {market.status === 'OPEN'
                          ? 'Aberto'
                          : market.status === 'SUSPENDED'
                          ? 'Suspenso'
                          : 'Encerrado'}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>{market.matchTitle}</span>
                      <span className="text-xs font-normal text-slate-400">({market.competitionName})</span>
                    </h3>
                    <p className="text-xs text-slate-300 font-semibold">
                      Mercado: <span className="text-white">{market.marketName}</span>
                    </p>
                  </div>

                  {/* Exposure Bar & Key Numbers */}
                  <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Exposição Líquida</div>
                      <div className="font-mono font-black text-rose-400 text-sm sm:text-base">
                        {market.netExposure.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {market.exposurePercentage}% de {market.exposureLimit.toLocaleString()} MT
                      </div>
                    </div>

                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Apostado</div>
                      <div className="font-mono font-bold text-white text-sm">
                        {market.totalStake.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </div>
                      <div className="text-[10px] text-slate-400">{market.totalBets} apostas</div>
                    </div>

                    {/* Quick action: Suspend/Reopen */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleMarketStatus(market.matchId, market.marketId, market.status)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                          market.status === 'OPEN'
                            ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700'
                            : 'bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200 border border-emerald-600'
                        }`}
                        title={market.status === 'OPEN' ? 'Suspender Mercado' : 'Reabrir Mercado'}
                      >
                        {market.status === 'OPEN' ? (
                          <>
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>Suspender</span>
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Reabrir</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setExpandedMarketId(isExpanded ? null : market.marketId)}
                        className="p-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all"
                        title="Ver detalhes dos resultados"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isHighRisk ? 'bg-rose-500' : isMediumRisk ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, market.exposurePercentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                    <span>
                      Concentração Crítica: <strong className="text-white">{market.topRiskOutcome}</strong>
                    </span>
                    <span>{market.exposurePercentage}% do teto seguro</span>
                  </div>
                </div>

                {/* Expanded Outcome Breakdown */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-2">
                    <div className="flex justify-between items-center text-xs text-slate-300 font-bold mb-2">
                      <span>Detalhamento por Seleção & Concentração de Apostas:</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        Risco Líquido = Pagamento Potencial - Volume Apostado
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {market.outcomes.map((out) => {
                        const isTop = market.topRiskOutcome.includes(out.outcome);
                        return (
                          <div
                            key={out.outcome}
                            className={`p-2.5 rounded-xl border text-xs ${
                              isTop && out.totalStake > 0
                                ? 'bg-rose-950/40 border-rose-500/50 text-rose-100'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-white flex items-center gap-1">
                                {out.label}
                                {isTop && out.totalStake > 0 && (
                                  <span className="text-[9px] px-1 bg-rose-600 text-white rounded">
                                    Concentração
                                  </span>
                                )}
                              </span>
                              <span className="font-mono text-emerald-400">@{out.odds.toFixed(2)}</span>
                            </div>

                            <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                              <div className="flex justify-between">
                                <span>Apostas:</span>
                                <span className="font-mono text-white font-semibold">{out.betsCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Volume apostado:</span>
                                <span className="font-mono text-white">
                                  {out.totalStake.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Pagamento potencial:</span>
                                <span className="font-mono text-amber-300">
                                  {out.potentialPayout.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-slate-800 pt-1 font-semibold">
                                <span>Exposição líquida:</span>
                                <span className="font-mono text-rose-400">
                                  {out.netExposure.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
