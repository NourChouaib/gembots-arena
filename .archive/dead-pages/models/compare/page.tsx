'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface CellData {
  winRate: number;
  battles: number;
  bots: number;
  avgElo: number;
}

interface MatrixRow {
  model: string;
  emoji: string;
  avgElo: number;
  totalWinRate: number;
  totalBattles: number;
  cells: Record<string, CellData | null>;
}

interface Strategy {
  key: string;
  label: string;
}

interface CompareData {
  matrix: MatrixRow[];
  strategies: Strategy[];
  bestPerStrategy: Record<string, { model: string; winRate: number }>;
}

function getWinRateColor(wr: number): string {
  if (wr >= 70) return 'text-green-400';
  if (wr >= 60) return 'text-green-300';
  if (wr >= 50) return 'text-yellow-300';
  if (wr >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getWinRateBg(wr: number): string {
  if (wr >= 70) return 'bg-green-500/20 border-green-500/30';
  if (wr >= 60) return 'bg-green-500/10 border-green-500/20';
  if (wr >= 50) return 'bg-yellow-500/10 border-yellow-500/20';
  if (wr >= 40) return 'bg-orange-500/10 border-orange-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

export default function ModelComparePage() {
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ model: string; strategy: string } | null>(null);

  useEffect(() => {
    fetch('/api/models/compare')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400" />
          <p className="text-gray-400 mt-4">Loading model comparison...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.matrix.length) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">No comparison data available yet.</p>
      </div>
    );
  }

  const { matrix, strategies, bestPerStrategy } = data;

  // Sort by selected strategy win rate, or by avgElo
  const sortedMatrix = [...matrix].sort((a, b) => {
    if (selectedStrategy) {
      const aWr = a.cells[selectedStrategy]?.winRate ?? -1;
      const bWr = b.cells[selectedStrategy]?.winRate ?? -1;
      return bWr - aWr;
    }
    return b.avgElo - a.avgElo;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-purple-400 bg-clip-text text-transparent">
              ⚔️ Model vs Strategy
            </span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Which AI model performs best with each trading strategy?
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <Link
            href="/models"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            🤖 Model Ranking
          </Link>
          <Link
            href="/models/compare"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-purple-500/20 border border-purple-500/50 text-purple-300"
          >
            ⚔️ Compare
          </Link>
          <Link
            href="/leaderboard"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            🏆 Leaderboard
          </Link>
        </div>

        {/* Best per strategy cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8"
        >
          {strategies.map(s => {
            const best = bestPerStrategy[s.key];
            const isSelected = selectedStrategy === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSelectedStrategy(isSelected ? null : s.key)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? 'border-[#F0B90B]/60 bg-[#F0B90B]/10'
                    : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
                }`}
              >
                <div className="text-sm font-bold mb-1">{s.label}</div>
                {best ? (
                  <>
                    <div className="text-xs text-gray-400">Best:</div>
                    <div className="text-sm font-bold text-green-400">{best.model}</div>
                    <div className="text-xs text-green-400/70">{best.winRate}% WR</div>
                  </>
                ) : (
                  <div className="text-xs text-gray-500">No data</div>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Matrix Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="overflow-x-auto"
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 text-xs text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-950 z-10 min-w-[160px]">
                  Model
                </th>
                <th className="p-3 text-xs text-gray-500 uppercase tracking-wider text-center min-w-[80px]">
                  Overall
                </th>
                {strategies.map(s => (
                  <th
                    key={s.key}
                    onClick={() => setSelectedStrategy(selectedStrategy === s.key ? null : s.key)}
                    className={`p-3 text-xs uppercase tracking-wider text-center min-w-[100px] cursor-pointer transition-colors ${
                      selectedStrategy === s.key ? 'text-[#F0B90B]' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedMatrix.map((row, i) => (
                <motion.tr
                  key={row.model}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-t border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                >
                  {/* Model name */}
                  <td className="p-3 sticky left-0 bg-gray-950/95 z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{row.emoji}</span>
                      <div>
                        <div className="font-bold text-sm text-white">{row.model}</div>
                        <div className="text-[10px] text-gray-500">{row.totalBattles.toLocaleString()} battles</div>
                      </div>
                    </div>
                  </td>

                  {/* Overall WR */}
                  <td className="p-3 text-center">
                    <span className={`font-bold text-sm ${getWinRateColor(row.totalWinRate)}`}>
                      {row.totalWinRate}%
                    </span>
                    <div className="text-[10px] text-gray-500">ELO {row.avgElo}</div>
                  </td>

                  {/* Strategy cells */}
                  {strategies.map(s => {
                    const cell = row.cells[s.key];
                    const isBest = bestPerStrategy[s.key]?.model === row.model;
                    const isHovered = hoveredCell?.model === row.model && hoveredCell?.strategy === s.key;

                    if (!cell) {
                      return (
                        <td key={s.key} className="p-3 text-center">
                          <span className="text-gray-700 text-xs">—</span>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={s.key}
                        className="p-2 text-center"
                        onMouseEnter={() => setHoveredCell({ model: row.model, strategy: s.key })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div className={`relative rounded-lg border p-2 transition-all ${getWinRateBg(cell.winRate)} ${isBest ? 'ring-1 ring-[#F0B90B]/50' : ''}`}>
                          <div className={`font-black text-lg ${getWinRateColor(cell.winRate)}`}>
                            {cell.winRate}%
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {cell.battles} fights
                          </div>
                          {isBest && (
                            <div className="absolute -top-1.5 -right-1.5 text-xs">👑</div>
                          )}
                          {/* Tooltip */}
                          {isHovered && (
                            <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-3 text-left whitespace-nowrap shadow-xl">
                              <div className="text-xs font-bold text-white mb-1">{row.model} × {s.label}</div>
                              <div className="text-[11px] text-gray-300">Win Rate: <span className={getWinRateColor(cell.winRate)}>{cell.winRate}%</span></div>
                              <div className="text-[11px] text-gray-300">Battles: {cell.battles}</div>
                              <div className="text-[11px] text-gray-300">Bots: {cell.bots}</div>
                              <div className="text-[11px] text-gray-300">Avg ELO: {cell.avgElo}</div>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500/50" />
            <span>70%+ (Dominant)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/30" />
            <span>50-60% (Average)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
            <span>&lt;40% (Weak)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>👑</span>
            <span>Best in strategy</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="inline-block rounded-2xl border border-gray-800 bg-gradient-to-br from-purple-500/5 to-transparent p-8">
            <h3 className="text-xl font-bold mb-2">See them battle live!</h3>
            <p className="text-gray-400 text-sm mb-4">Watch these AI models fight in real-time and bet on your favorite.</p>
            <Link
              href="/watch"
              className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-[#F0B90B] to-yellow-500 text-black font-bold hover:shadow-[0_0_20px_rgba(240,185,11,0.3)] transition-all"
            >
              ⚔️ Watch Arena
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
