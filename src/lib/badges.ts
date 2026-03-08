import { Bot, Stake } from '../types';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const BADGES: Record<string, Badge> = {
  firstBet: {
    id: 'firstBet',
    name: 'First Steps',
    description: 'Made your first bet',
    icon: '🎯',
    color: '#10B981', // Green
    rarity: 'common'
  },
  luckyStreak: {
    id: 'luckyStreak',
    name: 'Lucky Streak',
    description: '3 wins in a row',
    icon: '🍀',
    color: '#F59E0B', // Amber
    rarity: 'rare'
  },
  diamondHands: {
    id: 'diamondHands',
    name: 'Diamond Hands',
    description: 'Hold through 50%+ price swings',
    icon: '💎',
    color: '#06B6D4', // Cyan
    rarity: 'epic'
  },
  whaleBet: {
    id: 'whaleBet',
    name: 'High Roller',
    description: 'Single bet of 1+ SOL',
    icon: '🌊',
    color: '#8B5CF6', // Purple
    rarity: 'epic'
  },
  hundredX: {
    id: 'hundredX',
    name: '100X Hunter',
    description: 'Found a 100X multiplier',
    icon: '🚀',
    color: '#EF4444', // Red
    rarity: 'legendary'
  },
  perfectWeek: {
    id: 'perfectWeek',
    name: 'Perfect Week',
    description: '7-day win streak',
    icon: '🏆',
    color: '#F59E0B', // Gold
    rarity: 'legendary'
  },
  earlyBird: {
    id: 'earlyBird',
    name: 'Early Bird',
    description: 'One of the first 100 users',
    icon: '🐦',
    color: '#6366F1', // Indigo
    rarity: 'rare'
  },
  moonMission: {
    id: 'moonMission',
    name: 'Moon Mission',
    description: 'Total winnings over 10 SOL',
    icon: '🌙',
    color: '#7C3AED', // Violet
    rarity: 'epic'
  }
};

export function calculateUserBadges(bot: Bot, stakes?: Stake[]): Badge[] {
  const earnedBadges: Badge[] = [];

  // First Bet badge
  if (bot.totalPredictions >= 1) {
    earnedBadges.push(BADGES.firstBet);
  }

  // Lucky Streak badge (simplified - using current streak)
  if (bot.streakDays >= 3) {
    earnedBadges.push(BADGES.luckyStreak);
  }

  // Perfect Week badge
  if (bot.streakDays >= 7) {
    earnedBadges.push(BADGES.perfectWeek);
  }

  // Whale Bet badge (check if staked amount is high enough)
  if (bot.stakedAmount >= 1) {
    earnedBadges.push(BADGES.whaleBet);
  }

  // 100X Hunter badge
  if (bot.totalXFound >= 100) {
    earnedBadges.push(BADGES.hundredX);
  }

  // Early Bird badge (check by creation date - first 100 users)
  const creationDate = new Date(bot.createdAt);
  const cutoffDate = new Date('2024-02-01'); // Arbitrary early date
  if (creationDate < cutoffDate) {
    earnedBadges.push(BADGES.earlyBird);
  }

  // Moon Mission badge (estimate based on reputation)
  if (bot.reputation >= 1000) {
    earnedBadges.push(BADGES.moonMission);
  }

  // Diamond Hands badge (simplified logic)
  if (bot.correctPredictions > 0 && (bot.correctPredictions / bot.totalPredictions) >= 0.8) {
    earnedBadges.push(BADGES.diamondHands);
  }

  return earnedBadges;
}

export function getBadgesByRarity(badges: Badge[]): Record<string, Badge[]> {
  return badges.reduce((acc, badge) => {
    if (!acc[badge.rarity]) acc[badge.rarity] = [];
    acc[badge.rarity].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);
}

export function getHighestRarityBadges(badges: Badge[]): Badge[] {
  const rarityOrder = ['legendary', 'epic', 'rare', 'common'];
  
  for (const rarity of rarityOrder) {
    const badgesOfRarity = badges.filter(b => b.rarity === rarity);
    if (badgesOfRarity.length > 0) {
      return badgesOfRarity;
    }
  }
  
  return [];
}