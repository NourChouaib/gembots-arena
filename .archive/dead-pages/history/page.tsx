'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Battle {
  id: string;
  date: string;
  tokenSymbol: string;
  myPrediction: number;
  opponentPrediction: number;
  opponentName: string;
  actualX: number;
  won: boolean;
  profit: number;
  stakeAmount: number;
}

interface Stats {
  totalBattles: number;
  wins: number;
  losses: number;
  winRate: number;
  totalProfit: number;
}

type Filter = 'all' | 'wins' | 'losses';

export default function HistoryPage() {
  const { publicKey, connected } = useWallet();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (connected && publicKey) {
      fetchHistory();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  const fetchHistory = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/user/history?wallet=${publicKey.toString()}`);
      const data = await res.json();
      
      if (data.battles) {
        setBattles(data.battles);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBattles = battles.filter((battle) => {
    if (filter === 'wins') return battle.won;
    if (filter === 'losses') return !battle.won;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Nav is now in layout.tsx */}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              📊 Battle History
            </span>
          </h1>
          <p className="text-gray-400">Your complete battle record</p>
        </motion.div>

        {!connected ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">Connect your Solana wallet to view your battle history</p>
            <WalletMultiButton />
          </motion.div>
        ) : loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
            <p className="text-gray-400 mt-4">Loading your battles...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
              >
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-white mb-1">{stats.totalBattles}</div>
                  <div className="text-sm text-gray-400">Total Battles</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 text-center">
                  <div className="text-3xl font-bold text-teal-400 mb-1">{stats.winRate}%</div>
                  <div className="text-sm text-gray-400">Win Rate</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 text-center">
                  <div className="flex justify-center gap-3 mb-1">
                    <span className="text-2xl font-bold text-green-400">{stats.wins}W</span>
                    <span className="text-2xl font-bold text-red-400">{stats.losses}L</span>
                  </div>
                  <div className="text-sm text-gray-400">Record</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 text-center">
                  <div className={`text-3xl font-bold mb-1 ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit} SOL
                  </div>
                  <div className="text-sm text-gray-400">Total Profit</div>
                </div>
              </motion.div>
            )}

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex gap-2 mb-6"
            >
              {(['all', 'wins', 'losses'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    filter === f
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {f === 'all' ? '📋 All' : f === 'wins' ? '✅ Wins' : '❌ Losses'}
                </button>
              ))}
            </motion.div>

            {/* Battle Table */}
            {filteredBattles.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-700"
              >
                <div className="text-5xl mb-4">⚔️</div>
                <h3 className="text-xl font-bold mb-2">No battles found</h3>
                <p className="text-gray-400 mb-6">
                  {filter === 'all' 
                    ? "You haven't fought any battles yet"
                    : `No ${filter} to show`
                  }
                </p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-bold transition-all"
                >
                  🎮 Start Fighting!
                </Link>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="overflow-x-auto"
              >
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Token</th>
                      <th className="text-center py-3 px-4 text-sm text-gray-400 font-medium">My Prediction</th>
                      <th className="text-center py-3 px-4 text-sm text-gray-400 font-medium">Opponent</th>
                      <th className="text-center py-3 px-4 text-sm text-gray-400 font-medium">Actual X</th>
                      <th className="text-center py-3 px-4 text-sm text-gray-400 font-medium">Result</th>
                      <th className="text-right py-3 px-4 text-sm text-gray-400 font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredBattles.map((battle, index) => (
                        <motion.tr
                          key={battle.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="py-4 px-4 text-sm text-gray-300">
                            {formatDate(battle.date)}
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm font-bold text-purple-400">
                              ${battle.tokenSymbol}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-sm font-mono text-cyan-400">
                              {battle.myPrediction.toFixed(2)}x
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="text-sm text-gray-300">{battle.opponentName}</div>
                            <div className="text-xs font-mono text-gray-500">
                              {battle.opponentPrediction.toFixed(2)}x
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-sm font-bold text-yellow-400">
                              {battle.actualX.toFixed(2)}x
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              battle.won 
                                ? 'bg-green-900/50 text-green-400 border border-green-500/30' 
                                : 'bg-red-900/50 text-red-400 border border-red-500/30'
                            }`}>
                              {battle.won ? '✅ WIN' : '❌ LOSE'}
                            </span>
                          </td>
                          <td className={`py-4 px-4 text-right text-sm font-bold ${
                            battle.profit >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {battle.profit >= 0 ? '+' : ''}{battle.profit.toFixed(2)} SOL
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 flex justify-center gap-6">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            🏠 Home
          </Link>
          <Link href="/leaderboard" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            🏆 Leaderboard
          </Link>
          <Link href="/docs" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            📖 API Docs
          </Link>
        </div>
      </footer>
    </div>
  );
}
