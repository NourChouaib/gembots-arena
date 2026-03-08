'use client';

/**
 * NFA Badge — shows NFA tier icon and ID next to bot name.
 * Tier emojis: 🥉 Bronze, 🥈 Silver, 🥇 Gold, 💎 Diamond, ⭐ Legendary
 */

const TIER_THRESHOLDS = [0, 10, 50, 100, 250];
const TIER_EMOJIS = ['🥉', '🥈', '🥇', '💎', '⭐'];
const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Legendary'];
const TIER_COLORS = ['#CD7F32', '#C0C0C0', '#FFD700', '#B9F2FF', '#FF6B6B'];

function getTier(wins: number): number {
  let tier = 0;
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (wins >= TIER_THRESHOLDS[i]) {
      tier = i;
      break;
    }
  }
  return tier;
}

interface NFABadgeProps {
  nfaId: number;
  wins?: number;
  compact?: boolean;
  className?: string;
}

export default function NFABadge({ nfaId, wins = 0, compact = false, className = '' }: NFABadgeProps) {
  const tier = getTier(wins);
  const emoji = TIER_EMOJIS[tier];
  const tierName = TIER_NAMES[tier];
  const color = TIER_COLORS[tier];

  if (compact) {
    return (
      <span 
        className={`inline-flex items-center gap-0.5 text-xs font-mono ${className}`}
        title={`NFA #${nfaId} — ${tierName} Tier`}
        style={{ color }}
      >
        {emoji} #{nfaId}
      </span>
    );
  }

  return (
    <span 
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold border ${className}`}
      style={{ 
        color, 
        borderColor: `${color}40`,
        backgroundColor: `${color}15`,
      }}
      title={`NFA #${nfaId} — ${tierName} Tier (${wins} wins)`}
    >
      {emoji} NFA #{nfaId}
    </span>
  );
}

export { getTier, TIER_EMOJIS, TIER_NAMES, TIER_COLORS, TIER_THRESHOLDS };
