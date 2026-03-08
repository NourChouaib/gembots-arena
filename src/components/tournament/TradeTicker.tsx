'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

export interface TickerTrade {
  id: number;
  botName: string;
  token: string;
  action: 'buy' | 'sell';
  pnl: number;
  isCombo: boolean;
  timestamp: number;
}

interface TradeTickerProps {
  trades: TickerTrade[];
}

export default function TradeTicker({ trades }: TradeTickerProps) {
  // Double the trades for seamless scrolling loop
  const displayTrades = useMemo(() => {
    if (trades.length === 0) return [];
    return [...trades, ...trades];
  }, [trades]);

  if (trades.length === 0) {
    return (
      <div className="w-full bg-black/60 backdrop-blur-sm border-t border-white/5 rounded-b-xl">
        <div className="py-2 px-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-500 opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-600" />
          </span>
          <span className="text-xs text-gray-500 font-mono">Waiting for trades...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-black/60 backdrop-blur-sm border-t border-white/5 rounded-b-xl">
      <motion.div
        className="flex gap-6 py-2 px-4 whitespace-nowrap"
        animate={{ x: [0, -(trades.length * 250)] }}
        transition={{ duration: Math.max(20, trades.length * 5), repeat: Infinity, ease: 'linear' }}
      >
        {displayTrades.map((trade, i) => (
          <span key={`${trade.id}-${i}`} className="text-xs font-mono flex items-center gap-1.5 shrink-0">
            <span>{trade.pnl >= 0 ? '🟢' : '🔴'}</span>
            <span className="text-gray-400">{trade.botName}</span>
            <span className="text-white">
              {trade.action === 'buy' ? 'bought' : 'sold'} ${trade.token}
            </span>
            <span className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
              {trade.pnl >= 0 ? '+' : ''}{trade.pnl}%
            </span>
            {trade.isCombo && <span className="text-yellow-400">🔥</span>}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
