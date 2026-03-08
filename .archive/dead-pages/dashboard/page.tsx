'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface BotData {
  id: number;
  name: string;
  hp: number;
  wins: number;
  losses: number;
  win_streak: number;
  league: string;
  win_rate: number;
}

interface Battle {
  battle_id: string;
  status: string;
  token_symbol: string;
  token_address: string;
  my_prediction: number;
  opponent_prediction: number;
  actual_x: number | null;
  won: boolean | null;
  created_at: string;
  resolves_at: string;
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const [bot, setBot] = useState<BotData | null>(null);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (connected && publicKey) {
      fetchDashboard();
      const interval = setInterval(fetchDashboard, 10000);
      return () => clearInterval(interval);
    } else {
      setIsLoading(false);
    }
  }, [connected, publicKey]);

  const fetchDashboard = async () => {
    if (!publicKey) return;
    try {
      // First get user's bot via the existing user API
      const userRes = await fetch(`/api/user/bot?wallet=${publicKey.toString()}`);
      const userData = await userRes.json();

      if (!userData.bot) {
        setError('no_bot');
        setIsLoading(false);
        return;
      }

      const userBot = userData.bot;
      setIsActive(userBot.is_active);

      // Check if bot has an API key (try register endpoint to get existing)
      const storedKey = localStorage.getItem(`gembots_apikey_${publicKey.toString()}`);
      if (storedKey) setApiKey(storedKey);

      // Fetch battles via the API
      const battlesRes = await fetch(
        `/api/v1/bot/battles?api_key=${storedKey || 'wallet_' + publicKey.toString()}&limit=10`
      );
      const battlesData = await battlesRes.json();

      if (battlesData.bot) {
        setBot(battlesData.bot);
        setBattles(battlesData.battles || []);
      } else {
        // Fallback: use user bot data
        setBot({
          id: userBot.id,
          name: userBot.name,
          hp: userBot.hp,
          wins: userBot.wins,
          losses: userBot.losses,
          win_streak: 0,
          league: 'bronze',
          win_rate: userBot.wins + userBot.losses > 0
            ? parseFloat(((userBot.wins / (userBot.wins + userBot.losses)) * 100).toFixed(1))
            : 0,
        });
      }

      setError('');
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBot = async () => {
    if (!bot) return;
    try {
      await fetch('/api/user/bot/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: bot.id, active: !isActive }),
      });
      setIsActive(!isActive);
    } catch (e) {
      console.error('Toggle error:', e);
    }
  };

  const generateApiKey = async () => {
    if (!publicKey) return;
    try {
      const res = await fetch('/api/v1/bot/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          name: bot?.name || 'MyBot',
          strategy: 'smart_ai',
        }),
      });
      const data = await res.json();
      if (data.api_key) {
        setApiKey(data.api_key);
        localStorage.setItem(`gembots_apikey_${publicKey.toString()}`, data.api_key);
      }
    } catch (e) {
      console.error('API key generation error:', e);
    }
  };

  // Win rate chart data (last 24h)
  const recentBattles = battles.filter(b => {
    const age = Date.now() - new Date(b.created_at).getTime();
    return age < 24 * 60 * 60 * 1000 && b.status !== 'active';
  });
  const hourlyBuckets: { hour: string; wins: number; losses: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const hourAgo = new Date(Date.now() - i * 3600000);
    const hourLabel = hourAgo.getUTCHours().toString().padStart(2, '0') + ':00';
    const inBucket = recentBattles.filter(b => {
      const t = new Date(b.created_at);
      return Math.abs(t.getTime() - hourAgo.getTime()) < 3600000;
    });
    hourlyBuckets.push({
      hour: hourLabel,
      wins: inBucket.filter(b => b.won).length,
      losses: inBucket.filter(b => b.won === false).length,
    });
  }

  const leagueColors: Record<string, string> = {
    bronze: 'text-orange-400 border-orange-500/30 bg-orange-900/20',
    silver: 'text-gray-300 border-gray-400/30 bg-gray-700/20',
    gold: 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20',
    diamond: 'text-cyan-400 border-cyan-500/30 bg-cyan-900/20',
  };

  // Not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">

        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-3xl font-bold mb-4">Bot Dashboard</h2>
          <p className="text-gray-400 mb-6">Connect your wallet to see your bot&apos;s performance</p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">

        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⚙️</div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'no_bot') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">

        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-3xl font-bold mb-4">No Bot Found</h2>
          <p className="text-gray-400 mb-6">Create a bot first to see the dashboard</p>
          <Link
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold"
          >
            Go to Arena →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">

      <main className="max-w-7xl mx-auto px-6 py-8">
        {bot && (
          <>
            {/* Bot Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-xl p-6 mb-6"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">🤖</div>
                  <div>
                    <h2 className="text-3xl font-bold">{bot.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${leagueColors[bot.league] || leagueColors.bronze}`}>
                        {bot.league.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-400">HP: {bot.hp}/100</span>
                      {bot.win_streak > 0 && (
                        <span className="text-sm text-yellow-400">🔥 {bot.win_streak} streak</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleBot}
                    className={`px-6 py-2.5 rounded-lg font-bold transition-all ${
                      isActive
                        ? 'bg-red-900/50 border border-red-500/30 text-red-400 hover:bg-red-900/70'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
                    }`}
                  >
                    {isActive ? '⏸ Deactivate' : '▶️ Activate'}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Wins" value={bot.wins} color="text-green-400" icon="✅" />
              <StatCard label="Losses" value={bot.losses} color="text-red-400" icon="❌" />
              <StatCard label="Win Rate" value={`${bot.win_rate}%`} color={bot.win_rate >= 50 ? 'text-green-400' : 'text-yellow-400'} icon="📊" />
              <StatCard label="HP" value={`${bot.hp}/100`} color={bot.hp > 50 ? 'text-cyan-400' : 'text-red-400'} icon="❤️" />
            </div>

            {/* Win Rate Chart (24h) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6"
            >
              <h3 className="text-lg font-bold mb-4">📈 Win Rate (Last 24h)</h3>
              {recentBattles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No battles in the last 24 hours
                </div>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {hourlyBuckets.map((bucket, i) => {
                    const total = bucket.wins + bucket.losses;
                    const maxTotal = Math.max(...hourlyBuckets.map(b => b.wins + b.losses), 1);
                    const height = total > 0 ? (total / maxTotal) * 100 : 0;
                    const winPct = total > 0 ? (bucket.wins / total) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center" title={`${bucket.hour}: ${bucket.wins}W ${bucket.losses}L`}>
                        <div className="w-full relative" style={{ height: `${Math.max(height, 4)}%` }}>
                          <div
                            className="absolute bottom-0 w-full bg-green-600/60 rounded-t"
                            style={{ height: `${winPct}%` }}
                          />
                          <div
                            className="absolute top-0 w-full bg-red-600/40 rounded-t"
                            style={{ height: `${100 - winPct}%` }}
                          />
                        </div>
                        {i % 4 === 0 && (
                          <span className="text-[10px] text-gray-500 mt-1">{bucket.hour}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Recent Battles */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6"
            >
              <h3 className="text-lg font-bold mb-4">⚔️ Recent Battles</h3>
              {battles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">😴</div>
                  No battles yet. Activate your bot to start fighting!
                </div>
              ) : (
                <div className="space-y-2">
                  {battles.slice(0, 10).map((b) => (
                    <div
                      key={b.battle_id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        b.status === 'active'
                          ? 'border-yellow-500/30 bg-yellow-900/10'
                          : b.won
                          ? 'border-green-500/20 bg-green-900/10'
                          : 'border-red-500/20 bg-red-900/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {b.status === 'active' ? '⏳' : b.won ? '✅' : '❌'}
                        </span>
                        <div>
                          <span className="font-bold text-sm">${b.token_symbol}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(b.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">My</div>
                          <div className="font-bold">{b.my_prediction?.toFixed(2)}x</div>
                        </div>
                        <span className="text-gray-600">vs</span>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Opponent</div>
                          <div className="font-bold">{b.opponent_prediction?.toFixed(2)}x</div>
                        </div>
                        {b.actual_x !== null && (
                          <>
                            <span className="text-gray-600">→</span>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Actual</div>
                              <div className="font-bold text-cyan-400">{b.actual_x?.toFixed(2)}x</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* API Key Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
            >
              <h3 className="text-lg font-bold mb-4">🔑 API Access</h3>
              {apiKey ? (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Your API Key (keep it secret!):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-800 px-4 py-2 rounded-lg text-sm font-mono">
                      {showApiKey ? apiKey : '•'.repeat(40)}
                    </code>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(apiKey)}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
                    >
                      📋
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Use this key with the <Link href="/docs" className="text-purple-400 hover:underline">Bot API</Link> to control your bot programmatically.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-400 mb-3">
                    Generate an API key to control your bot programmatically.
                  </p>
                  <button
                    onClick={generateApiKey}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-bold text-sm"
                  >
                    🔑 Generate API Key
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}

/* Header removed — nav is now in layout.tsx */

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
