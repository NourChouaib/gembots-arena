'use client';

import { motion } from 'framer-motion';
import { Bot } from '../types';
import { formatNumber, formatWalletAddress, getAccuracyRate } from '../lib/utils';
import { COLORS } from '../lib/constants';
import { getUserLevel } from '../lib/levels';
import { calculateUserBadges, getHighestRarityBadges } from '../lib/badges';

interface BotCardProps {
  bot: Bot;
  rank: number;
}

export default function BotCard({ bot, rank }: BotCardProps) {
  const accuracy = getAccuracyRate(bot.correctPredictions, bot.totalPredictions);
  const level = getUserLevel(bot.totalPredictions);
  const badges = calculateUserBadges(bot);
  const topBadges = getHighestRarityBadges(badges).slice(0, 3); // Show max 3 badges

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 hover:border-[#9945FF]/50 transition-all duration-200 backdrop-blur-sm hover:shadow-[#9945FF]/20 hover:shadow-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)` }}
          >
            #{rank}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">{bot.name}</h3>
              <span 
                className="px-2 py-1 text-xs font-medium rounded-full"
                style={{ 
                  backgroundColor: level.color + '20',
                  color: level.color,
                  border: `1px solid ${level.color}40`
                }}
              >
                {level.icon} {level.name}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {formatWalletAddress(bot.walletAddress)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-[#14F195] animate-neon-text">
            {formatNumber(bot.reputation, 1)}
          </p>
          <p className="text-xs text-gray-400">REP</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center mb-3">
        <div>
          <p className="text-lg font-semibold text-green-400">
            {formatNumber(bot.totalXFound, 1)}x
          </p>
          <p className="text-xs text-gray-400">Total X</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-blue-400">
            {formatNumber(accuracy * 100, 0)}%
          </p>
          <p className="text-xs text-gray-400">Accuracy</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-purple-400">
            {bot.streakDays}
          </p>
          <p className="text-xs text-gray-400">Streak</p>
        </div>
      </div>

      {/* Badges */}
      {topBadges.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {topBadges.map((badge, index) => (
            <div 
              key={badge.id}
              className="px-2 py-1 text-xs rounded-full flex items-center gap-1"
              style={{ 
                backgroundColor: badge.color + '20',
                color: badge.color,
                border: `1px solid ${badge.color}40`
              }}
              title={badge.description}
            >
              <span>{badge.icon}</span>
              <span className="font-medium">{badge.name}</span>
            </div>
          ))}
        </div>
      )}

      {bot.streakDays >= 7 && (
        <div className="mt-3 px-2 py-1 bg-gold/20 border border-gold/30 rounded text-center">
          <p className="text-xs text-gold font-medium">
            🔥 {bot.streakDays >= 30 ? 'Legendary' : 'Hot'} Streak!
          </p>
        </div>
      )}
    </motion.div>
  );
}