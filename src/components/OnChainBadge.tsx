'use client';

import { motion } from 'framer-motion';

interface OnChainBadgeProps {
  agentId: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

export default function OnChainBadge({ agentId, size = 'sm', showLabel = true }: OnChainBadgeProps) {
  const bscscanUrl = `https://bscscan.com/nft/${REGISTRY}/${agentId}`;
  
  return (
    <motion.a
      href={bscscanUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 rounded-full border transition-all hover:scale-105 ${
        size === 'sm' 
          ? 'px-1.5 py-0.5 text-[9px]' 
          : 'px-2.5 py-1 text-xs'
      } border-[#F0B90B]/40 bg-[#F0B90B]/10 text-[#F0B90B] hover:bg-[#F0B90B]/20 hover:border-[#F0B90B]/60`}
      title={`ERC-8004 Agent #${agentId} — Verified on BSC`}
      whileHover={{ scale: 1.05 }}
    >
      <svg 
        className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5"
      >
        <path d="M9 12l2 2 4-4" />
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      </svg>
      {showLabel && (
        <span className="font-semibold">#{agentId}</span>
      )}
    </motion.a>
  );
}
