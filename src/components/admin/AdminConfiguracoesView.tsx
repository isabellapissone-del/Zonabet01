import React, { useState, useEffect } from 'react';
import { AuditLog, SystemSettings } from '../../types.ts';
import {
  Settings,
  Shield,
  Smartphone,
  Database,
  FileText,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Lock,
  Percent,
  DollarSign,
  MessageCircle,
  Eye,
  Sliders,
  Save,
  Key,
  ExternalLink,
  Layers,
  ShieldCheck,
} from 'lucide-react';

interface AdminConfiguracoesViewProps {
  settings: SystemSettings | null;
  totalFeeCollected?: number;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  loadingSettings?: boolean;
  auditLogs: AuditLog[];
  supabaseStatus: any;
  supabaseSchemaSql: string;
  syncingSupabase: boolean;
  pullingSupabase: boolean;
  copiedSql: boolean;
  handleSyncToSupabase: () => Promise<void>;
  handlePullFromSupabase: () => Promise<void>;
  handleCopySql: () => Promise<void>;
  onResetAllBalances: () => Promise<void>;
  onRefreshSupabaseStatus?: () => Promise<void>;
}

export const AdminConfiguracoesView: React.FC<AdminConfiguracoesViewProps> = ({
  settings,
  totalFeeCollected = 0,
  onUpdateSettings,
  loadingSettings = false,
  auditLogs,
  supabaseStatus,
  supabaseSchemaSql,
  syncingSupabase,
  pullingSupabase,
  copiedSql,
  handleSyncToSupabase,
  handlePullFromSupabase,
  handleCopySql,
  onResetAllBalances,
  onRefreshSupabaseStatus,
}) => {
  const [subTab, setSubTab] = useState<
    'taxa' | 'limites' | 'whatsapp' | 'contas' | 'auditoria' | 'supabase' | 'manutencao'
  >('taxa');

  // Form states initialized from settings prop
  const [feePct, setFeePct] = useState('5.0');
  const [feeActive, setFeeActive] = useState(true);
  const [minWithdrawal, setMinWithdrawal] = useState('50');
  const [maxWithdrawal, setMaxWithdrawal] = useState('50000');

  // Simulator
  const [simulationAmount, setSimulationAmount] = useState('1000');

  // Betting limits
  const [minStake, setMinStake] = useState('20');
  const [maxStake, setMaxStake] = useState('50000');
  const [maxPotentialWin, setMaxPotentialWin] = useState('500000');
  const [maxDailyStake, setMaxDailyStake] = useState('100000');

  // WhatsApp
  const [waEnabled, setWaEnabled] = useState(true);
  const [waPhone, setWaPhone] = useState('+258872344381');
  const [waMessage, setWaMessage] = useState('Olá ZONABET! Preciso de ajuda com a minha conta.');
  const [waButtonText, setWaButtonText] = useState('Apoio WhatsApp');
  const [waPosition, setWaPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');

  // Saving state
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when settings prop loads or updates
  useEffect(() => {
    if (settings) {
      setFeePct(settings.withdrawalFeePercentage.toString());
      setFeeActive(settings.withdrawalFeeActive);
      setMinWithdrawal(settings.minWithdrawal.toString());
      setMaxWithdrawal(settings.maxWithdrawal.toString());

      setMinStake(settings.minStake.toString());
      setMaxStake(settings.maxStake.toString());
      setMaxPotentialWin(settings.maxPotentialWin.toString());
      setMaxDailyStake(settings.maxDailyStakePerUser.toString());

      if (settings.whatsapp) {
        setWaEnabled(settings.whatsapp.enabled);
        setWaPhone(settings.whatsapp.phone);
        setWaMessage(settings.whatsapp.message);
        setWaButtonText(settings.whatsapp.buttonText);
        setWaPosition(settings.whatsapp.position);
      }
    }
  }, [settings]);

  const handleSaveTaxa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await onUpdateSettings({
        withdrawalFeePercentage: Number(feePct) || 5.0,
        withdrawalFeeActive: feeActive,
        minWithdrawal: Number(minWithdrawal) || 50,
        maxWithdrawal: Number(maxWithdrawal) || 50000,
      });
      setSuccessMessage('Configurações de Taxa de Levantamento atualizadas com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao guardar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLimites = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await onUpdateSettings({
        minStake: Number(minStake) || 20,
        maxStake: Number(maxStake) || 50000,
        maxPotentialWin: Number(maxPotentialWin) || 500000,
        maxDailyStakePerUser: Number(maxDailyStake) || 100000,
      });
      setSuccessMessage('Limites de Apostas e Ganhos guardados com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao guardar limites');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await onUpdateSettings({
        whatsapp: {
          enabled: waEnabled,
          phone: waPhone,
          message: waMessage,
          buttonText: waButtonText,
          position: waPosition,
        },
      });
      setSuccessMessage('Configurações de Apoio WhatsApp atualizadas!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao guardar configurações de WhatsApp');
    } finally {
      setSaving(false);
    }
  };

  // Simulation calculations
  const simAmountNum = parseFloat(simulationAmount) || 0;
  const simFeePct = feeActive ? parseFloat(feePct) || 0 : 0;
  const simFeeAmount = Math.round((simAmountNum * (simFeePct / 100)) * 100) / 100;
  const simNetAmount = Math.max(0, simAmountNum - simFeeAmount);

  return (
    <div className="space-y-5">
      {/* Sub-navigation bar matching tree hierarchy */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-800/60 border border-slate-700/80 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-300 font-bold text-xs sm:text-sm">⚙️ CONFIGURAÇÕES</span>
          <span className="text-slate-500">/</span>
          <span className="text-xs text-slate-300 font-semibold">
            {subTab === 'taxa' && 'Taxa de Levantamento Dinâmica'}
            {subTab === 'limites' && 'Limites de Apostas & Ganhos'}
            {subTab === 'whatsapp' && 'Botão de Apoio WhatsApp'}
            {subTab === 'contas' && 'Canais de Pagamento & e-Mola'}
            {subTab === 'auditoria' && `Registo Central de Auditoria (${auditLogs.length})`}
            {subTab === 'supabase' && 'Supabase Cloud & Base de Dados'}
            {subTab === 'manutencao' && 'Manutenção & Limpeza do Sistema'}
          </span>
        </div>

        {/* Tree Sub-tabs buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setSubTab('taxa')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              subTab === 'taxa'
                ? 'bg-rose-500 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Taxa de Levantamento</span>
          </button>

          <button
            onClick={() => setSubTab('limites')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              subTab === 'limites'
                ? 'bg-slate-200 text-slate-950 shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Limites & Apostas</span>
          </button>

          <button
            onClick={() => setSubTab('whatsapp')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              subTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Apoio WhatsApp</span>
          </button>

          <button
            onClick={() => setSubTab('contas')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              subTab === 'contas'
                ? 'bg-slate-200 text-slate-950 shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Contas Oficiais</span>
          </button>

          <button
            onClick={() => setSubTab('auditoria')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              subTab === 'auditoria'
                ? 'bg-slate-200 text-slate-950 shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Auditoria ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setSubTab('supabase')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              subTab === 'supabase'
                ? 'bg-slate-200 text-slate-950 shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase Cloud</span>
          </button>

          <button
            onClick={() => setSubTab('manutencao')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              subTab === 'manutencao'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Manutenção</span>
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-rose-950/60 border border-rose-500 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ================= SUB-TAB 1: TAXA DE LEVANTAMENTO (EXIGÊNCIA PRINCIPAL) ================= */}
      {subTab === 'taxa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Edit Form */}
          <div className="lg:col-span-7 p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Configuração da Taxa de Levantamento</h3>
                  <p className="text-xs text-slate-400">
                    Definição dinâmica de taxa sobre saques solicitados pelos utilizadores.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveTaxa} className="space-y-4">
              {/* Fee Percentage */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Percentual da Taxa de Levantamento (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={feePct}
                    onChange={(e) => setFeePct(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-base font-black focus:outline-none focus:border-rose-500"
                    placeholder="5.0"
                    required
                  />
                  <span className="absolute right-3.5 top-3 text-slate-400 font-bold text-xs">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Padrão do sistema: <strong>5.0%</strong>. Este valor é aplicado e exibido transparentemente antes de qualquer confirmação de levantamento.
                </p>
              </div>

              {/* Toggle active */}
              <div className="p-3.5 bg-slate-900/80 border border-slate-700/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Estado da Cobrança da Taxa</span>
                  <span className="text-[11px] text-slate-400">
                    {feeActive
                      ? 'Taxa ATIVA: Os utilizadores serão tributados no percentual acima.'
                      : 'Taxa DESATIVADA: Levantamentos sem cobrança (taxa 0%).'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feeActive}
                    onChange={(e) => setFeeActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Levantamento Mínimo (MZN)
                  </label>
                  <input
                    type="number"
                    value={minWithdrawal}
                    onChange={(e) => setMinWithdrawal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                    placeholder="50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Levantamento Máximo por Pedido (MZN)
                  </label>
                  <input
                    type="number"
                    value={maxWithdrawal}
                    onChange={(e) => setMaxWithdrawal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                    placeholder="50000"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'A guardar alterações...' : 'Guardar Configuração da Taxa'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Side: Simulator & Total Arrecadado */}
          <div className="lg:col-span-5 space-y-4">
            {/* Total Arrecadado Widget */}
            <div className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 border border-rose-500/40 rounded-2xl">
              <span className="text-xs uppercase font-bold text-rose-300 block mb-1">
                Total Arrecadado com a Taxa
              </span>
              <div className="font-mono font-black text-2xl text-white">
                {totalFeeCollected.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Receita líquida acumulada retida pela plataforma a partir das solicitações de levantamento aprovadas.
              </p>
            </div>

            {/* Live Transparent Calculation Simulator */}
            <div className="p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Simulador de Visualização Transparente
                </h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Veja exatamente como os valores aparecerão para o apostador antes da confirmação do saque:
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Valor Solicitado de Teste (MZN)
                </label>
                <input
                  type="number"
                  value={simulationAmount}
                  onChange={(e) => setSimulationAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Exact breakdown box required by prompt */}
              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Valor solicitado:</span>
                  <span className="font-bold text-white">
                    {simAmountNum.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Taxa de levantamento ({feeActive ? feePct : '0'}%):</span>
                  <span className="font-bold">
                    - {simFeeAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
                <div className="flex justify-between text-emerald-400 border-t border-slate-800 pt-1.5 font-bold">
                  <span>Valor líquido a receber:</span>
                  <span>{simNetAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Total descontado do saldo:</span>
                  <span>{simAmountNum.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                </div>
              </div>

              {/* Confirmation notice banner matching user prompt */}
              <div className="p-3 bg-cyan-950/40 border border-cyan-800 rounded-xl text-[11px] text-cyan-200">
                <strong>Mensagem exibida ao apostador:</strong>
                <p className="mt-0.5 italic">
                  "Taxa de levantamento: {feeActive ? feePct : '0'}%. Você receberá:{' '}
                  {simNetAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 2: LIMITES & APOSTAS ================= */}
      {subTab === 'limites' && (
        <div className="max-w-2xl mx-auto p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Regras de Apostas & Limites Globais</h3>
              <p className="text-xs text-slate-400">
                Parâmetros dinâmicos para controle de apostas e limites diários de apostadores.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveLimites} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Aposta Mínima por Bilhete (MZN)
                </label>
                <input
                  type="number"
                  value={minStake}
                  onChange={(e) => setMinStake(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  placeholder="20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Aposta Máxima por Bilhete (MZN)
                </label>
                <input
                  type="number"
                  value={maxStake}
                  onChange={(e) => setMaxStake(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  placeholder="50000"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ganho Máximo Potencial por Bilhete (MZN)
                </label>
                <input
                  type="number"
                  value={maxPotentialWin}
                  onChange={(e) => setMaxPotentialWin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  placeholder="500000"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Limite Diário de Apostas por Apostador (MZN)
                </label>
                <input
                  type="number"
                  value={maxDailyStake}
                  onChange={(e) => setMaxDailyStake(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  placeholder="100000"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'A guardar...' : 'Guardar Limites Operacionais'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= SUB-TAB 3: WHATSAPP ================= */}
      {subTab === 'whatsapp' && (
        <div className="max-w-2xl mx-auto p-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Botão de Apoio Flutuante WhatsApp</h3>
              <p className="text-xs text-slate-400">
                Configuração dinâmica do botão flutuante para atendimento direto aos utilizadores.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveWhatsApp} className="space-y-4">
            <div className="p-3.5 bg-slate-900/80 border border-slate-700/80 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Exibir Botão Flutuante de WhatsApp</span>
                <span className="text-[11px] text-slate-400">
                  {waEnabled ? 'Visível em todas as telas para os apostadores.' : 'Botão oculto.'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={waEnabled}
                  onChange={(e) => setWaEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Número de WhatsApp (com indicativo de Moçambique +258)
              </label>
              <input
                type="text"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                placeholder="+258872344381"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Texto do Botão
              </label>
              <input
                type="text"
                value={waButtonText}
                onChange={(e) => setWaButtonText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                placeholder="Apoio WhatsApp"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mensagem Padrão de Abertura
              </label>
              <textarea
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                placeholder="Olá ZONABET! Preciso de apoio..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Posicionamento na Tela
              </label>
              <select
                value={waPosition}
                onChange={(e) => setWaPosition(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="bottom-right">Canto Inferior Direito (Padrão)</option>
                <option value="bottom-left">Canto Inferior Esquerdo</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'A guardar...' : 'Guardar Configuração do WhatsApp'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= SUB-TAB 4: CONTAS OFICIAIS ================= */}
      {subTab === 'contas' && (
        <div className="max-w-2xl mx-auto p-5 sm:p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Conta e-Mola Oficial ZONABET</h3>
              <p className="text-xs text-slate-400">
                Canal autorizado para recebimento de depósitos e validação de comprovativos.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Operadora:</span>
              <span className="font-bold text-orange-400">e-Mola (Movitel Moçambique)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Número Oficial:</span>
              <span className="font-mono font-black text-white text-base">867090687</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Titular Registada:</span>
              <span className="font-bold text-white">Aninha Basto</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Instruções aos Apostadores:</span>
              <span className="text-slate-300 font-medium text-right max-w-xs">
                Enviar dinheiro para 867090687 e submeter o talão na tela de depósito para crédito imediato.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 5: AUDITORIA ================= */}
      {subTab === 'auditoria' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 text-xs text-slate-300">
            Rastreamento imutável de todas as ações de gestão (criação de eventos desportivos, alteração de odds, liquidação de bilhetes, alterações de taxas e limites).
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3.5">Data / Hora</th>
                  <th className="py-3 px-3">Administrador</th>
                  <th className="py-3 px-3">Ação</th>
                  <th className="py-3 px-3">Entidade & ID</th>
                  <th className="py-3 px-3">Modificação</th>
                  <th className="py-3 px-3 text-right">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      Nenhum registo de auditoria no sistema.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('pt-MZ', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-white font-bold">{log.adminEmail}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action.includes('SETTING') || log.action.includes('UPDATE')
                              ? 'bg-amber-500/20 text-amber-300'
                              : log.action.includes('CREATE')
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                        {log.entityType}: {log.entityId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs truncate font-sans">
                        {JSON.stringify(log.newData || log.previousData || {})}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 font-mono text-[11px]">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 6: SUPABASE ================= */}
      {subTab === 'supabase' && (
        <div className="space-y-5">
          {/* Status Card */}
          <div className="p-5 bg-slate-800/90 border border-slate-700/80 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    supabaseStatus?.connected
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : supabaseStatus?.isConfigured
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600/40'
                  }`}
                >
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">Ligação Supabase Cloud (PostgreSQL)</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        supabaseStatus?.connected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : supabaseStatus?.isConfigured
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {supabaseStatus?.connected
                        ? '🟢 Conectado'
                        : supabaseStatus?.isConfigured
                        ? '🟠 Configurado (Sem Tabelas)'
                        : '⚪ Modo em Memória (Offline)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {supabaseStatus?.connected
                      ? 'A aplicação está sincronizada em tempo real com a sua base de dados Supabase na nuvem.'
                      : supabaseStatus?.isConfigured
                      ? 'Chaves detetadas. Execute o script SQL no Supabase para inicializar as tabelas.'
                      : 'A operar com armazenamento local/em memória. Configure as variáveis para persistência permanente.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onRefreshSupabaseStatus && (
                  <button
                    onClick={onRefreshSupabaseStatus}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-600"
                    title="Verificar ligação"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Verificar</span>
                  </button>
                )}
                <button
                  onClick={handleSyncToSupabase}
                  disabled={syncingSupabase}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingSupabase ? 'animate-spin' : ''}`} />
                  <span>Enviar para Supabase</span>
                </button>
                <button
                  onClick={handlePullFromSupabase}
                  disabled={pullingSupabase}
                  className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-650 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-600 disabled:opacity-50"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Restaurar do Supabase</span>
                </button>
              </div>
            </div>

            {/* Connection Variables Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span>Endpoint Supabase</span>
                </div>
                <p className="text-xs font-mono text-white truncate">
                  {supabaseStatus?.url || 'Não configurado (ex: https://xyz.supabase.co)'}
                </p>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chave Anónima (Anon)</span>
                </div>
                <p className="text-xs font-mono">
                  {supabaseStatus?.hasAnonKey ? (
                    <span className="text-emerald-400 font-bold">✅ Configurada</span>
                  ) : (
                    <span className="text-slate-500">Pendente de configuração</span>
                  )}
                </p>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Service Role Key (Escrita)</span>
                </div>
                <p className="text-xs font-mono">
                  {supabaseStatus?.hasServiceKey ? (
                    <span className="text-emerald-400 font-bold">✅ Configurada</span>
                  ) : (
                    <span className="text-slate-500">Pendente de configuração</span>
                  )}
                </p>
              </div>
            </div>

            {supabaseStatus?.error && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Aviso do Supabase:</span> {supabaseStatus.error}
                </div>
              </div>
            )}
          </div>

          {/* Guide Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center border border-emerald-500/30">
                  1
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Criar Projeto Supabase</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Acesse <strong className="text-slate-200">supabase.com</strong>, crie um projeto gratuito e aceda a <em>Project Settings → API</em> para obter o seu <strong>Project URL</strong> e as chaves <strong>anon public</strong> e <strong>service_role</strong>.
              </p>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center border border-emerald-500/30">
                  2
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Definir Variáveis</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                No menu <strong className="text-slate-200">Settings</strong> do AI Studio (ou no ficheiro <code className="text-emerald-400">.env</code>), preencha <code className="text-slate-300">SUPABASE_URL</code>, <code className="text-slate-300">SUPABASE_ANON_KEY</code> e <code className="text-slate-300">SUPABASE_SERVICE_ROLE_KEY</code>.
              </p>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center border border-emerald-500/30">
                  3
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Executar Schema SQL</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Copie o script DDL abaixo, cole-o no <strong>SQL Editor</strong> do Supabase e clique em <strong>Run</strong>. Depois, clique em <strong>"Enviar para Supabase"</strong> acima.
              </p>
            </div>
          </div>

          {/* SQL Snippet */}
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-300 font-bold font-mono">Script SQL DDL (Tabelas ZONABET):</span>
              </div>
              <button
                onClick={handleCopySql}
                className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-emerald-500/30"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado para a Área de Transferência!' : 'Copiar DDL SQL'}</span>
              </button>
            </div>
            <pre className="p-3.5 bg-slate-950 rounded-lg text-[11px] text-slate-400 font-mono max-h-52 overflow-y-auto leading-relaxed border border-slate-800/60 selection:bg-emerald-900">
              {supabaseSchemaSql || '-- Carregando schema SQL...'}
            </pre>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 7: MANUTENÇÃO ================= */}
      {subTab === 'manutencao' && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Limpeza de Dinheiro Virtual</h3>
                <p className="text-xs text-slate-400">
                  Esta ação irá resetar o saldo de <strong>TODOS</strong> os jogadores para 0.00 MT.
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-200 space-y-1">
                  <p className="font-bold uppercase tracking-wider text-rose-300">⚠️ Ação Irreversível</p>
                  <p>Ao confirmar, todos os saldos atuais no sistema (Supabase e In-Memory) serão zerados.</p>
                  <p>Um registo de auditoria será criado para esta operação global.</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  if (window.confirm('TEM A CERTEZA? Esta ação irá apagar o saldo de TODOS os jogadores do sistema permanentemente.')) {
                    onResetAllBalances();
                  }
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 transition-all active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>EXECUTAR LIMPEZA GLOBAL DE SALDOS</span>
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl space-y-4">
             <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Estado dos Volumes de Dados</h3>
                <p className="text-xs text-slate-400">
                  Resumo técnico dos registos financeiros atualmente em memória.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
               <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Transações Totais:</span>
                  <span className="text-white font-mono font-bold"># {auditLogs.length} registos</span>
               </div>
               <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Receita de Taxas:</span>
                  <span className="text-emerald-400 font-mono font-bold">{totalFeeCollected.toFixed(2)} MT</span>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
