'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BetDirection } from '@/lib/bets-engine';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserBet {
  id: string;
  timestamp: number;
  marketId: number;
  direction: BetDirection;
  amount: number;
  odds: number;          // multiplier at time of bet
  result: 'win' | 'loss' | 'pending';
  pnl: number;           // positive or negative
}

export interface UserStats {
  totalBets: number;
  wins: number;
  losses: number;
  totalPnl: number;
  bestStreak: number;
  currentStreak: number;
  worstLoss: number;
  biggestWin: number;
}

const INITIAL_BALANCE = 1000;
const STORAGE_KEYS = {
  balance: 'gembets-balance',
  history: 'gembets-history',
  stats: 'gembets-stats',
};

const DEFAULT_STATS: UserStats = {
  totalBets: 0,
  wins: 0,
  losses: 0,
  totalPnl: 0,
  bestStreak: 0,
  currentStreak: 0,
  worstLoss: 0,
  biggestWin: 0,
};

// ─── localStorage helpers ───────────────────────────────────────────────────

function loadNumber(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  } catch { return fallback; }
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v) as T;
  } catch { return fallback; }
}

function save(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, typeof value === 'number' ? String(value) : JSON.stringify(value));
  } catch { /* quota exceeded — ignore */ }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useGemBets() {
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [history, setHistory] = useState<UserBet[]>([]);
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [currentBet, setCurrentBet] = useState<UserBet | null>(null);
  const [lastResult, setLastResult] = useState<{ pnl: number; won: boolean } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Refs for latest values (avoids stale closures)
  const balanceRef = useRef(balance);
  const historyRef = useRef(history);
  const statsRef = useRef(stats);
  balanceRef.current = balance;
  historyRef.current = history;
  statsRef.current = stats;

  // Load from localStorage on mount
  useEffect(() => {
    const b = loadNumber(STORAGE_KEYS.balance, INITIAL_BALANCE);
    const h = loadJSON<UserBet[]>(STORAGE_KEYS.history, []);
    const s = loadJSON<UserStats>(STORAGE_KEYS.stats, DEFAULT_STATS);
    setBalance(b);
    setHistory(h);
    setStats(s);
    setLoaded(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (!loaded) return;
    save(STORAGE_KEYS.balance, balance);
  }, [balance, loaded]);

  useEffect(() => {
    if (!loaded) return;
    save(STORAGE_KEYS.history, history);
  }, [history, loaded]);

  useEffect(() => {
    if (!loaded) return;
    save(STORAGE_KEYS.stats, stats);
  }, [stats, loaded]);

  // Place a bet
  const placeBet = useCallback((marketId: number, direction: BetDirection, amount: number, upPercent: number) => {
    if (currentBet) return; // already placed
    if (amount > balanceRef.current || amount <= 0) return;

    // Calculate odds based on pool distribution
    const myPercent = direction === 'up' ? upPercent : (100 - upPercent);
    const odds = Math.max(1.01, 100 / Math.max(myPercent, 1)); // minimum 1.01x

    const bet: UserBet = {
      id: `${marketId}-${Date.now()}`,
      timestamp: Date.now(),
      marketId,
      direction,
      amount,
      odds,
      result: 'pending',
      pnl: 0,
    };

    // Deduct immediately
    setBalance(prev => prev - amount);
    setCurrentBet(bet);
    setLastResult(null);
  }, [currentBet]);

  // Resolve user's current bet
  const resolveBet = useCallback((marketResult: BetDirection) => {
    const bet = currentBet;
    if (!bet || bet.result !== 'pending') return;

    const won = bet.direction === marketResult;
    const pnl = won ? Math.round(bet.amount * bet.odds - bet.amount) : -bet.amount;
    const winnings = won ? Math.round(bet.amount * bet.odds) : 0;

    const resolved: UserBet = { ...bet, result: won ? 'win' : 'loss', pnl };

    // Update balance (add back winnings if won)
    if (won) {
      setBalance(prev => prev + winnings);
    }

    // Update history (keep last 20)
    setHistory(prev => [resolved, ...prev].slice(0, 20));

    // Update stats
    setStats(prev => {
      const newStreak = won ? prev.currentStreak + 1 : 0;
      return {
        totalBets: prev.totalBets + 1,
        wins: prev.wins + (won ? 1 : 0),
        losses: prev.losses + (won ? 0 : 1),
        totalPnl: prev.totalPnl + pnl,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        currentStreak: newStreak,
        worstLoss: Math.min(prev.worstLoss, pnl),
        biggestWin: Math.max(prev.biggestWin, pnl),
      };
    });

    setLastResult({ pnl, won });
    setCurrentBet(null);
  }, [currentBet]);

  // Clear last result notification
  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  // Reset balance
  const resetBalance = useCallback(() => {
    setBalance(INITIAL_BALANCE);
    setStats(DEFAULT_STATS);
    setHistory([]);
    setCurrentBet(null);
    setLastResult(null);
  }, []);

  // Computed
  const isBroke = balance <= 0 && !currentBet;
  const winRate = stats.totalBets > 0 ? ((stats.wins / stats.totalBets) * 100).toFixed(1) : '—';

  return {
    balance,
    history,
    stats,
    currentBet,
    lastResult,
    loaded,
    isBroke,
    winRate,
    placeBet,
    resolveBet,
    clearResult,
    resetBalance,
  };
}
