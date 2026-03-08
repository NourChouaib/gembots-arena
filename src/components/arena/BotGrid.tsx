// @ts-nocheck
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { ArenaBot } from '../../types/arena';

interface BotGridProps {
  bots: ArenaBot[];
  selectedToken?: string;
  onBotClick: (botId: string) => void;
  rootingForBot?: string | null;
  isWatchMode?: boolean;
}

// Статусы с минималистичными индикаторами
const StatusConfig = {
  'IDLE': { label: 'Idle', color: 'bg-gray-500' },
  'HUNTING': { label: 'Scanning', color: 'bg-amber-500' },
  'BUYING': { label: 'Buying', color: 'bg-emerald-500' },
  'SELLING': { label: 'Selling', color: 'bg-rose-500' },
  'HOLDING': { label: 'Holding', color: 'bg-blue-500' },
  'CELEBRATING': { label: 'Win!', color: 'bg-emerald-400' },
  'CRYING': { label: 'Loss', color: 'bg-rose-400' }
};

export function BotGrid({ bots, selectedToken, onBotClick, rootingForBot, isWatchMode }: BotGridProps) {
  const gridBots = bots.slice(0, 12);

  return (
    <div className="grid grid-cols-3 gap-3 h-full">
      {gridBots.map((bot, index) => {
        const isActive = bot.position && (!selectedToken || bot.position.tokenMint === selectedToken);
        const isRootingFor = rootingForBot === bot.id;
        const isProfit = bot.todayPnL > 0;
        const isLoss = bot.todayPnL < 0;
        const status = StatusConfig[bot.currentAction];
        
        // Цвет границы карточки определяется только P&L
        const borderStyle = isRootingFor
          ? 'border-white/60 ring-1 ring-white/20'
          : isProfit
            ? 'border-emerald-500/40 hover:border-emerald-500/60'
            : isLoss
              ? 'border-rose-500/40 hover:border-rose-500/60'
              : 'border-gray-700/50 hover:border-gray-600';
        
        return (
          <motion.div
            key={bot.id}
            className={`relative bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border cursor-pointer transition-all duration-200 min-h-[140px] ${borderStyle}`}
            onClick={() => onBotClick(bot.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Top row: Status dot + Bot name */}
            <div className="flex items-center gap-2 mb-3">
              <motion.div 
                className={`w-2 h-2 rounded-full ${status.color}`}
                animate={isActive ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <h3 className="text-sm font-semibold text-gray-100 truncate flex-1">
                {bot.name}
              </h3>
              {isRootingFor && (
                <span className="text-xs text-gray-400">★</span>
              )}
            </div>

            {/* Status label */}
            <div className="text-xs text-gray-500 mb-2">
              {status.label}
            </div>

            {/* Position info or placeholder */}
            {bot.position ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{bot.position.tokenSymbol}</span>
                  <span className={`text-sm font-bold ${
                    bot.position.pnlPercent > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {bot.position.pnlPercent > 0 ? '+' : ''}{bot.position.pnlPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600">
                No position
              </div>
            )}

            {/* Today's P&L - главный индикатор внизу */}
            <div className="absolute bottom-3 left-4 right-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Today</span>
                <span className={`text-sm font-bold ${
                  isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-gray-500'
                }`}>
                  {isProfit ? '+' : ''}{bot.todayPnL !== 0 ? `$${bot.todayPnL.toFixed(0)}` : '$0'}
                </span>
              </div>
            </div>

            {/* Subtle pulse on buy/sell actions */}
            {(bot.currentAction === 'BUYING' || bot.currentAction === 'SELLING') && (
              <motion.div
                className={`absolute inset-0 rounded-xl pointer-events-none ${
                  bot.currentAction === 'BUYING' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>
        );
      })}

      {/* Empty slots - чистый минимализм */}
      {Array.from({ length: Math.max(0, 12 - gridBots.length) }, (_, i) => (
        <div 
          key={`empty-${i}`}
          className="bg-gray-900/40 border border-gray-800/50 border-dashed rounded-xl p-4 flex items-center justify-center min-h-[140px]"
        >
          <span className="text-xs text-gray-700">—</span>
        </div>
      ))}
    </div>
  );
}