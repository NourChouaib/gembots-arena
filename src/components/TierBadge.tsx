'use client';

import { motion } from 'framer-motion';
import { TIER_NAMES, TIER_COLORS } from '@/lib/nfa';

interface TierBadgeProps {
  tier: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

const TIER_EMOJIS: Record<number, string> = {
  0: '🥉',
  1: '🥈',
  2: '🥇',
  3: '💎',
  4: '🔥',
};

export default function TierBadge({ tier, size = 'sm', showLabel = true, animated = true }: TierBadgeProps) {
  const color = TIER_COLORS[tier] || TIER_COLORS[0];
  const name = TIER_NAMES[tier] || 'Bronze';
  const emoji = TIER_EMOJIS[tier] || '🥉';
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
    lg: 'px-4 py-1.5 text-sm gap-2',
  };

  const badge = (
    <span
      className={`inline-flex items-center rounded-full font-bold border ${sizeClasses[size]}`}
      style={{
        borderColor: `${color}66`,
        backgroundColor: `${color}1A`,
        color: color,
      }}
    >
      <span>{emoji}</span>
      {showLabel && <span>{name}</span>}
    </span>
  );

  if (animated && tier >= 3) {
    return (
      <motion.span
        animate={{ 
          boxShadow: [
            `0 0 5px ${color}33`,
            `0 0 15px ${color}66`,
            `0 0 5px ${color}33`,
          ] 
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="inline-flex rounded-full"
      >
        {badge}
      </motion.span>
    );
  }

  return badge;
}
