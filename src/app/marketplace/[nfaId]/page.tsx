'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEVMWallet } from '@/providers/EVMWalletProvider';
import TierBadge from '@/components/TierBadge';
import { getRobotImage, getNFAName, getNFADisplayInfo } from '@/lib/robot-images';
import {
  NFAData,
  fetchNFA,
  buyNFA,
  listNFA,
  cancelListing,
  evolveNFA,
  getWinRate,
  getEvolutionProgress,
  shortenAddress,
  bscscanAddress,
  bscscanNFT,
  TIER_COLORS,
  TIER_GRADIENTS,
  TIER_GLOW,
  TIER_NAMES,
  NFA_CONTRACT_ADDRESS,
} from '@/lib/nfa';
import { ethers } from 'ethers';

interface BattleRecord {
  id: string;
  bot1_name: string;
  bot2_name: string;
  winner_name: string | null;
  token_symbol: string;
  bot1_prediction: number;
  bot2_prediction: number;
  resolved_at: string;
  is_win: boolean;
}

// Strategy style labels (no details exposed)
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
};

export default function NFADetailPage() {
  const params = useParams();
  const nfaId = parseInt(params.nfaId as string);
  const { connected, address, signer, connect, connecting } = useEVMWallet();

  const [nfa, setNfa] = useState<NFAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showListModal, setShowListModal] = useState(false);
  const [listPrice, setListPrice] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [listStep, setListStep] = useState<'approve' | 'list'>('approve');
  const [battles, setBattles] = useState<BattleRecord[]>([]);
  const [battlesLoading, setBattlesLoading] = useState(false);
  const [strategyStyle, setStrategyStyle] = useState<string | null>(null);
  const [tradingStats, setTradingStats] = useState<{
    total_trades: number;
    win_rate: number;
    total_pnl_usd: number;
    sharpe_ratio: number;
    paper_balance_usd: number;
    trading_mode: string;
  } | null>(null);
  const [tournamentRank, setTournamentRank] = useState<number | null>(null);

  const loadNFA = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNFA(nfaId);
      setNfa(data);
    } catch (err) {
      console.error('Failed to load NFA:', err);
    } finally {
      setLoading(false);
    }
  }, [nfaId]);

  const loadBattleHistory = useCallback(async () => {
    setBattlesLoading(true);
    try {
      const res = await fetch(`/api/nfa/battles?nfaId=${nfaId}`);
      if (res.ok) {
        const data = await res.json();
        setBattles(data.battles || []);
        if (data.strategy) setStrategyStyle(data.strategy);
      }
    } catch (err) {
      console.error('Failed to load battles:', err);
    } finally {
      setBattlesLoading(false);
    }
  }, [nfaId]);

  const loadTradingStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/nfa/trading/wallet?nfaId=${nfaId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.stats || data.mode !== 'off') {
          setTradingStats({
            total_trades: data.stats?.total_trades || 0,
            win_rate: data.stats?.win_rate || 0,
            total_pnl_usd: data.stats?.total_pnl_usd || 0,
            sharpe_ratio: data.stats?.sharpe_ratio || 0,
            paper_balance_usd: data.stats?.paper_balance_usd || 10000,
            trading_mode: data.mode || 'off',
          });
        }
      }
    } catch {
      // Trading stats optional
    }
  }, [nfaId]);

  const loadTournamentRank = useCallback(async () => {
    try {
      const res = await fetch('/api/nfa/trading/tournament');
      if (res.ok) {
        const data = await res.json();
        if (data.entries) {
          const entry = data.entries.find((e: { nfa_id: number }) => e.nfa_id === nfaId);
          if (entry) setTournamentRank(entry.rank || null);
        }
      }
    } catch { /* optional */ }
  }, [nfaId]);

  useEffect(() => {
    if (nfaId) {
      loadNFA();
      loadBattleHistory();
      loadTradingStats();
      loadTournamentRank();
    }
  }, [nfaId, loadNFA, loadBattleHistory, loadTradingStats, loadTournamentRank]);

  const isOwner = connected && address && nfa && nfa.owner.toLowerCase() === address.toLowerCase();
  const isListed = nfa?.listing?.active;
  const winRate = nfa ? getWinRate(nfa.wins, nfa.totalBattles) : '0.0';
  const evolution = nfa ? getEvolutionProgress(nfa.wins, nfa.tier) : { current: 0, required: 1, percent: 0 };
  const tierColor = nfa ? TIER_COLORS[nfa.tier] : TIER_COLORS[0];

  const handleBuy = async () => {
    if (!signer || !nfa?.listing) return;
    setActionLoading(true);
    setActionError(null);
    try {
      // Check BNB balance first
      const balance = await signer.provider!.getBalance(await signer.getAddress());
      const price = nfa.listing.price;
      const gasEstimate = ethers.parseEther('0.001'); // ~1M gas buffer
      if (balance < price + gasEstimate) {
        setActionError(`Insufficient BNB. Need ${ethers.formatEther(price)} + gas. Balance: ${parseFloat(ethers.formatEther(balance)).toFixed(4)} BNB`);
        setActionLoading(false);
        return;
      }
      // Check buyer ≠ seller
      const myAddr = (await signer.getAddress()).toLowerCase();
      if (myAddr === nfa.listing.seller.toLowerCase()) {
        setActionError('You cannot buy your own NFA');
        setActionLoading(false);
        return;
      }
      const receipt = await buyNFA(signer, nfaId, nfa.listing.price);
      setTxHash(receipt?.hash || null);
      await loadNFA();
    } catch (err: unknown) {
      const e = err as { reason?: string; message?: string };
      setActionError(e.reason || e.message || 'Transaction failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleList = async () => {
    if (!signer || !listPrice) return;
    setActionLoading(true);
    setActionError(null);
    try {
      setListStep('approve');
      const receipt = await listNFA(signer, nfaId, listPrice);
      setListStep('list');
      setTxHash(receipt?.hash || null);
      setShowListModal(false);
      setListPrice('');
      await loadNFA();
    } catch (err: unknown) {
      const e = err as { reason?: string; message?: string };
      setActionError(e.reason || e.message || 'Transaction failed');
    } finally {
      setActionLoading(false);
      setListStep('approve');
    }
  };

  const handleCancelListing = async () => {
    if (!signer) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const receipt = await cancelListing(signer, nfaId);
      setTxHash(receipt?.hash || null);
      await loadNFA();
    } catch (err: unknown) {
      const e = err as { reason?: string; message?: string };
      setActionError(e.reason || e.message || 'Transaction failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEvolve = async () => {
    if (!signer) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const receipt = await evolveNFA(signer, nfaId);
      setTxHash(receipt?.hash || null);
      await loadNFA();
    } catch (err: unknown) {
      const e = err as { reason?: string; message?: string };
      setActionError(e.reason || e.message || 'Not eligible for evolution yet');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
            <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 animate-spin" />
          </div>
          <p className="text-gray-400 animate-pulse">Loading NFA #{nfaId}...</p>
        </div>
      </div>
    );
  }

  if (!nfa) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-white mb-2">NFA #{nfaId} Not Found</h2>
          <p className="text-gray-400 mb-6">This NFA doesn&apos;t exist or hasn&apos;t been minted yet.</p>
          <Link
            href="/marketplace"
            className="px-6 py-3 bg-gray-800 rounded-xl text-white font-medium hover:bg-gray-700 transition-colors"
          >
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const gradient = TIER_GRADIENTS[nfa.tier] || TIER_GRADIENTS[0];
  const glow = TIER_GLOW[nfa.tier] || '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
          <span>/</span>
          <span className="text-white">NFA #{nfaId}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Image + Tier */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className={`relative bg-gradient-to-br ${gradient} border rounded-2xl overflow-hidden ${glow}`}>
              <div className="relative aspect-square bg-gray-900/30 p-8">
                <Image
                  src={getRobotImage(nfaId)}
                  alt={`NFA #${nfaId}`}
                  fill
                  className="object-contain p-6"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <div className="absolute top-4 left-4">
                  <TierBadge tier={nfa.tier} size="lg" />
                </div>
                <div className="absolute top-4 right-4">
                  <a
                    href={bscscanNFT(nfaId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-full bg-gray-900/80 border border-gray-700 text-xs font-mono text-gray-400 hover:text-white transition-colors"
                  >
                    #{nfaId} ↗
                  </a>
                </div>
              </div>

              {/* Evolution Progress */}
              <div className="p-4 border-t border-gray-700/50">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Evolution Progress</span>
                  <span className="text-gray-300">
                    {nfa.tier < 4 ? (
                      <>
                        <span style={{ color: tierColor }}>{TIER_NAMES[nfa.tier]}</span>
                        <span className="text-gray-600 mx-1">→</span>
                        <span style={{ color: TIER_COLORS[nfa.tier + 1] }}>{TIER_NAMES[nfa.tier + 1]}</span>
                      </>
                    ) : (
                      <span style={{ color: tierColor }}>MAX TIER ✨</span>
                    )}
                  </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${evolution.percent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: tierColor }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-500">{evolution.current} / {evolution.required} wins</span>
                  <span className="text-[10px] text-gray-500">{evolution.percent.toFixed(0)}%</span>
                </div>
                {isOwner && evolution.percent >= 100 && nfa.tier < 4 && (
                  <button
                    onClick={handleEvolve}
                    disabled={actionLoading}
                    className="w-full mt-3 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {actionLoading ? 'Evolving...' : '⚡ Evolve to ' + TIER_NAMES[nfa.tier + 1]}
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right: Details + Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {getNFAName(nfaId)}
              </h1>
              <p className="text-gray-400">
                Agent #{nfa.agentId} • Created by{' '}
                <a
                  href={bscscanAddress(nfa.originalCreator)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:underline"
                >
                  {shortenAddress(nfa.originalCreator)}
                </a>
              </p>
            </div>

            {/* Battle Stats */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">⚔️ Battle Stats</h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{nfa.wins}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{nfa.losses}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Losses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-400">{winRate}%</div>
                  <div className="text-[10px] text-gray-500 uppercase">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{nfa.currentStreak > 0 ? `🔥${nfa.currentStreak}` : '—'}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{nfa.bestStreak}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Best Streak</div>
                </div>
              </div>
            </div>

            {/* Proof of Prompt */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">🔐 Proof of Prompt</h3>
              <div className="font-mono text-xs text-gray-400 bg-gray-900/50 p-3 rounded-lg break-all border border-gray-700/50">
                {nfa.proofOfPrompt}
              </div>
              <p className="text-[10px] text-gray-600 mt-2">
                Keccak256 hash of the system prompt. Verifiable on-chain forever.
              </p>
            </div>

            {/* Strategy Style */}
            {strategyStyle && STRATEGY_STYLES[strategyStyle] && (
              <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">🎯 Strategy Style</h3>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{STRATEGY_STYLES[strategyStyle].emoji}</span>
                  <div>
                    <div className={`font-bold text-lg ${STRATEGY_STYLES[strategyStyle].color}`}>
                      {STRATEGY_STYLES[strategyStyle].label}
                    </div>
                    <div className="text-xs text-gray-500">Strategy details are kept confidential</div>
                  </div>
                </div>
              </div>
            )}

            {/* Trading Performance */}
            {tradingStats && tradingStats.total_trades > 0 && (
              <div className="bg-gray-800/30 border border-green-700/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">📊 Trading Performance</h3>
                  <div className="flex items-center gap-2">
                    {tournamentRank && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-yellow-900/30 text-yellow-400">
                        🏆 Rank #{tournamentRank}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      tradingStats.trading_mode === 'paper' ? 'bg-green-900/30 text-green-400' :
                      tradingStats.trading_mode === 'live' ? 'bg-red-900/30 text-red-400' :
                      'bg-gray-700/50 text-gray-500'
                    }`}>
                      {tradingStats.trading_mode === 'paper' ? '📝 Paper' : tradingStats.trading_mode === 'live' ? '🔴 Live' : 'Off'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="text-center">
                    <div className={`text-lg font-bold ${tradingStats.total_pnl_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tradingStats.total_pnl_usd >= 0 ? '+' : ''}${tradingStats.total_pnl_usd.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-500">Total PnL</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-teal-400">{tradingStats.win_rate.toFixed(1)}%</div>
                    <div className="text-[10px] text-gray-500">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{tradingStats.total_trades}</div>
                    <div className="text-[10px] text-gray-500">Total Trades</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${tradingStats.sharpe_ratio > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tradingStats.sharpe_ratio.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-500">Sharpe Ratio</div>
                  </div>
                </div>
                <Link
                  href={`/trading/${nfaId}`}
                  className="block text-center px-4 py-2 rounded-lg bg-green-600/20 border border-green-500/40 text-green-400 text-sm font-bold hover:bg-green-600/30 transition-colors"
                >
                  📊 View Trading Dashboard
                </Link>
              </div>
            )}

            {/* Owner Info */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">👤 Ownership</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">Current Owner</div>
                  <a
                    href={bscscanAddress(nfa.owner)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 font-mono text-sm hover:underline"
                  >
                    {shortenAddress(nfa.owner)} ↗
                  </a>
                </div>
                {isOwner && (
                  <span className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold">
                    You Own This
                  </span>
                )}
              </div>
            </div>

            {/* Price / Action Buttons */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5 space-y-4">
              {isListed && (
                <div>
                  <div className="text-sm text-gray-400 mb-1">Price</div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {parseFloat(ethers.formatEther(nfa.listing!.price)).toFixed(4)} BNB
                  </div>
                </div>
              )}

              {/* Transaction success */}
              {txHash && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                  <p className="text-green-400 text-sm font-medium">✅ Transaction Successful</p>
                  <a
                    href={`https://bscscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-400/70 hover:underline font-mono"
                  >
                    {txHash.slice(0, 20)}... ↗
                  </a>
                </div>
              )}

              {/* Action Error */}
              {actionError && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{actionError}</p>
                </div>
              )}

              {/* Not connected */}
              {!connected && (
                <button
                  onClick={connect}
                  disabled={connecting}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all disabled:opacity-50"
                >
                  {connecting ? 'Connecting...' : '🦊 Connect Wallet to Trade'}
                </button>
              )}

              {/* Connected: Owner actions */}
              {connected && isOwner && (
                <div className="space-y-3">
                  {isListed ? (
                    <button
                      onClick={handleCancelListing}
                      disabled={actionLoading}
                      className="w-full px-6 py-3 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 font-bold hover:bg-red-600/30 transition-all disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : '❌ Cancel Listing'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowListModal(true)}
                      disabled={actionLoading}
                      className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      🏪 List for Sale
                    </button>
                  )}
                </div>
              )}

              {/* Connected: Buyer actions */}
              {connected && !isOwner && isListed && (
                <button
                  onClick={handleBuy}
                  disabled={actionLoading}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold text-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50"
                >
                  {actionLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Buying...
                    </span>
                  ) : (
                    <>💰 Buy for {parseFloat(ethers.formatEther(nfa.listing!.price)).toFixed(4)} BNB</>
                  )}
                </button>
              )}
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-3">
              <a
                href={bscscanNFT(nfaId)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-sm text-gray-400 hover:text-white transition-colors"
              >
                📜 View on BscScan
              </a>
              <a
                href={bscscanAddress(NFA_CONTRACT_ADDRESS)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-sm text-gray-400 hover:text-white transition-colors"
              >
                📋 Contract
              </a>
              <Link
                href={`/nfa/${nfaId}/reputation`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition-colors"
              >
                🔗 Verify Reputation On-Chain
              </Link>
              <Link
                href="/marketplace"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Back to Marketplace
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Battle History */}
        <div className="col-span-1 lg:col-span-2 mt-8">
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📜 Recent Battle History</h3>
            {battlesLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-500 animate-pulse">Loading battles...</div>
              </div>
            ) : battles.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">No battle history yet</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {battles.map((battle, i) => (
                  <div key={battle.id || i} className={`flex items-center justify-between p-3 rounded-lg border ${
                    battle.is_win 
                      ? 'bg-green-900/10 border-green-500/20' 
                      : 'bg-red-900/10 border-red-500/20'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg ${battle.is_win ? '🏆' : '💀'}`}>
                        {battle.is_win ? '🏆' : '💀'}
                      </span>
                      <div>
                        <div className="text-sm text-white">
                          {battle.bot1_name} <span className="text-gray-500">vs</span> {battle.bot2_name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          ${battle.token_symbol} • {battle.bot1_prediction?.toFixed(2)}x vs {battle.bot2_prediction?.toFixed(2)}x
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold ${battle.is_win ? 'text-green-400' : 'text-red-400'}`}>
                        {battle.is_win ? 'WIN' : 'LOSS'}
                      </div>
                      {battle.resolved_at && (
                        <div className="text-[10px] text-gray-600">
                          {new Date(battle.resolved_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* List Modal */}
      {showListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-white mb-4">🏪 List NFA #{nfaId} for Sale</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Price in BNB</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="0.1"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 font-bold">BNB</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                A platform fee and creator royalty will be deducted from the sale price.
                The contract will be approved to transfer your NFA.
              </p>
              {actionError && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{actionError}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowListModal(false); setActionError(null); }}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-800 text-gray-400 font-medium hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleList}
                  disabled={actionLoading || !listPrice || parseFloat(listPrice) <= 0}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {actionLoading ? (listStep === 'approve' ? '🔓 Approving...' : '📝 Listing...') : '✅ Approve & List'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
