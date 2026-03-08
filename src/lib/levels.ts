export interface Level {
  id: string;
  name: string;
  minBets: number;
  maxBets?: number;
  color: string;
  icon: string;
  description: string;
}

export const LEVELS: Level[] = [
  {
    id: 'newbie',
    name: 'Newbie',
    minBets: 0,
    maxBets: 4,
    color: '#9CA3AF', // Gray
    icon: '🌱',
    description: 'Just getting started in the arena'
  },
  {
    id: 'degen',
    name: 'Degen',
    minBets: 5,
    maxBets: 19,
    color: '#3B82F6', // Blue
    icon: '🎲',
    description: 'Embracing the chaos of crypto'
  },
  {
    id: 'whale',
    name: 'Whale',
    minBets: 20,
    maxBets: 49,
    color: '#8B5CF6', // Purple
    icon: '🐋',
    description: 'Making waves in the market'
  },
  {
    id: 'legend',
    name: 'Legend',
    minBets: 50,
    color: '#F59E0B', // Gold
    icon: '👑',
    description: 'A true master of the game'
  }
];

export function getUserLevel(totalBets: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const level = LEVELS[i];
    if (totalBets >= level.minBets) {
      if (!level.maxBets || totalBets <= level.maxBets) {
        return level;
      }
    }
  }
  return LEVELS[0]; // Fallback to Newbie
}

export function getNextLevel(currentLevel: Level): Level | null {
  const currentIndex = LEVELS.findIndex(l => l.id === currentLevel.id);
  if (currentIndex < LEVELS.length - 1) {
    return LEVELS[currentIndex + 1];
  }
  return null; // Already at max level
}

export function getBetsToNextLevel(totalBets: number): number {
  const currentLevel = getUserLevel(totalBets);
  const nextLevel = getNextLevel(currentLevel);
  
  if (!nextLevel) return 0; // Already at max level
  
  return nextLevel.minBets - totalBets;
}

export function getLevelProgress(totalBets: number): number {
  const currentLevel = getUserLevel(totalBets);
  const nextLevel = getNextLevel(currentLevel);
  
  if (!nextLevel) return 100; // Max level achieved
  
  const currentRange = nextLevel.minBets - currentLevel.minBets;
  const currentProgress = totalBets - currentLevel.minBets;
  
  return Math.min(Math.max((currentProgress / currentRange) * 100, 0), 100);
}