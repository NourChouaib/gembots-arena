'use client';

import { motion } from 'framer-motion';

export interface BracketMatch {
  matchOrder: number;
  bot1Name: string;
  bot2Name: string;
  bot1Id: number;
  bot2Id: number;
  winnerId: number | null;
  status: 'pending' | 'active' | 'finished';
}

interface TournamentBracketPanelProps {
  rounds: Record<string, BracketMatch[]>;
  currentRound: number;
  totalRounds: number;
}

const ROUND_LABELS: Record<number, string> = {
  1: 'QF',
  2: 'SF',
  3: 'FINAL',
};

function getRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return 'FINAL';
  if (round === totalRounds - 1) return 'SF';
  return ROUND_LABELS[round] || `R${round}`;
}

function MatchRow({ match, roundLabel, index }: { match: BracketMatch; roundLabel: string; index: number }) {
  const isFinished = match.status === 'finished';
  const isActive = match.status === 'active';
  const isPending = match.status === 'pending';

  const winnerName = isFinished && match.winnerId
    ? match.winnerId === match.bot1Id ? match.bot1Name : match.bot2Name
    : null;
  const loserName = isFinished && match.winnerId
    ? match.winnerId === match.bot1Id ? match.bot2Name : match.bot1Name
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative px-3 py-2 rounded-lg border transition-all cursor-pointer group ${
        isActive
          ? 'bg-purple-900/30 border-purple-500/50'
          : isFinished
          ? 'bg-gray-900/30 border-gray-700/50 hover:border-gray-600/60'
          : 'bg-gray-900/20 border-gray-800/40 hover:border-gray-700/50'
      }`}
    >
      {/* Active match glow */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-purple-500/40"
          animate={{ borderColor: ['rgba(168,85,247,0.3)', 'rgba(168,85,247,0.7)', 'rgba(168,85,247,0.3)'] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      <div className="flex items-center gap-2">
        {/* Round label */}
        <span className="text-[10px] font-mono text-gray-600 w-8 shrink-0">
          {roundLabel}{match.matchOrder}
        </span>

        {/* Status icon */}
        <span className="w-4 text-center shrink-0">
          {isFinished && '✅'}
          {isActive && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ⚔️
            </motion.span>
          )}
          {isPending && <span className="text-gray-600">⏳</span>}
        </span>

        {/* Match info */}
        <div className="flex-1 min-w-0">
          {isFinished ? (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-green-400 font-bold truncate">{winnerName}</span>
              <span className="text-gray-600">&gt;</span>
              <span className="text-gray-500 line-through truncate">{loserName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs">
              <span className={isActive ? 'text-white font-bold' : 'text-gray-400'}>
                {match.bot1Name || 'TBD'}
              </span>
              <span className="text-gray-600">v</span>
              <span className={isActive ? 'text-white font-bold' : 'text-gray-400'}>
                {match.bot2Name || 'TBD'}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function TournamentBracketPanel({ rounds, currentRound, totalRounds }: TournamentBracketPanelProps) {
  const roundKeys = Object.keys(rounds).map(Number).sort();

  return (
    <div className="h-full flex flex-col bg-gray-900/40 backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="font-orbitron text-xs font-bold text-gray-300 tracking-widest uppercase">
          Tournament Bracket
        </h2>
      </div>

      {/* Bracket matches */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
        {roundKeys.map((round) => {
          const matches = rounds[round];
          const label = getRoundLabel(round, totalRounds);
          const isCurrentRound = round === currentRound;

          return (
            <div key={round}>
              {/* Round label */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-orbitron font-bold tracking-wider ${
                  round === totalRounds ? 'text-yellow-400' : isCurrentRound ? 'text-purple-400' : 'text-gray-600'
                }`}>
                  {label === 'FINAL' ? '⚔️ FINAL' : label === 'SF' ? '🔥 SEMI-FINALS' : '🔥 QUARTER-FINALS'}
                </span>
                {isCurrentRound && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-purple-900/40 text-purple-400 rounded-full font-bold">
                    NOW
                  </span>
                )}
              </div>

              {/* Matches */}
              <div className="space-y-1.5">
                {matches.map((match, i) => (
                  <MatchRow
                    key={`${round}-${match.matchOrder}`}
                    match={match}
                    roundLabel={label}
                    index={i}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
