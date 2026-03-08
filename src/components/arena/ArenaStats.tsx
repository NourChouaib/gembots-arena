// @ts-nocheck
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { ArenaBot, ArenaToken } from '../../types/arena';

interface ArenaStatsProps {
  totalBots: number;
  activeTrades: number;
  topPerformer?: ArenaBot;
  tokens: ArenaToken[];
}

export function ArenaStats({ totalBots, activeTrades, topPerformer, tokens }: ArenaStatsProps) {
  const totalVolume = tokens.reduce((sum, token) => sum + token.volume24h, 0);
  const avgPerformance = tokens.length > 0 
    ? tokens.reduce((sum, token) => sum + token.change24h, 0) / tokens.length 
    : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Stats</h3>
      
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
          <div className="text-xl font-bold text-gray-100">{totalBots}</div>
          <div className="text-xs text-gray-500">Active Bots</div>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
          <div className="text-xl font-bold text-gray-100">{activeTrades}</div>
          <div className="text-xs text-gray-500">Live Trades</div>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
          <div className="text-xl font-bold text-gray-100">${(totalVolume / 1000000).toFixed(1)}M</div>
          <div className="text-xs text-gray-500">Volume</div>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
          <div className={`text-xl font-bold ${avgPerformance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {avgPerformance > 0 ? '+' : ''}{avgPerformance.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Avg Change</div>
        </div>
      </div>

      {/* Top Performer */}
      {topPerformer && topPerformer.todayPnL > 0 && (
        <motion.div
          className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-xs text-gray-500 mb-1">Top Performer</div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-200">{topPerformer.name}</span>
            <span className="font-bold text-emerald-400">+${topPerformer.todayPnL.toFixed(0)}</span>
          </div>
        </motion.div>
      )}

      {/* System Status */}
      <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 space-y-2">
        <div className="text-xs text-gray-500 mb-2">System</div>
        {[
          { label: 'Price Feed', status: true },
          { label: 'Bot Engine', status: true },
          { label: 'WebSocket', status: true }
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{item.label}</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${item.status ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className={item.status ? 'text-emerald-400' : 'text-rose-400'}>
                {item.status ? 'OK' : 'Down'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
