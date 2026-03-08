/**
 * GemBots ELO Rating System
 * 
 * Standard ELO with adjustments for GemBots:
 * - K-factor decreases with experience
 * - Bonus for perfect predictions (diff < 0.1)
 * - Bonus for upset wins (lower ELO beats higher)
 * - Minimum ELO floor of 100
 */

export interface EloResult {
  winnerNewElo: number;
  loserNewElo: number;
  winnerDelta: number;
  loserDelta: number;
  isUpset: boolean;
  isPerfect: boolean;
}

export interface League {
  name: string;
  emoji: string;
  minElo: number;
  color: string;
}

export const LEAGUES: League[] = [
  { name: 'Diamond', emoji: '💎', minElo: 2000, color: '#b9f2ff' },
  { name: 'Gold', emoji: '🥇', minElo: 1500, color: '#ffd700' },
  { name: 'Silver', emoji: '🥈', minElo: 1000, color: '#c0c0c0' },
  { name: 'Bronze', emoji: '🥉', minElo: 0, color: '#cd7f32' },
];

/**
 * Get the K-factor based on total games played
 * Higher K = more volatile, for newer players
 */
function getKFactor(totalGames: number): number {
  if (totalGames < 10) return 40;   // New player, volatile
  if (totalGames < 30) return 25;   // Settling in
  return 16;                         // Established
}

/**
 * Calculate expected score (probability of winning)
 */
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new ELO ratings after a battle
 * 
 * @param winnerElo Current ELO of winner
 * @param loserElo Current ELO of loser
 * @param winnerGames Total games of winner
 * @param loserGames Total games of loser
 * @param predictionDiff How close winner's prediction was (lower = better)
 */
export function calculateElo(
  winnerElo: number,
  loserElo: number,
  winnerGames: number = 30,
  loserGames: number = 30,
  predictionDiff: number = 1.0,
): EloResult {
  const kWinner = getKFactor(winnerGames);
  const kLoser = getKFactor(loserGames);
  
  const expectedWin = expectedScore(winnerElo, loserElo);
  const expectedLose = expectedScore(loserElo, winnerElo);
  
  // Base ELO change
  let winnerDelta = Math.round(kWinner * (1 - expectedWin));
  let loserDelta = Math.round(kLoser * (0 - expectedLose));
  
  // Bonus: Perfect prediction (diff < 0.1x)
  const isPerfect = predictionDiff < 0.1;
  if (isPerfect) {
    winnerDelta = Math.round(winnerDelta * 1.5);
  }
  
  // Bonus: Upset win (lower ELO beats higher by 100+)
  const isUpset = loserElo - winnerElo >= 100;
  if (isUpset) {
    winnerDelta = Math.round(winnerDelta * 1.25);
  }
  
  // Minimum changes
  winnerDelta = Math.max(winnerDelta, 1);  // Always gain at least 1
  loserDelta = Math.min(loserDelta, -1);   // Always lose at least 1
  
  const winnerNewElo = Math.max(100, winnerElo + winnerDelta);
  const loserNewElo = Math.max(100, loserElo + loserDelta);
  
  return {
    winnerNewElo,
    loserNewElo,
    winnerDelta,
    loserDelta,
    isUpset,
    isPerfect,
  };
}

/**
 * Get league for a given ELO rating
 */
export function getLeague(elo: number): League {
  return LEAGUES.find(l => elo >= l.minElo) || LEAGUES[LEAGUES.length - 1];
}

/**
 * Get league name string
 */
export function getLeagueName(elo: number): string {
  return getLeague(elo).name.toLowerCase();
}

/**
 * Format ELO with league emoji
 */
export function formatElo(elo: number): string {
  const league = getLeague(elo);
  return `${league.emoji} ${elo}`;
}
