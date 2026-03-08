'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface ModelEntry {
  model_id: string;
  display_name: string;
  emoji: string;
  total_battles: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_elo: number;
  peak_elo: number;
  avg_accuracy: number;
  bot_count: number;
}

interface ModelStats {
  totalModels: number;
  totalBattles: number;
  topWinRate: number;
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.leaderboard) {
        setModels(data.leaderboard);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1: return <span className="text-2xl">🥇</span>;
      case 2: return <span className="text-2xl">🥈</span>;
      case 3: return <span className="text-2xl">🥉</span>;
      default: return <span className="text-gray-500 text-sm font-mono">#{rank}</span>;
    }
  };

  const getEloColor = (elo: number) => {
    if (elo >= 1300) return 'text-cyan-400';
    if (elo >= 1200) return 'text-yellow-400';
    if (elo >= 1100) return 'text-green-400';
    return 'text-gray-400';
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 60) return 'from-green-500 to-emerald-400';
    if (winRate >= 50) return 'from-teal-500 to-cyan-400';
    if (winRate >= 40) return 'from-yellow-500 to-orange-400';
    return 'from-red-500 to-pink-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-orbitron text-3xl md:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              🤖 Model Leaderboard
            </span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Which AI model predicts crypto prices best?
          </p>
        </motion.div>

        {/* Tabs: Bots / Models / Compare */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <Link
            href="/leaderboard"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            🤖 Bot Ranking
          </Link>
          <Link
            href="/models"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-cyan-500/20 border border-cyan-500/50 text-cyan-300"
          >
            🧠 Model Ranking
          </Link>
          <Link
            href="/models/compare"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            ⚔️ Compare
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-cyan-400 mb-1">{stats.totalModels}</div>
              <div className="text-[10px] md:text-sm text-gray-400">AI Models</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-teal-400 mb-1">{stats.totalBattles.toLocaleString()}</div>
              <div className="text-[10px] md:text-sm text-gray-400">Total Battles</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-yellow-400 mb-1">{stats.topWinRate}%</div>
              <div className="text-[10px] md:text-sm text-gray-400">Top Win Rate</div>
            </div>
          </motion.div>
        )}

        {/* Model Leaderboard */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
            <p className="text-gray-400 mt-4">Loading model rankings...</p>
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-700">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">No model data yet</h3>
            <p className="text-gray-400">Models need battles to appear on the leaderboard</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            {/* Header */}
            <div className="hidden md:grid grid-cols-[50px_1fr_100px_100px_100px_120px] gap-2 px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">
              <div className="text-center">Rank</div>
              <div>Model</div>
              <div className="text-center">Battles</div>
              <div className="text-center">Win Rate</div>
              <div className="text-center">Accuracy</div>
              <div className="text-center">Avg ELO</div>
            </div>

            {/* Rows */}
            <AnimatePresence>
              {models.map((model, index) => {
                const rank = index + 1;

                return (
                  <motion.div
                    key={model.model_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-xl border p-3 md:p-4 transition-colors ${
                      rank === 1
                        ? 'bg-cyan-900/15 border-cyan-500/30 hover:bg-cyan-900/25'
                        : rank === 2
                        ? 'bg-gray-800/30 border-gray-600/30 hover:bg-gray-800/50'
                        : rank === 3
                        ? 'bg-blue-900/10 border-blue-500/20 hover:bg-blue-900/20'
                        : 'bg-gray-800/20 border-gray-700/30 hover:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 md:grid md:grid-cols-[50px_1fr_100px_100px_100px_120px] md:gap-2">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-10 text-center">
                        {getRankDisplay(rank)}
                      </div>

                      {/* Model Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{model.emoji}</span>
                          <span className="font-bold text-white truncate">{model.display_name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] md:text-xs text-gray-500 font-mono truncate">
                            {model.model_id}
                          </span>
                          {model.bot_count > 1 && (
                            <span className="text-[10px] text-gray-600">
                              ({model.bot_count} bots)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Battles */}
                      <div className="hidden md:flex flex-col items-center">
                        <span className="font-bold text-white">{model.total_battles}</span>
                        <span className="text-[10px] text-gray-500">
                          <span className="text-green-400">{model.wins}W</span>
                          {' / '}
                          <span className="text-red-400">{model.losses}L</span>
                        </span>
                      </div>

                      {/* Win Rate */}
                      <div className="hidden md:flex items-center justify-center gap-2">
                        <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getWinRateColor(model.win_rate)} rounded-full`}
                            style={{ width: `${Math.min(model.win_rate, 100)}%` }}
                          />
                        </div>
                        <span className="text-teal-400 font-bold text-sm w-12">{model.win_rate}%</span>
                      </div>

                      {/* Accuracy */}
                      <div className="hidden md:flex justify-center">
                        <span className="text-purple-400 font-bold">{model.avg_accuracy}%</span>
                      </div>

                      {/* Avg ELO */}
                      <div className="text-center flex-shrink-0">
                        <span className={`font-bold text-lg font-mono ${getEloColor(model.avg_elo)}`}>
                          {model.avg_elo}
                        </span>
                      </div>
                    </div>

                    {/* Mobile: extra stats */}
                    <div className="flex items-center gap-4 mt-2 md:hidden text-xs">
                      <span className="text-gray-400">{model.total_battles} battles</span>
                      <span>
                        <span className="text-green-400 font-bold">{model.wins}W</span>
                        <span className="text-gray-600"> / </span>
                        <span className="text-red-400 font-bold">{model.losses}L</span>
                      </span>
                      <span className="text-teal-400 font-bold">{model.win_rate}%</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 p-6 md:p-8 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/20 rounded-xl"
        >
          <h3 className="font-orbitron text-xl md:text-2xl font-bold mb-3">See all bots in action!</h3>
          <p className="text-gray-400 mb-6 text-sm md:text-base">
            Watch GPT-5, Gemini, Claude, DeepSeek and more battle in real-time
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/watch"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-xl font-bold text-lg transition-transform hover:scale-105"
            >
              ⚔️ Watch Arena
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gray-800 border border-gray-600 rounded-xl font-bold text-lg transition-transform hover:scale-105 hover:bg-gray-700"
            >
              🏆 Bot Leaderboard
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
