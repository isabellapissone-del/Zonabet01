export interface SettlementEventPayload {
  matchId: string;
  homeScore: number;
  awayScore: number;
  settlement?: {
    settledBetsCount?: number;
    wonBetsCount?: number;
    totalPayout?: number;
    match?: any;
  };
  timestamp: number;
}

let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('zonabet_settlement_channel');
  }
} catch (e) {
  console.warn('[BroadcastChannel] Não suportado ou restrito no iframe:', e);
}

/**
 * Broadcasts a match settlement event to current window and all other browser tabs
 */
export function broadcastSettlement(payload: Omit<SettlementEventPayload, 'timestamp'>) {
  const fullPayload: SettlementEventPayload = {
    ...payload,
    timestamp: Date.now(),
  };

  // 1. Dispatch custom event on current window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('zonabet:match_settled', { detail: fullPayload })
    );

    // 2. BroadcastChannel for other open tabs
    if (channel) {
      try {
        channel.postMessage(fullPayload);
      } catch (err) {
        console.warn('Erro ao emitir BroadcastChannel:', err);
      }
    }

    // 3. LocalStorage for cross-tab synchronization
    try {
      localStorage.setItem('zonabet_last_settlement', JSON.stringify(fullPayload));
    } catch (err) {
      console.warn('Erro ao persistir settlement no localStorage:', err);
    }
  }
}

/**
 * Subscribes to match settlement events from any source (current window, other tabs, localStorage)
 */
export function subscribeToSettlement(callback: (payload: SettlementEventPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Window event listener
  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<SettlementEventPayload>;
    if (custom.detail) {
      callback(custom.detail);
    }
  };
  window.addEventListener('zonabet:match_settled', handleCustomEvent);

  // BroadcastChannel listener
  const handleChannelMsg = (event: MessageEvent<SettlementEventPayload>) => {
    if (event.data && event.data.matchId) {
      callback(event.data);
    }
  };
  if (channel) {
    channel.addEventListener('message', handleChannelMsg);
  }

  // Storage event listener (fires in other tabs when localStorage changes)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === 'zonabet_last_settlement' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as SettlementEventPayload;
        callback(parsed);
      } catch (err) {
        console.error('Erro ao interpretar evento do storage:', err);
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('zonabet:match_settled', handleCustomEvent);
    if (channel) {
      channel.removeEventListener('message', handleChannelMsg);
    }
    window.removeEventListener('storage', handleStorage);
  };
}
