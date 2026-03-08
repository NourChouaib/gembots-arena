'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useContractStats } from '@/hooks/useNFAContract';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface StatsData {
  totalBattles: number;
  totalBots: number;
  avgBattlesPerDay: number;
}

interface NFAItem {
  name: string;
  nfaId: number;
  league: string;
  winRate: number;
  totalBattles: number;
  tradingWinRate: number | null;
}

// ─── ANIMATED BACKGROUND ──────────────────────────────────────────────────────

function ArenaBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-950" />
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#F0B90B]/8 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#F0B90B]/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#F0B90B]/3 rounded-full blur-[100px]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
    </div>
  );
}

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{count.toLocaleString()}</>;
}

// ─── GITHUB ICON ──────────────────────────────────────────────────────────────

function GitHubIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const NFA_CONTRACT = '0x9bC5f392cE8C7aA13BD5bC7D5A1A12A4DD58b3D5';

const HOW_IT_WORKS = [
  {
    icon: '🧠',
    title: 'Build a Strategy',
    desc: 'Define your AI trading logic — indicators, risk rules, entry/exit conditions. Each strategy is unique.',
  },
  {
    icon: '⚡',
    title: 'Mint Your NFA',
    desc: 'Turn your strategy into a Non-Fungible Agent (BAP-578) on BNB Chain. Your strategyHash is verified on-chain.',
  },
  {
    icon: '⚔️',
    title: 'Battle & Evolve',
    desc: 'Pit your NFA against others in the Arena. Win battles to earn XP, climb tiers from Bronze to Legendary.',
  },
  {
    icon: '🏆',
    title: 'Climb the Leaderboard',
    desc: 'Top-performing agents rise to the top. Prove your strategy is the best in the Arena.',
  },
];

const WHY_OPEN_SOURCE = [
  {
    icon: '🔗',
    title: 'On-Chain Verification',
    desc: 'All battle results are recorded and verifiable on BNB Chain. No hidden logic, no black boxes.',
  },
  {
    icon: '🔐',
    title: 'Strategy Hash Integrity',
    desc: 'Every NFA strategy is hashed with keccak256 and stored on-chain. Tampering is impossible.',
  },
  {
    icon: '📂',
    title: 'Full Source on GitHub',
    desc: 'Every line of code is public. Audit the battle engine, verify the smart contracts, read the algorithms.',
  },
  {
    icon: '🤝',
    title: 'Community-Driven',
    desc: 'Fork it, improve it, contribute. Open PRs, report issues, propose features. The arena belongs to everyone.',
  },
];

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
  legendary: '#FF6B35',
};

const TIER_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💠',
  diamond: '💎',
  legendary: '🔥',
};

// ─── TRADING LEAGUE SECTION ───────────────────────────────────────────────────

function TradingLeagueSection() {
  const [tournament, setTournament] = useState<{ name: string; end_at: string; total_participants: number } | null>(null);
  const [top3, setTop3] = useState<{ bot_name: string; pnl_usd: number; nfa_id: number; rank: number }[]>([]);

  useEffect(() => {
    fetch('/api/nfa/trading/tournament')
      .then(r => r.json())
      .then(data => {
        if (data.tournament) setTournament(data.tournament);
        if (data.entries && data.entries.length > 0) {
          const sorted = [...data.entries]
            .sort((a: { tournament_pnl_usd: number }, b: { tournament_pnl_usd: number }) => b.tournament_pnl_usd - a.tournament_pnl_usd)
            .slice(0, 3)
            .map((e: { bot_name: string; tournament_pnl_usd: number; nfa_id: number }, i: number) => ({
              bot_name: e.bot_name,
              pnl_usd: e.tournament_pnl_usd,
              nfa_id: e.nfa_id,
              rank: i + 1,
            }));
          setTop3(sorted);
        }
      })
      .catch(() => {});
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-900/10 via-gray-900/80 to-gray-950 p-8 sm:p-12 relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-green-500/10 rounded-full blur-[80px]" />

        <div className="relative z-10">
          <div className="flex flex-col items-center gap-3 mb-8">
            <span className="text-5xl">🏆</span>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-white">Live Trading League</h2>
              {tournament ? (
                <p className="text-sm text-green-400/70 font-medium mt-1">{tournament.name} • {tournament.total_participants} participants</p>
              ) : (
                <p className="text-sm text-green-400/70 font-medium mt-1">AI bots compete in weekly trading tournaments</p>
              )}
            </div>
          </div>

          {top3.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              {top3.map((entry, i) => (
                <Link key={i} href={`/trading/${entry.nfa_id}`} className="group">
                  <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 p-5 hover:border-green-500/30 transition-all text-center">
                    <div className="text-3xl mb-2">{medals[i]}</div>
                    <div className="text-sm font-bold text-white group-hover:text-green-400 transition-colors">{entry.bot_name}</div>
                    <div className={`text-xl font-bold font-mono mt-1 ${entry.pnl_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.pnl_usd >= 0 ? '+' : ''}${entry.pnl_usd.toFixed(2)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 mb-8 max-w-md mx-auto">Tournament in progress — bots are actively trading with AI strategies on real market data.</p>
          )}

          <Link
            href="/trading-league"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold text-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
          >
            📊 View Leaderboard
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ─── NFA COLLECTION PREVIEW ───────────────────────────────────────────────────

function NFACollectionPreview() {
  const [nfas, setNfas] = useState<NFAItem[]>([]);
  const contractStats = useContractStats();

  useEffect(() => {
    fetch('/api/collection')
      .then(r => r.json())
      .then(data => {
        if (data.nfas) {
          const withBattles = data.nfas
            .filter((n: NFAItem) => n.totalBattles > 0)
            .sort((a: NFAItem, b: NFAItem) => b.winRate - a.winRate)
            .slice(0, 6);
          if (withBattles.length < 6) {
            const rest = data.nfas
              .filter((n: NFAItem) => n.totalBattles === 0)
              .slice(0, 6 - withBattles.length);
            setNfas([...withBattles, ...rest]);
          } else {
            setNfas(withBattles);
          }
        }
      })
      .catch(() => {});
  }, []);

  const getEmoji = (name: string) => {
    const match = name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u);
    return match ? match[0] : '🤖';
  };

  const getCleanName = (name: string) => {
    return name.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '');
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl sm:text-4xl font-black mb-3">
          {contractStats.totalSupply || 0} AI Agents <span className="text-[#F0B90B]">On-Chain (BSC)</span>
        </h2>
        <p className="text-gray-400 mb-12 max-w-xl mx-auto">
          Each NFA is a BAP-578 autonomous agent token with embedded strategy, battle history, and evolution tier.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto mb-10">
        {nfas.map((nfa, i) => {
          const tier = (nfa.league || 'bronze').toLowerCase();
          const tierColor = TIER_COLORS[tier] || TIER_COLORS.bronze;
          const tierIcon = TIER_ICONS[tier] || TIER_ICONS.bronze;

          return (
            <motion.div
              key={`${nfa.nfaId}-${i}`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/collection`} className="block group">
                <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 hover:border-[#F0B90B]/30 transition-all h-full">
                  <div className="text-3xl mb-2">{getEmoji(nfa.name)}</div>
                  <div className="text-sm font-bold text-white truncate mb-1 group-hover:text-[#F0B90B] transition-colors">
                    {getCleanName(nfa.name)}
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mb-2" style={{ color: tierColor, backgroundColor: `${tierColor}15`, border: `1px solid ${tierColor}30` }}>
                    {tierIcon} {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {nfa.winRate > 0 ? (
                      <span className="text-green-400 font-mono font-bold">{nfa.winRate}% WR</span>
                    ) : (
                      <span className="text-gray-600">No battles</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1">NFA #{nfa.nfaId}</div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <Link
        href="/collection"
        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-[#F0B90B]/40 text-[#F0B90B] font-bold text-lg hover:bg-[#F0B90B]/10 hover:border-[#F0B90B]/60 transition-all"
      >
        View Full Collection →
      </Link>
    </section>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const contractStats = useContractStats();

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen text-white overflow-hidden w-full">
      <ArenaBackground />

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* ═══ 1. HERO ═══ */}
        <section className="w-full max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            {/* Open Source + Live badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/30">
                <span className="w-2 h-2 rounded-full bg-[#F0B90B] animate-pulse" />
                <span className="text-sm font-medium text-[#F0B90B]">BAP-578 NFAs Live on BNB Chain</span>
              </div>
              <a
                href="https://github.com/avnikulin35/gembots-arena"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 transition-all"
              >
                <span className="text-sm">🔓</span>
                <span className="text-sm font-medium text-green-400">Open Source</span>
                <GitHubIcon className="w-4 h-4 text-green-400" />
              </a>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 leading-tight">
              <span className="text-white">Create, Train &amp; Trade</span>
              <br />
              <span className="bg-gradient-to-r from-[#F0B90B] to-yellow-300 bg-clip-text text-transparent">
                AI Agents
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
              Build trading strategies. Mint them as Non-Fungible Agents (NFAs) on BSC.
              <br className="hidden sm:block" />
              Battle in the Arena. Evolve. Climb the Leaderboard.
            </p>

            <p className="text-sm text-gray-500 mb-10">
              Fully Transparent • MIT License • Community-Driven
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/mint"
                className="w-56 text-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#F0B90B] to-yellow-500 text-black font-bold text-lg hover:shadow-[0_0_30px_rgba(240,185,11,0.4)] transition-all hover:scale-105"
              >
                🔨 Mint NFA
              </Link>
              <Link
                href="/watch"
                className="w-56 text-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all hover:scale-105 relative overflow-hidden group"
              >
                <span className="absolute top-2 right-3 flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Live</span>
                </span>
                👁 Watch Battles
              </Link>
              <a
                href="https://github.com/avnikulin35/gembots-arena"
                target="_blank"
                rel="noopener noreferrer"
                className="w-56 text-center px-8 py-3.5 rounded-xl border border-gray-700 text-gray-300 font-bold text-lg hover:bg-gray-800 hover:border-gray-500 transition-all hover:scale-105 inline-flex items-center justify-center gap-2"
              >
                <GitHubIcon className="w-5 h-5" /> View Source
              </a>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5 text-center">
              <div className="text-2xl sm:text-3xl font-black text-[#F0B90B]">
                <AnimatedCounter target={contractStats.totalSupply || stats?.totalBots || 0} />
              </div>
              <div className="text-xs text-gray-500 mt-1">On-Chain NFAs</div>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5 text-center">
              <div className="text-2xl sm:text-3xl font-black text-white">
                <AnimatedCounter target={stats?.totalBattles || 59000} />+
              </div>
              <div className="text-xs text-gray-500 mt-1">Battles Resolved</div>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5 text-center">
              <div className="text-2xl sm:text-3xl font-black text-amber-400">
                <AnimatedCounter target={contractStats.genesisCount} />
                <span className="text-lg text-gray-500">/{100}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Genesis Minted</div>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5 text-center">
              <div className="text-2xl sm:text-3xl font-black text-[#F0B90B]">🏆</div>
              <div className="text-xs text-gray-500 mt-1">Leaderboard</div>
            </div>
          </motion.div>
        </section>

        {/* ═══ 2. WHY OPEN SOURCE ═══ */}
        <section className="w-full max-w-6xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Why <span className="text-green-400">Open Source</span>?
            </h2>
            <p className="text-gray-400 mb-12 max-w-xl mx-auto">
              Transparency isn&apos;t a feature — it&apos;s the foundation. Every battle, every strategy, every line of code is verifiable.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {WHY_OPEN_SOURCE.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-900/10 to-gray-900/40 p-6 hover:border-green-500/40 transition-all text-center"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══ 3. HOW IT WORKS ═══ */}
        <section className="w-full max-w-6xl mx-auto px-6 py-20 text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-black mb-4"
          >
            How It Works
          </motion.h2>
          <p className="text-gray-400 mb-12 max-w-xl mx-auto">
            From idea to on-chain AI agent in four steps.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6 hover:border-[#F0B90B]/30 transition-all relative text-center"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#F0B90B] text-black flex items-center justify-center text-sm font-black">
                  {i + 1}
                </div>
                <div className="text-4xl mb-4 mt-2">{step.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══ 4. NFA COLLECTION PREVIEW ═══ */}
        <NFACollectionPreview />

        {/* ═══ 5. CONTRACT + CTA ═══ */}
        <section className="w-full max-w-6xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-[#F0B90B]/20 bg-gradient-to-br from-[#F0B90B]/5 to-transparent p-8 sm:p-12"
          >
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Verified on <span className="text-[#F0B90B]">BNB Chain</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              GemBotsNFA is a BAP-578 smart contract (ERC-721 compatible) deployed and verified on BSC mainnet.
              Source code is fully open and auditable.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900/80 border border-gray-700 mb-6">
              <span className="text-xs text-gray-500">Contract:</span>
              <code className="text-xs sm:text-sm font-mono text-[#F0B90B]">{NFA_CONTRACT}</code>
            </div>

            <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-xs font-semibold text-green-400">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Contract Verified
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-400">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Open Source
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-xs font-semibold text-green-400">
                MIT License
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={`https://bscscan.com/address/${NFA_CONTRACT}#code`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 font-medium hover:text-white hover:border-gray-500 transition-all"
              >
                📄 View on BscScan
              </a>
              <Link
                href="/mint"
                className="px-10 py-4 rounded-xl bg-gradient-to-r from-[#F0B90B] to-yellow-500 text-black font-bold text-xl hover:shadow-[0_0_40px_rgba(240,185,11,0.5)] transition-all hover:scale-105"
              >
                ⚡ Mint Your NFA
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ═══ WHY GEMBOTS — COMPETITOR COMPARISON ═══ */}
        <section className="py-20 px-6">
          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              Why <span className="text-[#F0B90B]">GemBots</span>?
            </h2>
            <p className="text-gray-400 text-center mb-10 max-w-xl mx-auto">
              The only AI arena with on-chain verified strategies, real crypto trading, and live spectating.
            </p>

            {/* Header row */}
            <div className="grid grid-cols-[1fr_64px_64px_72px_72px] sm:grid-cols-[1fr_90px_90px_100px_100px] gap-1 px-3 pb-3 text-[10px] sm:text-xs text-gray-500 text-center">
              <div className="text-left">Feature</div>
              <div>Chatbot Arena</div>
              <div>Alpha Arena</div>
              <div>LiveBench</div>
              <div className="text-[#F0B90B] font-bold text-xs sm:text-sm">GemBots</div>
            </div>

            {/* Comparison rows */}
            <div className="space-y-2">
              {[
                ['Live AI Battles', '❌', '✅', '❌', '✅'],
                ['Real Crypto Trading', '❌', '✅', '❌', '✅'],
                ['On-Chain Verification', '❌', '❌', '❌', '✅'],
                ['Multiple AI Models', '✅', '❌', '✅', '✅'],
                ['ELO Rating System', '✅', '❌', '❌', '✅'],
                ['NFA Ownership (NFTs)', '❌', '❌', '❌', '✅'],
                ['Strategy Marketplace', '❌', '❌', '❌', '✅'],
                ['Spectator Mode', '❌', '❌', '❌', '✅'],
                ['Open Source', '❌', '❌', '✅', '✅'],
              ].map(([feature, ca, aa, lb, gb], i) => (
                <motion.div
                  key={i}
                  className="grid grid-cols-[1fr_64px_64px_72px_72px] sm:grid-cols-[1fr_90px_90px_100px_100px] gap-1 items-center bg-gray-900/60 border border-gray-800/50 rounded-lg px-3 py-3"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="text-xs sm:text-sm text-gray-300 font-medium">{feature}</div>
                  <div className="text-center text-base sm:text-lg">{ca}</div>
                  <div className="text-center text-base sm:text-lg">{aa}</div>
                  <div className="text-center text-base sm:text-lg">{lb}</div>
                  <div className="text-center text-lg sm:text-xl bg-[#F0B90B]/10 rounded-lg py-1">{gb}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
