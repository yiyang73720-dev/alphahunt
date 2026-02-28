'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { NBAGame, Signal, GameOdds, DashboardState } from './types';

// ========================================
// SSE Hook for real-time updates
// ========================================

export function useLiveData() {
  const [state, setState] = useState<DashboardState>({
    games: [],
    signals: [],
    odds: {},
    lastUpdate: '',
    isLive: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    // Initial fetch
    fetch('/api/signals')
      .then((res) => res.json())
      .then((data) => {
        setState({
          games: data.games || [],
          signals: data.signals || [],
          odds: data.oddsMap || {},
          lastUpdate: data.timestamp || new Date().toISOString(),
          isLive: (data.games || []).some((g: NBAGame) => g.status === 'live'),
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });

    // SSE connection
    const es = new EventSource('/api/stream');
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
          return;
        }
        setState({
          games: data.games || [],
          signals: data.signals || [],
          odds: data.oddsMap || {},
          lastUpdate: data.timestamp || new Date().toISOString(),
          isLive: (data.games || []).some((g: NBAGame) => g.status === 'live'),
        });
        setError(null);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      // Reconnect after 5 seconds
      setTimeout(connect, 5000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/signals');
      const data = await res.json();
      setState({
        games: data.games || [],
        signals: data.signals || [],
        odds: data.oddsMap || {},
        lastUpdate: data.timestamp || new Date().toISOString(),
        isLive: (data.games || []).some((g: NBAGame) => g.status === 'live'),
      });
    } catch {
      // ignore
    }
  }, []);

  return { ...state, loading, error, refresh };
}

// ========================================
// Bet Storage Hook (localStorage)
// ========================================

import { Bet, BetSummary } from './types';

export function useBets() {
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('alphahunt_bets');
    if (saved) setBets(JSON.parse(saved));
  }, []);

  const save = (newBets: Bet[]) => {
    setBets(newBets);
    localStorage.setItem('alphahunt_bets', JSON.stringify(newBets));
  };

  const addBet = (bet: Omit<Bet, 'id'>) => {
    const newBet = { ...bet, id: `bet_${Date.now()}` };
    save([newBet, ...bets]);
  };

  const updateBet = (id: string, updates: Partial<Bet>) => {
    save(bets.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBet = (id: string) => {
    save(bets.filter((b) => b.id !== id));
  };

  const summary: BetSummary = {
    totalBets: bets.length,
    wins: bets.filter((b) => b.outcome === 'win').length,
    losses: bets.filter((b) => b.outcome === 'loss').length,
    pushes: bets.filter((b) => b.outcome === 'push').length,
    pending: bets.filter((b) => b.outcome === 'pending').length,
    totalWagered: bets.reduce((s, b) => s + b.amount, 0),
    totalPnl: bets.reduce((s, b) => s + (b.payout || 0) - b.amount, 0),
    winRate: bets.filter((b) => b.outcome !== 'pending' && b.outcome !== 'push').length > 0
      ? bets.filter((b) => b.outcome === 'win').length /
        bets.filter((b) => b.outcome !== 'pending' && b.outcome !== 'push').length
      : 0,
    roi: bets.reduce((s, b) => s + b.amount, 0) > 0
      ? (bets.reduce((s, b) => s + (b.payout || 0) - b.amount, 0) /
          bets.reduce((s, b) => s + b.amount, 0)) * 100
      : 0,
    bySignalType: bets.reduce(
      (acc, b) => {
        const key = b.signalType;
        if (!acc[key]) acc[key] = { wins: 0, losses: 0, pnl: 0 };
        if (b.outcome === 'win') acc[key].wins++;
        if (b.outcome === 'loss') acc[key].losses++;
        acc[key].pnl += (b.payout || 0) - b.amount;
        return acc;
      },
      {} as Record<string, { wins: number; losses: number; pnl: number }>,
    ),
  };

  return { bets, addBet, updateBet, deleteBet, summary };
}

// ========================================
// Settings Hook (localStorage)
// ========================================

import { UserSettings } from './types';

const DEFAULT_SETTINGS: UserSettings = {
  email: '',
  phone: '',
  bankroll: 20000,
  alertPreferences: {
    emailAlerts: true,
    phoneAlerts: false,
    minSignalCount: 1,
    minEdge: 3.0,
  },
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = localStorage.getItem('alphahunt_settings');
    if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
  }, []);

  const updateSettings = (updates: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    localStorage.setItem('alphahunt_settings', JSON.stringify(newSettings));
  };

  return { settings, updateSettings };
}
