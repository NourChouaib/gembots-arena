'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface TournamentMatch {
  matchOrder: number;
  bot1Id: number;
  bot1Name: string;
  bot2Id: number;
  bot2Name: string;
  winnerId: number | null;
  battleId: string | null;
  status: 'pending' | 'active' | 'finished';
}

interface TournamentParticipant {
  id: number;
  name: string;
  elo: number;
  seed: number;
}

interface Tournament {
  id: string;
  name: string;
  status: 'active' | 'finished';
  bracketSize: number;
  totalRounds: number;
  currentRound: number;
  participants: TournamentParticipant[];
  rounds: Record<string, TournamentMatch[]>;
  champion?: TournamentParticipant;
  createdAt: string;
}

const ROUND_NAMES: Record<number, string> = {
  1: 'Quarter-Finals',
  2: 'Semi-Finals',
  3: 'Grand Final',
};

export default function TournamentPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournament();
    const interval = setInterval(fetchTournament, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchTournament = async () => {
    try {
      const res = await fetch('/api/tournament');
      const data = await res.json();
      setTournament(data.tournament);
    } catch (error) {
      console.error('Failed to fetch tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          <p className="text-gray-400 mt-4">Loading tournament...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Nav is now in layout.tsx */}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!tournament ? (
          <NoTournament />
        ) : (
          <TournamentBracket tournament={tournament} />
        )}
      </main>
    </div>
  );
}

function NoTournament() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20"
    >
      <div className="text-7xl mb-6">🏆</div>
      <h1 className="text-4xl font-bold mb-4">
        <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
          Weekly Tournament
        </span>
      </h1>
      <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
        No tournament is currently active. Check back soon — tournaments run weekly!
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/"
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold transition-all"
        >
          🎮 Play Now
        </Link>
        <Link
          href="/leaderboard"
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-bold transition-all"
        >
          🏆 Leaderboard
        </Link>
      </div>
    </motion.div>
  );
}

function TournamentBracket({ tournament }: { tournament: Tournament }) {
  const totalRounds = tournament.totalRounds;
  const roundKeys = Object.keys(tournament.rounds).map(Number).sort();

  return (
    <div>
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            🏆 {tournament.name}
          </span>
        </h1>
        <p className="text-gray-400">
          {tournament.status === 'finished' 
            ? `Champion: ${tournament.champion?.name || 'TBD'}` 
            : `Round ${tournament.currentRound}/${totalRounds} in progress`}
        </p>
        {tournament.status === 'active' && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-500/30 rounded-full">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm font-bold">LIVE</span>
          </div>
        )}
      </motion.div>

      {/* Champion Banner */}
      {tournament.champion && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-10 p-8 bg-gradient-to-r from-yellow-900/30 via-orange-900/30 to-yellow-900/30 border-2 border-yellow-500/40 rounded-2xl"
        >
          <div className="text-6xl mb-3">👑</div>
          <div className="text-3xl font-black text-yellow-400 mb-1">{tournament.champion.name}</div>
          <div className="text-gray-400">Tournament Champion • ELO {tournament.champion.elo}</div>
        </motion.div>
      )}

      {/* Participants */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-xl font-bold mb-4 text-gray-300">📋 Participants</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tournament.participants
            .sort((a, b) => a.seed - b.seed)
            .map((p, i) => {
              const isEliminated = isParticipantEliminated(p.id, tournament);
              const isChampion = tournament.champion?.id === p.id;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/bot/${p.id}`}
                    className={`block p-3 rounded-xl border transition-all hover:scale-105 ${
                      isChampion
                        ? 'bg-yellow-900/30 border-yellow-500/50 ring-2 ring-yellow-500/30'
                        : isEliminated
                        ? 'bg-gray-900/50 border-gray-800 opacity-50'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-mono">#{p.seed}</span>
                      <span className={`font-bold text-sm ${isChampion ? 'text-yellow-400' : isEliminated ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {isChampion && '👑 '}{p.name}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">ELO {p.elo}</div>
                  </Link>
                </motion.div>
              );
            })}
        </div>
      </motion.div>

      {/* Bracket Rounds */}
      <div className="space-y-8">
        {roundKeys.map((round, ri) => {
          const matches = tournament.rounds[round];
          const roundName = ROUND_NAMES[round] || `Round ${round}`;
          const isCurrentRound = round === tournament.currentRound && tournament.status === 'active';
          const isFinal = round === totalRounds;

          return (
            <motion.div
              key={round}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + ri * 0.15 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <h2 className={`text-xl font-bold ${isFinal ? 'text-yellow-400' : 'text-gray-300'}`}>
                  {isFinal ? '⚔️' : '🔥'} {roundName}
                </h2>
                {isCurrentRound && (
                  <span className="px-2 py-0.5 bg-green-900/30 border border-green-500/30 rounded-full text-green-400 text-xs font-bold animate-pulse">
                    LIVE
                  </span>
                )}
              </div>

              <div className={`grid gap-4 ${isFinal ? 'max-w-lg mx-auto' : 'sm:grid-cols-2'}`}>
                {matches.map((match, mi) => (
                  <MatchCard key={mi} match={match} isFinal={isFinal} />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center mt-12"
      >
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
        >
          🎮 Join the Arena
        </Link>
      </motion.div>
    </div>
  );
}

function MatchCard({ match, isFinal }: { match: TournamentMatch; isFinal: boolean }) {
  const isFinished = match.status === 'finished';
  const isActive = match.status === 'active';

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${
      isFinal
        ? isFinished
          ? 'bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-500/40'
          : isActive
          ? 'bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/40 animate-pulse'
          : 'bg-gray-800/30 border-gray-700'
        : isFinished
        ? 'bg-gray-800/30 border-gray-700'
        : isActive
        ? 'bg-purple-900/20 border-purple-500/30'
        : 'bg-gray-800/20 border-gray-800'
    }`}>
      <div className="flex items-center gap-3">
        {/* Bot 1 */}
        <div className={`flex-1 p-3 rounded-lg text-center ${
          isFinished && match.winnerId === match.bot1Id
            ? 'bg-green-900/30 border border-green-500/30'
            : isFinished && match.winnerId !== match.bot1Id
            ? 'opacity-40'
            : 'bg-gray-800/50'
        }`}>
          <Link href={`/bot/${match.bot1Id}`} className="hover:opacity-80 transition-opacity">
            <div className="text-2xl mb-1">🤖</div>
            <div className={`font-bold text-sm ${
              isFinished && match.winnerId === match.bot1Id ? 'text-green-400' : 'text-white'
            }`}>
              {match.bot1Name}
            </div>
            {isFinished && match.winnerId === match.bot1Id && (
              <div className="text-xs text-green-400 mt-1">🏆 Winner</div>
            )}
          </Link>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center">
          {isActive ? (
            <div className="text-sm font-bold text-purple-400 animate-pulse">⚔️</div>
          ) : isFinished ? (
            <div className="text-sm text-gray-600">✅</div>
          ) : (
            <div className="text-sm text-gray-600 font-bold">VS</div>
          )}
        </div>

        {/* Bot 2 */}
        <div className={`flex-1 p-3 rounded-lg text-center ${
          isFinished && match.winnerId === match.bot2Id
            ? 'bg-green-900/30 border border-green-500/30'
            : isFinished && match.winnerId !== match.bot2Id
            ? 'opacity-40'
            : 'bg-gray-800/50'
        }`}>
          <Link href={`/bot/${match.bot2Id}`} className="hover:opacity-80 transition-opacity">
            <div className="text-2xl mb-1">🤖</div>
            <div className={`font-bold text-sm ${
              isFinished && match.winnerId === match.bot2Id ? 'text-green-400' : 'text-white'
            }`}>
              {match.bot2Name}
            </div>
            {isFinished && match.winnerId === match.bot2Id && (
              <div className="text-xs text-green-400 mt-1">🏆 Winner</div>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}

function isParticipantEliminated(botId: number, tournament: Tournament): boolean {
  for (const matches of Object.values(tournament.rounds)) {
    for (const match of matches as TournamentMatch[]) {
      if (match.status === 'finished' && match.winnerId !== null) {
        if ((match.bot1Id === botId || match.bot2Id === botId) && match.winnerId !== botId) {
          return true;
        }
      }
    }
  }
  return false;
}
