'use client';

import { motion } from 'framer-motion';

interface HPBarProps {
  current: number;
  max: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  animate?: boolean;
}

export default function HPBar({ current, max, showLabel = true, size = 'sm', animate = true }: HPBarProps) {
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  
  // Color transitions: green → yellow → orange → red
  const getBarColor = (pct: number) => {
    if (pct > 60) return 'bg-green-500';
    if (pct > 35) return 'bg-yellow-500';
    if (pct > 15) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getGlowColor = (pct: number) => {
    if (pct > 60) return 'shadow-green-500/40';
    if (pct > 35) return 'shadow-yellow-500/40';
    if (pct > 15) return 'shadow-orange-500/40';
    return 'shadow-red-500/40';
  };

  const barHeight = size === 'md' ? 'h-3' : 'h-2';
  const isLow = percent <= 25;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-gray-500">HP</span>
          <span className={`font-mono ${isLow ? 'text-red-400' : 'text-gray-400'}`}>
            {current}/{max}
          </span>
        </div>
      )}
      <div className={`${barHeight} bg-gray-800/80 rounded-full overflow-hidden relative`}>
        {/* Background shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        
        {/* HP bar fill */}
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${getBarColor(percent)} ${isLow ? 'animate-pulse' : ''}`}
          initial={animate ? { width: '100%' } : { width: `${percent}%` }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          style={{
            boxShadow: isLow ? `0 0 8px rgba(239, 68, 68, 0.6)` : undefined,
          }}
        >
          {/* Inner highlight */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
        </motion.div>

        {/* Damage flash overlay (red flash that fades) */}
        {isLow && (
          <motion.div
            className="absolute inset-0 bg-red-500/20 rounded-full"
            animate={{ opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}
