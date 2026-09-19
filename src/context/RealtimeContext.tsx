import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Match, Bet } from '../types.ts';

interface RealtimeContextType {
  isLiveConnected: boolean;
  lastEventTime: number | null;
  latestUpdatedMatchId: string | null;
  latestUpdatedBetId: string | null;
  onMatchChange: (handler: (match: Match, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void) => () => void;
  onBetChange: (handler: (bet: Bet, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void) => () => void;
  triggerMatchUpdate?: (match: Match, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
  triggerBetUpdate?: (bet: Bet, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

/**
 * Provedor de contexto local ZONABET (100% manual e offline-first).
 * Sem WebSockets, sem polling e sem dependência de serviços em tempo real externos.
 */
export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);
  const [latestUpdatedMatchId, setLatestUpdatedMatchId] = useState<string | null>(null);
  const [latestUpdatedBetId, setLatestUpdatedBetId] = useState<string | null>(null);

  // Callbacks locais
  const matchHandlers = React.useRef<Set<(match: Match, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void>>(new Set());
  const betHandlers = React.useRef<Set<(bet: Bet, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void>>(new Set());

  const onMatchChange = (handler: (match: Match, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void) => {
    matchHandlers.current.add(handler);
    return () => {
      matchHandlers.current.delete(handler);
    };
  };

  const onBetChange = (handler: (bet: Bet, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void) => {
    betHandlers.current.add(handler);
    return () => {
      betHandlers.current.delete(handler);
    };
  };

  const triggerMatchUpdate = (match: Match, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
    setLastEventTime(Date.now());
    setLatestUpdatedMatchId(match.id);
    matchHandlers.current.forEach((h) => {
      try {
        h(match, eventType);
      } catch {}
    });
  };

  const triggerBetUpdate = (bet: Bet, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
    setLastEventTime(Date.now());
    setLatestUpdatedBetId(bet.id);
    betHandlers.current.forEach((h) => {
      try {
        h(bet, eventType);
      } catch {}
    });
  };

  return (
    <RealtimeContext.Provider
      value={{
        isLiveConnected: false,
        lastEventTime,
        latestUpdatedMatchId,
        latestUpdatedBetId,
        onMatchChange,
        onBetChange,
        triggerMatchUpdate,
        triggerBetUpdate,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
