'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TournamentHeader from '@/components/tournament/TournamentHeader';
import TournamentBracketPanel, { type BracketMatch } from '@/components/tournament/TournamentBracketPanel';
import LiveFightView, { type FightBotState } from '@/components/tournament/LiveFightView';
import TradeTicker, { type TickerTrade } from '@/components/tournament/TradeTicker';
import NFABadge from '@/components/NFABadge';
import { getModelDisplayName } from '@/lib/model-display';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface TournamentData {
  id: string;
  name: string;
  status: 'active' | 'finished' | 'waiting';
  currentRound: number;
  totalRounds: number;
  rounds: Record<string, BracketMatch[]>;
  league?: 'nfa' | 'free';
  eloMultiplier?: number;
  participants: { id: number; name: string; elo: number; seed: number; ai_model?: string; trading_style?: string; nfa_id?: number | null }[];
  currentMatch: {
    bot1: { id: number; name: string; hp: number; maxHp: number; elo?: number; pnl?: number; ai_model?: string; trading_style?: string; nfa_id?: number | null; lastTrade?: { side?: string; action?: string; pnl?: number; size?: number; unrealizedPnl?: number }; position?: string | null };
    bot2: { id: number; name: string; hp: number; maxHp: number; elo?: number; pnl?: number; ai_model?: string; trading_style?: string; nfa_id?: number | null; lastTrade?: { side?: string; action?: string; pnl?: number; size?: number; unrealizedPnl?: number }; position?: string | null };
    trades: TickerTrade[];
    timeLeft: number;
    status: 'waiting' | 'betting' | 'fighting' | 'finished';
    winnerName?: string;
    matchIndex: number;
    matchOrder?: number;
    totalMatches: number;
    token?: string;
    priceMode?: string;
    bettingMatchId?: string;
    bettingEndsAt?: number;
  } | null;
  nextMatchIn?: number;
  totalPool: number;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const TOKENS = ['BONK', 'WIF', 'PEPE', 'DOGE', 'JUP', 'PYTH', 'ORCA', 'RAY'];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let mockTradeId = 0;

function generateMockTrade(bot1Name: string, bot2Name: string): TickerTrade {
  const isBot1 = Math.random() > 0.5;
  const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
  const action: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
  const pnl = Math.random() > 0.35 ? randomBetween(1, 40) : randomBetween(-20, -1);
  return {
    id: ++mockTradeId,
    botName: isBot1 ? bot1Name : bot2Name,
    token,
    action,
    pnl,
    isCombo: pnl > 20 && Math.random() > 0.5,
    timestamp: Date.now(),
  };
}

function createMockTournament(): TournamentData {
  return {
    id: 'mock-weekly-7',
    name: 'Weekly Tournament #7',
    status: 'active',
    currentRound: 1,
    totalRounds: 3,
    rounds: {
      '1': [
        { matchOrder: 1, bot1Name: 'AlphaBot', bot2Name: 'GemHunter', bot1Id: 1, bot2Id: 2, winnerId: 1, status: 'finished' },
        { matchOrder: 2, bot1Name: 'MoonShot', bot2Name: 'DiamondAI', bot1Id: 3, bot2Id: 4, winnerId: 3, status: 'finished' },
        { matchOrder: 3, bot1Name: 'NeonViper', bot2Name: 'CyberFang', bot1Id: 5, bot2Id: 6, winnerId: null, status: 'active' },
        { matchOrder: 4, bot1Name: 'SolSniper', bot2Name: 'TokenKing', bot1Id: 7, bot2Id: 8, winnerId: null, status: 'pending' },
      ],
      '2': [
        { matchOrder: 1, bot1Name: 'AlphaBot', bot2Name: 'MoonShot', bot1Id: 1, bot2Id: 3, winnerId: null, status: 'pending' },
        { matchOrder: 2, bot1Name: 'TBD', bot2Name: 'TBD', bot1Id: 0, bot2Id: 0, winnerId: null, status: 'pending' },
      ],
      '3': [
        { matchOrder: 1, bot1Name: 'TBD', bot2Name: 'TBD', bot1Id: 0, bot2Id: 0, winnerId: null, status: 'pending' },
      ],
    },
    participants: [
      { id: 1, name: 'AlphaBot', elo: 1450, seed: 1 },
      { id: 2, name: 'GemHunter', elo: 1320, seed: 8 },
      { id: 3, name: 'MoonShot', elo: 1410, seed: 2 },
      { id: 4, name: 'DiamondAI', elo: 1380, seed: 7 },
      { id: 5, name: 'NeonViper', elo: 1390, seed: 3 },
      { id: 6, name: 'CyberFang', elo: 1350, seed: 6 },
      { id: 7, name: 'SolSniper', elo: 1400, seed: 4 },
      { id: 8, name: 'TokenKing', elo: 1360, seed: 5 },
    ],
    currentMatch: {
      bot1: { id: 5, name: 'NeonViper', hp: 1000, maxHp: 1000, elo: 1390 },
      bot2: { id: 6, name: 'CyberFang', hp: 1000, maxHp: 1000, elo: 1350 },
      trades: [],
      timeLeft: 240,
      status: 'fighting',
      matchIndex: 3,
      totalMatches: 4,
    },
    totalPool: 42.5,
  };
}

// ─── TYPES (RECENT BATTLES) ───────────────────────────────────────────────────

interface RecentBattle {
  id: string;
  bot1_id: number;
  bot2_id: number;
  bot1_name: string;
  bot2_name: string;
  token_symbol: string;
  winner_id: number;
  winner_name: string;
  bot1_prediction: number | null;
  bot2_prediction: number | null;
  actual_x: number | null;
  bot1_accuracy: number | null;
  bot2_accuracy: number | null;
  damage_dealt: number | null;
  created_at: string;
  finished_at: string;
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

function useTournamentData() {
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mockRef = useRef<TournamentData | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Normalize API data to match our internal format
  const normalizeApiData = useCallback((data: any): TournamentData => {
    const t = data.tournament;
    const cm = t.currentMatch;

    // Map API status to our expected values
    const statusMap: Record<string, 'waiting' | 'betting' | 'fighting' | 'finished'> = {
      fighting: 'fighting',
      active: 'fighting',
      paused: 'fighting', // treat paused as fighting for display
      finished: 'finished',
      waiting: 'waiting',
      pending: 'waiting',
      betting: 'betting',
      intermission: 'waiting', // between matches
    };

    // Normalize trades from API format to TickerTrade format
    const normalizedTrades: TickerTrade[] = (cm?.trades || []).map((tr: any, idx: number) => ({
      id: idx + 1,
      botName: tr.bot || tr.botName || 'Unknown',
      token: tr.token || 'SOL',
      action: (tr.side === 'SHORT' || tr.action === 'sell') ? 'sell' as const : 'buy' as const,
      pnl: typeof tr.pnl === 'number' ? tr.pnl : parseFloat(tr.pnl) || 0,
      isCombo: (typeof tr.pnl === 'number' ? Math.abs(tr.pnl) : 0) > 8,
      timestamp: tr.timestamp || Date.now(),
    }));

    // Figure out match count from rounds
    const roundMatches = t.rounds?.[String(t.currentRound)] || [];
    const currentMatchIdx = cm?.matchOrder ?? (roundMatches.findIndex((m: any) => m.status === 'active' || m.status === 'fighting') + 1 || 1);

    // Parse PnL string like "+21.56%" to number 21.56
    const parsePnl = (pnlStr: any): number => {
      if (typeof pnlStr === 'number') return pnlStr;
      if (typeof pnlStr === 'string') {
        const num = parseFloat(pnlStr.replace(/[^0-9.\-+]/g, ''));
        return isNaN(num) ? 0 : num;
      }
      return 0;
    };

    return {
      id: t.id || 'tournament',
      name: t.name || 'Tournament',
      status: t.status || 'active',
      league: t.league || 'free',
      eloMultiplier: t.eloMultiplier || 1.0,
      currentRound: t.currentRound ?? 1,
      totalRounds: t.totalRounds ?? 3,
      rounds: t.rounds || {},
      participants: (t.participants || []).map((p: any) => ({
        ...p,
        ai_model: p.model_id ? getModelDisplayName(p.model_id) : (p.ai_model || undefined),
        trading_style: p.trading_style || undefined,
        nfa_id: p.nfa_id ?? null,
      })),
      currentMatch: cm ? {
        bot1: {
          id: cm.bot1?.id ?? 0,
          name: cm.bot1?.name ?? 'Bot 1',
          hp: cm.bot1?.hp ?? 1000,
          maxHp: cm.bot1?.maxHp ?? 1000,
          elo: cm.bot1?.elo ?? t.participants?.find((p: any) => p.id === cm.bot1?.id)?.elo,
          pnl: parsePnl(cm.bot1?.pnl),
          ai_model: cm.bot1?.model_id ? getModelDisplayName(cm.bot1.model_id) : (cm.bot1?.ai_model ?? t.participants?.find((p: any) => p.id === cm.bot1?.id)?.ai_model),
          trading_style: cm.bot1?.trading_style ?? t.participants?.find((p: any) => p.id === cm.bot1?.id)?.trading_style,
          nfa_id: cm.bot1?.nfa_id ?? t.participants?.find((p: any) => p.id === cm.bot1?.id)?.nfa_id ?? null,
          lastTrade: cm.bot1?.lastTrade || undefined,
          position: cm.bot1?.position ?? null,
        },
        bot2: {
          id: cm.bot2?.id ?? 0,
          name: cm.bot2?.name ?? 'Bot 2',
          hp: cm.bot2?.hp ?? 1000,
          maxHp: cm.bot2?.maxHp ?? 1000,
          elo: cm.bot2?.elo ?? t.participants?.find((p: any) => p.id === cm.bot2?.id)?.elo,
          pnl: parsePnl(cm.bot2?.pnl),
          ai_model: cm.bot2?.model_id ? getModelDisplayName(cm.bot2.model_id) : (cm.bot2?.ai_model ?? t.participants?.find((p: any) => p.id === cm.bot2?.id)?.ai_model),
          trading_style: cm.bot2?.trading_style ?? t.participants?.find((p: any) => p.id === cm.bot2?.id)?.trading_style,
          nfa_id: cm.bot2?.nfa_id ?? t.participants?.find((p: any) => p.id === cm.bot2?.id)?.nfa_id ?? null,
          lastTrade: cm.bot2?.lastTrade || undefined,
          position: cm.bot2?.position ?? null,
        },
        trades: normalizedTrades,
        timeLeft: cm.timeLeft ?? 0,
        status: statusMap[cm.status] || 'fighting',
        winnerName: cm.winnerName ?? (typeof cm.winner === 'string' ? cm.winner : cm.winner?.name) ?? undefined,
        matchIndex: cm.matchIndex ?? currentMatchIdx,
        matchOrder: cm.matchOrder ?? currentMatchIdx,
        totalMatches: cm.totalMatches ?? (roundMatches.length || 4),
        token: cm.token || undefined,
        priceMode: cm.priceMode || undefined,
        bettingMatchId: cm.bettingMatchId || undefined,
        bettingEndsAt: cm.bettingEndsAt || undefined,
      } : null,
      nextMatchIn: t.nextMatchIn,
      totalPool: t.totalPool ?? 0,
    };
  }, []);

  // Try to fetch from API, fallback to mock
  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch('/api/tournament');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data.tournament && data.tournament.currentMatch) {
        setTournament(normalizeApiData(data));
        setError(false);
        return;
      }
    } catch {
      // API not available or no current match, use mock
    }

    // Fallback: use mock with local simulation
    if (!mockRef.current) {
      mockRef.current = createMockTournament();
    }
    setTournament({ ...mockRef.current });
    setError(false);
  }, [normalizeApiData]);

  // Simulate fight in mock mode
  useEffect(() => {
    if (!tournament || !tournament.currentMatch || tournament.currentMatch.status !== 'fighting') return;

    // Check if we're in mock mode (mock id prefix)
    const isMock = tournament.id.startsWith('mock-');
    if (!isMock) return;

    // Timer countdown
    timerRef.current = setInterval(() => {
      setTournament((prev) => {
        if (!prev || !prev.currentMatch) return prev;
        const newTimeLeft = Math.max(0, prev.currentMatch.timeLeft - 1);

        // Check for end conditions
        if (newTimeLeft === 0 || prev.currentMatch.bot1.hp <= 0 || prev.currentMatch.bot2.hp <= 0) {
          const winner = prev.currentMatch.bot1.hp >= prev.currentMatch.bot2.hp
            ? prev.currentMatch.bot1.name
            : prev.currentMatch.bot2.name;
          return {
            ...prev,
            currentMatch: { ...prev.currentMatch, timeLeft: newTimeLeft, status: 'finished', winnerName: winner },
          };
        }

        return { ...prev, currentMatch: { ...prev.currentMatch, timeLeft: newTimeLeft } };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tournament?.id, tournament?.currentMatch?.status]);

  // Generate mock trades
  useEffect(() => {
    if (!tournament || !tournament.currentMatch || tournament.currentMatch.status !== 'fighting') return;
    const isMock = tournament.id.startsWith('mock-');
    if (!isMock) return;

    const scheduleNextTrade = () => {
      const delay = randomBetween(2000, 4000);
      tradeTimerRef.current = setTimeout(() => {
        setTournament((prev) => {
          if (!prev || !prev.currentMatch || prev.currentMatch.status !== 'fighting') return prev;

          const trade = generateMockTrade(prev.currentMatch.bot1.name, prev.currentMatch.bot2.name);
          const isBot1 = trade.botName === prev.currentMatch.bot1.name;
          const damage = Math.abs(trade.pnl) * 4;

          let newBot1Hp = prev.currentMatch.bot1.hp;
          let newBot2Hp = prev.currentMatch.bot2.hp;

          if (trade.pnl > 0) {
            // Attacker profits → defender takes damage
            if (isBot1) newBot2Hp = Math.max(0, newBot2Hp - damage);
            else newBot1Hp = Math.max(0, newBot1Hp - damage);
          } else {
            // Attacker fails → self-damage (less)
            if (isBot1) newBot1Hp = Math.max(0, newBot1Hp - damage / 2);
            else newBot2Hp = Math.max(0, newBot2Hp - damage / 2);
          }

          const newTrades = [trade, ...prev.currentMatch.trades].slice(0, 50);

          // Recalculate cumulative PnL per bot from all trades
          let pnl1 = 0, pnl2 = 0;
          for (const t of newTrades) {
            if (t.botName === prev.currentMatch.bot1.name) pnl1 += t.pnl;
            else pnl2 += t.pnl;
          }

          return {
            ...prev,
            currentMatch: {
              ...prev.currentMatch,
              bot1: { ...prev.currentMatch.bot1, hp: newBot1Hp, pnl: pnl1 },
              bot2: { ...prev.currentMatch.bot2, hp: newBot2Hp, pnl: pnl2 },
              trades: newTrades,
            },
          };
        });

        tradeTimerRef.current = scheduleNextTrade();
      }, delay);
      return tradeTimerRef.current;
    };

    tradeTimerRef.current = scheduleNextTrade();

    return () => {
      if (tradeTimerRef.current) clearTimeout(tradeTimerRef.current);
    };
  }, [tournament?.id, tournament?.currentMatch?.status]);

  // Initial fetch + polling for API data
  useEffect(() => {
    fetchTournament().then(() => setLoading(false));

    // Only poll API in non-mock mode (mock uses local simulation)
    // We still poll to detect when API becomes available
    const pollInterval = setInterval(() => {
      // Light poll to check if API has data
      fetch('/api/tournament')
        .then((r) => r.json())
        .then((data) => {
          if (data.tournament?.currentMatch) {
            setTournament(normalizeApiData(data));
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [fetchTournament, normalizeApiData]);

  return { tournament, loading, error };
}

function useRecentBattles() {
  const [battles, setBattles] = useState<RecentBattle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBattles = async () => {
      try {
        const res = await fetch('/api/arena/recent-battles');
        if (res.ok) {
          const data = await res.json();
          setBattles(data.battles || []);
        }
      } catch (error) {
        console.error('Failed to fetch recent battles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBattles();
  }, []);

  return { battles, loading };
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function WatchPage() {
  const { tournament, loading } = useTournamentData();
  const { battles: recentBattles, loading: battlesLoading } = useRecentBattles();
  const [showBracket, setShowBracket] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0014] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="inline-block"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <div className="w-12 h-12 rounded-full border-2 border-transparent border-t-[#9945FF] border-r-[#14F195]" />
          </motion.div>
          <p className="text-gray-400 mt-4 font-orbitron text-sm">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    // Show recent battles instead of empty state
    return (
      <div className="min-h-screen bg-[#0a0014]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="font-orbitron text-2xl font-bold text-white mb-2">No Active Tournament</h1>
            <p className="text-gray-400 text-sm mb-6">Check back soon — tournaments run weekly!</p>
          </div>

          {/* Recent Battles Section */}
          <div className="mt-8">
            <h2 className="font-orbitron text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">⚔️</span>
              Recent Battles
            </h2>
            
            {battlesLoading ? (
              <div className="text-center py-12">
                <motion.div
                  className="inline-block"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-[#9945FF] border-r-[#14F195]" />
                </motion.div>
              </div>
            ) : recentBattles.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No battles yet. Check back soon!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentBattles.map((battle, idx) => (
                  <motion.div
                    key={battle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 rounded-xl border border-white/10 p-5 hover:border-[#9945FF]/30 transition-all"
                  >
                    {/* Battle Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-gray-500 font-mono">
                        {new Date(battle.finished_at).toLocaleDateString()}
                      </div>
                      <div className="px-2 py-1 bg-[#9945FF]/10 border border-[#9945FF]/30 rounded text-xs text-[#9945FF] font-semibold">
                        {battle.token_symbol}
                      </div>
                    </div>

                    {/* Bot vs Bot */}
                    <div className="space-y-3 mb-4">
                      {/* Bot 1 */}
                      <div className={`flex items-center justify-between p-2 rounded-lg ${
                        battle.winner_id === battle.bot1_id 
                          ? 'bg-green-500/10 border border-green-500/30' 
                          : 'bg-red-500/5 border border-red-500/20'
                      }`}>
                        <div className="flex items-center gap-2">
                          {battle.winner_id === battle.bot1_id && <span className="text-yellow-400">👑</span>}
                          <span className="font-semibold text-white text-sm">{battle.bot1_name}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {battle.bot1_accuracy !== null ? `${battle.bot1_accuracy.toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>

                      {/* VS */}
                      <div className="text-center text-gray-600 text-xs font-bold">VS</div>

                      {/* Bot 2 */}
                      <div className={`flex items-center justify-between p-2 rounded-lg ${
                        battle.winner_id === battle.bot2_id 
                          ? 'bg-green-500/10 border border-green-500/30' 
                          : 'bg-red-500/5 border border-red-500/20'
                      }`}>
                        <div className="flex items-center gap-2">
                          {battle.winner_id === battle.bot2_id && <span className="text-yellow-400">👑</span>}
                          <span className="font-semibold text-white text-sm">{battle.bot2_name}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {battle.bot2_accuracy !== null ? `${battle.bot2_accuracy.toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Battle Stats */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-white/5">
                      <div>
                        Actual: <span className="text-[#14F195] font-semibold">
                          {battle.actual_x ? `${battle.actual_x.toFixed(2)}x` : 'N/A'}
                        </span>
                      </div>
                      {battle.damage_dealt && (
                        <div>
                          Damage: <span className="text-red-400 font-semibold">{battle.damage_dealt}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const cm = tournament.currentMatch;
  const matchStatus = cm?.status || 'waiting';

  // Map bots to fight view props
  const fightBotA: FightBotState | null = cm ? {
    id: cm.bot1.id,
    name: cm.bot1.name,
    hp: cm.bot1.hp,
    maxHp: cm.bot1.maxHp,
    color: '#9945FF',
    glowColor: 'rgba(153, 69, 255, 0.6)',
    pnl: cm.bot1.pnl,
    ai_model: cm.bot1.ai_model,
    trading_style: cm.bot1.trading_style,
    elo: cm.bot1.elo,
    nfa_id: cm.bot1.nfa_id,
    lastTrade: cm.bot1.lastTrade,
    position: cm.bot1.position,
  } : null;

  const fightBotB: FightBotState | null = cm ? {
    id: cm.bot2.id,
    name: cm.bot2.name,
    hp: cm.bot2.hp,
    maxHp: cm.bot2.maxHp,
    color: '#14F195',
    glowColor: 'rgba(20, 241, 149, 0.6)',
    pnl: cm.bot2.pnl,
    ai_model: cm.bot2.ai_model,
    trading_style: cm.bot2.trading_style,
    elo: cm.bot2.elo,
    nfa_id: cm.bot2.nfa_id,
    lastTrade: cm.bot2.lastTrade,
    position: cm.bot2.position,
  } : null;

  return (
    <div className="min-h-screen bg-[#0a0014]">
      {/* Header */}
      <TournamentHeader
        name={tournament.name}
        currentRound={tournament.currentRound}
        totalRounds={tournament.totalRounds}
        currentMatchIndex={cm?.matchIndex ?? 1}
        totalMatchesInRound={cm?.totalMatches ?? 4}
        status={tournament.status === 'active' && matchStatus === 'fighting' ? 'active' : tournament.status === 'finished' ? 'finished' : 'waiting'}
        nextMatchIn={tournament.nextMatchIn}
      />

      {/* League Badge */}
      {tournament.league === 'nfa' && (
        <div className="mx-auto max-w-[1600px] px-3 md:px-6 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs font-semibold">
            🏅 NFA League — 1.5x ELO
          </div>
        </div>
      )}

      {/* NFA Badges for current fighters */}
      {cm && (
        <div className="mx-auto max-w-[1600px] px-3 md:px-6 pt-1 flex items-center justify-center gap-4 text-xs">
          {(() => {
            const p1 = tournament.participants.find(p => p.id === cm.bot1.id);
            const p2 = tournament.participants.find(p => p.id === cm.bot2.id);
            return (
              <>
                {p1?.nfa_id != null && <NFABadge nfaId={p1.nfa_id} compact />}
                {(p1?.nfa_id != null || p2?.nfa_id != null) && <span className="text-gray-600">vs</span>}
                {p2?.nfa_id != null && <NFABadge nfaId={p2.nfa_id} compact />}
              </>
            );
          })()}
        </div>
      )}

      {/* Main content */}
      <div className="px-3 md:px-6 pb-4 max-w-[1600px] mx-auto">
        {/* Desktop: 2-column layout — Bracket | Fight */}
        <div className="hidden lg:grid lg:grid-cols-[320px_1fr] gap-5 h-[calc(100vh-180px)] min-h-[500px]">
          {/* Left: Bracket */}
          <motion.div
            className="overflow-y-auto"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <TournamentBracketPanel
              rounds={tournament.rounds}
              currentRound={tournament.currentRound}
              totalRounds={tournament.totalRounds}
            />
          </motion.div>

          {/* Center: Fight View */}
          <div className="min-w-0 min-h-0">
            <LiveFightView
              botA={fightBotA}
              botB={fightBotB}
              status={matchStatus}
              timeLeft={cm?.timeLeft ?? 0}
              winnerName={cm?.winnerName}
              nextMatchIn={tournament.nextMatchIn}
              token={cm?.token}
              bettingEndsAt={cm?.bettingEndsAt}
            />
          </div>
        </div>

        {/* Mobile: vertical stack layout */}
        <div className="lg:hidden flex flex-col gap-3">
          {/* Fight View */}
          <motion.div
            className="relative rounded-xl overflow-hidden border border-white/5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="min-h-[420px]">
              <LiveFightView
                botA={fightBotA}
                botB={fightBotB}
                status={matchStatus}
                timeLeft={cm?.timeLeft ?? 0}
                winnerName={cm?.winnerName}
                nextMatchIn={tournament.nextMatchIn}
                token={cm?.token}
                bettingEndsAt={cm?.bettingEndsAt}
              />
            </div>
          </motion.div>

          {/* Bracket toggle — full width */}
          <div>
            <button
              onClick={() => setShowBracket(!showBracket)}
              className="w-full py-2 px-3 rounded-lg border border-white/10 bg-gray-900/40 text-xs text-gray-400 font-orbitron tracking-wider hover:border-white/20 transition-all"
            >
              {showBracket ? '▼ Hide' : '▶ Show'} Bracket
            </button>

            <AnimatePresence>
              {showBracket && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="max-h-72 overflow-y-auto">
                    <TournamentBracketPanel
                      rounds={tournament.rounds}
                      currentRound={tournament.currentRound}
                      totalRounds={tournament.totalRounds}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Trade Ticker (bottom) */}
        <motion.div
          className="mt-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <TradeTicker trades={cm?.trades ?? []} />
        </motion.div>
      </div>
    </div>
  );
}
