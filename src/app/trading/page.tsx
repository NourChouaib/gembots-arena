'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getRobotImage } from '@/lib/robot-images';
import Image from 'next/image';

// ─── Types ───

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
  updated_at?: string;
}

interface Tournament {
  id: number;
  name: string;
  status: string;
  start_at: string;
  end_at: string;
  prize_pool_bnb?: number;
}

interface DashboardStats {
  totalBots: number;
  activeBots: number;
  totalTrades: number;
  overallWinRate: number;
  openPositionCount: number;
  avgOpenPnl: number;
  totalBalance: number;
  totalInitial: number;
  bestTradePct: number;
  worstTradePct: number;
  trades24h: number;
}

interface TopPerformer {
  bot_id: number;
  bot_name: string;
  strategy: string;
  nfa_id: number;
  league: string;
  virtual_balance: number;
  initial_balance: number;
  total_trades: number;
  winning_trades: number;
  total_pnl_percent: number;
  roi_pct: number;
  win_rate: number;
  open_positions: number;
  last_updated: string;
}

interface OpenPosition {
  bot_id: number;
  bot_name: string;
  strategy: string;
  nfa_id: number;
  token_symbol: string;
  amount_usd: number;
  entry_price: number;
  current_price: number;
  pnl_percent: number;
  entry_time: string;
  live_pnl_pct: number;
}

interface StrategyBreakdown {
  strategy: string;
  bot_count: number;
  total_trades: number;
  avg_win_rate: number;
  avg_roi: number;
}

interface TokenDistribution {
  token_symbol: string;
  position_count: number;
  total_usd: number;
  avg_pnl_pct: number;
}

interface DashboardData {
  topPerformers: TopPerformer[];
  openPositions: OpenPosition[];
  stats: DashboardStats;
  strategyBreakdown: StrategyBreakdown[];
  tokenDistribution: TokenDistribution[];
  updatedAt: string;
}

// ─── Constants ───

const STRATEGY_STYLES: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  trend_follower: { label: 'Trend', emoji: '📈', color: 'text-green-400', bg: 'bg-green-500/10' },
  whale_watcher: { label: 'Whale', emoji: '🐋', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  mean_reversion: { label: 'Mean Rev', emoji: '🔄', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  smart_ai: { label: 'Neural', emoji: '🧠', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  chaos: { label: 'Chaos', emoji: '🎲', color: 'text-red-400', bg: 'bg-red-500/10' },
  momentum: { label: 'Momentum', emoji: '🚀', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  scalper: { label: 'Scalper', emoji: '⚡', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  swing: { label: 'Swing', emoji: '🏄', color: 'text-teal-400', bg: 'bg-teal-500/10' },
  contrarian: { label: 'Contrarian', emoji: '🔮', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  default: { label: 'Default', emoji: '🤖', color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

const TOKEN_COLORS: Record<string, string> = {
  BTC: 'text-orange-400',
  ETH: 'text-blue-400',
  SOL: 'text-purple-400',
  BNB: 'text-yellow-400',
};

type TabType = 'dashboard' | 'tournament' | 'alltime' | 'weekly';

// ─── Component ───

export default function TradingPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/paper-trading/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const data = await res.json();
      setDashboard(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  }, []);

  const fetchLeaderboard = useCallback(async (tab: TabType) => {
    try {
      const res = await fetch(`/api/nfa/trading/leaderboard?type=${tab}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEntries(data.entries || []);
      setTournament(data.tournament || null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      if (activeTab === 'dashboard') {
        await fetchDashboard();
      } else {
        await fetchLeaderboard(activeTab);
      }
      setLoading(false);
    };
    load();
    const interval = setInterval(() => {
      if (activeTab === 'dashboard') fetchDashboard();
      else fetchLeaderboard(activeTab);
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, fetchDashboard, fetchLeaderboard]);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Live Dashboard', icon: '📊' },
    { id: 'tournament', label: 'Tournament', icon: '🏆' },
    { id: 'alltime', label: 'All-Time', icon: '📈' },
    { id: 'weekly', label: 'Weekly', icon: '📅' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl font-bold text-white mb-2"
          >
            💰 NFA Trading League
          </motion.h1>
          <p className="text-gray-400">
            AI agents trading crypto with virtual balances. Real prices, real strategies, paper gains.
          </p>
          {lastUpdate && (
            <p className="text-xs text-gray-600 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refreshes every 30s
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-600/30 border border-purple-500/50 text-purple-300'
                  : 'bg-gray-800/40 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : activeTab === 'dashboard' ? (
          <DashboardView dashboard={dashboard} />
        ) : (
          <LeaderboardView entries={entries} tournament={tournament} />
        )}

        {/* How it works */}
        <div className="mt-12 bg-gray-800/20 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">🤔 How Paper Trading Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-2xl mb-2">📝</div>
              <h4 className="font-medium text-white mb-1">Virtual Balance</h4>
              <p className="text-gray-400">
                Each NFA starts with $10,000 virtual balance. Trades happen at real market prices — no cheating.
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">🤖</div>
              <h4 className="font-medium text-white mb-1">AI Strategies</h4>
              <p className="text-gray-400">
                6 unique strategies: Trend Following, Whale Watching, Mean Reversion, Momentum, Scalping & Contrarian.
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">🏆</div>
              <h4 className="font-medium text-white mb-1">Tournaments</h4>
              <p className="text-gray-400">
                Weekly tournaments rank bots by PnL. Top performers prove their AI edge. Best track records get real vaults.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard View ───

function DashboardView({ dashboard }: { dashboard: DashboardData | null }) {
  if (!dashboard) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-xl font-bold text-white mb-2">No Trading Data Yet</h2>
        <p className="text-gray-400">Paper trading engine is warming up. Check back soon!</p>
      </div>
    );
  }

  const { stats, topPerformers, openPositions, strategyBreakdown, tokenDistribution } = dashboard;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Active Bots"
          value={stats.activeBots.toString()}
          sub={`of ${stats.totalBots} total`}
          icon="🤖"
          color="text-purple-400"
        />
        <StatCard
          label="Open Positions"
          value={stats.openPositionCount.toString()}
          sub={`Avg PnL: ${stats.avgOpenPnl >= 0 ? '+' : ''}${stats.avgOpenPnl.toFixed(2)}%`}
          icon="📂"
          color={stats.avgOpenPnl >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard
          label="Total Trades"
          value={stats.totalTrades.toString()}
          sub={`${stats.trades24h} in 24h`}
          icon="📊"
          color="text-blue-400"
        />
        <StatCard
          label="Win Rate"
          value={`${stats.overallWinRate}%`}
          sub={stats.overallWinRate >= 50 ? 'Profitable' : 'Learning'}
          icon="🎯"
          color={stats.overallWinRate >= 50 ? 'text-green-400' : 'text-yellow-400'}
        />
        <StatCard
          label="Best Trade"
          value={`+${stats.bestTradePct}%`}
          sub="All-time best"
          icon="🚀"
          color="text-green-400"
        />
        <StatCard
          label="Portfolio"
          value={`${stats.totalBalance.toFixed(3)}`}
          sub={`Initial: ${stats.totalInitial.toFixed(3)}`}
          icon="💰"
          color={stats.totalBalance >= stats.totalInitial ? 'text-green-400' : 'text-red-400'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-xl p-5"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            🏆 Top Performers
            <span className="text-xs text-gray-500 font-normal">by ROI</span>
          </h3>
          <div className="space-y-3">
            {topPerformers.slice(0, 5).map((bot, idx) => {
              const strat = STRATEGY_STYLES[bot.strategy] || STRATEGY_STYLES.default;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
              const roi = bot.roi_pct;

              return (
                <div
                  key={bot.bot_id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-lg w-8 text-center">{medal}</span>
                  {bot.nfa_id ? (
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-700 flex-shrink-0">
                      <Image
                        src={getRobotImage(bot.nfa_id)}
                        alt={bot.bot_name}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-lg flex-shrink-0">
                      {strat.emoji}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{bot.bot_name}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={strat.color}>{strat.emoji} {strat.label}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500">{bot.total_trades} trades</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500">{bot.win_rate}% WR</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-bold ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {bot.open_positions} open
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Live Positions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-xl p-5"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            📂 Live Positions
            <span className="text-xs text-gray-500 font-normal">{stats.openPositionCount} open</span>
          </h3>
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
            {openPositions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No open positions</div>
            ) : (
              openPositions.map((pos, idx) => {
                const strat = STRATEGY_STYLES[pos.strategy] || STRATEGY_STYLES.default;
                const pnl = pos.live_pnl_pct;
                const tokenColor = TOKEN_COLORS[pos.token_symbol] || 'text-gray-300';

                return (
                  <div
                    key={`${pos.bot_id}-${pos.token_symbol}-${idx}`}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-800/20 hover:bg-gray-800/40 transition-colors text-sm"
                  >
                    <span className={`font-bold ${tokenColor} w-10`}>{pos.token_symbol}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-300 text-xs truncate">{pos.bot_name}</div>
                      <div className="text-[10px] text-gray-600">
                        Entry: ${pos.entry_price.toLocaleString()} → ${(pos.current_price || pos.entry_price).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`font-medium ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-gray-600">${pos.amount_usd.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-xl p-5"
        >
          <h3 className="text-lg font-bold text-white mb-4">⚔️ Strategy Breakdown</h3>
          <div className="space-y-3">
            {strategyBreakdown.map(s => {
              const strat = STRATEGY_STYLES[s.strategy] || STRATEGY_STYLES.default;
              return (
                <div key={s.strategy} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${strat.bg} flex items-center justify-center text-xl`}>
                    {strat.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${strat.color}`}>{strat.label}</span>
                      <span className={`text-sm font-bold ${s.avg_roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {s.avg_roi >= 0 ? '+' : ''}{s.avg_roi.toFixed(2)}% ROI
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span>{s.bot_count} bots</span>
                      <span>{s.total_trades} trades</span>
                      <span>{s.avg_win_rate}% WR</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Token Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 rounded-xl p-5"
        >
          <h3 className="text-lg font-bold text-white mb-4">🪙 Token Distribution</h3>
          {tokenDistribution.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No active positions</div>
          ) : (
            <div className="space-y-4">
              {tokenDistribution.map(token => {
                const tokenColor = TOKEN_COLORS[token.token_symbol] || 'text-gray-300';
                const maxPositions = Math.max(...tokenDistribution.map(t => t.position_count));
                const barWidth = maxPositions > 0 ? (token.position_count / maxPositions) * 100 : 0;

                return (
                  <div key={token.token_symbol}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${tokenColor}`}>{token.token_symbol}</span>
                        <span className="text-xs text-gray-500">{token.position_count} positions</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-400">${token.total_usd.toFixed(2)}</span>
                        <span className={`font-medium ${token.avg_pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {token.avg_pnl_pct >= 0 ? '+' : ''}{token.avg_pnl_pct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          token.avg_pnl_pct >= 0
                            ? 'bg-gradient-to-r from-green-600 to-green-400'
                            : 'bg-gradient-to-r from-red-600 to-red-400'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Leaderboard View ───

function LeaderboardView({ entries, tournament }: { entries: LeaderboardEntry[]; tournament: Tournament | null }) {
  const totalPnl = entries.reduce((sum, e) => sum + (e.pnl_usd || 0), 0);
  const totalTrades = entries.reduce((sum, e) => sum + (e.trades || 0), 0);
  const avgWinRate = entries.length > 0
    ? entries.reduce((sum, e) => sum + (e.win_rate || 0), 0) / entries.length
    : 0;

  return (
    <>
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{entries.length}</div>
          <div className="text-xs text-gray-500 uppercase">Active Traders</div>
        </div>
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
          <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 uppercase">Total PnL</div>
        </div>
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalTrades}</div>
          <div className="text-xs text-gray-500 uppercase">Total Trades</div>
        </div>
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-teal-400">{avgWinRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 uppercase">Avg Win Rate</div>
        </div>
      </div>

      {/* Tournament Banner */}
      {tournament && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-xl p-5 mb-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-yellow-400">🏆 {tournament.name}</h2>
              <p className="text-sm text-gray-400">
                {new Date(tournament.start_at).toLocaleDateString()} → {new Date(tournament.end_at).toLocaleDateString()}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                  tournament.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-gray-700/50 text-gray-400'
                }`}>
                  {tournament.status.toUpperCase()}
                </span>
              </p>
            </div>
            {tournament.prize_pool_bnb && (
              <div className="text-right">
                <div className="text-xl font-bold text-yellow-400">{tournament.prize_pool_bnb} BNB</div>
                <div className="text-xs text-gray-500">Prize Pool</div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Leaderboard Table */}
      {entries.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">No Trading Data Yet</h2>
          <p className="text-gray-400">Paper trading bots are warming up. Check back soon!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="text-left px-4 py-3 w-12">#</th>
                <th className="text-left px-4 py-3">Bot</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Strategy</th>
                <th className="text-right px-4 py-3">PnL</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">Trades</th>
                <th className="text-right px-4 py-3">Win Rate</th>
                <th className="text-right px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const strat = STRATEGY_STYLES[entry.strategy] || STRATEGY_STYLES.default;
                const rank = entry.rank || idx + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;

                return (
                  <motion.tr
                    key={entry.bot_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`text-lg ${rank <= 3 ? '' : 'text-gray-500 text-sm'}`}>
                        {medal}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {entry.nfa_id && (
                          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-700 flex-shrink-0">
                            <Image
                              src={getRobotImage(entry.nfa_id)}
                              alt={entry.bot_name}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          </div>
                        )}
                        <div>
                          <div className="text-white font-medium text-sm">{entry.bot_name}</div>
                          {entry.nfa_id && (
                            <div className="text-[10px] text-gray-500">NFA #{entry.nfa_id}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-sm ${strat.color}`}>
                        {strat.emoji} {strat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`font-bold text-sm ${entry.pnl_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {entry.pnl_usd >= 0 ? '+' : ''}${entry.pnl_usd.toFixed(2)}
                      </div>
                      <div className={`text-[10px] ${entry.pnl_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.pnl_pct >= 0 ? '+' : ''}{entry.pnl_pct.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-sm hidden md:table-cell">
                      {entry.trades}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${
                        entry.win_rate >= 55 ? 'text-green-400' :
                        entry.win_rate >= 45 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {entry.win_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {entry.nfa_id && (
                        <Link
                          href={`/trading/${entry.nfa_id}`}
                          className="px-3 py-1 rounded-lg bg-gray-700/50 text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                        >
                          View →
                        </Link>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Sub-components ───

function StatCard({ label, value, sub, icon, color }: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] text-gray-600 uppercase">{label}</span>
      </div>
      <div className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>
    </motion.div>
  );
}

function LoadingSpinner() {
  return (
    <div className="text-center py-16">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
        <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 animate-spin" />
      </div>
      <p className="text-gray-400 animate-pulse">Loading trading data...</p>
    </div>
  );
}
