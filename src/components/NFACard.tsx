'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import TierBadge from './TierBadge';
import { NFAData, TIER_GRADIENTS, TIER_GLOW, getWinRate, shortenAddress } from '@/lib/nfa';
import { getRobotImage, getNFAName } from '@/lib/robot-images';
import { ethers } from 'ethers';

interface NFACardProps {
  nfa: NFAData;
  index?: number;
}

export default function NFACard({ nfa, index = 0 }: NFACardProps) {
  const wins = nfa.wins ?? nfa.stats?.wins ?? 0;
  const losses = nfa.losses ?? nfa.stats?.losses ?? 0;
  const totalBattles = nfa.totalBattles ?? nfa.stats?.totalBattles ?? 0;
  const currentStreak = nfa.currentStreak ?? nfa.stats?.currentStreak ?? 0;
  const winRate = getWinRate(wins, totalBattles);
  const gradient = TIER_GRADIENTS[nfa.tier] || TIER_GRADIENTS[0];
  const glow = TIER_GLOW[nfa.tier] || '';
  const isListed = nfa.listing?.active;
  const isGenesis = 'isGenesis' in nfa && (nfa as NFAData & { isGenesis?: boolean }).isGenesis;

  // Try to get display name: 1) on-chain persona, 2) local collection, 3) fallback
  let displayName = getNFAName(nfa.nfaId);
  try {
    if (nfa.metadata?.persona) {
      const p = JSON.parse(nfa.metadata.persona);
      if (p.name && p.emoji) displayName = `${p.emoji} ${p.name}`;
      else if (p.name) displayName = p.name;
    }
  } catch { /* ignore */ }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group"
    >
      <Link href={`/marketplace/${nfa.nfaId}`}>
        <div className={`relative bg-gradient-to-br ${gradient} border rounded-2xl overflow-hidden transition-all duration-300 ${glow} hover:brightness-110`}>
          {/* Robot Image */}
          <div className="relative aspect-square bg-gray-900/50 p-4">
            <Image
              src={getRobotImage(nfa.nfaId)}
              alt={`NFA #${nfa.nfaId}`}
              fill
              className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            {/* Tier Badge overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-1">
              <TierBadge tier={nfa.tier} size="sm" />
              {isGenesis && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-400">
                  🌟 GENESIS
                </span>
              )}
            </div>
            {/* NFA ID */}
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-gray-900/80 border border-gray-700 text-[10px] font-mono text-gray-400">
              #{nfa.nfaId}
            </div>
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            {/* Name + Stats */}
            <div>
              <h3 className="font-bold text-white text-sm truncate">
                {displayName}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-green-400 font-mono">{winRate}% WR</span>
                <span className="text-xs text-gray-500">
                  {wins}W / {losses}L
                </span>
                {currentStreak > 0 && (
                  <span className="text-xs text-orange-400">🔥 {currentStreak}</span>
                )}
              </div>
            </div>

            {/* Price / Owner */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
              {isListed ? (
                <div>
                  <div className="text-lg font-bold text-yellow-400">
                    {parseFloat(ethers.formatEther(nfa.listing!.price)).toFixed(3)} BNB
                  </div>
                  <div className="text-[10px] text-gray-500">Listed by {shortenAddress(nfa.listing!.seller)}</div>
                </div>
              ) : (
                <div>
                  <div className="text-sm text-gray-400">Not Listed</div>
                  <div className="text-[10px] text-gray-500">Owner: {shortenAddress(nfa.owner)}</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] text-gray-500">{totalBattles} battles</div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
