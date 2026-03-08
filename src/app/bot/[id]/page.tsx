'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useNFA } from '@/hooks/useNFAContract';
import { useEVMWallet } from '@/providers/EVMWalletProvider';
import {
  TIER_NAMES,
  TIER_COLORS,
  TIER_GRADIENTS,
  STATUS_NAMES,
  AgentStatus,
  BSCSCAN_BASE,
  NFA_CONTRACT_ADDRESS,
  fundAgent,
  withdrawFromAgent,
  pauseAgent,
  unpauseAgent,
  updateAgentMetadata,
  buyNFA,
} from '@/lib/nfa';
import { getNFADisplayInfo, getRobotImage } from '@/lib/robot-images';
import { ethers } from 'ethers';

// Arena stats from Supabase
interface ArenaBot {
  id: number;
  name: string;
  wins: number;
  losses: number;
  total_battles: number;
  elo: number;
  league: string;
  hp: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function parsePersona(persona?: string): { name?: string; personality?: string; backstory?: string } {
  if (!persona) return {};
  try { return JSON.parse(persona); } catch { return {}; }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function BotProfilePage() {
  const params = useParams();
  const nfaId = params.id ? parseInt(params.id as string, 10) : null;
  const { nfa, loading, error, refresh } = useNFA(nfaId);
  const { connected, address, signer } = useEVMWallet();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('0.01');
  const [showFundModal, setShowFundModal] = useState(false);
  const [txMessage, setTxMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [arenaBot, setArenaBot] = useState<ArenaBot | null>(null);

  // Fetch arena stats from Supabase
  useEffect(() => {
    if (nfaId === null) return;
    fetch('/api/arena-stats')
      .then(r => r.json())
      .then(data => {
        if (data.bots) {
          const bot = data.bots.find((b: ArenaBot) => b.id === nfaId);
          if (bot) setArenaBot(bot);
        }
      })
      .catch(() => {});
  }, [nfaId]);

  // Display info (name, image, style) from robot-images
  const displayInfo = nfaId !== null ? getNFADisplayInfo(nfaId) : null;
  const robotImage = nfaId !== null ? getRobotImage(nfaId) : null;

  const isOwner = connected && address && nfa?.owner?.toLowerCase() === address.toLowerCase();

  const handleAction = useCallback(async (action: string) => {
    if (!signer || nfaId === null) return;
    setActionLoading(action);
    setTxMessage(null);
    try {
      let tx;
      switch (action) {
        case 'fund':
          tx = await fundAgent(signer, nfaId, fundAmount);
          break;
        case 'withdraw':
          tx = await withdrawFromAgent(signer, nfaId, balance.toString());
          break;
        case 'pause':
          tx = await pauseAgent(signer, nfaId);
          break;
        case 'unpause':
          tx = await unpauseAgent(signer, nfaId);
          break;
        case 'buy':
          if (!nfa?.listing?.price) return;
          tx = await buyNFA(signer, nfaId, BigInt(nfa.listing.price));
          break;
        default:
          return;
      }
      if (tx) {
        setTxMessage({ type: 'success', text: `✅ ${action} successful! TX: ${tx.hash?.slice(0, 14) || 'confirmed'}...` });
      }
      setTimeout(refresh, 3000);
    } catch (e: any) {
      setTxMessage({ type: 'error', text: `❌ ${action} failed: ${e.message?.slice(0, 100)}` });
    } finally {
      setActionLoading(null);
      setShowFundModal(false);
    }
  }, [signer, nfaId, fundAmount, refresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-[#F0B90B] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading NFA #{nfaId} from blockchain...</p>
        </div>
      </div>
    );
  }

  if (error || !nfa) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-gray-400 text-lg mb-2">NFA #{nfaId} not found</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <Link href="/collection" className="text-[#F0B90B] hover:underline">← Back to Collection</Link>
        </div>
      </div>
    );
  }

  const persona = parsePersona(nfa.metadata?.persona);
  // Prefer display info name, then arena name, then persona, then fallback
  const displayName = displayInfo?.name || arenaBot?.name || persona.name || `NFA #${nfa.nfaId}`;
  const tierName = TIER_NAMES[nfa.tier] || 'Bronze';
  const tierColor = TIER_COLORS[nfa.tier] || 'text-orange-400';
  const tierGradient = TIER_GRADIENTS[nfa.tier] || 'from-orange-500/20 via-orange-600/10 to-amber-500/20';
  const status = nfa.state?.status ?? AgentStatus.Active;
  const statusName = STATUS_NAMES[status] || 'Unknown';
  const isActive = status === AgentStatus.Active;
  const isPaused = status === AgentStatus.Paused;
  const balance = nfa.state?.balance ? Number(nfa.state.balance) / 1e18 : 0;
  // Prefer arena stats (Supabase) over on-chain (which may be 0)
  const wins = arenaBot?.wins ?? nfa.wins ?? 0;
  const losses = arenaBot?.losses ?? nfa.losses ?? 0;
  const totalBattles = arenaBot?.total_battles ?? nfa.totalBattles ?? 0;
  const winRate = totalBattles > 0 ? ((wins / totalBattles) * 100).toFixed(1) : '—';
  const elo = arenaBot?.elo ?? 0;
  const league = arenaBot?.league ?? '';
  const hp = arenaBot?.hp ?? 100;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link href="/collection" className="text-sm text-gray-500 hover:text-[#F0B90B] mb-6 inline-block">
          ← Back to Collection
        </Link>

        {/* Hero Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br ${tierGradient} border border-gray-700/50 rounded-2xl p-6 sm:p-8 mb-6`}>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gray-800 flex items-center justify-center border-2 border-gray-700 overflow-hidden">
                {robotImage ? (
                  <Image src={robotImage} alt={displayName} width={96} height={96} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl">🤖</span>
                )}
              </div>
              <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-900 border border-gray-700 ${tierColor}`}>
                ⭐ {tierName}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
                <h1 className="text-3xl font-bold">{displayName}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
                  isPaused ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                  'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}>
                  {statusName}
                </span>
              </div>
              
              <p className="text-sm text-gray-500 mb-1">
                NFA #{nfa.nfaId} • {nfa.isGenesis ? '🌟 Genesis' : 'Standard'}
                {displayInfo?.style && <span> • {displayInfo.style}</span>}
                {league && <span> • 🏅 {league}</span>}
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-4">
                {nfa.strategy?.modelId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    🧠 {nfa.strategy.modelId}
                  </span>
                )}
                {nfa.strategy?.strategyURI && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    🎯 Strategy
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-6">
                <div>
                  <div className="text-2xl font-bold text-[#F0B90B]">{balance.toFixed(4)}</div>
                  <div className="text-xs text-gray-500">BNB Balance</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{wins}</div>
                  <div className="text-xs text-gray-500">Wins</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{losses}</div>
                  <div className="text-xs text-gray-500">Losses</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${
                    winRate !== '—' && parseFloat(winRate) >= 50 ? 'text-green-400' : 'text-gray-400'
                  }`}>{winRate}{winRate !== '—' ? '%' : ''}</div>
                  <div className="text-xs text-gray-500">Win Rate</div>
                </div>
                {elo > 0 && (
                  <div>
                    <div className="text-2xl font-bold text-purple-400">{elo}</div>
                    <div className="text-xs text-gray-500">ELO</div>
                  </div>
                )}
                <div>
                  <div className="text-2xl font-bold text-amber-400">{nfa.currentStreak > 0 ? `🔥 ${nfa.currentStreak}` : '—'}</div>
                  <div className="text-xs text-gray-500">Streak</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* TX Message */}
        {txMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            txMessage.type === 'success' ? 'bg-green-900/20 border border-green-500/30 text-green-400' :
            'bg-red-900/20 border border-red-500/30 text-red-400'
          }`}>
            {txMessage.text}
          </div>
        )}

        {/* Owner Actions */}
        {isOwner && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              🔧 Agent Controls
              <span className="text-xs text-gray-500 font-normal">(owner only)</span>
            </h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowFundModal(true)} disabled={!!actionLoading}
                className="px-4 py-2 rounded-lg bg-[#F0B90B]/20 border border-[#F0B90B]/40 text-[#F0B90B] font-medium text-sm hover:bg-[#F0B90B]/30 disabled:opacity-50 transition-all">
                {actionLoading === 'fund' ? '⏳ Funding...' : '💰 Fund Agent'}
              </button>
              <button onClick={() => handleAction('withdraw')} disabled={!!actionLoading || balance === 0}
                className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-medium text-sm hover:bg-blue-500/30 disabled:opacity-50 transition-all">
                {actionLoading === 'withdraw' ? '⏳ Withdrawing...' : '💸 Withdraw'}
              </button>
              {isActive ? (
                <button onClick={() => handleAction('pause')} disabled={!!actionLoading}
                  className="px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-medium text-sm hover:bg-yellow-500/30 disabled:opacity-50 transition-all">
                  {actionLoading === 'pause' ? '⏳...' : '⏸ Pause'}
                </button>
              ) : isPaused ? (
                <button onClick={() => handleAction('unpause')} disabled={!!actionLoading}
                  className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 font-medium text-sm hover:bg-green-500/30 disabled:opacity-50 transition-all">
                  {actionLoading === 'unpause' ? '⏳...' : '▶️ Unpause'}
                </button>
              ) : null}
              <button onClick={refresh}
                className="px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-400 font-medium text-sm hover:bg-gray-700 transition-all">
                🔄 Refresh
              </button>
              <Link href={`/nfa/${nfa.nfaId}/reputation`}
                className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-medium text-sm hover:bg-cyan-500/20 hover:text-cyan-300 transition-all">
                🔗 Verify On-Chain
              </Link>
            </div>
          </motion.div>
        )}

        {/* Fund Modal */}
        {showFundModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowFundModal(false)}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">💰 Fund Agent</h3>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Amount (BNB)</label>
                <input type="number" step="0.001" min="0.001" value={fundAmount}
                  onChange={e => setFundAmount(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:border-[#F0B90B]/50" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleAction('fund')} disabled={!!actionLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#F0B90B] text-black font-bold hover:bg-yellow-400 disabled:opacity-50 transition-all">
                  {actionLoading === 'fund' ? '⏳ Sending...' : 'Confirm'}
                </button>
                <button onClick={() => setShowFundModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visitor Actions (non-owner) */}
        {!isOwner && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              ⚡ Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              {nfa?.listing?.active ? (
                <button
                  onClick={() => handleAction('buy')}
                  disabled={!connected || actionLoading === 'buy'}
                  className="px-5 py-2.5 rounded-lg bg-[#F0B90B] text-black font-bold text-sm hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(240,185,11,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {actionLoading === 'buy' ? '⏳ Buying...' : `🏪 Buy on Marketplace — ${nfa.listing.price ? `${ethers.formatEther(nfa.listing.price)} BNB` : ''}`}
                </button>
              ) : (
                <Link href="/marketplace"
                  className="px-5 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-300 font-medium text-sm hover:bg-gray-700 hover:text-white transition-all">
                  🏪 View Marketplace
                </Link>
              )}
              <Link href="/watch"
                className="px-5 py-2.5 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 font-medium text-sm hover:bg-red-600/30 transition-all relative">
                <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                ⚔️ Watch Battles Live
              </Link>
              <button onClick={() => {
                const url = `https://gembots.space/bot/${nfa.nfaId}`;
                const text = `Check out ${displayName} on GemBots Arena! ⭐ ${tierName} | 🏆 ${wins}W-${losses}L\n${url}`;
                if (navigator.share) { navigator.share({ text, url }).catch(() => {}); }
                else { navigator.clipboard.writeText(text).then(() => alert('Link copied!')); }
              }}
                className="px-5 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-300 font-medium text-sm hover:bg-gray-700 hover:text-white transition-all">
                📤 Share Bot
              </button>
              <Link href={`/nfa/${nfa.nfaId}/reputation`}
                className="px-5 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-medium text-sm hover:bg-cyan-500/20 hover:text-cyan-300 transition-all">
                🔗 Verify On-Chain
              </Link>
            </div>
          </motion.div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Agent Metadata (BAP-578) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">🧬 Agent Metadata</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Experience</span>
                <span className="text-gray-300">{nfa.metadata?.experience || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Voice Hash</span>
                <span className="text-gray-300 font-mono text-xs">{nfa.metadata?.voiceHash?.slice(0, 14) || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Animation</span>
                <span className="text-gray-300 text-xs">{nfa.metadata?.animationURI || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Active</span>
                <span className="text-gray-300">
                  {nfa.state?.lastActionTimestamp ? new Date(nfa.state.lastActionTimestamp * 1000).toLocaleString() : '—'}
                </span>
              </div>
              {persona.personality && (
                <div>
                  <span className="text-gray-500 block mb-1">Personality</span>
                  <span className="text-gray-400 text-xs">{persona.personality}</span>
                </div>
              )}
              {persona.backstory && (
                <div>
                  <span className="text-gray-500 block mb-1">Backstory</span>
                  <span className="text-gray-400 text-xs">{persona.backstory}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* On-Chain Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">⛓️ On-Chain Data</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Token ID</span>
                <span className="text-gray-300 font-mono">#{nfa.nfaId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Owner</span>
                <a href={`${BSCSCAN_BASE}/address/${nfa.owner}`} target="_blank" rel="noopener noreferrer"
                  className="text-[#F0B90B] font-mono hover:underline">{shortenAddress(nfa.owner)}</a>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Creator</span>
                <span className="text-gray-300 font-mono">{shortenAddress(nfa.originalCreator)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tier</span>
                <span className={`font-bold ${tierColor}`}>⭐ {tierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Genesis</span>
                <span className="text-gray-300">{nfa.isGenesis ? '🌟 Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Config Hash</span>
                <span className="text-gray-400 font-mono text-xs">{nfa.configHash?.slice(0, 14)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Best Streak</span>
                <span className="text-gray-300">{nfa.bestStreak ?? 0}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Strategy */}
        {nfa.strategy && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">🎯 Strategy</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block text-xs mb-1">Model</span>
                <span className="text-gray-300 font-mono">{nfa.strategy.modelId || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs mb-1">Strategy Hash</span>
                <span className="text-gray-300 font-mono text-xs">{nfa.strategy.strategyHash?.slice(0, 14) || '—'}...</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs mb-1">Strategy URI</span>
                <span className="text-gray-300 text-xs">{nfa.strategy.strategyURI || '—'}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Marketplace Listing */}
        {nfa.listing?.active && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-[#F0B90B]/5 border border-[#F0B90B]/30 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#F0B90B]">🏪 Listed for Sale</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Price: <span className="text-[#F0B90B] font-bold">{ethers.formatEther(nfa.listing.price)} BNB</span>
                </p>
              </div>
              {!isOwner && connected && (
                <button className="px-6 py-2 rounded-lg bg-[#F0B90B] text-black font-bold hover:bg-yellow-400 transition-all">
                  Buy NFA
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Footer links */}
        <div className="flex flex-wrap gap-4 justify-center mt-8">
          <a href={`${BSCSCAN_BASE}/token/${NFA_CONTRACT_ADDRESS}?a=${nfa.nfaId}`}
            target="_blank" rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-all text-sm">
            📜 View on BscScan
          </a>
          <button onClick={() => {
            const url = `https://gembots.space/bot/${nfa.nfaId}`;
            const text = `Check out ${displayName} on GemBots Arena! ⭐ ${tierName} | 🏆 ${wins}W-${losses}L\n${url}`;
            if (navigator.share) { navigator.share({ text, url }).catch(() => {}); }
            else { navigator.clipboard.writeText(text).then(() => alert('Copied!')); }
          }}
            className="px-6 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition-all text-sm">
            📤 Share
          </button>
          <Link href="/collection"
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#F0B90B] to-amber-600 text-black font-bold hover:shadow-[0_0_20px_rgba(240,185,11,0.3)] transition-all text-sm">
            🤖 All NFAs
          </Link>
        </div>
      </main>
    </div>
  );
}
