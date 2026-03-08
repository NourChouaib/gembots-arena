'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { SparkParticles, WinnerAura, SmokeEffect } from './ArenaEffects';
import { getSkinForBot } from './BotSkins';
import { hasImageSkin, ImageRobotSprite } from './ImageSprite';

// ─── HP STATE HELPERS ─────────────────────────────────────────────────────────

export type HpTier = 'fresh' | 'neutral' | 'hurt' | 'critical';

export function getHpTier(hp: number, maxHp: number): HpTier {
  const pct = (hp / maxHp) * 100;
  if (pct > 70) return 'fresh';
  if (pct > 40) return 'neutral';
  if (pct > 15) return 'hurt';
  return 'critical';
}

export function getHpFilters(tier: HpTier): string {
  switch (tier) {
    case 'fresh': return 'brightness(1.2) saturate(1.3)';
    case 'neutral': return 'brightness(1.0) saturate(1.0)';
    case 'hurt': return 'brightness(0.75) saturate(0.6)';
    case 'critical': return 'brightness(0.55) saturate(0.35)';
  }
}

export function isWinning(myHp: number, opponentHp: number, maxHp: number): boolean {
  const diff = ((myHp - opponentHp) / maxHp) * 100;
  return diff > 30;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface BotState {
  name: string;
  hp: number;
  maxHp: number;
  color: string;
  glowColor: string;
  comboCount: number;
  state: 'idle' | 'attack' | 'hurt' | 'critical';
  totalPnl: number;
  nfa_id?: number | null;
}

// ─── NeonViper SVG (sleek predator bot — purple) ──

export function NeonViperSVG({ hpTier, winning, botState, side, color }: { hpTier: HpTier; winning: boolean; botState: string; side: string; color: string }) {
  const criticalShift = hpTier === 'critical';
  const neonOpacity = hpTier === 'fresh' ? 1 : hpTier === 'neutral' ? 0.7 : hpTier === 'hurt' ? 0.35 : 0.15;
  const neonFlicker = hpTier === 'hurt' ? '1;0.3;0.8;0.2;1' : hpTier === 'critical' ? '0.1;0.6;0;0.4;0.1' : '0.7;1;0.7';
  const neonDur = hpTier === 'critical' ? '0.6s' : hpTier === 'hurt' ? '1.2s' : '2s';
  const eyeColor = (botState === 'hurt' || botState === 'critical') ? '#ff4444' : hpTier === 'critical' ? '#ff4444' : hpTier === 'hurt' ? '#ff8844' : color;
  const coreColor = hpTier === 'critical' ? '#ff2222' : color;
  const corePulse = hpTier === 'critical' ? '0.2;0.8;0.2' : '0.5;1;0.5';
  const coreDur = hpTier === 'critical' ? '0.5s' : '1.5s';

  return (
    <g>
      <defs>
        <linearGradient id={`viper-body-${side}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1a4e" />
          <stop offset="50%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0d0d1a" />
        </linearGradient>
        <linearGradient id={`viper-metal-${side}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a3a5a" />
          <stop offset="40%" stopColor="#1a1a2e" />
          <stop offset="60%" stopColor="#2a2a4a" />
          <stop offset="100%" stopColor="#1a1a2e" />
        </linearGradient>
        <filter id={`viper-glow-${side}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={`viper-inner-${side}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id={`viper-core-${side}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={coreColor} stopOpacity="1" />
          <stop offset="50%" stopColor={coreColor} stopOpacity="0.6" />
          <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Drop shadow on floor */}
      <ellipse cx="90" cy="234" rx="50" ry="6" fill="rgba(0,0,0,0.5)" filter={`url(#viper-glow-${side})`} />

      {/* === HORNS / ANTENNAE === */}
      <polygon points="52,18 42,2 48,22" fill={`url(#viper-metal-${side})`} stroke={color} strokeWidth="1.5" opacity={criticalShift ? 0.5 : 1}
        style={criticalShift ? { transform: 'rotate(-8deg)', transformOrigin: '48px 22px' } : {}} />
      <polygon points="128,18 138,2 132,22" fill={`url(#viper-metal-${side})`} stroke={color} strokeWidth="1.5" opacity={criticalShift ? 0.5 : 1}
        style={criticalShift ? { transform: 'rotate(10deg)', transformOrigin: '132px 22px' } : {}} />
      {/* Horn neon tips */}
      <circle cx="42" cy="3" r="3" fill={color} opacity={neonOpacity} filter={`url(#viper-glow-${side})`}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </circle>
      <circle cx="138" cy="3" r="3" fill={color} opacity={neonOpacity} filter={`url(#viper-glow-${side})`}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </circle>

      {/* === HEAD (angular/predator shape) === */}
      <polygon points="90,12 130,22 138,50 128,60 52,60 42,50 50,22"
        fill={`url(#viper-body-${side})`} stroke={color} strokeWidth="2"
        filter={hpTier === 'fresh' ? `url(#viper-glow-${side})` : undefined} />
      {/* Metallic sheen on head */}
      <polygon points="90,14 125,24 130,42 90,36" fill="rgba(255,255,255,0.04)" />

      {/* V-shaped visor */}
      <path d="M 60,30 L 90,42 L 120,30 L 118,36 L 90,48 L 62,36 Z" fill="rgba(0,0,0,0.6)" stroke={eyeColor} strokeWidth="1.5" />
      {/* Left eye in visor */}
      <polygon points="68,33 82,40 68,40" fill={eyeColor} opacity={0.9}>
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.9;0.1;0.7;0.2' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </polygon>
      {/* Right eye in visor */}
      <polygon points="112,33 98,40 112,40" fill={eyeColor} opacity={0.9}>
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.7;0.3;0.8;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.8s' : '2s'} repeatCount="indefinite" />
      </polygon>
      {/* Eye glow */}
      {(hpTier === 'fresh' || winning) && (
        <>
          <polygon points="66,32 84,41 66,41" fill={eyeColor} opacity="0.2" filter={`url(#viper-inner-${side})`}>
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur="2s" repeatCount="indefinite" />
          </polygon>
          <polygon points="114,32 96,41 114,41" fill={eyeColor} opacity="0.2" filter={`url(#viper-inner-${side})`}>
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur="2s" repeatCount="indefinite" />
          </polygon>
        </>
      )}

      {/* Head neon accent lines */}
      <line x1="55" y1="22" x2="65" y2="28" stroke={color} strokeWidth="1" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>
      <line x1="125" y1="22" x2="115" y2="28" stroke={color} strokeWidth="1" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>

      {/* Head cracks */}
      {(hpTier === 'hurt' || hpTier === 'critical') && (
        <>
          <path d="M 56 26 L 64 36 L 58 46" stroke="rgba(255,100,50,0.35)" strokeWidth="1.5" fill="none" />
          <path d="M 124 28 L 118 38 L 126 48" stroke="rgba(255,100,50,0.3)" strokeWidth="1" fill="none" />
        </>
      )}
      {hpTier === 'critical' && (
        <path d="M 80 14 L 86 26 L 78 38 L 84 50" stroke="rgba(255,80,40,0.45)" strokeWidth="1.5" fill="none" />
      )}

      {/* === NECK === */}
      <rect x="75" y="60" width="30" height="10" rx="2" fill={`url(#viper-metal-${side})`} stroke={color} strokeWidth="1" />
      <line x1="78" y1="65" x2="102" y2="65" stroke={color} strokeWidth="0.5" opacity={neonOpacity * 0.6} />

      {/* === SHOULDERS (massive angular armor) === */}
      <polygon points="30,72 55,68 58,90 25,88" fill={`url(#viper-metal-${side})`} stroke={color} strokeWidth="2" />
      <line x1="32" y1="76" x2="52" y2="72" stroke={color} strokeWidth="1" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>
      <line x1="28" y1="84" x2="54" y2="80" stroke={color} strokeWidth="0.8" opacity={neonOpacity * 0.6}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>
      <polygon points="150,72 125,68 122,90 155,88" fill={`url(#viper-metal-${side})`} stroke={color} strokeWidth="2" />
      <line x1="148" y1="76" x2="128" y2="72" stroke={color} strokeWidth="1" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>
      <line x1="152" y1="84" x2="126" y2="80" stroke={color} strokeWidth="0.8" opacity={neonOpacity * 0.6}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>

      {/* === TORSO === */}
      <polygon points="55,70 125,70 120,90 130,92 125,130 110,140 70,140 55,130 50,92 60,90"
        fill={`url(#viper-body-${side})`} stroke={color} strokeWidth="2"
        filter={hpTier === 'fresh' ? `url(#viper-glow-${side})` : undefined} />
      <polygon points="70,74 110,74 105,90 75,90" fill="rgba(255,255,255,0.05)" />

      {/* ENERGY CORE */}
      <circle cx="90" cy="102" r="10" fill={`url(#viper-core-${side})`} filter={`url(#viper-inner-${side})`}>
        <animate attributeName="r" values="9;11;9" dur={coreDur} repeatCount="indefinite" />
      </circle>
      <circle cx="90" cy="102" r="6" fill={coreColor} opacity="0.8">
        <animate attributeName="opacity" values={corePulse} dur={coreDur} repeatCount="indefinite" />
      </circle>
      <circle cx="90" cy="102" r="13" fill="none" stroke={coreColor} strokeWidth="1" opacity="0.3">
        <animate attributeName="r" values="12;16;12" dur={coreDur} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur={coreDur} repeatCount="indefinite" />
      </circle>

      {/* Lightning emblem */}
      <path d="M 86,80 L 92,80 L 88,88 L 94,88 L 84,100 L 88,92 L 82,92 Z"
        fill={color} opacity={hpTier === 'critical' ? 0.2 : 0.7} />

      {/* Tron neon lines on torso */}
      <path d="M 62,76 L 62,120" stroke={color} strokeWidth="1" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </path>
      <path d="M 118,76 L 118,120" stroke={color} strokeWidth="1" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </path>
      <path d="M 70,130 L 90,136 L 110,130" stroke={color} strokeWidth="1" fill="none" opacity={neonOpacity * 0.8}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </path>
      <line x1="62" y1="90" x2="78" y2="90" stroke={color} strokeWidth="0.8" opacity={neonOpacity * 0.5} />
      <line x1="102" y1="90" x2="118" y2="90" stroke={color} strokeWidth="0.8" opacity={neonOpacity * 0.5} />

      {/* Body cracks */}
      {(hpTier === 'hurt' || hpTier === 'critical') && (
        <>
          <path d="M 58 78 L 68 90 L 60 102" stroke="rgba(255,100,50,0.35)" strokeWidth="1.5" fill="none" />
          <path d="M 122 82 L 116 95 L 124 105" stroke="rgba(255,100,50,0.3)" strokeWidth="1" fill="none" />
        </>
      )}
      {hpTier === 'critical' && (
        <>
          <path d="M 75 74 L 82 88 L 74 102 L 80 118" stroke="rgba(255,80,40,0.45)" strokeWidth="1.5" fill="none" />
          <path d="M 108 76 L 100 92 L 110 108" stroke="rgba(255,80,40,0.4)" strokeWidth="1.5" fill="none" />
          <rect x="132" y="98" width="10" height="14" rx="1" fill="#1a1a2e" stroke={color} strokeWidth="1" opacity="0.5"
            style={{ transform: 'rotate(18deg)', transformOrigin: '132px 98px' }} />
        </>
      )}

      {/* Winning chest aura */}
      {winning && (
        <circle cx="90" cy="102" r="20" fill="none" stroke={color} strokeWidth="1" opacity="0.3">
          <animate attributeName="r" values="18;26;18" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* === LEGS === */}
      <polygon points={`${criticalShift ? 62 : 60},140 ${criticalShift ? 78 : 76},140 ${criticalShift ? 80 : 78},178 ${criticalShift ? 58 : 56},178`}
        fill={`url(#viper-body-${side})`} stroke={color} strokeWidth="2" />
      <line x1={criticalShift ? 64 : 62} y1="150" x2={criticalShift ? 76 : 74} y2="150" stroke={color} strokeWidth="0.8" opacity={neonOpacity * 0.5} />
      <line x1={criticalShift ? 70 : 68} y1="142" x2={criticalShift ? 70 : 68} y2="176" stroke={color} strokeWidth="1" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>

      <polygon points={`${criticalShift ? 100 : 104},140 ${criticalShift ? 116 : 120},140 ${criticalShift ? 120 : 124},178 ${criticalShift ? 98 : 102},178`}
        fill={`url(#viper-body-${side})`} stroke={color} strokeWidth="2" />
      <line x1={criticalShift ? 104 : 108} y1="150" x2={criticalShift ? 112 : 116} y2="150" stroke={color} strokeWidth="0.8" opacity={neonOpacity * 0.5} />
      <line x1={criticalShift ? 108 : 112} y1="142" x2={criticalShift ? 108 : 112} y2="176" stroke={color} strokeWidth="1" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>

      {/* Leg cracks */}
      {hpTier === 'critical' && (
        <>
          <path d="M 64 148 L 70 158 L 66 168" stroke="rgba(255,80,40,0.35)" strokeWidth="1" fill="none" />
          <path d="M 114 150 L 108 162" stroke="rgba(255,80,40,0.3)" strokeWidth="1" fill="none" />
        </>
      )}

      {/* === FEET (jet boots) === */}
      <polygon points={`${criticalShift ? 52 : 50},178 ${criticalShift ? 84 : 82},178 ${criticalShift ? 86 : 84},192 ${criticalShift ? 82 : 80},196 ${criticalShift ? 50 : 48},196 ${criticalShift ? 48 : 46},192`}
        fill={`url(#viper-metal-${side})`} stroke={color} strokeWidth="2" />
      <rect x={criticalShift ? 56 : 54} y="192" width="22" height="4" rx="2" fill={color} opacity={neonOpacity * 0.6}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </rect>
      <polygon points={`${criticalShift ? 94 : 98},178 ${criticalShift ? 126 : 130},178 ${criticalShift ? 128 : 132},192 ${criticalShift ? 124 : 128},196 ${criticalShift ? 92 : 96},196 ${criticalShift ? 90 : 94},192`}
        fill={`url(#viper-metal-${side})`} stroke={color} strokeWidth="2" />
      <rect x={criticalShift ? 98 : 102} y="192" width="22" height="4" rx="2" fill={color} opacity={neonOpacity * 0.6}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </rect>

      {/* Scratches on body (neutral+) */}
      {(hpTier === 'neutral' || hpTier === 'hurt' || hpTier === 'critical') && (
        <>
          <line x1="120" y1="25" x2="134" y2="35" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <line x1="60" y1="80" x2="72" y2="88" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        </>
      )}
    </g>
  );
}

// ─── CyberFang SVG (heavy tank bot — green) ──

export function CyberFangSVG({ hpTier, winning, botState, side, color }: { hpTier: HpTier; winning: boolean; botState: string; side: string; color: string }) {
  const criticalShift = hpTier === 'critical';
  const neonOpacity = hpTier === 'fresh' ? 1 : hpTier === 'neutral' ? 0.7 : hpTier === 'hurt' ? 0.35 : 0.15;
  const neonFlicker = hpTier === 'hurt' ? '1;0.3;0.8;0.2;1' : hpTier === 'critical' ? '0.1;0.6;0;0.4;0.1' : '0.7;1;0.7';
  const neonDur = hpTier === 'critical' ? '0.6s' : hpTier === 'hurt' ? '1.2s' : '2s';
  const eyeColor = (botState === 'hurt' || botState === 'critical') ? '#ff4444' : hpTier === 'critical' ? '#ff4444' : hpTier === 'hurt' ? '#ff8844' : color;
  const reactorColor = hpTier === 'critical' ? '#ff2222' : color;
  const reactorPulse = hpTier === 'critical' ? '0.2;0.7;0.2' : '0.5;1;0.5';
  const reactorDur = hpTier === 'critical' ? '0.5s' : '1.8s';

  return (
    <g>
      <defs>
        <linearGradient id={`fang-body-${side}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a3a2e" />
          <stop offset="50%" stopColor="#1a2a1e" />
          <stop offset="100%" stopColor="#0d1a0d" />
        </linearGradient>
        <linearGradient id={`fang-metal-${side}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a4a3a" />
          <stop offset="40%" stopColor="#1a2a1e" />
          <stop offset="60%" stopColor="#2a3a2a" />
          <stop offset="100%" stopColor="#1a2a1e" />
        </linearGradient>
        <filter id={`fang-glow-${side}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={`fang-inner-${side}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id={`fang-reactor-${side}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={reactorColor} stopOpacity="1" />
          <stop offset="50%" stopColor={reactorColor} stopOpacity="0.5" />
          <stop offset="100%" stopColor={reactorColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Drop shadow */}
      <ellipse cx="90" cy="234" rx="56" ry="7" fill="rgba(0,0,0,0.5)" filter={`url(#fang-glow-${side})`} />

      {/* === ANTENNA / RADAR === */}
      <line x1="90" y1="2" x2="90" y2="16" stroke={color} strokeWidth="2" opacity={criticalShift ? 0.5 : 0.8} />
      <circle cx="90" cy="2" r="4" fill="none" stroke={color} strokeWidth="1.5" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </circle>
      <line x1="82" y1="2" x2="98" y2="2" stroke={color} strokeWidth="2" opacity={neonOpacity}>
        <animateTransform attributeName="transform" type="rotate" from="0 90 2" to="360 90 2" dur="3s" repeatCount="indefinite" />
      </line>
      <circle cx="90" cy="2" r="2" fill={color} opacity={neonOpacity} filter={`url(#fang-glow-${side})`}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </circle>

      {/* === HEAD === */}
      <rect x="42" y="16" width="96" height="52" rx="20"
        fill={`url(#fang-body-${side})`} stroke={color} strokeWidth="2"
        filter={hpTier === 'fresh' ? `url(#fang-glow-${side})` : undefined} />
      <rect x="50" y="18" width="80" height="20" rx="14" fill="rgba(255,255,255,0.04)" />
      <rect x="52" y="16" width="76" height="6" rx="3" fill={`url(#fang-metal-${side})`} stroke={color} strokeWidth="1" />

      {/* Eyes */}
      <circle cx="70" cy="42" r="12" fill="rgba(0,0,0,0.7)" stroke={eyeColor} strokeWidth="2" />
      <circle cx="70" cy="42" r="8" fill={eyeColor} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.9;0.1;0.7;0.2' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.7s' : '2s'} repeatCount="indefinite" />
      </circle>
      <circle cx="72" cy="40" r="3" fill="rgba(255,255,255,0.7)" />

      <circle cx="110" cy="42" r="12" fill="rgba(0,0,0,0.7)" stroke={eyeColor} strokeWidth="2" />
      <circle cx="110" cy="42" r="8" fill={eyeColor} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.8;0.3;0.6;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.9s' : '2s'} repeatCount="indefinite" />
      </circle>
      <circle cx="112" cy="40" r="3" fill="rgba(255,255,255,0.7)" />

      {/* Eye glow */}
      {(hpTier === 'fresh' || winning) && (
        <>
          <circle cx="70" cy="42" r="16" fill={eyeColor} opacity="0.15" filter={`url(#fang-inner-${side})`}>
            <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="110" cy="42" r="16" fill={eyeColor} opacity="0.15" filter={`url(#fang-inner-${side})`}>
            <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* Mouth grill */}
      <rect x="65" y="56" width="50" height="8" rx="3" fill="rgba(0,0,0,0.5)" stroke={color} strokeWidth="1" />
      {[0, 1, 2, 3, 4].map(i => (
        <line key={i} x1={72 + i * 9} y1="57" x2={72 + i * 9} y2="63" stroke={color} strokeWidth="1" opacity={neonOpacity * 0.5} />
      ))}

      {/* Head neon accents */}
      <line x1="46" y1="30" x2="46" y2="56" stroke={color} strokeWidth="1.5" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>
      <line x1="134" y1="30" x2="134" y2="56" stroke={color} strokeWidth="1.5" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>

      {/* Head cracks */}
      {(hpTier === 'hurt' || hpTier === 'critical') && (
        <>
          <path d="M 50 22 L 58 34 L 52 46" stroke="rgba(255,100,50,0.35)" strokeWidth="1.5" fill="none" />
          <path d="M 130 26 L 124 38 L 132 50" stroke="rgba(255,100,50,0.3)" strokeWidth="1" fill="none" />
        </>
      )}
      {hpTier === 'critical' && (
        <path d="M 82 18 L 88 30 L 80 42 L 86 52" stroke="rgba(255,80,40,0.45)" strokeWidth="1.5" fill="none" />
      )}

      {/* === NECK === */}
      <rect x="68" y="68" width="44" height="10" rx="3" fill={`url(#fang-metal-${side})`} stroke={color} strokeWidth="1.5" />

      {/* === MASSIVE SHOULDERS === */}
      <polygon points="18,80 58,76 60,104 14,100" fill={`url(#fang-metal-${side})`} stroke={color} strokeWidth="2" />
      <rect x="20" y="82" width="36" height="4" rx="2" fill={color} opacity={neonOpacity * 0.4}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </rect>
      <circle cx="22" cy="90" r="4" fill={`url(#fang-metal-${side})`} stroke={color} strokeWidth="1" />

      <polygon points="162,80 122,76 120,104 166,100" fill={`url(#fang-metal-${side})`} stroke={color} strokeWidth="2" />
      <rect x="124" y="82" width="36" height="4" rx="2" fill={color} opacity={neonOpacity * 0.4}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </rect>
      <circle cx="158" cy="90" r="4" fill={`url(#fang-metal-${side})`} stroke={color} strokeWidth="1" />

      {/* === TORSO === */}
      <rect x="45" y="78" width="90" height="60" rx="8"
        fill={`url(#fang-body-${side})`} stroke={color} strokeWidth="2"
        filter={hpTier === 'fresh' ? `url(#fang-glow-${side})` : undefined} />
      <rect x="52" y="80" width="76" height="24" rx="6" fill="rgba(255,255,255,0.04)" />

      {/* Chest armor plates */}
      <rect x="52" y="84" width="34" height="24" rx="3" fill="rgba(255,255,255,0.03)" stroke={color} strokeWidth="1" opacity="0.5" />
      <rect x="94" y="84" width="34" height="24" rx="3" fill="rgba(255,255,255,0.03)" stroke={color} strokeWidth="1" opacity="0.5" />

      {/* Reactor */}
      <circle cx="90" cy="118" r="8" fill={`url(#fang-reactor-${side})`} filter={`url(#fang-inner-${side})`}>
        <animate attributeName="r" values="7;9;7" dur={reactorDur} repeatCount="indefinite" />
      </circle>
      <circle cx="90" cy="118" r="5" fill={reactorColor} opacity="0.7">
        <animate attributeName="opacity" values={reactorPulse} dur={reactorDur} repeatCount="indefinite" />
      </circle>
      <circle cx="90" cy="118" r="11" fill="none" stroke={reactorColor} strokeWidth="1" opacity="0.2">
        <animate attributeName="r" values="10;14;10" dur={reactorDur} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur={reactorDur} repeatCount="indefinite" />
      </circle>

      {/* Solana emblem */}
      <text x="90" y="100" textAnchor="middle" fill={color} fontSize="14" fontFamily="monospace" fontWeight="bold"
        opacity={hpTier === 'critical' ? 0.2 : 0.6}>◎</text>

      {/* Neon lines on torso */}
      <line x1="50" y1="96" x2="80" y2="96" stroke={color} strokeWidth="1" opacity={neonOpacity * 0.6}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>
      <line x1="100" y1="96" x2="130" y2="96" stroke={color} strokeWidth="1" opacity={neonOpacity * 0.6}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>
      <line x1="50" y1="110" x2="130" y2="110" stroke={color} strokeWidth="0.8" opacity={neonOpacity * 0.4}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>
      <line x1="48" y1="82" x2="48" y2="134" stroke={color} strokeWidth="1.5" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>
      <line x1="132" y1="82" x2="132" y2="134" stroke={color} strokeWidth="1.5" opacity={neonOpacity}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>

      {/* Body cracks */}
      {(hpTier === 'hurt' || hpTier === 'critical') && (
        <>
          <path d="M 50 84 L 60 98 L 52 110" stroke="rgba(255,100,50,0.35)" strokeWidth="1.5" fill="none" />
          <path d="M 130 88 L 122 100 L 128 112" stroke="rgba(255,100,50,0.3)" strokeWidth="1" fill="none" />
        </>
      )}
      {hpTier === 'critical' && (
        <>
          <path d="M 68 80 L 76 96 L 66 110 L 74 126" stroke="rgba(255,80,40,0.45)" strokeWidth="1.5" fill="none" />
          <path d="M 116 82 L 108 98 L 118 112" stroke="rgba(255,80,40,0.4)" strokeWidth="1.5" fill="none" />
          <rect x="136" y="102" width="12" height="16" rx="2" fill="#1a2a1e" stroke={color} strokeWidth="1" opacity="0.5"
            style={{ transform: 'rotate(20deg)', transformOrigin: '136px 102px' }} />
        </>
      )}

      {/* Winning aura */}
      {winning && (
        <circle cx="90" cy="118" r="22" fill="none" stroke={color} strokeWidth="1" opacity="0.3">
          <animate attributeName="r" values="20;28;20" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Reactor glow on sides */}
      <rect x="42" y="86" width="6" height="22" rx="2" fill={reactorColor} opacity={neonOpacity * 0.3}>
        <animate attributeName="opacity" values={reactorPulse} dur={reactorDur} repeatCount="indefinite" />
      </rect>
      <rect x="132" y="86" width="6" height="22" rx="2" fill={reactorColor} opacity={neonOpacity * 0.3}>
        <animate attributeName="opacity" values={reactorPulse} dur={reactorDur} repeatCount="indefinite" />
      </rect>

      {/* === LEGS === */}
      <rect x={criticalShift ? 52 : 50} y="140" width="28" height="40" rx="4"
        fill={`url(#fang-body-${side})`} stroke={color} strokeWidth="2" />
      <rect x={criticalShift ? 54 : 52} y="150" width="24" height="4" rx="2" fill={color} opacity={neonOpacity * 0.4}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </rect>
      <line x1={criticalShift ? 66 : 64} y1="142" x2={criticalShift ? 66 : 64} y2="178" stroke={color} strokeWidth="1" opacity={neonOpacity * 0.6}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>

      <rect x={criticalShift ? 98 : 102} y="140" width="28" height="40" rx="4"
        fill={`url(#fang-body-${side})`} stroke={color} strokeWidth="2" />
      <rect x={criticalShift ? 100 : 104} y="150" width="24" height="4" rx="2" fill={color} opacity={neonOpacity * 0.4}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </rect>
      <line x1={criticalShift ? 112 : 116} y1="142" x2={criticalShift ? 112 : 116} y2="178" stroke={color} strokeWidth="1" opacity={neonOpacity * 0.6}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </line>

      {/* Knee joints */}
      <circle cx={criticalShift ? 66 : 64} cy="162" r="5" fill={`url(#fang-metal-${side})`} stroke={color} strokeWidth="1" />
      <circle cx={criticalShift ? 112 : 116} cy="162" r="5" fill={`url(#fang-metal-${side})`} stroke={color} strokeWidth="1" />

      {/* Leg cracks */}
      {hpTier === 'critical' && (
        <>
          <path d="M 56 148 L 62 158 L 58 168" stroke="rgba(255,80,40,0.35)" strokeWidth="1" fill="none" />
          <path d="M 118 150 L 112 162" stroke="rgba(255,80,40,0.3)" strokeWidth="1" fill="none" />
        </>
      )}

      {/* === FEET === */}
      <rect x={criticalShift ? 44 : 42} y="180" width="38" height="16" rx="5"
        fill={`url(#fang-metal-${side})`} stroke={color} strokeWidth="2" />
      <rect x={criticalShift ? 48 : 46} y="192" width="30" height="4" rx="2" fill={color} opacity={neonOpacity * 0.4}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </rect>

      <rect x={criticalShift ? 96 : 100} y="180" width="38" height="16" rx="5"
        fill={`url(#fang-metal-${side})`} stroke={color} strokeWidth="2" />
      <rect x={criticalShift ? 100 : 104} y="192" width="30" height="4" rx="2" fill={color} opacity={neonOpacity * 0.4}>
        <animate attributeName="opacity" values={neonFlicker} dur={neonDur} repeatCount="indefinite" />
      </rect>

      {/* Surface scratches (neutral+) */}
      {(hpTier === 'neutral' || hpTier === 'hurt' || hpTier === 'critical') && (
        <>
          <line x1="126" y1="22" x2="138" y2="34" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <line x1="56" y1="88" x2="68" y2="96" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        </>
      )}
    </g>
  );
}

// ─── Robot SVG Sprite (with dynamic skins) ──

export function RobotSprite({ bot, side, isShaking, opponentHp, botId, opponentBotId }: { bot: BotState; side: 'left' | 'right'; isShaking: boolean; opponentHp: number; botId?: number; opponentBotId?: number }) {
  const controls = useAnimation();
  const hpTier = getHpTier(bot.hp, bot.maxHp);
  const winning = isWinning(bot.hp, opponentHp, bot.maxHp);

  useEffect(() => {
    if (bot.state === 'attack') {
      controls.start({
        x: side === 'left' ? [0, 40, 0] : [0, -40, 0],
        transition: { duration: 0.3, ease: 'easeOut' },
      });
    } else if (bot.state === 'hurt') {
      controls.start({
        x: side === 'left' ? [0, -15, 0] : [0, 15, 0],
        transition: { duration: 0.2, ease: 'easeOut' },
      });
    } else if (bot.state === 'critical') {
      controls.start({
        x: side === 'left' ? [0, 60, 0] : [0, -60, 0],
        scale: [1, 1.15, 1],
        transition: { duration: 0.4, ease: 'easeOut' },
      });
    }
  }, [bot.state, controls, side]);

  const transform = side === 'right' ? 'scaleX(-1)' : 'scaleX(1)';

  const bodyRotate =
    hpTier === 'critical' ? 8 :
    hpTier === 'hurt' ? 4 : 0;

  const idleDuration =
    hpTier === 'critical' ? 4 :
    hpTier === 'hurt' ? 3 :
    winning ? 1.4 : 2;
  const idleAmplitude =
    hpTier === 'critical' ? 2 :
    hpTier === 'hurt' ? 3 :
    winning ? 7 : 5;

  // Determine which skin to use
  const skinResult = botId !== undefined ? getSkinForBot(botId, opponentBotId) : null;
  const skinIndex = skinResult?.index ?? -1;
  const useImageSprite = skinIndex >= 0 && hasImageSkin(skinIndex);
  const SkinComponent = skinResult && skinResult.skin.Component ? skinResult.skin.Component : null;
  const isViperBot = botId !== undefined ? (skinResult?.index === 0) : (side === 'left');
  const isFangBot = botId !== undefined ? (skinResult?.index === 1) : (side === 'right');

  return (
    <div
      className="relative"
      style={{
        transform,
      }}
    >
    <motion.div
      animate={controls}
      className="relative"
      style={{
        filter: getHpFilters(hpTier),
      }}
    >
      {/* Winner aura */}
      {winning && <WinnerAura color={bot.color} glowColor={bot.glowColor} />}

      {/* Glow under robot */}
      <motion.div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 rounded-full blur-xl"
        style={{ background: bot.glowColor }}
        animate={{
          opacity: hpTier === 'fresh' ? [0.7, 1, 0.7] :
                   hpTier === 'neutral' ? [0.5, 0.7, 0.5] :
                   hpTier === 'hurt' ? [0.2, 0.35, 0.2] :
                   [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Smoke for critical */}
      {hpTier === 'critical' && <SmokeEffect />}

      {/* Sparks for hurt/critical */}
      {(hpTier === 'hurt' || hpTier === 'critical') && (
        <SparkParticles
          color={hpTier === 'critical' ? '#ff6644' : '#ffcc00'}
          intensity={hpTier === 'critical' ? 'high' : 'low'}
        />
      )}

      {/* Critical danger pulse overlay */}
      {hpTier === 'critical' && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none z-10"
          style={{
            background: 'radial-gradient(circle, rgba(255,0,0,0.25) 0%, transparent 70%)',
          }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Robot body container — tilts when damaged */}
      <motion.div
        animate={{
          rotate: bot.state === 'idle' ? bodyRotate : 0,
          ...(hpTier === 'critical' && bot.state === 'idle' ? {
            x: [0, -2, 2, -1, 1, 0],
          } : {}),
        }}
        transition={hpTier === 'critical' ? {
          x: { duration: 0.3, repeat: Infinity, repeatDelay: 0.2 },
          rotate: { duration: 0.5 },
        } : { duration: 0.5 }}
        style={{ originX: '90px', originY: '200px' }}
      >
        {useImageSprite ? (
          /* Image-based sprite — switches PNG by HP tier */
          <motion.div
            animate={
              bot.state === 'idle'
                ? { y: [0, -idleAmplitude, 0] }
                : {}
            }
            transition={
              bot.state === 'idle'
                ? { duration: idleDuration, repeat: Infinity, ease: 'easeInOut' }
                : {}
            }
          >
            <ImageRobotSprite skinIndex={skinIndex} hpTier={hpTier} side={side} />
          </motion.div>
        ) : (
          <motion.svg
            viewBox="0 0 180 240"
            className="drop-shadow-2xl w-[120px] h-[160px] md:w-[180px] md:h-[240px]"
            animate={
              bot.state === 'idle'
                ? { y: [0, -idleAmplitude, 0] }
                : {}
            }
            transition={
              bot.state === 'idle'
                ? { duration: idleDuration, repeat: Infinity, ease: 'easeInOut' }
                : {}
            }
          >
            {SkinComponent ? (
              <SkinComponent hpTier={hpTier} winning={winning} botState={bot.state} side={side} color={bot.color} />
            ) : isViperBot ? (
              <NeonViperSVG hpTier={hpTier} winning={winning} botState={bot.state} side={side} color={bot.color} />
            ) : (
              <CyberFangSVG hpTier={hpTier} winning={winning} botState={bot.state} side={side} color={bot.color} />
            )}
          </motion.svg>
        )}
      </motion.div>

      {/* Hit flash overlay */}
      <AnimatePresence>
        {(bot.state === 'hurt' || bot.state === 'critical') && (
          <motion.div
            className="absolute inset-0 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'radial-gradient(circle, rgba(255,60,60,0.5) 0%, transparent 70%)',
            }}
          />
        )}
        {bot.state === 'attack' && (
          <motion.div
            className="absolute inset-0 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              background: `radial-gradient(circle, ${bot.glowColor} 0%, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  );
}
