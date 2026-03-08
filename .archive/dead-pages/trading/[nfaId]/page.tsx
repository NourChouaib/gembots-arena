'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEVMWallet } from '@/providers/EVMWalletProvider';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

// ─── Types ───────────────────────────────────────────────────────────────────

interface TradingStats {
  nfa_id: number;
  total_trades: number;
  open_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl_usd: number;
  avg_pnl_pct: number;
  best_trade_pnl: number;
  worst_trade_pnl: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  current_streak: number;
  best_streak: number;
  avg_hold_minutes: number;
  paper_balance_usd: number;
  updated_at: string;
}

interface Trade {
  id: number;
  nfa_id: number;
  pair: string;
  side: 'buy' | 'sell';
  entry_price: number;
  exit_price: number | null;
  size_usd: number;
  pnl_usd: number | null;
  pnl_pct: number | null;
  mode: 'paper' | 'live';
  status: 'open' | 'closed';
  confidence: number | null;
  strategy_name: string | null;
  close_reason: string | null;
  tx_hash: string | null;
  gas_used: number | null;
  open_at: string;
  close_at: string | null;
}

interface WalletBalance {
  bnb: string;
  tokens: Array<{ symbol: string; balance: string; address: string }>;
  lowBalance: boolean;
}

interface FeeSummary {
  nfaId: number;
  totalFeeBnb: number;
  totalFeeUsd: number;
  tradeFeesCount: number;
  tournamentFeesCount: number;
}

interface WalletInfo {
  botId: number;
  nfaId: number;
  name: string;
  wallet: string | null;
  mode: string;
  config: Record<string, unknown>;
  stats: TradingStats | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TradingDashboardPage() {
  const params = useParams();
  const nfaId = parseInt(params.nfaId as string);
  const { connected, address, connect, connecting } = useEVMWallet();

  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [showLiveWarning, setShowLiveWarning] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null);

  // Config editing
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    max_position_pct: 10,
    max_daily_loss_pct: 5,
    max_trades_per_day: 20,
    confidence_threshold: 0.7,
    take_profit_pct: 5,
    stop_loss_pct: 3,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch wallet info
      const walletRes = await fetch(`/api/nfa/trading/wallet?nfaId=${nfaId}`);
      if (walletRes.ok) {
        const data = await walletRes.json();
        setWalletInfo(data);
        if (data.config) {
          setConfigForm(prev => ({ ...prev, ...data.config }));
        }
      } else {
        const err = await walletRes.json();
        setError(err.error || 'Failed to load wallet info');
      }

      // Fetch trades
      const historyRes = await fetch(`/api/nfa/trading/history?nfaId=${nfaId}&limit=100`);
      if (historyRes.ok) {
        const data = await historyRes.json();
        setTrades(data.trades || []);
      }

      // Fetch real wallet balance
      const balanceRes = await fetch(`/api/nfa/trading/balance?nfaId=${nfaId}`);
      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setWalletBalance({ bnb: data.bnb, tokens: data.tokens, lowBalance: data.lowBalance });
      }

      // Fetch fee summary
      const feeRes = await fetch(`/api/nfa/trading/analytics?nfaId=${nfaId}`);
      if (feeRes.ok) {
        const data = await feeRes.json();
        setFeeSummary(data);
      }
    } catch (err) {
      setError('Failed to load trading data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [nfaId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [loadData]);

  const handleGenerateWallet = async () => {
    if (!address) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nfa/trading/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nfaId, ownerAddress: address }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Wallet created: ${data.wallet}`);
        await loadData();
      } else {
        setError(data.error || 'Failed to create wallet');
      }
    } catch {
      setError('Failed to create wallet');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetMode = async (newMode: string) => {
    if (!address) return;
    
    // Show warning before enabling live
    if (newMode === 'live' && !showLiveWarning) {
      setShowLiveWarning(true);
      return;
    }
    setShowLiveWarning(false);

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nfa/trading/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nfaId, ownerAddress: address, mode: newMode }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Trading mode set to: ${newMode}`);
        await loadData();
      } else {
        setError(data.error || 'Failed to update mode');
      }
    } catch {
      setError('Failed to update trading mode');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTrading = async () => {
    if (!address) return;
    const newMode = walletInfo?.mode === 'paper' ? 'off' : 'paper';
    await handleSetMode(newMode);
  };

  const handleCopyAddress = () => {
    if (walletInfo?.wallet) {
      navigator.clipboard.writeText(walletInfo.wallet);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleSaveConfig = async () => {
    if (!address) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nfa/trading/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nfaId, ownerAddress: address, config: configForm }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Config saved!');
        setEditingConfig(false);
        await loadData();
      } else {
        setError(data.error || 'Failed to save config');
      }
    } catch {
      setError('Failed to save config');
    } finally {
      setActionLoading(false);
    }
  };

  // Clear messages after 4s
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const stats = walletInfo?.stats;
  const isOwner = connected && address && walletInfo;

  // PnL chart data from closed trades
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl_usd !== null);
  const cumulativePnl: number[] = [];
  let runningPnl = 0;
  for (const t of closedTrades.slice().reverse()) {
    runningPnl += t.pnl_usd || 0;
    cumulativePnl.push(runningPnl);
  }

  const chartData = {
    labels: cumulativePnl.map((_, i) => `#${i + 1}`),
    datasets: [
      {
        label: 'Cumulative PnL ($)',
        data: cumulativePnl,
        borderColor: runningPnl >= 0 ? '#22c55e' : '#ef4444',
        backgroundColor: runningPnl >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { display: false },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#9ca3af' },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
            <div className="absolute inset-0 rounded-full border-2 border-t-green-500 animate-spin" />
          </div>
          <p className="text-gray-400 animate-pulse">Loading Trading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 via-transparent to-emerald-900/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <span>/</span>
            <Link href={`/marketplace/${nfaId}`} className="hover:text-white transition-colors">NFA #{nfaId}</Link>
            <span>/</span>
            <span className="text-white">Trading</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                📊 Trading Dashboard
              </span>
            </h1>
            <p className="text-gray-400">
              NFA #{nfaId} {walletInfo?.name ? `• ${walletInfo.name}` : ''} • Paper Trading League
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Messages */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            ❌ {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm">
            ✅ {successMsg}
          </div>
        )}

        {/* Wallet & Mode Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Card */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">💰 Trading Wallet</h3>
            {walletInfo?.wallet ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="font-mono text-sm text-green-400 bg-gray-900/50 p-3 rounded-lg break-all border border-gray-700/50 flex-1">
                    {walletInfo.wallet}
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="px-3 py-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-all text-sm shrink-0"
                    title="Copy Address"
                  >
                    {copiedAddress ? '✅' : '📋'}
                  </button>
                </div>
                
                {/* Paper Balance */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">Paper Balance:</span>
                  <span className="text-lg font-bold text-yellow-400">
                    ${(stats?.paper_balance_usd || 10000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Real Balance */}
                {walletBalance && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500">Real BNB Balance:</span>
                      <span className={`text-sm font-bold ${walletBalance.lowBalance ? 'text-red-400' : 'text-green-400'}`}>
                        {parseFloat(walletBalance.bnb).toFixed(6)} BNB
                      </span>
                    </div>
                    {walletBalance.tokens.length > 0 && (
                      <div className="space-y-1 mt-1">
                        {walletBalance.tokens.map(t => (
                          <div key={t.symbol} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{t.symbol}:</span>
                            <span className="text-xs font-mono text-gray-300">{parseFloat(t.balance).toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {walletBalance.lowBalance && (
                      <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg p-2">
                        ⚠️ Low balance! Fund with BNB for live trading. Send BNB (BEP-20) to the address above.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-3">No wallet generated yet</p>
                {connected ? (
                  <button
                    onClick={handleGenerateWallet}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {actionLoading ? '⏳ Generating...' : '🔑 Generate Wallet'}
                  </button>
                ) : (
                  <button
                    onClick={connect}
                    disabled={connecting}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    🦊 Connect Wallet
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mode Card */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">⚙️ Trading Mode</h3>
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
                walletInfo?.mode === 'paper'
                  ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                  : walletInfo?.mode === 'live'
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                  : 'bg-gray-700/50 border border-gray-600 text-gray-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  walletInfo?.mode === 'paper' ? 'bg-green-400 animate-pulse' :
                  walletInfo?.mode === 'live' ? 'bg-red-400 animate-pulse' :
                  'bg-gray-500'
                }`} />
                {walletInfo?.mode === 'paper' ? '📝 Paper Trading' :
                 walletInfo?.mode === 'live' ? '🔴 Live Trading' :
                 '⏸ Off'}
              </span>
            </div>
            
            {/* Live Warning Modal */}
            {showLiveWarning && (
              <div className="mb-4 bg-red-900/30 border border-red-500/40 rounded-xl p-4">
                <p className="text-red-400 font-bold text-sm mb-2">⚠️ WARNING: Real Money!</p>
                <p className="text-red-300/80 text-xs mb-3">
                  Switching to LIVE mode will use real BNB for trades via PancakeSwap. 
                  Max trade size: 0.1 BNB. Make sure your wallet is funded.
                </p>
                {walletBalance && (
                  <p className="text-xs text-gray-400 mb-3">
                    Current balance: <span className="text-white font-bold">{parseFloat(walletBalance.bnb).toFixed(6)} BNB</span>
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSetMode('live')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-500 transition-all disabled:opacity-50"
                  >
                    {actionLoading ? '⏳...' : '🔴 Confirm Live Trading'}
                  </button>
                  <button
                    onClick={() => setShowLiveWarning(false)}
                    className="px-3 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isOwner && walletInfo?.wallet && (
              <div className="space-y-2">
                {/* Mode selection buttons */}
                <div className="grid grid-cols-3 gap-1 bg-gray-900/50 rounded-lg p-1">
                  {(['off', 'paper', 'live'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleSetMode(m)}
                      disabled={actionLoading || walletInfo?.mode === m}
                      className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all disabled:cursor-default ${
                        walletInfo?.mode === m
                          ? m === 'live'
                            ? 'bg-red-600 text-white'
                            : m === 'paper'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {m === 'off' ? '⏸ Off' : m === 'paper' ? '📝 Paper' : '🔴 Live'}
                    </button>
                  ))}
                </div>
                
                {walletInfo?.mode === 'live' && (
                  <div className="text-[10px] text-red-400/70 text-center">
                    Max 0.1 BNB/trade • 2% max slippage
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats Card */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">📈 Quick Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Total PnL</div>
                <div className={`text-xl font-bold ${(stats?.total_pnl_usd || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(stats?.total_pnl_usd || 0) >= 0 ? '+' : ''}${(stats?.total_pnl_usd || 0).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Win Rate</div>
                <div className="text-xl font-bold text-teal-400">{(stats?.win_rate || 0).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Trades</div>
                <div className="text-xl font-bold text-white">{stats?.total_trades || 0}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Open</div>
                <div className="text-xl font-bold text-yellow-400">{stats?.open_trades || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        {stats && stats.total_trades > 0 && (
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📊 Detailed Statistics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              <StatBox label="Sharpe Ratio" value={stats.sharpe_ratio.toFixed(2)} color={stats.sharpe_ratio > 0 ? 'text-green-400' : 'text-red-400'} />
              <StatBox label="Max Drawdown" value={`${stats.max_drawdown_pct.toFixed(1)}%`} color="text-red-400" />
              <StatBox label="Avg PnL %" value={`${stats.avg_pnl_pct.toFixed(2)}%`} color={stats.avg_pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'} />
              <StatBox label="Best Trade" value={`$${stats.best_trade_pnl.toFixed(2)}`} color="text-green-400" />
              <StatBox label="Worst Trade" value={`$${stats.worst_trade_pnl.toFixed(2)}`} color="text-red-400" />
              <StatBox label="Win Streak" value={`🔥 ${stats.current_streak}`} color="text-orange-400" />
              <StatBox label="Best Streak" value={`${stats.best_streak}`} color="text-purple-400" />
              <StatBox label="Avg Hold" value={`${stats.avg_hold_minutes.toFixed(0)}m`} color="text-blue-400" />
            </div>
          </div>
        )}

        {/* Fee Summary */}
        {feeSummary && feeSummary.tradeFeesCount > 0 && (
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">💰 Fee Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-400">${feeSummary.totalFeeUsd.toFixed(4)}</div>
                <div className="text-[10px] text-gray-500 uppercase">Total Fees (USD)</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-400">{feeSummary.totalFeeBnb.toFixed(6)}</div>
                <div className="text-[10px] text-gray-500 uppercase">Total Fees (BNB)</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">{feeSummary.tradeFeesCount}</div>
                <div className="text-[10px] text-gray-500 uppercase">Trade Fees</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{feeSummary.tournamentFeesCount}</div>
                <div className="text-[10px] text-gray-500 uppercase">Tournament Fees</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700/50 text-center">
              <span className="text-[10px] text-gray-600">Platform fee: 0.5% per trade (entry + exit)</span>
            </div>
          </div>
        )}

        {/* Performance Analytics */}
        {stats && closedTrades.length > 3 && (
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📊 Performance Analytics</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Win/Loss Distribution */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Win/Loss Distribution</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                      style={{ width: `${stats.win_rate}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-mono w-12 text-right">{stats.win_rate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>🟢 {stats.winning_trades} wins</span>
                  <span>🔴 {stats.losing_trades} losses</span>
                </div>
              </div>

              {/* Best/Worst Trade */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Trade Range</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Best Trade:</span>
                    <span className="text-sm font-bold text-green-400">+${stats.best_trade_pnl.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Worst Trade:</span>
                    <span className="text-sm font-bold text-red-400">${stats.worst_trade_pnl.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Avg PnL:</span>
                    <span className={`text-sm font-bold ${stats.avg_pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.avg_pnl_pct >= 0 ? '+' : ''}{stats.avg_pnl_pct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Hold Time & Streaks */}
              <div>
                <div className="text-xs text-gray-500 uppercase mb-2">Timing & Streaks</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Avg Hold Time:</span>
                    <span className="text-sm font-bold text-blue-400">
                      {stats.avg_hold_minutes >= 60
                        ? `${(stats.avg_hold_minutes / 60).toFixed(1)}h`
                        : `${stats.avg_hold_minutes.toFixed(0)}m`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Current Streak:</span>
                    <span className="text-sm font-bold text-orange-400">🔥 {stats.current_streak}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Best Streak:</span>
                    <span className="text-sm font-bold text-purple-400">⭐ {stats.best_streak}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PnL Chart */}
        {cumulativePnl.length > 1 && (
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📈 PnL Equity Curve</h3>
            <div className="h-64">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Trading Config */}
        {isOwner && (
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">⚙️ Trading Config</h3>
              <button
                onClick={() => setEditingConfig(!editingConfig)}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                {editingConfig ? '✕ Cancel' : '✏️ Edit'}
              </button>
            </div>
            {editingConfig ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ConfigInput label="Max Position %" value={configForm.max_position_pct} onChange={v => setConfigForm(f => ({ ...f, max_position_pct: v }))} min={1} max={50} />
                <ConfigInput label="Max Daily Loss %" value={configForm.max_daily_loss_pct} onChange={v => setConfigForm(f => ({ ...f, max_daily_loss_pct: v }))} min={1} max={20} />
                <ConfigInput label="Max Trades/Day" value={configForm.max_trades_per_day} onChange={v => setConfigForm(f => ({ ...f, max_trades_per_day: v }))} min={1} max={100} />
                <ConfigInput label="Confidence Threshold" value={configForm.confidence_threshold} onChange={v => setConfigForm(f => ({ ...f, confidence_threshold: v }))} min={0.1} max={1.0} step={0.05} />
                <ConfigInput label="Take Profit %" value={configForm.take_profit_pct} onChange={v => setConfigForm(f => ({ ...f, take_profit_pct: v }))} min={0.5} max={50} step={0.5} />
                <ConfigInput label="Stop Loss %" value={configForm.stop_loss_pct} onChange={v => setConfigForm(f => ({ ...f, stop_loss_pct: v }))} min={0.5} max={20} step={0.5} />
                <div className="sm:col-span-2 lg:col-span-3">
                  <button
                    onClick={handleSaveConfig}
                    disabled={actionLoading}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {actionLoading ? '⏳ Saving...' : '💾 Save Config'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="text-gray-500">Max Position: <span className="text-white">{(walletInfo?.config as Record<string, number>)?.max_position_pct || 10}%</span></div>
                <div className="text-gray-500">Max Daily Loss: <span className="text-white">{(walletInfo?.config as Record<string, number>)?.max_daily_loss_pct || 5}%</span></div>
                <div className="text-gray-500">Max Trades/Day: <span className="text-white">{(walletInfo?.config as Record<string, number>)?.max_trades_per_day || 20}</span></div>
                <div className="text-gray-500">Confidence: <span className="text-white">{(walletInfo?.config as Record<string, number>)?.confidence_threshold || 0.7}</span></div>
                <div className="text-gray-500">Take Profit: <span className="text-white">{(walletInfo?.config as Record<string, number>)?.take_profit_pct || 5}%</span></div>
                <div className="text-gray-500">Stop Loss: <span className="text-white">{(walletInfo?.config as Record<string, number>)?.stop_loss_pct || 3}%</span></div>
              </div>
            )}
          </div>
        )}

        {/* Open Positions */}
        {trades.filter(t => t.status === 'open').length > 0 && (
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">🟢 Open Positions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-[10px] uppercase">
                    <th className="text-left pb-2">Pair</th>
                    <th className="text-left pb-2">Side</th>
                    <th className="text-left pb-2">Mode</th>
                    <th className="text-right pb-2">Entry</th>
                    <th className="text-right pb-2">Size</th>
                    <th className="text-right pb-2">Confidence</th>
                    <th className="text-right pb-2">TX</th>
                    <th className="text-right pb-2">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.filter(t => t.status === 'open').map(trade => (
                    <tr key={trade.id} className="border-t border-gray-800">
                      <td className="py-2 font-mono text-white">{trade.pair}</td>
                      <td className={`py-2 font-bold ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.side.toUpperCase()}
                      </td>
                      <td className="py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          trade.mode === 'live' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                        }`}>
                          {trade.mode === 'live' ? '🔴 LIVE' : '📝 PAPER'}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-300">${trade.entry_price.toFixed(2)}</td>
                      <td className="py-2 text-right text-gray-300">${trade.size_usd.toFixed(2)}</td>
                      <td className="py-2 text-right text-gray-400">{(trade.confidence || 0).toFixed(0)}%</td>
                      <td className="py-2 text-right">
                        {trade.tx_hash ? (
                          <a
                            href={`https://bscscan.com/tx/${trade.tx_hash.split(',')[0]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-[10px] font-mono"
                          >
                            {trade.tx_hash.split(',')[0].slice(0, 10)}...
                          </a>
                        ) : (
                          <span className="text-gray-600 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-gray-500 text-[10px]">
                        {new Date(trade.open_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Trade History */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📜 Trade History</h3>
          {closedTrades.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No trades yet. {walletInfo?.mode === 'off' ? 'Start paper trading to see results!' : 'Waiting for trading signals...'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-[10px] uppercase">
                    <th className="text-left pb-2">Pair</th>
                    <th className="text-left pb-2">Side</th>
                    <th className="text-left pb-2">Mode</th>
                    <th className="text-right pb-2">Entry</th>
                    <th className="text-right pb-2">Exit</th>
                    <th className="text-right pb-2">Size</th>
                    <th className="text-right pb-2">PnL</th>
                    <th className="text-right pb-2">PnL %</th>
                    <th className="text-center pb-2">Reason</th>
                    <th className="text-right pb-2">TX</th>
                    <th className="text-right pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {closedTrades.map(trade => (
                    <tr key={trade.id} className="border-t border-gray-800">
                      <td className="py-2 font-mono text-white">{trade.pair}</td>
                      <td className={`py-2 font-bold ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.side.toUpperCase()}
                      </td>
                      <td className="py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          trade.mode === 'live' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                        }`}>
                          {trade.mode === 'live' ? 'LIVE' : 'PAPER'}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-300">${trade.entry_price.toFixed(2)}</td>
                      <td className="py-2 text-right text-gray-300">${(trade.exit_price || 0).toFixed(2)}</td>
                      <td className="py-2 text-right text-gray-300">${trade.size_usd.toFixed(2)}</td>
                      <td className={`py-2 text-right font-bold ${(trade.pnl_usd || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(trade.pnl_usd || 0) >= 0 ? '+' : ''}${(trade.pnl_usd || 0).toFixed(2)}
                      </td>
                      <td className={`py-2 text-right ${(trade.pnl_pct || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(trade.pnl_pct || 0) >= 0 ? '+' : ''}{(trade.pnl_pct || 0).toFixed(2)}%
                      </td>
                      <td className="py-2 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          trade.close_reason === 'take_profit' ? 'bg-green-900/30 text-green-400' :
                          trade.close_reason === 'stop_loss' ? 'bg-red-900/30 text-red-400' :
                          'bg-gray-700/50 text-gray-400'
                        }`}>
                          {trade.close_reason === 'take_profit' ? '🎯 TP' :
                           trade.close_reason === 'stop_loss' ? '🛑 SL' :
                           trade.close_reason === 'timeout' ? '⏰ TO' :
                           trade.close_reason || '—'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {trade.tx_hash ? (
                          <a
                            href={`https://bscscan.com/tx/${trade.tx_hash.split(',')[0]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-[10px] font-mono"
                            title={trade.tx_hash}
                          >
                            🔗 BSCScan
                          </a>
                        ) : (
                          <span className="text-gray-600 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-gray-500 text-[10px]">
                        {trade.close_at ? new Date(trade.close_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 uppercase">{label}</div>
    </div>
  );
}

function ConfigInput({ label, value, onChange, min, max, step = 1 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 transition-colors"
      />
    </div>
  );
}
