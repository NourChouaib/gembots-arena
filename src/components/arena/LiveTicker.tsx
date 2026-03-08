// @ts-nocheck
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { LiveTicker as LiveTickerType } from '../../types/arena';

interface LiveTickerProps {
  ticker: LiveTickerType[];
  className?: string;
}

export function LiveTicker({ ticker, className = '' }: LiveTickerProps) {
  // Если нет событий, показываем демо-сообщения
  const displayTicker = ticker.length > 0 ? ticker : [
    {
      id: 'demo-1',
      text: '🤖 AlphaBot bought PEPE at $0.001234 with 89% confidence',
      type: 'trade' as const,
      icon: '💰',
      timestamp: new Date().toISOString()
    },
    {
      id: 'demo-2', 
      text: '🚀 DiamondBot hit 3.2x on WIF! Profit: $2,850',
      type: 'moonshot' as const,
      icon: '🚀',
      timestamp: new Date().toISOString()
    },
    {
      id: 'demo-3',
      text: '💎 MegaWhale holding DOGE through the dip - diamond hands!',
      type: 'trade' as const,
      icon: '💎',
      timestamp: new Date().toISOString()
    }
  ];

  return (
    <div className={`fixed left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-t border-purple-500/20 ${className || 'bottom-0'}`}>
      <div className="relative overflow-hidden h-14">
        {/* Gradient edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black/80 to-transparent z-10 pointer-events-none" />
        
        {/* Scrolling content */}
        <motion.div
          className="flex items-center space-x-8 h-full whitespace-nowrap"
          animate={{ x: ['100%', '-100%'] }}
          transition={{
            duration: 45, // 45 секунд на полный цикл
            ease: 'linear',
            repeat: Infinity,
          }}
        >
          {displayTicker.concat(displayTicker).map((item, index) => {
            const bgColor = item.type === 'moonshot' 
              ? 'bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-500/30' 
              : item.type === 'achievement'
              ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30'
              : 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-blue-500/30';
            
            return (
              <motion.div
                key={`${item.id}-${index}`}
                className={`flex items-center space-x-3 px-4 py-2 rounded-lg border backdrop-blur-sm ${bgColor}`}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-white font-medium text-sm">
                  {item.text}
                </span>
                
                {/* Timestamp */}
                <span className="text-xs text-gray-400 ml-2">
                  {new Date(item.timestamp).toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                
                {/* Special effects for moonshots */}
                {item.type === 'moonshot' && (
                  <motion.div
                    className="flex space-x-1"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <span className="text-yellow-400">✨</span>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
        
        {/* Live indicator */}
        <div className="absolute top-2 left-4 flex items-center space-x-2 z-20">
          <motion.div
            className="w-2 h-2 bg-red-500 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-xs text-red-400 font-medium">LIVE</span>
        </div>
      </div>
    </div>
  );
}