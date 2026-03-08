// @ts-nocheck
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { ArenaBot } from '../../types/arena';

interface LeaderboardProps {
  bots: ArenaBot[];
}

// Status indicator colors
const StatusConfig = {
  'IDLE': 'bg-gray-500',
  'HUNTING': 'bg-amber-500',
  'BUYING': 'bg-emerald-500',
  'SELLING': 'bg-rose-500',
  'HOLDING': 'bg-blue-500',
  'CELEBRATING': 'bg-emerald-400',
  'CRYING': 'bg-rose-400'
};

export function Leaderboard({ bots }: LeaderboardProps) {
  const sortedBots = React.useMemo(() => {
    return [...bots]
      .sort((a, b) => b.todayPnL - a.todayPnL)
      .slice(0, 10);
  }, [bots]);

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {sortedBots.map((bot, index) => {
        const rank = index + 1;
        const isProfit = bot.todayPnL > 0;
        const isLoss = bot.todayPnL < 0;
        
        return (
          <motion.div
            key={bot.id}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60 transition-colors"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            {/* Rank & Bot Info */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                rank === 1 ? 'bg-amber-500/20 text-amber-400' :
                rank === 2 ? 'bg-gray-500/20 text-gray-400' :
                rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                'bg-gray-800 text-gray-500'
              }`}>
                {rank}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-200 truncate text-sm">
                    {bot.name}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${StatusConfig[bot.currentAction]}`} />
                </div>
                <div className="text-xs text-gray-500">
                  {bot.winRate.toFixed(0)}% wins
                </div>
              </div>
            </div>

            {/* P&L */}
            <div className="text-right">
              <div className={`font-bold text-sm ${
                isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-gray-500'
              }`}>
                {isProfit ? '+' : ''}${bot.todayPnL.toFixed(0)}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Empty state */}
      {sortedBots.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          <div className="text-sm">No active bots</div>
        </div>
      )}

      {/* Stats footer */}
      {sortedBots.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="font-semibold text-emerald-400">
              {sortedBots.filter(b => b.todayPnL > 0).length}
            </div>
            <div className="text-gray-500">Profitable</div>
          </div>
          <div>
            <div className="font-semibold text-gray-300">
              {sortedBots.filter(b => b.currentAction === 'HOLDING').length}
            </div>
            <div className="text-gray-500">Trading</div>
          </div>
          <div>
            <div className="font-semibold text-gray-300">
              ${Math.max(...sortedBots.map(b => b.todayPnL), 0).toFixed(0)}
            </div>
            <div className="text-gray-500">Best</div>
          </div>
        </div>
      )}
    </div>
  );
}
