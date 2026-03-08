'use client';

import { useMemo } from 'react';
import type { HpTier } from './BotSprites';

// ─── IMAGE-BASED ROBOT SPRITES ───────────────────────────────────────────────
// Maps skin index → image paths for each HP tier
// Bots not in this map will fall back to SVG skins

interface ImageSkinPaths {
  fresh: string;
  neutral: string;
  hurt: string;
  critical: string;
}

const IMAGE_SKINS: Record<number, ImageSkinPaths> = {
  0: { // NeonViper
    fresh:    '/robots/states/01_neon_viper_fresh.png',
    neutral:  '/robots/states/01_neon_viper_neutral.png',
    hurt:     '/robots/states/01_neon_viper_hurt.png',
    critical: '/robots/states/01_neon_viper_critical.png',
  },
  1: { // CyberFang
    fresh:    '/robots/states/cyber-fang_fresh.png',
    neutral:  '/robots/states/cyber-fang_neutral.png',
    hurt:     '/robots/states/cyber-fang_hurt.png',
    critical: '/robots/states/cyber-fang_critical.png',
  },
  2: { // ShadowNinja
    fresh:    '/robots/states/shadow-ninja_fresh.png',
    neutral:  '/robots/states/shadow-ninja_neutral.png',
    hurt:     '/robots/states/shadow-ninja_hurt.png',
    critical: '/robots/states/shadow-ninja_critical.png',
  },
  3: { // IronGolem
    fresh:    '/robots/states/iron-golem_fresh.png',
    neutral:  '/robots/states/iron-golem_neutral.png',
    hurt:     '/robots/states/iron-golem_hurt.png',
    critical: '/robots/states/iron-golem_critical.png',
  },
  4: { // LaserHawk
    fresh:    '/robots/states/laser-hawk_fresh.png',
    neutral:  '/robots/states/laser-hawk_neutral.png',
    hurt:     '/robots/states/laser-hawk_hurt.png',
    critical: '/robots/states/laser-hawk_critical.png',
  },
  5: { // TechSamurai
    fresh:    '/robots/states/tech-samurai_fresh.png',
    neutral:  '/robots/states/tech-samurai_neutral.png',
    hurt:     '/robots/states/tech-samurai_hurt.png',
    critical: '/robots/states/tech-samurai_critical.png',
  },
  6: { // CrystalMage
    fresh:    '/robots/states/crystal-mage_fresh.png',
    neutral:  '/robots/states/crystal-mage_neutral.png',
    hurt:     '/robots/states/crystal-mage_hurt.png',
    critical: '/robots/states/crystal-mage_critical.png',
  },
  7: { // StormTrooper
    fresh:    '/robots/states/storm-trooper_fresh.png',
    neutral:  '/robots/states/storm-trooper_neutral.png',
    hurt:     '/robots/states/storm-trooper_hurt.png',
    critical: '/robots/states/storm-trooper_critical.png',
  },
  8: { // PhantomWraith
    fresh:    '/robots/states/phantom-wraith_fresh.png',
    neutral:  '/robots/states/phantom-wraith_neutral.png',
    hurt:     '/robots/states/phantom-wraith_hurt.png',
    critical: '/robots/states/phantom-wraith_critical.png',
  },
  9: { // MechSpider
    fresh:    '/robots/states/mech-spider_fresh.png',
    neutral:  '/robots/states/mech-spider_neutral.png',
    hurt:     '/robots/states/mech-spider_hurt.png',
    critical: '/robots/states/mech-spider_critical.png',
  },
  10: { // DragonMech
    fresh:    '/robots/states/11_dragon_mech_fresh.png',
    neutral:  '/robots/states/11_dragon_mech_neutral.png',
    hurt:     '/robots/states/11_dragon_mech_hurt.png',
    critical: '/robots/states/11_dragon_mech_critical.png',
  },
  11: { // ArcticFrost
    fresh:    '/robots/states/arctic-frost_fresh.png',
    neutral:  '/robots/states/arctic-frost_neutral.png',
    hurt:     '/robots/states/arctic-frost_hurt.png',
    critical: '/robots/states/arctic-frost_critical.png',
  },
  12: { // VolcanicCore
    fresh:    '/robots/states/volcanic-core_fresh.png',
    neutral:  '/robots/states/volcanic-core_neutral.png',
    hurt:     '/robots/states/volcanic-core_hurt.png',
    critical: '/robots/states/volcanic-core_critical.png',
  },
  13: { // NeonRacer
    fresh:    '/robots/states/neon-racer_fresh.png',
    neutral:  '/robots/states/neon-racer_neutral.png',
    hurt:     '/robots/states/neon-racer_hurt.png',
    critical: '/robots/states/neon-racer_critical.png',
  },
  14: { // BioHazard
    fresh:    '/robots/states/bio-hazard_fresh.png',
    neutral:  '/robots/states/bio-hazard_neutral.png',
    hurt:     '/robots/states/bio-hazard_hurt.png',
    critical: '/robots/states/bio-hazard_critical.png',
  },
  15: { // ThunderBolt
    fresh:    '/robots/states/thunder-bolt_fresh.png',
    neutral:  '/robots/states/thunder-bolt_neutral.png',
    hurt:     '/robots/states/thunder-bolt_hurt.png',
    critical: '/robots/states/thunder-bolt_critical.png',
  },
  16: { // GravityWell
    fresh:    '/robots/states/gravity-well_fresh.png',
    neutral:  '/robots/states/gravity-well_neutral.png',
    hurt:     '/robots/states/gravity-well_hurt.png',
    critical: '/robots/states/gravity-well_critical.png',
  },
  17: { // QuantumShift
    fresh:    '/robots/states/quantum-shift_fresh.png',
    neutral:  '/robots/states/quantum-shift_neutral.png',
    hurt:     '/robots/states/quantum-shift_hurt.png',
    critical: '/robots/states/quantum-shift_critical.png',
  },
  18: { // VoidWalker
    fresh:    '/robots/states/void-walker_fresh.png',
    neutral:  '/robots/states/void-walker_neutral.png',
    hurt:     '/robots/states/void-walker_hurt.png',
    critical: '/robots/states/void-walker_critical.png',
  },
  19: { // OmegaPrime
    fresh:    '/robots/states/omega-prime_fresh.png',
    neutral:  '/robots/states/omega-prime_neutral.png',
    hurt:     '/robots/states/omega-prime_hurt.png',
    critical: '/robots/states/omega-prime_critical.png',
  },
};

/**
 * Check if a skin index has image-based sprites
 */
export function hasImageSkin(skinIndex: number): boolean {
  return skinIndex in IMAGE_SKINS;
}

/**
 * Get the image path for a given skin index and HP tier
 */
export function getImageForTier(skinIndex: number, hpTier: HpTier): string | null {
  const skin = IMAGE_SKINS[skinIndex];
  if (!skin) return null;
  return skin[hpTier];
}

/**
 * Image-based robot sprite component
 * Replaces SVG with a PNG image that changes based on HP tier
 */
export function ImageRobotSprite({ skinIndex, hpTier, side }: { skinIndex: number; hpTier: HpTier; side: 'left' | 'right' }) {
  const imagePath = useMemo(() => getImageForTier(skinIndex, hpTier), [skinIndex, hpTier]);
  
  if (!imagePath) return null;

  // All PNGs now face RIGHT (pre-flipped at build time).
  // Parent container handles side-based flipping: scaleX(-1) for right side.
  return (
    <img
      src={imagePath}
      alt="Robot"
      className="w-[120px] h-[160px] md:w-[180px] md:h-[240px] object-contain"
      style={{ imageRendering: 'auto' }}
      draggable={false}
    />
  );
}
