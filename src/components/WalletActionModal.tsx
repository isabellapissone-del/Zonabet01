import React, { useState, useEffect } from 'react';
import { DepositPanel } from './DepositPanel.tsx';
import { WithdrawalPanel } from './WithdrawalPanel.tsx';
import { X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface WalletActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'deposit' | 'withdraw';
}

export const WalletActionModal: React.FC<WalletActionModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'deposit',
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-full sm:max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/70">
          {/* Action Tabs Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              id="wallet-modal-tab-deposit"
              type="button"
              onClick={() => setActiveTab('deposit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'deposit'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Depositar</span>
            </button>
            <button
              id="wallet-modal-tab-withdraw"
              type="button"
              onClick={() => setActiveTab('withdraw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'withdraw'
                  ? 'bg-orange-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Levantar</span>
            </button>
          </div>

          <button
            id="wallet-modal-close-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-6 overflow-y-auto">
          {activeTab === 'deposit' ? (
            <DepositPanel onClose={onClose} isModal={true} />
          ) : (
            <WithdrawalPanel onClose={onClose} isModal={true} />
          )}
        </div>
      </div>
    </div>
  );
};
