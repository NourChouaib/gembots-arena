// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AirdropEntry {
  rank: number;
  name: string;
  botId: number;
  score: number;
  battles: number;
  wins: number;
  winStreak: number;
  referrals: number;
  league: string;
  elo: number;
  tier: string;
  multiplier: number;
  adjustedScore: number;
}

interface AirdropData {
  airdrop: {
    status: string;
    totalPool: string;
    totalParticipants: number;
    totalScore: number;
    snapshotDate: string;
    tokenLaunch: string;
  };
  leaderboard: AirdropEntry[];
  scoring: any;
}

export default function AirdropPage() {
  const [data, setData] = useState<AirdropData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/airdrop')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const leagueColor = (league: string) => {
    switch (league) {
      case 'diamond': return 'text-cyan-400';
      case 'gold': return 'text-yellow-400';
      case 'silver': return 'text-gray-300';
      default: return 'text-orange-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🪂</div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              $GEMB Airdrop
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Earn loyalty points by battling, winning, and referring friends. 
            Points convert to $GEMB tokens at launch!
          </p>
        </div>

        {/* Stats Cards */}
        {data?.airdrop && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{data.airdrop.totalPool}</div>
              <div className="text-xs text-gray-500 mt-1">Total Pool</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{data.airdrop.totalParticipants}</div>
              <div className="text-xs text-gray-500 mt-1">Participants</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{data.airdrop.totalScore?.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">Total Points</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{data.airdrop.tokenLaunch}</div>
              <div className="text-xs text-gray-500 mt-1">Token Launch</div>
            </div>
          </div>
        )}

        {/* How to Earn */}
        <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">📊 How to Earn Points</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚔️</span>
              <div>
                <div className="font-bold text-sm">Battle</div>
                <div className="text-xs text-gray-400">+10 pts each</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="font-bold text-sm">Win</div>
                <div className="text-xs text-gray-400">+25 pts each</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <div>
                <div className="font-bold text-sm">Win Streak</div>
                <div className="text-xs text-gray-400">+5 pts × streak</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <div className="font-bold text-sm">Referral</div>
                <div className="text-xs text-gray-400">+50 pts each</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <div>
                <div className="font-bold text-sm">Early User</div>
                <div className="text-xs text-gray-400">+100 pts bonus</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">💎</span>
              <div>
                <div className="font-bold text-sm">Hold $GEMB</div>
                <div className="text-xs text-gray-400">Up to 2x multiplier</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tier Multipliers */}
        <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-purple-400">🎖️ Holder Tier Multipliers</h2>
          <p className="text-sm text-gray-400 mb-4">Hold $GEMB tokens to boost your airdrop allocation!</p>
          <div className="flex flex-wrap gap-3">
            {[
              { name: 'Recruit', emoji: '🥉', mult: '1.0x', min: 'Any amount', color: 'border-green-600' },
              { name: 'Fighter', emoji: '🥈', mult: '1.1x', min: '$50+', color: 'border-blue-500' },
              { name: 'Commander', emoji: '🥇', mult: '1.2x', min: '$100+', color: 'border-yellow-500' },
              { name: 'General', emoji: '💎', mult: '1.5x', min: '$500+', color: 'border-purple-500' },
              { name: 'Legend', emoji: '👑', mult: '2.0x', min: '$1,000+', color: 'border-yellow-400' },
            ].map(tier => (
              <div key={tier.name} className={`bg-gray-900/80 border ${tier.color} rounded-lg px-4 py-2 text-center min-w-[100px]`}>
                <div className="text-lg">{tier.emoji}</div>
                <div className="font-bold text-sm">{tier.name}</div>
                <div className="text-xs text-gray-400">{tier.min}</div>
                <div className="text-sm font-bold text-green-400 mt-1">{tier.mult}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold">🏆 Airdrop Leaderboard</h2>
            <span className="text-xs text-gray-500">Live scores</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : !data?.leaderboard?.length ? (
            <div className="p-8 text-center text-gray-500">
              No participants yet. <Link href="/" className="text-purple-400 hover:underline">Start battling!</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-4 sm:px-6 py-2 text-xs text-gray-500 font-medium">
                <div className="col-span-1">Rank</div>
                <div className="col-span-3">Bot</div>
                <div className="col-span-2 text-center">Battles</div>
                <div className="col-span-2 text-center">Wins</div>
                <div className="col-span-2 text-center">ELO</div>
                <div className="col-span-2 text-right">Score</div>
              </div>

              {data.leaderboard.map((entry) => (
                <div 
                  key={entry.botId} 
                  className={`grid grid-cols-12 gap-2 px-4 sm:px-6 py-3 items-center hover:bg-gray-800/50 transition-colors ${entry.rank <= 3 ? 'bg-yellow-900/10' : ''}`}
                >
                  <div className="col-span-1 font-bold text-sm">
                    {rankEmoji(entry.rank)}
                  </div>
                  <div className="col-span-3">
                    <div className="font-medium text-sm truncate">{entry.name}</div>
                    <div className={`text-xs ${leagueColor(entry.league)}`}>
                      {entry.league} {entry.winStreak > 2 ? `🔥${entry.winStreak}` : ''}
                    </div>
                  </div>
                  <div className="col-span-2 text-center text-sm text-gray-400">{entry.battles}</div>
                  <div className="col-span-2 text-center text-sm text-green-400">{entry.wins}</div>
                  <div className="col-span-2 text-center text-sm text-purple-400">{entry.elo}</div>
                  <div className="col-span-2 text-right">
                    <span className="font-bold text-yellow-400 text-sm">{entry.adjustedScore.toLocaleString()}</span>
                    {entry.multiplier > 1 && (
                      <span className="text-xs text-green-400 ml-1">×{entry.multiplier}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-8 mb-12">
          <p className="text-gray-400 mb-4">Start earning points now — every battle counts!</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors">
              🎮 Play Now
            </Link>
            <Link href="/token" className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-colors">
              🪙 $GEMB Token
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
