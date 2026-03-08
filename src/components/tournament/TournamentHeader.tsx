'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface TournamentHeaderProps {
  name: string;
  currentRound: number;
  totalRounds: number;
  currentMatchIndex: number;
  totalMatchesInRound: number;
  status: 'active' | 'finished' | 'waiting';
  nextMatchIn?: number; // seconds until next match
}

const ROUND_NAMES: Record<number, string> = {
  1: 'Quarter-Finals',
  2: 'Semi-Finals',
  3: 'Grand Final',
};

export default function TournamentHeader({
  name,
  currentRound,
  totalRounds,
  currentMatchIndex,
  totalMatchesInRound,
  status,
  nextMatchIn,
}: TournamentHeaderProps) {
  const [countdown, setCountdown] = useState(nextMatchIn ?? 0);

  useEffect(() => {
    if (nextMatchIn !== undefined) setCountdown(nextMatchIn);
  }, [nextMatchIn]);

  useEffect(() => {
    if (countdown <= 0 || status !== 'waiting') return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown, status]);

  const roundName = ROUND_NAMES[currentRound] || `Round ${currentRound}`;

  return (
    <div className="relative z-10 px-4 md:px-6 pt-4 pb-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Left: Tournament info */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <h1 className="font-orbitron text-sm md:text-lg font-bold text-white tracking-wider">
              {name}
            </h1>
            <p className="text-xs md:text-sm text-gray-400">
              {roundName} • Match {currentMatchIndex} of {totalMatchesInRound}
            </p>
          </div>
        </div>

        {/* Right: Status badge + countdown */}
        <div className="flex items-center gap-3">
          {status === 'waiting' && countdown > 0 && (
            <div className="text-right">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Next Match</div>
              <div className="font-orbitron text-sm font-bold text-yellow-400">
                {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </div>
            </div>
          )}

          {/* LIVE badge */}
          {status === 'active' && (
            <motion.div
              className="flex items-center gap-1.5 px-3 py-1 bg-red-900/30 border border-red-500/40 rounded-full"
              animate={{ borderColor: ['rgba(239,68,68,0.4)', 'rgba(239,68,68,0.8)', 'rgba(239,68,68,0.4)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="font-orbitron text-xs font-bold text-red-400 tracking-wider">LIVE</span>
            </motion.div>
          )}

          {status === 'finished' && (
            <div className="px-3 py-1 bg-green-900/30 border border-green-500/40 rounded-full">
              <span className="font-orbitron text-xs font-bold text-green-400 tracking-wider">FINISHED</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom separator line */}
      <div className="mt-3 h-[1px] bg-gradient-to-r from-transparent via-[#9945FF]/30 to-transparent" />
    </div>
  );
}
