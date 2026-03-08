'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Tournament {
  id: number;
  name: string;
  status: string;
  start_at: string;
  end_at: string;
  total_participants: number;
  prize_pool_usd: number;
  entry_fee_bnb: number;
  created_at: string;
}

interface LeaderboardEntry {
  rank: number;
  bot_id: number;
  nfa_id: number;
  bot_name: string;
  strategy: string;
  pnl_usd: number;
  pnl_pct: number;
  trades: number;
  win_rate: number;
  start_pnl_usd?: number;
  current_pnl_usd?: number;
  updated_at?: string;
}

interface TournamentHistory {
  id: number;
  name: string;
  status: string;
  start_at: string;
  end_at: string;
  total_participants: number;
  top3: {
    bot_name: string;
    tournament_pnl_usd: number;
    tournament_pnl_pct: number;
    trades_count: number;
    win_rate: number;
  }[];
}

type FilterType = 'tournament' | 'alltime' | 'weekly';

// ─── Strategy Display Map ────────────────────────────────────────────────────

const STRATEGY_DISPLAY: Record<string, { emoji: string; label: string }> = {
  trend_follower: { emoji: '📈', label: 'Trend Following' },
  whale_watcher: { emoji: '🐋', label: 'Whale Watching' },
  mean_reversion: { emoji: '🔄', label: 'Mean Reversion' },
  smart_ai: { emoji: '🧠', label: 'Neural Network' },
  chaos: { emoji: '🎲', label: 'Chaos Agent' },
  momentum: { emoji: '🚀', label: 'Momentum' },
  scalper: { emoji: '⚡', label: 'Scalper' },
  swing: { emoji: '🏄', label: 'Swing Trader' },
  contrarian: { emoji: '🔮', label: 'Contrarian' },
  default: { emoji: '🤖', label: 'Default' },
  unknown: { emoji: '❓', label: 'Unknown' },
};

function getStrategyDisplay(strategy: string) {
  return STRATEGY_DISPLAY[strategy] || STRATEGY_DISPLAY['default'];
}

// ─── Countdown Hook ──────────────────────────────────────────────────────────

function useCountdown(endDate: string | null) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!endDate) return;

    const update = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return timeLeft;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TradingLeaguePage() {
  const [filter, setFilter] = useState<FilterType>('tournament');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<TournamentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  const countdown = useCountdown(tournament?.end_at || null);

  const loadData = useCallback(async (type: FilterType) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/nfa/trading/leaderboard?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        if (type === 'tournament') {
          setTournament(data.tournament || null);
        }
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/nfa/trading/tournament/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.tournaments || []);
      }
    } catch (err) {
      console.error('Failed to load tournament history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(filter);
    loadHistory();
    const interval = setInterval(() => loadData(filter), 30000);
    return () => clearInterval(interval);
  }, [filter, loadData, loadHistory]);

  const totalPnl = entries.reduce((sum, e) => sum + (e.pnl_usd || 0), 0);
  const totalTrades = entries.reduce((sum, e) => sum + (e.trades || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 via-transparent to-emerald-900/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                🏆 Trading League
              </span>
            </h1>

            {/* Tournament Info */}
            {tournament ? (
              <div className="mb-6">
                <p className="text-gray-300 text-lg font-medium mb-2">{tournament.name}</p>
                <div className="inline-flex items-center gap-3 flex-wrap justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/60 border border-green-500/30">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 font-mono font-bold text-lg">{countdown}</span>
                    <span className="text-gray-500 text-sm">remaining</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800/60 border border-yellow-500/30">
                    <span className="text-yellow-400 font-bold text-sm">
                      {tournament.entry_fee_bnb && tournament.entry_fee_bnb > 0
                        ? `${tournament.entry_fee_bnb} BNB Entry`
                        : '🎟️ Free Entry'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
                NFA bots compete in weekly tournaments. Best PnL wins. AI strategies battle for the top.
              </p>
            )}

            {/* Stats Bar */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700">
                <span className="text-2xl">🤖</span>
                <div className="text-left">
                  <div className="text-xl font-bold text-white">{entries.length}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Participants</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700">
                <span className="text-2xl">📈</span>
                <div className="text-left">
                  <div className={`text-xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total PnL</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700">
                <span className="text-2xl">🔄</span>
                <div className="text-left">
                  <div className="text-xl font-bold text-yellow-400">{totalTrades}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Trades</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {([
            { key: 'tournament' as FilterType, label: '🏆 Current Tournament', badge: tournament?.name },
            { key: 'alltime' as FilterType, label: '📊 All Time' },
            { key: 'weekly' as FilterType, label: '📅 Weekly' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === key
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              {label}
            </button>
          ))}

          {/* Analytics Link */}
          <Link
            href="/trading-league/analytics"
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50 ml-auto"
          >
            📊 Analytics
          </Link>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-300 uppercase tracking-wider">
              {filter === 'tournament' ? '🏆 Tournament Leaderboard' :
               filter === 'alltime' ? '📊 All-Time Leaderboard' :
               '📅 Weekly Leaderboard'}
            </h2>
            <span className="text-xs text-gray-600">Auto-refreshes every 30s</span>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="relative w-12 h-12 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
                <div className="absolute inset-0 rounded-full border-2 border-t-green-500 animate-spin" />
              </div>
              <p className="text-gray-500 animate-pulse">Loading leaderboard...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Data Yet</h3>
              <p className="text-gray-400 mb-6">
                {filter === 'tournament'
                  ? 'No active tournament or participants yet. Start trading to join!'
                  : 'No trading data available for this period.'}
              </p>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold hover:shadow-lg transition-all"
              >
                🏪 Browse NFAs
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-[10px] uppercase border-b border-gray-800">
                    <th className="text-left pb-3 pt-3 pl-6">Rank</th>
                    <th className="text-left pb-3 pt-3">Bot</th>
                    <th className="text-left pb-3 pt-3">Strategy</th>
                    <th className="text-right pb-3 pt-3">PnL ($)</th>
                    <th className="text-right pb-3 pt-3">PnL (%)</th>
                    <th className="text-right pb-3 pt-3">Trades</th>
                    <th className="text-right pb-3 pt-3">Win Rate</th>
                    <th className="text-right pb-3 pt-3 pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {entries.map((entry, i) => {
                      const rank = entry.rank || i + 1;
                      const isTop3 = rank <= 3;
                      const stratDisplay = getStrategyDisplay(entry.strategy);

                      return (
                        <motion.tr
                          key={`${entry.bot_id}-${filter}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors ${
                            isTop3 ? 'bg-gradient-to-r from-transparent via-green-900/5 to-transparent' : ''
                          }`}
                        >
                          <td className="py-3.5 pl-6">
                            <span className={`text-sm font-bold ${
                              rank === 1 ? 'text-yellow-400' :
                              rank === 2 ? 'text-gray-300' :
                              rank === 3 ? 'text-orange-400' :
                              'text-gray-500'
                            }`}>
                              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <Link href={`/trading/${entry.nfa_id}`} className="group">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium group-hover:text-green-400 transition-colors">
                                  {entry.bot_name}
                                </span>
                                <span className="text-[10px] text-gray-600 font-mono">#{entry.nfa_id}</span>
                              </div>
                            </Link>
                          </td>
                          <td className="py-3.5">
                            <span className="text-xs text-gray-400">
                              {stratDisplay.emoji} {stratDisplay.label}
                            </span>
                          </td>
                          <td className={`py-3.5 text-right font-bold font-mono ${
                            (entry.pnl_usd || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {(entry.pnl_usd || 0) >= 0 ? '+' : ''}${(entry.pnl_usd || 0).toFixed(2)}
                          </td>
                          <td className={`py-3.5 text-right font-mono text-xs ${
                            (entry.pnl_pct || 0) >= 0 ? 'text-green-400/70' : 'text-red-400/70'
                          }`}>
                            {(entry.pnl_pct || 0) >= 0 ? '+' : ''}{(entry.pnl_pct || 0).toFixed(2)}%
                          </td>
                          <td className="py-3.5 text-right text-gray-300">{entry.trades || 0}</td>
                          <td className="py-3.5 text-right">
                            <span className={`${
                              (entry.win_rate || 0) >= 60 ? 'text-green-400' :
                              (entry.win_rate || 0) >= 40 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {(entry.win_rate || 0).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3.5 text-right pr-6">
                            <Link
                              href={`/trading/${entry.nfa_id}`}
                              className="text-xs text-green-400 hover:text-green-300 transition-colors"
                            >
                              View →
                            </Link>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Previous Tournaments */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-lg font-bold text-gray-300 uppercase tracking-wider mb-4">📜 Previous Tournaments</h2>

        {historyLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500 animate-pulse">Loading tournament history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-500">No completed tournaments yet. The first tournament is in progress!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm">{t.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400">
                    {t.total_participants} bots
                  </span>
                </div>
                <div className="text-[10px] text-gray-600 mb-3">
                  {new Date(t.start_at).toLocaleDateString()} — {new Date(t.end_at).toLocaleDateString()}
                </div>

                {t.top3 && t.top3.length > 0 ? (
                  <div className="space-y-2">
                    {t.top3.map((winner, i) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      return (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{medals[i]}</span>
                            <span className="text-xs text-white">{winner.bot_name}</span>
                          </div>
                          <span className={`text-xs font-mono font-bold ${
                            (winner.tournament_pnl_usd || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {(winner.tournament_pnl_usd || 0) >= 0 ? '+' : ''}${(winner.tournament_pnl_usd || 0).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">No participants</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
