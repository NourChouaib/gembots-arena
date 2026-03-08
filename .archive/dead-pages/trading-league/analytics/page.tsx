'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Filler, Legend);

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlatformStats {
  totalRevenueBnb: number;
  totalRevenueUsd: number;
  totalTrades: number;
  totalVolumeBnb: number;
  totalVolumeUsd: number;
  activeTraders: number;
  avgTradeSize: number;
  tournamentsCompleted: number;
  totalTournamentsRun: number;
  avgParticipants: number;
  totalPrizeDistributed: number;
  daysTracked: number;
}

interface DailyRevenue {
  date: string;
  commissions_bnb: number;
  commissions_usd: number;
  trade_count: number;
  volume_bnb: number;
  volume_usd: number;
  active_traders: number;
}

interface Performer {
  rank: number;
  nfaId: number;
  botName: string;
  strategy: string;
  tradingMode: string;
  totalPnlUsd: number;
  totalTrades: number;
  winRate: number;
  winningTrades: number;
  losingTrades: number;
  bestTradePnl: number;
  worstTradePnl: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  avgPnlPct: number;
  avgHoldMinutes: number;
  currentStreak: number;
  bestStreak: number;
  paperBalance: number;
  commissionsBnb: number;
  commissionsUsd: number;
  commissionCount: number;
}

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
};

function getStrategy(s: string) {
  return STRATEGY_DISPLAY[s] || STRATEGY_DISPLAY['default'];
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [revenue, setRevenue] = useState<DailyRevenue[]>([]);
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [performerSort, setPerformerSort] = useState('pnl');

  const loadData = useCallback(async () => {
    try {
      const [statsRes, revenueRes, perfRes] = await Promise.all([
        fetch('/api/nfa/trading/analytics'),
        fetch(`/api/nfa/trading/analytics/revenue?days=${days}`),
        fetch(`/api/nfa/trading/analytics/performance?sort=${performerSort}&limit=20`),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenue(data.daily || []);
      }
      if (perfRes.ok) {
        const data = await perfRes.json();
        setPerformers(data.performers || []);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [days, performerSort]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [loadData]);

  // ─── Chart Data: Revenue ───
  const revenueChartData = {
    labels: revenue.map(r => {
      const d = new Date(r.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [
      {
        label: 'Daily Revenue ($)',
        data: revenue.map(r => r.commissions_usd),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revenueChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => `$${(ctx.parsed?.y ?? 0).toFixed(4)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#6b7280', maxTicksLimit: 10 },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ticks: { color: '#9ca3af', callback: (v: any) => `$${v}` },
      },
    },
  };

  // ─── Chart Data: Volume ───
  const volumeChartData = {
    labels: revenue.map(r => {
      const d = new Date(r.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [
      {
        label: 'Daily Volume (BNB)',
        data: revenue.map(r => r.volume_bnb),
        backgroundColor: 'rgba(234, 179, 8, 0.6)',
        borderColor: '#eab308',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => `${(ctx.parsed?.y ?? 0).toFixed(4)} BNB`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#6b7280', maxTicksLimit: 10 },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ticks: { color: '#9ca3af', callback: (v: any) => `${v} BNB` },
      },
    },
  };

  // ─── Chart Data: Trades Per Day ───
  const tradesChartData = {
    labels: revenue.map(r => {
      const d = new Date(r.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }),
    datasets: [
      {
        label: 'Trades/Day',
        data: revenue.map(r => r.trade_count),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
            <div className="absolute inset-0 rounded-full border-2 border-t-green-500 animate-spin" />
          </div>
          <p className="text-gray-400 animate-pulse">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-blue-900/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/trading-league" className="hover:text-white transition-colors">🏆 Trading League</Link>
              <span>/</span>
              <span className="text-white">Analytics</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-teal-400 bg-clip-text text-transparent">
                📊 Platform Analytics
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Real-time trading metrics, revenue tracking, and performance insights.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ─── Overview Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon="💰"
            label="Total Revenue"
            value={`$${(stats?.totalRevenueUsd || 0).toFixed(2)}`}
            sub={`${(stats?.totalRevenueBnb || 0).toFixed(4)} BNB`}
            color="text-green-400"
          />
          <StatCard
            icon="🔄"
            label="Total Trades"
            value={(stats?.totalTrades || 0).toLocaleString()}
            sub={`$${(stats?.totalVolumeUsd || 0).toFixed(0)} volume`}
            color="text-blue-400"
          />
          <StatCard
            icon="🤖"
            label="Active Traders"
            value={String(stats?.activeTraders || 0)}
            sub={`${stats?.daysTracked || 0} days tracked`}
            color="text-purple-400"
          />
          <StatCard
            icon="📏"
            label="Avg Trade Size"
            value={`$${(stats?.avgTradeSize || 0).toFixed(2)}`}
            sub="per transaction"
            color="text-yellow-400"
          />
        </div>

        {/* ─── Tournament Stats ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-2xl font-bold text-white">{stats?.totalTournamentsRun || 0}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Tournaments Run</div>
            <div className="text-xs text-gray-600 mt-1">{stats?.tournamentsCompleted || 0} completed</div>
          </div>
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5 text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-white">{(stats?.avgParticipants || 0).toFixed(0)}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Participants</div>
            <div className="text-xs text-gray-600 mt-1">per tournament</div>
          </div>
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5 text-center">
            <div className="text-3xl mb-2">🎁</div>
            <div className="text-2xl font-bold text-green-400">${(stats?.totalPrizeDistributed || 0).toFixed(0)}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Prize Distributed</div>
            <div className="text-xs text-gray-600 mt-1">total USD</div>
          </div>
        </div>

        {/* ─── Revenue Chart ─── */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">💰 Daily Revenue</h3>
            <div className="flex gap-1">
              {[30, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    days === d
                      ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                      : 'bg-gray-800/50 border border-gray-700 text-gray-500 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <Line data={revenueChartData} options={revenueChartOptions} />
          </div>
        </div>

        {/* ─── Volume + Trades Charts ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📊 Daily Volume (BNB)</h3>
            <div className="h-56">
              <Bar data={volumeChartData} options={volumeChartOptions} />
            </div>
          </div>
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📈 Trades Per Day</h3>
            <div className="h-56">
              <Line data={tradesChartData} options={revenueChartOptions} />
            </div>
          </div>
        </div>

        {/* ─── Top Performers Table ─── */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-300 uppercase tracking-wider">🏅 Top Performers</h2>
            <div className="flex gap-1">
              {[
                { key: 'pnl', label: 'PnL' },
                { key: 'trades', label: 'Trades' },
                { key: 'winrate', label: 'Win Rate' },
                { key: 'commissions', label: 'Fees' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPerformerSort(key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    performerSort === key
                      ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                      : 'bg-gray-800/50 border border-gray-700 text-gray-500 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {performers.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Data Yet</h3>
              <p className="text-gray-400 mb-6">No trading data available. Start trading to see performance analytics!</p>
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
                    <th className="text-right pb-3 pt-3">Trades</th>
                    <th className="text-right pb-3 pt-3">Win Rate</th>
                    <th className="text-right pb-3 pt-3">Sharpe</th>
                    <th className="text-right pb-3 pt-3">Max DD</th>
                    <th className="text-right pb-3 pt-3">Fees ($)</th>
                    <th className="text-right pb-3 pt-3 pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {performers.map((p, i) => {
                    const strat = getStrategy(p.strategy);
                    const isTop3 = p.rank <= 3;
                    return (
                      <motion.tr
                        key={p.nfaId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors ${
                          isTop3 ? 'bg-gradient-to-r from-transparent via-purple-900/5 to-transparent' : ''
                        }`}
                      >
                        <td className="py-3.5 pl-6">
                          <span className={`text-sm font-bold ${
                            p.rank === 1 ? 'text-yellow-400' :
                            p.rank === 2 ? 'text-gray-300' :
                            p.rank === 3 ? 'text-orange-400' :
                            'text-gray-500'
                          }`}>
                            {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <Link href={`/trading/${p.nfaId}`} className="group">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium group-hover:text-purple-400 transition-colors">
                                {p.botName}
                              </span>
                              <span className="text-[10px] text-gray-600 font-mono">#{p.nfaId}</span>
                              {p.tradingMode === 'live' && (
                                <span className="text-[8px] px-1 py-0.5 rounded bg-red-900/40 text-red-400 font-bold">LIVE</span>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="py-3.5">
                          <span className="text-xs text-gray-400">{strat.emoji} {strat.label}</span>
                        </td>
                        <td className={`py-3.5 text-right font-bold font-mono ${
                          p.totalPnlUsd >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {p.totalPnlUsd >= 0 ? '+' : ''}${p.totalPnlUsd.toFixed(2)}
                        </td>
                        <td className="py-3.5 text-right text-gray-300">{p.totalTrades}</td>
                        <td className="py-3.5 text-right">
                          <span className={`${
                            p.winRate >= 60 ? 'text-green-400' :
                            p.winRate >= 40 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {p.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className={`py-3.5 text-right font-mono text-xs ${
                          p.sharpeRatio > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {p.sharpeRatio.toFixed(2)}
                        </td>
                        <td className="py-3.5 text-right text-red-400 text-xs">
                          {p.maxDrawdownPct.toFixed(1)}%
                        </td>
                        <td className="py-3.5 text-right text-gray-400 font-mono text-xs">
                          ${p.commissionsUsd.toFixed(2)}
                        </td>
                        <td className="py-3.5 text-right pr-6">
                          <Link
                            href={`/trading/${p.nfaId}`}
                            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            View →
                          </Link>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="text-center pb-8">
          <Link
            href="/trading-league"
            className="text-gray-500 hover:text-white transition-colors text-sm"
          >
            ← Back to Trading League
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/30 border border-gray-700 rounded-xl p-5"
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-600 mt-1">{sub}</div>
    </motion.div>
  );
}
