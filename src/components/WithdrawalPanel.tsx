import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../api.ts';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  Info,
  Percent,
} from 'lucide-react';

interface WithdrawalPanelProps {
  onSuccess?: (newBalance: number) => void;
  onClose?: () => void;
  isModal?: boolean;
}

type WithdrawalMethod = 'EMOLA';

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

export const WithdrawalPanel: React.FC<WithdrawalPanelProps> = ({
  onSuccess,
  onClose,
  isModal = false,
}) => {
  const { user, updateBalance, refreshUserData } = useAuth();

  const method: WithdrawalMethod = 'EMOLA';
  const [amount, setAmount] = useState<string>('250');
  const [phone, setPhone] = useState<string>(() => {
    if (user?.phone) {
      return user.phone.replace(/^\+258\s*/, '').replace(/\s+/g, '');
    }
    return '';
  });

  // Dynamic system settings
  const [feePercentage, setFeePercentage] = useState<number>(5.0);
  const [feeActive, setFeeActive] = useState<boolean>(true);
  const [minWithdrawal, setMinWithdrawal] = useState<number>(20);
  const [maxWithdrawal, setMaxWithdrawal] = useState<number>(50000);

  useEffect(() => {
    api
      .getPublicSettings()
      .then((res) => {
        if (res.settings) {
          if (res.settings.withdrawalFeePercentage !== undefined) {
            setFeePercentage(Number(res.settings.withdrawalFeePercentage));
          }
          if (res.settings.withdrawalFeeActive !== undefined) {
            setFeeActive(Boolean(res.settings.withdrawalFeeActive));
          }
          if (res.settings.minWithdrawal !== undefined) {
            setMinWithdrawal(Number(res.settings.minWithdrawal));
          }
          if (res.settings.maxWithdrawal !== undefined) {
            setMaxWithdrawal(Number(res.settings.maxWithdrawal));
          }
        }
      })
      .catch(() => {
        // Fallback default is 5.0%
      });
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    reference: string;
    amount: number;
    fee: number;
    netAmount: number;
    methodLabel: string;
    destination: string;
    newBalance: number;
  } | null>(null);

  const availableBalance = user?.balance ?? 0;
  const numericAmount = parseFloat(amount) || 0;

  // Dynamic calculation of the fee and net payout
  const activeRate = feeActive ? feePercentage / 100 : 0;
  const feeAmount = Math.round(numericAmount * activeRate * 100) / 100;
  const netAmount = Math.max(0, Math.round((numericAmount - feeAmount) * 100) / 100);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numericAmount < minWithdrawal) {
      setError(`O montante mínimo de levantamento é de ${minWithdrawal.toFixed(2)} MT.`);
      return;
    }

    if (numericAmount > maxWithdrawal) {
      setError(`O montante máximo por pedido de levantamento é de ${maxWithdrawal.toFixed(2)} MT.`);
      return;
    }

    if (numericAmount > availableBalance) {
      setError(`Saldo insuficiente. O seu saldo disponível é de ${availableBalance.toFixed(2)} MT.`);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      setError('Por favor, introduza um número de celular Movitel (86/87) válido para receber os fundos.');
      return;
    }
    const destinationInfo = phone.startsWith('+258') ? phone : `+258 ${phone.trim()}`;

    setLoading(true);

    try {
      const res = await api.withdraw({
        amount: numericAmount,
        method: 'EMOLA',
        phoneNumber: destinationInfo,
      });

      const updatedBalance = res.wallet?.balance ?? (availableBalance - numericAmount);
      updateBalance(updatedBalance);
      await refreshUserData();

      const methodLabel = 'e-Mola (Movitel)';
      const finalFee = res.fee !== undefined ? res.fee : feeAmount;
      const finalNet = res.netAmount !== undefined ? res.netAmount : netAmount;

      setSuccessData({
        reference: res.transaction?.reference || `LEV-EMOLA-${Date.now().toString().slice(-6)}`,
        amount: numericAmount,
        fee: finalFee,
        netAmount: finalNet,
        methodLabel,
        destination: destinationInfo,
        newBalance: updatedBalance,
      });

      if (onSuccess) {
        onSuccess(updatedBalance);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar o levantamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleMaxBalance = () => {
    if (availableBalance > 0) {
      setAmount(Math.floor(availableBalance).toString());
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setError(null);
    setAmount('250');
  };

  return (
    <div className={`w-full ${isModal ? 'max-w-xl mx-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Painel de Levantamento</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase">
                e-Mola Oficial
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Levante os seus ganhos instantaneamente para a sua carteira móvel e-Mola (Movitel).
            </p>
          </div>
        </div>

        {/* Live Balance */}
        <div className="text-right">
          <span className="text-[11px] text-slate-400 block">Saldo Disponível</span>
          <span className="font-extrabold text-sm sm:text-base text-emerald-400">
            {availableBalance.toFixed(2)} MT
          </span>
        </div>
      </div>

      {/* Success Receipt State */}
      {successData ? (
        <div className="bg-slate-900/90 border border-orange-500/30 rounded-2xl p-5 sm:p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Levantamento Solicitado com Sucesso!
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              +{successData.netAmount.toFixed(2)} <span className="text-sm sm:text-base text-emerald-400 font-bold">MT Líquidos</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Transferência enviada para a sua carteira e-Mola com taxa de 5% deduzida automaticamente.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-left space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Referência de Payout:</span>
              <span className="text-white font-bold">{successData.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Canal de Pagamento:</span>
              <span className="text-orange-400 font-sans font-bold">{successData.methodLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Número de Destino e-Mola:</span>
              <span className="text-white font-sans">{successData.destination}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800 font-sans">
              <span className="text-slate-400">Montante Solicitado (Bruto):</span>
              <span className="text-slate-200 font-bold">{successData.amount.toFixed(2)} MT</span>
            </div>
            <div className="flex justify-between font-sans text-amber-400">
              <span className="flex items-center gap-1">
                <span>Taxa de Levantamento ({feeActive ? feePercentage : 0}%):</span>
              </span>
              <span className="font-bold font-mono">-{successData.fee.toFixed(2)} MT</span>
            </div>
            <div className="flex justify-between font-sans text-emerald-400 font-black">
              <span>Valor Líquido Transferido:</span>
              <span className="font-mono text-sm">+{successData.netAmount.toFixed(2)} MT</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800 font-sans">
              <span className="text-slate-400 font-bold">Saldo Restante na Conta:</span>
              <span className="text-emerald-400 font-black">{successData.newBalance.toFixed(2)} MT</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            {onClose && (
              <button
                id="withdraw-success-close-btn"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Concluído</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              id="withdraw-success-repeat-btn"
              onClick={resetForm}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs sm:text-sm border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Novo Levantamento</span>
            </button>
          </div>
        </div>
      ) : (
        /* Form State */
        <form onSubmit={handleWithdraw} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Balance notification card */}
          {availableBalance < 20 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                O seu saldo atual é de {availableBalance.toFixed(2)} MT. O montante mínimo exigido para levantamentos é de 20,00 MT.
              </span>
            </div>
          )}

          {/* 1. Dedicated Official e-Mola Channel */}
          <div className="bg-gradient-to-br from-amber-950/40 via-orange-950/30 to-slate-900 border border-orange-500/40 rounded-2xl p-4 text-xs space-y-3 shadow-lg shadow-orange-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center text-sm font-black shadow-md shadow-orange-500/30">
                  e
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">e-Mola (Movitel)</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40">
                      Canal Exclusivo
                    </span>
                  </div>
                  <span className="text-[11px] text-orange-300/90 font-medium block">
                    Levantamento direto e instantâneo para a sua carteira e-Mola (*898#)
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-orange-500/20 rounded-xl p-3 text-[11px] text-slate-300 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                Transferências automáticas e seguras via e-Mola (*898#). Aplica-se uma taxa de 5% sobre os ganhos levantados, calculada automaticamente pelo sistema.
              </span>
            </div>
          </div>

          {/* 2. Amount Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">
                2. Montante a Levantar (MT)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Mín: 20 MT</span>
                <button
                  type="button"
                  onClick={handleMaxBalance}
                  className="text-[10px] font-bold text-orange-400 hover:text-orange-300 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/30 cursor-pointer"
                >
                  Levantar Tudo
                </button>
              </div>
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-5 gap-1.5 mb-2.5">
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={val > availableBalance}
                  onClick={() => setAmount(val.toString())}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${
                    numericAmount === val
                      ? 'bg-orange-500 text-slate-950 border-orange-400 font-black shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  {val} MT
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="relative">
              <input
                id="withdraw-amount-input"
                type="number"
                min="20"
                max={availableBalance}
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 250"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-orange-400 placeholder-slate-600 focus:outline-none focus:border-orange-500 tracking-tight"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                MT (Meticais)
              </span>
            </div>
          </div>

          {/* 3. Destination Details (e-Mola Phone) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">
                3. Número de Celular Movitel para Receber os Fundos
              </label>
              <span className="text-[10px] text-orange-400 font-bold">
                Prefixo 86 ou 87 (e-Mola)
              </span>
            </div>
            <div className="relative flex items-center">
              <div className="absolute left-3 flex items-center gap-1.5 text-slate-400 font-bold text-xs pointer-events-none">
                <span>🇲🇿</span>
                <span>+258</span>
              </div>
              <input
                id="withdraw-phone-input"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="86 700 0000"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-20 pr-4 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                O valor líquido será creditado diretamente no saldo da carteira e-Mola associada ao número indicado.
              </span>
            </p>
          </div>

          {/* Fee & Calculation Summary */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 text-xs space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-black text-white flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-rose-400" />
                <span>Demonstrativo de Levantamento</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  feeActive
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {feeActive ? `Taxa de ${feePercentage}% Ativa` : 'Taxa Isenta (0%)'}
              </span>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-800 font-mono text-xs">
              <div className="flex justify-between text-slate-300 font-sans">
                <span>Valor solicitado:</span>
                <span className="font-bold text-white font-mono">{numericAmount.toFixed(2)} MT</span>
              </div>
              <div className="flex justify-between text-rose-400 font-sans">
                <span>Taxa de levantamento ({feeActive ? feePercentage : 0}%):</span>
                <span className="font-bold font-mono">-{feeAmount.toFixed(2)} MT</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-sans font-black text-sm pt-1 border-t border-slate-800">
                <span>Valor líquido que receberá:</span>
                <span className="font-mono text-base">+{netAmount.toFixed(2)} MT</span>
              </div>
              <div className="flex justify-between text-slate-400 font-sans text-[11px]">
                <span>Valor total descontado do saldo:</span>
                <span className="font-mono text-slate-300">{numericAmount.toFixed(2)} MT</span>
              </div>
            </div>

            {/* Prominent Pre-Confirmation Notice mandated by prompt */}
            <div className="p-3 bg-gradient-to-r from-orange-950/40 via-amber-950/30 to-slate-900 border border-orange-500/40 rounded-xl text-xs text-orange-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Aviso de Transferência:</span>
                <span>
                  "Taxa de levantamento: {feeActive ? feePercentage : 0}%. Você receberá:{' '}
                  <strong>{netAmount.toFixed(2)} MT</strong>."
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="withdraw-submit-btn"
            type="submit"
            disabled={loading || numericAmount < minWithdrawal || numericAmount > availableBalance}
            className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>A processar transferência com a e-Mola...</span>
              </>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4" />
                <span>Confirmar Levantamento (Recebe {netAmount.toFixed(2)} MT no e-Mola)</span>
              </>
            )}
          </button>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span>Processamento verificado pelo sistema de tesouraria ZONABET e rede Movitel</span>
          </div>
        </form>
      )}
    </div>
  );
};
