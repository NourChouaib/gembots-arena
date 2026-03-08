'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

// ─── Types ───
interface StatsData {
  totalBattles: number;
  totalBots: number;
  activeBots: number;
  totalTournaments: number;
  avgBattlesPerDay: number;
  arenaStartDate: string | null;
  topBots: TopBot[];
  recentBattles: RecentBattle[];
}

interface TopBot {
  id: number;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  league: string;
  winStreak: number;
  peakElo: number;
}

interface RecentBattle {
  id: string;
  bot1: string;
  bot2: string;
  winner: string;
  token: string;
  resolvedAt: string;
}

// ─── Animated Counter ───
function AnimatedCounter({ target, duration = 2000, suffix = '', prefix = '' }: {
  target: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || target === 0) return;
    started.current = true;

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ─── Uptime Calculator ───
function UptimeDisplay({ startDate }: { startDate: string | null }) {
  const [uptime, setUptime] = useState('');

  useEffect(() => {
    if (!startDate) { setUptime('—'); return; }
    const update = () => {
      const start = new Date(startDate).getTime();
      const diff = Date.now() - start;
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setUptime(`${days}d ${hours}h ${minutes}m`);
    };
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [startDate]);

  return <span>{uptime}</span>;
}

// ─── League badge ───
function LeagueBadge({ league }: { league: string }) {
  const colors: Record<string, string> = {
    bronze: 'from-amber-700 to-amber-500',
    silver: 'from-gray-400 to-gray-200',
    gold: 'from-yellow-500 to-yellow-300',
    diamond: 'from-cyan-400 to-blue-300',
    champion: 'from-purple-500 to-pink-400',
  };
  const icons: Record<string, string> = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    diamond: '💎',
    champion: '👑',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${colors[league] || colors.bronze} text-black`}>
      {icons[league] || '🏅'} {league.charAt(0).toUpperCase() + league.slice(1)}
    </span>
  );
}

// ─── Time ago ───
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Main Page ───
export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 30000); // refresh every 30s
    return () => clearInterval(iv);
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1, y: 0, scale: 1,
      transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 grid-bg">
      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full"
            initial={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              opacity: 0,
            }}
            animate={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: Math.random() * 12 + 6,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Nav is now in layout.tsx */}

      {/* Hero */}
      <section className="relative z-10 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 font-orbitron">
              <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-green-400 bg-clip-text text-transparent">
                Arena Stats
              </span>
              <span className="block text-2xl md:text-3xl mt-2 text-gray-300 font-orbitron">
                Proof of Work
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mt-4">
              Real product. Real battles. Real data.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="relative z-10 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          {loading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <p className="text-red-400 text-lg">⚠️ {error}</p>
              <button onClick={fetchStats} className="mt-4 px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 transition-colors text-white">
                Retry
              </button>
            </div>
          )}

          {stats && !loading && (
            <>
              {/* ── Stat Cards Grid ── */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
                {[
                  { label: 'Total Battles', value: stats.totalBattles, icon: '⚔️', color: 'from-purple-600 to-purple-900' },
                  { label: 'Total Bots', value: stats.activeBots, icon: '🤖', color: 'from-cyan-600 to-cyan-900' },
                  { label: 'Tournaments', value: stats.totalTournaments, icon: '🏆', color: 'from-yellow-600 to-yellow-900' },
                  { label: 'Battles / Day', value: stats.avgBattlesPerDay, icon: '📊', color: 'from-green-600 to-green-900', decimal: true },
                  { label: 'Arena Uptime', icon: '⏱️', color: 'from-pink-600 to-pink-900', uptime: true },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className={`relative rounded-2xl p-6 bg-gradient-to-br ${card.color} border border-white/10 overflow-hidden group hover:scale-[1.03] transition-transform`}
                  >
                    <div className="absolute inset-0 bg-black/40 rounded-2xl" />
                    <div className="relative z-10">
                      <div className="text-3xl mb-2">{card.icon}</div>
                      <div className="text-3xl md:text-4xl font-bold font-orbitron text-white mb-1">
                        {card.uptime ? (
                          <UptimeDisplay startDate={stats.arenaStartDate} />
                        ) : (
                          <AnimatedCounter target={Math.round(card.value!)} duration={1500} />
                        )}
                        {card.decimal && <span className="text-xl text-gray-300">/day</span>}
                      </div>
                      <div className="text-sm text-gray-300 font-medium">{card.label}</div>
                    </div>
                    {/* Subtle glow */}
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/5 blur-2xl group-hover:bg-white/10 transition-colors" />
                  </motion.div>
                ))}
              </div>

              {/* ── Two columns: Top Bots + Recent Battles ── */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Top 3 Bots by ELO */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="rounded-2xl border border-white/10 bg-gray-900/80 backdrop-blur-md overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-900/50 to-transparent">
                    <h2 className="text-xl font-bold font-orbitron text-white flex items-center gap-2">
                      🏅 Top 3 Bots by ELO
                    </h2>
                  </div>
                  <div className="divide-y divide-white/5">
                    {stats.topBots.length === 0 && (
                      <div className="p-6 text-center text-gray-500">No bots with enough battles yet</div>
                    )}
                    {stats.topBots.map((bot, i) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const totalBattles = bot.wins + bot.losses;
                      const winRate = totalBattles > 0 ? Math.round((bot.wins / totalBattles) * 100) : 0;
                      return (
                        <motion.div
                          key={bot.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.15 }}
                          className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                        >
                          <div className="text-3xl">{medals[i]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-white truncate">{bot.name}</span>
                              <LeagueBadge league={bot.league} />
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <span>{bot.wins}W / {bot.losses}L</span>
                              <span className="text-green-400">{winRate}%</span>
                              {bot.winStreak > 0 && <span className="text-orange-400">🔥{bot.winStreak}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold font-orbitron text-purple-400">{bot.elo}</div>
                            <div className="text-xs text-gray-500">Peak: {bot.peakElo}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="px-6 py-3 border-t border-white/10 bg-gray-900/50">
                    <Link href="/leaderboard" className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                      View full leaderboard →
                    </Link>
                  </div>
                </motion.div>

                {/* Recent 5 Battles */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="rounded-2xl border border-white/10 bg-gray-900/80 backdrop-blur-md overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-900/50 to-transparent flex items-center justify-between">
                    <h2 className="text-xl font-bold font-orbitron text-white flex items-center gap-2">
                      ⚡ Recent Battles
                    </h2>
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> LIVE
                    </span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {stats.recentBattles.length === 0 && (
                      <div className="p-6 text-center text-gray-500">No battles recorded yet</div>
                    )}
                    {stats.recentBattles.map((battle, i) => (
                      <motion.div
                        key={battle.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className="px-6 py-4 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className={`font-semibold ${battle.winner === battle.bot1 ? 'text-green-400' : 'text-gray-300'}`}>
                              {battle.bot1}
                            </span>
                            <span className="text-gray-600">vs</span>
                            <span className={`font-semibold ${battle.winner === battle.bot2 ? 'text-green-400' : 'text-gray-300'}`}>
                              {battle.bot2}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{timeAgo(battle.resolvedAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">${battle.token}</span>
                          <span>→ Winner: <span className="text-yellow-400 font-medium">{battle.winner}</span></span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="px-6 py-3 border-t border-white/10 bg-gray-900/50">
                    <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                      Watch live arena →
                    </Link>
                  </div>
                </motion.div>
              </div>

              {/* ── Footer note ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center mt-12 text-gray-600 text-sm"
              >
                Data refreshes every 30 seconds • Powered by Supabase + BNB Chain
              </motion.div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
