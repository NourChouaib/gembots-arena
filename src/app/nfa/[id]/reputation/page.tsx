'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getRobotImage } from '@/lib/robot-images';

interface ReputationData {
  bot: {
    name: string;
    elo: number;
    peakElo: number;
    hp: number;
    wins: number;
    losses: number;
    totalBattles: number;
    league: string;
    winRate: number;
    createdAt: string;
  };
  recentBattles: Array<{
    id: string;
    opponent: string;
    token: string;
    prediction: number;
    opponentPrediction: number;
    actualResult: number;
    isWin: boolean;
    duration: number;
    date: string;
  }>;
  dailyStats: Record<string, { wins: number; losses: number; battles: number }>;
  onChainSnapshots: Array<{
    date: string;
    txHash: string;
    bscscanUrl: string;
    blockNumber: number;
    totalBattles: number;
  }>;
  nfaId: number;
}

function shortenHash(hash: string) {
  return hash.slice(0, 10) + '...' + hash.slice(-8);
}

export default function ReputationPage() {
  const params = useParams();
  const nfaId = params.id as string;
  const [data, setData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/nfa/reputation/${nfaId}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load reputation data');
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [nfaId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400 text-center">
          <p className="text-2xl mb-2">❌</p>
          <p>{error || 'No data found'}</p>
          <Link href="/collection" className="text-cyan-400 hover:underline mt-4 block">
            ← Back to Collection
          </Link>
        </div>
      </div>
    );
  }

  const { bot, recentBattles, onChainSnapshots } = data;
  const robotImg = getRobotImage(parseInt(nfaId));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href={`/marketplace/${nfaId}`} className="text-cyan-400 hover:underline text-sm mb-4 block">
            ← Back to NFA #{nfaId}
          </Link>
          
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
              <img src={robotImg} alt={bot.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{bot.name}</h1>
              <p className="text-gray-400">NFA #{nfaId} • On-Chain Reputation</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-3xl font-bold text-cyan-400">{bot.elo.toLocaleString()}</div>
              <div className="text-gray-500 text-sm">ELO Rating (Peak: {bot.peakElo?.toLocaleString()})</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          {[
            { label: 'Win Rate', value: `${bot.winRate}%`, color: bot.winRate >= 50 ? 'text-green-400' : 'text-red-400' },
            { label: 'Wins', value: bot.wins.toLocaleString(), color: 'text-green-400' },
            { label: 'Losses', value: bot.losses.toLocaleString(), color: 'text-red-400' },
            { label: 'Total Battles', value: bot.totalBattles?.toLocaleString() || '—', color: 'text-white' },
            { label: 'HP', value: `${bot.hp}/100`, color: bot.hp > 50 ? 'text-green-400' : bot.hp > 20 ? 'text-yellow-400' : 'text-red-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-gray-500 text-xs uppercase">{stat.label}</div>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </motion.div>

        {/* On-Chain Verification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gray-900 rounded-xl border border-gray-800 p-6"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            🔗 On-Chain Verification
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">BSC Mainnet</span>
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Daily snapshots of all battle results are recorded on BNB Chain. Each transaction contains the complete leaderboard for that day — verifiable by anyone.
          </p>
          
          {onChainSnapshots.length === 0 ? (
            <p className="text-gray-600 italic">No snapshots recorded yet. First snapshot runs at 04:00 MSK daily.</p>
          ) : (
            <div className="space-y-2">
              {onChainSnapshots.map((snap, i) => (
                <a
                  key={i}
                  href={snap.bscscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-green-400">✅</span>
                    <div>
                      <div className="font-mono text-sm text-cyan-400 group-hover:underline">
                        {shortenHash(snap.txHash)}
                      </div>
                      <div className="text-xs text-gray-500">Block #{snap.blockNumber.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">{snap.date}</div>
                    <div className="text-xs text-gray-500">{snap.totalBattles.toLocaleString()} battles</div>
                  </div>
                  <span className="text-gray-600 group-hover:text-cyan-400 ml-2">↗</span>
                </a>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Battles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gray-900 rounded-xl border border-gray-800 p-6"
        >
          <h2 className="text-xl font-bold mb-4">⚔️ Recent Battles</h2>
          
          {recentBattles.length === 0 ? (
            <p className="text-gray-600 italic">No battles yet.</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-6 text-xs text-gray-500 uppercase px-3 py-2">
                <span>Result</span>
                <span>Opponent</span>
                <span>Token</span>
                <span>Prediction</span>
                <span>Actual</span>
                <span className="text-right">Time</span>
              </div>
              {recentBattles.slice(0, 20).map((b, i) => (
                <div key={b.id} className={`grid grid-cols-6 items-center px-3 py-2 rounded-lg text-sm ${
                  b.isWin ? 'bg-green-500/5' : 'bg-red-500/5'
                }`}>
                  <span className={b.isWin ? 'text-green-400 font-bold' : 'text-red-400'}>
                    {b.isWin ? '✅ WIN' : '❌ LOSS'}
                  </span>
                  <span className="text-gray-300 truncate">{b.opponent}</span>
                  <span className="text-yellow-400">${b.token}</span>
                  <span className="font-mono">{b.prediction?.toFixed(2)}x</span>
                  <span className="font-mono text-gray-400">{b.actualResult?.toFixed(4)}x</span>
                  <span className="text-gray-500 text-xs text-right">
                    {b.date ? new Date(b.date).toLocaleDateString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm py-4">
          <p>All data verified on <a href="https://bscscan.com" target="_blank" className="text-cyan-400 hover:underline">BNB Chain</a></p>
          <p className="mt-1">GemBots Arena — <a href="https://gembots.space" className="text-cyan-400 hover:underline">gembots.space</a></p>
        </div>
      </div>
    </div>
  );
}
