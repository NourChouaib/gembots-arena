'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    fetch('/api/models')
      .then(r => r.json())
      .then(data => {
        setModels(data.leaderboard || []);
        setStats(data.stats || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-orbitron text-3xl md:text-4xl font-black mb-2">
            🧠 AI Model Leaderboard
          </h1>
          <p className="text-gray-400">Which AI model dominates the Arena?</p>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex justify-center gap-2 mb-6">
          <Link
            href="/leaderboard"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            🤖 Bot Ranking
          </Link>
          <Link
            href="/models"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-purple-500/20 border border-purple-500/50 text-purple-300"
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
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-xl mx-auto">
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4 text-center">
              <div className="text-2xl font-black text-[#F0B90B]">{stats.totalModels}</div>
              <div className="text-xs text-gray-500 mt-1">AI Models</div>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4 text-center">
              <div className="text-2xl font-black text-white">{stats.totalBattles.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">Total Battles</div>
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4 text-center">
              <div className="text-2xl font-black text-green-400">{stats.topWinRate}%</div>
              <div className="text-xs text-gray-500 mt-1">Best Win Rate</div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 text-gray-500 animate-pulse">Loading model rankings...</div>
        )}

        {/* Model Table */}
        {!loading && models.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-x-auto"
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-bold uppercase">#</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-bold uppercase">Model</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-bold uppercase">Avg ELO</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-bold uppercase">Peak ELO</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-bold uppercase">Win Rate</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-bold uppercase">Accuracy</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-bold uppercase">Battles</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-bold uppercase">Bots</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m, i) => (
                  <motion.tr
                    key={m.model_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors ${
                      i === 0 ? 'bg-[#F0B90B]/5' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className={`text-sm font-bold ${
                        i === 0 ? 'text-[#F0B90B]' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{m.emoji}</span>
                        <span className={`font-bold text-sm ${i === 0 ? 'text-[#F0B90B]' : 'text-white'}`}>
                          {m.display_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-sm text-[#F0B90B]">
                        {m.avg_elo.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-sm text-gray-400">
                        {m.peak_elo.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold text-sm ${
                        m.win_rate >= 55 ? 'text-green-400' :
                        m.win_rate >= 45 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {m.win_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm ${
                        m.avg_accuracy >= 60 ? 'text-green-400' :
                        m.avg_accuracy >= 45 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {m.avg_accuracy.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-gray-400">{m.total_battles.toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-gray-500">{m.bot_count}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {!loading && models.length === 0 && (
          <div className="text-center py-20 text-gray-500">No model data available yet.</div>
        )}
      </div>
    </div>
  );
}
