import { createContext, useContext, useState, ReactNode } from 'react';
import { BetSlipItem } from '../types.ts';
import { api } from '../api.ts';
import { useAuth } from './AuthContext.tsx';
import { parseMatchKickoff } from '../utils/matchUtils.ts';

interface BetSlipContextType {
  items: BetSlipItem[];
  stake: number;
  totalOdds: number;
  potentialReturn: number;
  isSubmitting: boolean;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  toggleSelection: (item: BetSlipItem) => void;
  removeSelection: (selectionId: string) => void;
  clearSlip: () => void;
  setStake: (amount: number) => void;
  updateSelectionOdds: (matchId: string, selectionId: string, newOdds: number) => void;
  placeBet: () => Promise<{ success: boolean; message?: string }>;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const { user, refreshUserData } = useAuth();
  const [items, setItems] = useState<BetSlipItem[]>([]);
  const [stake, setStakeState] = useState<number>(20); // Aposta mínima inicial de 20 MT
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);

  // Toggle or replace selection on the same match
  const toggleSelection = (newItem: BetSlipItem) => {
    setItems((prev) => {
      // Check if this exact selection is already selected -> remove it
      const exists = prev.some((i) => i.selectionId === newItem.selectionId);
      if (exists) {
        return prev.filter((i) => i.selectionId !== newItem.selectionId);
      }
      // If another selection on the same match exists, replace it
      const filtered = prev.filter((i) => i.matchId !== newItem.matchId);
      return [...filtered, newItem];
    });
  };

  const removeSelection = (selectionId: string) => {
    setItems((prev) => prev.filter((i) => i.selectionId !== selectionId));
  };

  const clearSlip = () => {
    setItems([]);
  };

  const setStake = (amount: number) => {
    setStakeState(Math.max(0, amount));
  };

  const updateSelectionOdds = (matchId: string, selectionId: string, newOdds: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.matchId === matchId && item.selectionId === selectionId) {
          return { ...item, odds: newOdds };
        }
        return item;
      })
    );
  };

  // Calculate cumulative odds
  const totalOdds = items.length === 0
    ? 0
    : Math.round(items.reduce((acc, curr) => acc * curr.odds, 1.0) * 100) / 100;

  // Potential return in MZN
  const potentialReturn = Math.round(stake * totalOdds * 100) / 100;

  const placeBet = async (): Promise<{ success: boolean; message?: string }> => {
    if (!user) {
      return { success: false, message: 'Por favor inicie sessão para confirmar a aposta.' };
    }
    if (items.length === 0) {
      return { success: false, message: 'O boletim de apostas está vazio.' };
    }
    // Validação de aposta mínima de 20 MT
    if (stake < 20) {
      return { success: false, message: 'A aposta mínima permitida é de 20 MT (20 MZN).' };
    }
    if (stake > user.balance) {
      return { success: false, message: `Saldo insuficiente (${user.balance.toFixed(2)} MZN). Por favor recarregue a carteira.` };
    }

    // Validação preventiva de kickoff: Bloquear caso o jogo já tenha iniciado
    for (const item of items) {
      if (item.kickoff) {
        const parts = item.kickoff.trim().split(' ');
        const datePart = parts[0] || 'Hoje';
        const timePart = parts[1] || parts[0];
        const kickoffDate = parseMatchKickoff(datePart, timePart);
        if (kickoffDate && kickoffDate.getTime() <= Date.now()) {
          return {
            success: false,
            message: `O jogo ${item.matchTitle} já iniciou. As apostas foram encerradas para esta partida. Remova-o do boletim para continuar.`,
          };
        }
      }
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = `bet-req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        items: items.map((i) => ({
          matchId: i.matchId,
          marketId: i.marketId,
          selectionId: i.selectionId,
        })),
        stake,
        idempotencyKey,
      };

      const res = await api.placeBet(payload);
      await refreshUserData();
      clearSlip();
      setIsOpenMobile(false);
      return { success: true, message: res.message || 'Aposta registada com sucesso!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao submeter aposta' };
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BetSlipContext.Provider
      value={{
        items,
        stake,
        totalOdds,
        potentialReturn,
        isSubmitting,
        isOpenMobile,
        setIsOpenMobile,
        toggleSelection,
        removeSelection,
        clearSlip,
        setStake,
        updateSelectionOdds,
        placeBet,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (!context) {
    throw new Error('useBetSlip must be used within a BetSlipProvider');
  }
  return context;
}
