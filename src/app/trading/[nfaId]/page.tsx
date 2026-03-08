'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { getRobotImage, getNFAName } from '@/lib/robot-images';

interface TradingStats {
  total_trades: number;
  win_rate: number;
  total_pnl_usd: number;
  sharpe_ratio: number;
  paper_balance_usd: number;
  max_drawdown_pct: number;
  best_trade_pnl: number;
  worst_trade_pnl: number;
  avg_hold_minutes: number;
  total_volume_usd: number;
  best_strategy?: string;
}

interface Trade {
  id: number;
  nfa_id: number;
  bot_id: number;
  pair: string;
  side: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  pnl_usd: number | null;
  pnl_pct: number | null;
  status: string;
  open_at: string;
  close_at: string | null;
  stop_loss_pct: number | null;
  take_profit_pct: number | null;
}

interface BotInfo {
  botId: number;
  nfaId: number;
  name: string;
  mode: string;
  config: Record<string, unknown>;
  stats: TradingStats | null;
}

const STRATEGY_STYLES: Record<string, { label: string; emoji: string; color: string }> = {
  trend_follower: { label: 'Trend Following', emoji: '📈', color: 'text-green-400' },
  whale_watcher: { label: 'Whale Watching', emoji: '🐋', color: 'text-blue-400' },
  mean_reversion: { label: 'Mean Reversion', emoji: '🔄', color: 'text-purple-400' },
  smart_ai: { label: 'Neural Network', emoji: '🧠', color: 'text-cyan-400' },
  chaos: { label: 'Chaos Agent', emoji: '🎲', color: 'text-red-400' },
  momentum: { label: 'Momentum', emoji: '🚀', color: 'text-yellow-400' },
  scalper: { label: 'Scalper', emoji: '⚡', color: 'text-orange-400' },
  swing: { label: 'Swing Trader', emoji: '🏄', color: 'text-teal-400' },
  contrarian: { label: 'Contrarian', emoji: '🔮', color: 'text-pink-400' },
  default: { label: 'Default', emoji: '🤖', color: 'text-gray-400' },
};

// Simple SVG sparkline
function Sparkline({ data, width = 200, height = 40 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const lastVal = data[data.length - 1];
  const color = lastVal >= 0 ? '#4ade80' : '#f87171';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* Zero line if data crosses zero */}
      {min < 0 && max > 0 && (
        <line
          x1="0"
          y1={height - ((0 - min) / range) * (height - 4) - 2}
          x2={width}
          y2={height - ((0 - min) / range) * (height - 4) - 2}
          stroke="#374151"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      )}
    </svg>
  );
}

export default function TradingDetailPage() {
  const params = useParams();
  const nfaId = parseInt(params.nfaId as string);

  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTradeTab, setActiveTradeTab] = useState<'open' | 'closed'>('open');

  const fetchBotInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/nfa/trading/wallet?nfaId=${nfaId}`);
      if (res.ok) {
        const data = await res.json();
        setBotInfo(data);
      }
    } catch (err) {
      console.error('Bot info error:', err);
    }
  }, [nfaId]);

  const fetchTrades = useCallback(async () => {
    try {
      const [openRes, closedRes] = await Promise.all([
        fetch(`/api/nfa/trading/history?nfaId=${nfaId}&status=open&limit=20`),
        fetch(`/api/nfa/trading/history?nfaId=${nfaId}&status=closed&limit=30`),
      ]);

      if (openRes.ok) {
        const data = await openRes.json();
        setOpenTrades(data.trades || []);
      }
      if (closedRes.ok) {
        const data = await closedRes.json();
        setClosedTrades(data.trades || []);
      }
    } catch (err) {
      console.error('Trades fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [nfaId]);

  useEffect(() => {
    if (nfaId) {
      fetchBotInfo();
      fetchTrades();
      const interval = setInterval(() => {
        fetchBotInfo();
        fetchTrades();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [nfaId, fetchBotInfo, fetchTrades]);

  const stats = botInfo?.stats;
  const strategy = stats?.best_strategy || 'default';
  const stratStyle = STRATEGY_STYLES[strategy] || STRATEGY_STYLES.default;

  // Build PnL sparkline from closed trades
  const pnlHistory = closedTrades
    .slice()
    .reverse()
    .reduce((acc: number[], trade) => {
      const last = acc.length > 0 ? acc[acc.length - 1] : 0;
      acc.push(last + (trade.pnl_usd || 0));
      return acc;
    }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
            <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 animate-spin" />
          </div>
          <p className="text-gray-400 animate-pulse">Loading trading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/trading" className="hover:text-white transition-colors">← Trading League</Link>
          <span>/</span>
          <span className="text-white">NFA #{nfaId}</span>
        </div>

        {/* Bot Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5 mb-8"
        >
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-gray-700 flex-shrink-0">
            <Image
              src={getRobotImage(nfaId)}
              alt={`NFA #${nfaId}`}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {getNFAName(nfaId)}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-sm ${stratStyle.color}`}>
                {stratStyle.emoji} {stratStyle.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                botInfo?.mode === 'paper' ? 'bg-green-900/30 text-green-400' :
                botInfo?.mode === 'live' ? 'bg-red-900/30 text-red-400' :
                'bg-gray-700/50 text-gray-500'
              }`}>
                {botInfo?.mode === 'paper' ? '📝 Paper Trading' : botInfo?.mode === 'live' ? '🔴 Live' : 'Off'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
            <div className={`text-2xl font-bold ${(stats?.total_pnl_usd || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(stats?.total_pnl_usd || 0) >= 0 ? '+' : ''}${(stats?.total_pnl_usd || 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 uppercase mt-1">Total PnL</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-teal-400">{(stats?.win_rate || 0).toFixed(1)}%</div>
            <div className="text-xs text-gray-500 uppercase mt-1">Win Rate</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{stats?.total_trades || 0}</div>
            <div className="text-xs text-gray-500 uppercase mt-1">Total Trades</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-gray-800/40 border border-gray-700 rounded-xl p-4">
            <div className={`text-2xl font-bold ${(stats?.sharpe_ratio || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(stats?.sharpe_ratio || 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 uppercase mt-1">Sharpe Ratio</div>
          </motion.div>
        </div>

        {/* Balance + PnL Chart Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Balance Card */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">💰 Portfolio</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xl font-bold text-white">${(stats?.paper_balance_usd || 10000).toFixed(2)}</div>
                <div className="text-xs text-gray-500">Current Balance</div>
              </div>
              <div>
                <div className="text-xl font-bold text-gray-400">$10,000.00</div>
                <div className="text-xs text-gray-500">Initial Balance</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">${(stats?.best_trade_pnl || 0).toFixed(2)}</div>
                <div className="text-xs text-gray-500">Best Trade</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-400">${(stats?.worst_trade_pnl || 0).toFixed(2)}</div>
                <div className="text-xs text-gray-500">Worst Trade</div>
              </div>
            </div>
          </div>

          {/* PnL Chart */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📈 PnL Curve</h3>
            {pnlHistory.length >= 2 ? (
              <div className="flex items-center justify-center">
                <Sparkline data={pnlHistory} width={350} height={80} />
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                Not enough closed trades for chart
              </div>
            )}
          </div>
        </div>

        {/* More Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/20 border border-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-sm font-bold text-orange-400">{(stats?.max_drawdown_pct || 0).toFixed(1)}%</div>
            <div className="text-[10px] text-gray-500">Max Drawdown</div>
          </div>
          <div className="bg-gray-800/20 border border-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-sm font-bold text-white">{Math.round(stats?.avg_hold_minutes || 0)}m</div>
            <div className="text-[10px] text-gray-500">Avg Hold Time</div>
          </div>
          <div className="bg-gray-800/20 border border-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-sm font-bold text-white">{openTrades.length}</div>
            <div className="text-[10px] text-gray-500">Open Positions</div>
          </div>
          <div className="bg-gray-800/20 border border-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-sm font-bold text-white">${(stats?.total_volume_usd || 0).toFixed(0)}</div>
            <div className="text-[10px] text-gray-500">Total Volume</div>
          </div>
        </div>

        {/* Trade History */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">📜 Trades</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTradeTab('open')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTradeTab === 'open'
                    ? 'bg-blue-600/30 text-blue-300'
                    : 'bg-gray-700/30 text-gray-500 hover:text-gray-300'
                }`}
              >
                Open ({openTrades.length})
              </button>
              <button
                onClick={() => setActiveTradeTab('closed')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTradeTab === 'closed'
                    ? 'bg-blue-600/30 text-blue-300'
                    : 'bg-gray-700/30 text-gray-500 hover:text-gray-300'
                }`}
              >
                Closed ({closedTrades.length})
              </button>
            </div>
          </div>

          {(activeTradeTab === 'open' ? openTrades : closedTrades).length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No {activeTradeTab} trades yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                    <th className="text-left px-3 py-2">Pair</th>
                    <th className="text-left px-3 py-2">Side</th>
                    <th className="text-right px-3 py-2">Entry</th>
                    {activeTradeTab === 'closed' && <th className="text-right px-3 py-2">Exit</th>}
                    <th className="text-right px-3 py-2">Qty</th>
                    {activeTradeTab === 'closed' && <th className="text-right px-3 py-2">PnL</th>}
                    <th className="text-right px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTradeTab === 'open' ? openTrades : closedTrades).map((trade) => (
                    <tr key={trade.id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                      <td className="px-3 py-2 text-white font-medium">{trade.pair}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          trade.side === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                        }`}>
                          {trade.side?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-300">${trade.entry_price?.toFixed(2)}</td>
                      {activeTradeTab === 'closed' && (
                        <td className="px-3 py-2 text-right text-gray-300">
                          ${trade.exit_price?.toFixed(2) || '—'}
                        </td>
                      )}
                      <td className="px-3 py-2 text-right text-gray-400">{trade.quantity?.toFixed(4)}</td>
                      {activeTradeTab === 'closed' && (
                        <td className="px-3 py-2 text-right">
                          <span className={`font-bold ${(trade.pnl_usd || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(trade.pnl_usd || 0) >= 0 ? '+' : ''}${(trade.pnl_usd || 0).toFixed(2)}
                          </span>
                        </td>
                      )}
                      <td className="px-3 py-2 text-right text-gray-500 text-xs">
                        {new Date(trade.open_at).toLocaleString(undefined, { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            href="/trading"
            className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Leaderboard
          </Link>
          <Link
            href={`/marketplace/${nfaId}`}
            className="px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            🤖 View NFA Profile
          </Link>
          <Link
            href={`/nfa/${nfaId}/reputation`}
            className="px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            🔗 On-Chain Reputation
          </Link>
        </div>
      </div>
    </div>
  );
}
