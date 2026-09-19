import React, { useState } from 'react';
import { User } from '../types.ts';
import { api } from '../api.ts';
import { X, DollarSign, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';

interface AdjustBalanceModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState<number>(500);
  const [reason, setReason] = useState<string>('Bonificação / Ajuste manual de teste');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const currentBalance = user.balance || 0;
  const finalAmount = mode === 'credit' ? amount : -amount;
  const expectedBalance = currentBalance + finalAmount;

  const quickAmounts = [100, 250, 500, 1000, 2500, 5000, 10000];
  const quickReasons = [
    'Bonificação de boas-vindas',
    'Ajuste manual de teste',
    'Compensação de aposta',
    'Correção administrativa de saldo',
    'Depósito presencial verificado',
  ];

  const [isConfirming, setIsConfirming] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('O montante deve ser superior a zero');
      return;
    }
    if (mode === 'debit' && currentBalance < amount) {
      setError(`Saldo insuficiente para dedução. O utilizador possui apenas ${currentBalance.toFixed(2)} MZN.`);
      return;
    }

    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.adjustBalance({
        userId: user.id,
        amount: finalAmount,
        reason,
      });
      onSuccess(res.message);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar ajuste de saldo');
      setIsConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 text-white space-y-4 max-h-[94vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${mode === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {mode === 'credit' ? 'Adicionar Saldo' : 'Deduzir Saldo'}: {user.name}
              </h2>
              <p className="text-[11px] text-slate-400">{user.email} • ID: {user.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Credit vs Debit Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setMode('credit')}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                mode === 'credit'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Adicionar Crédito (+)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('debit')}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                mode === 'debit'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MinusCircle className="w-4 h-4" />
              <span>Deduzir Saldo (-)</span>
            </button>
          </div>

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-300">Montante a Movimentar (MZN)</label>
              <span className="text-slate-400 text-[11px]">
                Saldo Atual: <strong className="text-emerald-400">{currentBalance.toFixed(2)} MZN</strong>
              </span>
            </div>
            <input
              type="number"
              min="1"
              max="50000"
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-lg font-black text-white focus:outline-none focus:border-amber-500"
            />
            
            {/* Quick amounts */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border ${
                    amount === amt
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Reason / Justification */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Motivo da Operação (Registo Obrigatório no Livro-Razão)
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {quickReasons.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => setReason(qr)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60"
                >
                  {qr}
                </button>
              ))}
            </div>
          </div>

          {/* Balance projection card */}
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Novo Saldo Previsto:</span>
              <strong className={`text-base font-black ${expectedBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {expectedBalance.toFixed(2)} MZN
              </strong>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
              mode === 'credit' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {mode === 'credit' ? `+${amount.toFixed(2)} MZN` : `-${amount.toFixed(2)} MZN`}
            </span>
          </div>

          {isConfirming ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <AlertCircle className="w-5 h-5" />
                <span>ATENÇÃO: Confirmação de Operação</span>
              </div>
              <p className="text-sm text-slate-300">
                Você está prestes a {mode === 'credit' ? 'adicionar' : 'remover'}{' '}
                <strong className="text-white">{amount.toFixed(2)} MT</strong>{' '}
                {mode === 'credit' ? 'ao' : 'do'} usuário <strong className="text-white">{user.name}</strong>.
                O saldo passará de <strong className="text-white">{currentBalance.toFixed(2)} MT</strong> para{' '}
                <strong className="text-white">{expectedBalance.toFixed(2)} MT</strong>.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-2 font-bold rounded-lg transition-colors text-slate-950 ${
                    mode === 'credit' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400 text-white'
                  } disabled:opacity-50`}
                >
                  {loading ? 'A processar...' : 'CONFIRMAR OPERAÇÃO'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading || (mode === 'debit' && currentBalance < amount)}
              className={`w-full py-3 font-black rounded-xl text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                mode === 'credit'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
              } disabled:opacity-50`}
            >
              {mode === 'credit' ? (
                `Confirmar Crédito de +${amount} MZN no Saldo`
              ) : (
                `Confirmar Débito de -${amount} MZN do Saldo`
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
