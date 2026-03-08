'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Cell {
  winRate: number;
  battles: number;
  bots: number;
  avgElo: number;
}

interface ModelRow {
  model: string;
  emoji: string;
  avgElo: number;
  totalWinRate: number;
  totalBattles: number;
  cells: Record<string, Cell | null>;
}

const STRATEGY_LABELS: Record<string, string> = {
  scalper: '⚡ Scalper',
  momentum: '📈 Momentum',
  swing: '🌊 Swing',
  mean_reversion: '🔄 Mean Rev',
  contrarian: '🔮 Contrarian',
};

const STRATEGIES = ['scalper', 'momentum', 'swing', 'mean_reversion', 'contrarian'];

export default function ComparePage() {
  const [matrix, setMatrix] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/models/compare')
      .then(r => r.json())
      .then(data => {
        setMatrix(data.matrix || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const wrColor = (wr: number) =>
    wr >= 60 ? 'text-green-400 bg-green-500/10' :
    wr >= 50 ? 'text-yellow-400 bg-yellow-500/10' :
    'text-red-400 bg-red-500/10';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-orbitron text-3xl md:text-4xl font-black mb-2">
            ⚔️ Model × Strategy Matrix
          </h1>
          <p className="text-gray-400">How does each AI model perform with different trading styles?</p>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <Link
            href="/leaderboard"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            🤖 Bot Ranking
          </Link>
          <Link
            href="/models"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            🧠 Model Ranking
          </Link>
          <Link
            href="/models/compare"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-purple-500/20 border border-purple-500/50 text-purple-300"
          >
            ⚔️ Compare
          </Link>
        </div>

        {loading && (
          <div className="text-center py-20 text-gray-500 animate-pulse">Loading comparison matrix...</div>
        )}

        {!loading && matrix.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="overflow-x-auto"
          >
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-3 text-xs text-gray-500 font-bold uppercase w-48">Model</th>
                  <th className="text-center py-3 px-2 text-xs text-gray-500 font-bold uppercase">Avg ELO</th>
                  <th className="text-center py-3 px-2 text-xs text-gray-500 font-bold uppercase">Total WR</th>
                  {STRATEGIES.map(s => (
                    <th key={s} className="text-center py-3 px-2 text-xs text-gray-500 font-bold uppercase">
                      {STRATEGY_LABELS[s] || s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <motion.tr
                    key={row.model}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{row.emoji}</span>
                        <div>
                          <div className="font-bold text-sm text-white">{row.model}</div>
                          <div className="text-[10px] text-gray-500">{row.totalBattles.toLocaleString()} battles</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="font-mono font-bold text-sm text-[#F0B90B]">
                        {row.avgElo.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`font-bold text-sm px-2 py-0.5 rounded ${wrColor(row.totalWinRate)}`}>
                        {row.totalWinRate}%
                      </span>
                    </td>
                    {STRATEGIES.map(s => {
                      const cell = row.cells[s];
                      if (!cell) {
                        return (
                          <td key={s} className="py-3 px-2 text-center">
                            <span className="text-gray-700 text-xs">—</span>
                          </td>
                        );
                      }
                      return (
                        <td key={s} className="py-3 px-2 text-center">
                          <div className={`inline-flex flex-col items-center px-2 py-1 rounded-lg ${wrColor(cell.winRate)}`}>
                            <span className="font-bold text-sm">{cell.winRate}%</span>
                            <span className="text-[9px] opacity-60">{cell.battles.toLocaleString()}</span>
                          </div>
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {!loading && matrix.length === 0 && (
          <div className="text-center py-20 text-gray-500">No comparison data available yet.</div>
        )}

        {/* Legend */}
        <div className="mt-8 flex justify-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40" /> ≥60% WR</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/40" /> 50-59% WR</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40" /> &lt;50% WR</span>
        </div>
      </div>
    </div>
  );
}
