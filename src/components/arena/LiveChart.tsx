// @ts-nocheck
'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ArenaToken, ArenaBot } from '../../types/arena';

interface LiveChartProps {
  token: ArenaToken;
  activeBots: ArenaBot[];
}

export function LiveChart({ token, activeBots }: LiveChartProps) {
  // Генерируем фейковые данные для графика (в реальной версии здесь будет Chart.js)
  const chartData = useMemo(() => {
    const points = Array.from({ length: 20 }, (_, i) => {
      const basePrice = token.price;
      const volatility = 0.05; // 5% волатильность
      const trend = token.change1h > 0 ? 0.002 : -0.002;
      const random = (Math.random() - 0.5) * volatility;
      
      return basePrice * (1 + trend * i + random);
    });
    
    return points;
  }, [token.price, token.change1h]);

  const maxPrice = Math.max(...chartData);
  const minPrice = Math.min(...chartData);
  const priceRange = maxPrice - minPrice || 0.0001; // Избегаем деления на ноль

  // SVG path для графика
  const chartPath = useMemo(() => {
    const width = 300;
    const height = 200;
    const padding = 20;
    
    const points = chartData.map((price, index) => {
      const x = padding + (index / (chartData.length - 1)) * (width - 2 * padding);
      const y = padding + ((maxPrice - price) / priceRange) * (height - 2 * padding);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }, [chartData, maxPrice, minPrice, priceRange]);

  const changeColor = token.change1h > 0 ? 'text-green-400' : 'text-red-400';
  const chartColor = token.change1h > 0 ? '#10b981' : '#ef4444';

  return (
    <div className="space-y-4">
      {/* Token Info Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{token.symbol}/USD</h3>
          <div className="text-sm text-gray-400">
            {activeBots.length} bot{activeBots.length !== 1 ? 's' : ''} trading
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            ${token.price.toFixed(6)}
          </div>
          <div className={`text-sm font-medium ${changeColor}`}>
            {token.change1h > 0 ? '+' : ''}{token.change1h.toFixed(2)}% (1h)
          </div>
        </div>
      </div>

      {/* Live Chart */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        <div className="relative">
          <motion.svg
            width="100%"
            height="200"
            viewBox="0 0 300 200"
            className="overflow-visible"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="30" height="20" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Chart line */}
            <motion.path
              d={chartPath}
              fill="none"
              stroke={chartColor}
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
            
            {/* Gradient fill under line */}
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: chartColor, stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: chartColor, stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <motion.path
              d={`${chartPath} L 280,180 L 20,180 Z`}
              fill="url(#chartGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            />

            {/* Current price indicator */}
            <motion.circle
              cx="280"
              cy={20 + ((maxPrice - token.price) / priceRange) * 160}
              r="4"
              fill={chartColor}
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.svg>

          {/* Price levels */}
          <div className="absolute inset-y-0 right-0 flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>${maxPrice.toFixed(6)}</span>
            <span>${((maxPrice + minPrice) / 2).toFixed(6)}</span>
            <span>${minPrice.toFixed(6)}</span>
          </div>
        </div>
      </div>

      {/* Token Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-gray-400">24h Change</div>
          <div className={`font-bold ${token.change24h > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {token.change24h > 0 ? '+' : ''}{token.change24h.toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-gray-400">Volume 24h</div>
          <div className="font-bold text-white">
            ${(token.volume24h / 1000000).toFixed(1)}M
          </div>
        </div>
      </div>

      {/* Active Bots Indicator */}
      {activeBots.length > 0 && (
        <motion.div 
          className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-sm text-blue-300 mb-2">🤖 Active Bots on {token.symbol}:</div>
          <div className="flex flex-wrap gap-2">
            {activeBots.map(bot => (
              <div key={bot.id} className="bg-blue-800/50 px-2 py-1 rounded text-xs text-blue-200">
                {bot.name} {BotEmotionMap[bot.currentAction]}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Bot emotion mapping (повторяем из BotGrid для консистентности)
const BotEmotionMap = {
  'IDLE': '😎',
  'HUNTING': '🔍', 
  'BUYING': '💰',
  'SELLING': '📤',
  'HOLDING': '💎',
  'CELEBRATING': '🎉',
  'CRYING': '😭'
};