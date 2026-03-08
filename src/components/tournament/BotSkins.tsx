'use client';

import type { HpTier } from './BotSprites';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface SkinProps {
  hpTier: HpTier;
  winning: boolean;
  botState: string;
  side: string;
  color: string;
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

function neonVals(hpTier: HpTier) {
  const neonOpacity = hpTier === 'fresh' ? 1 : hpTier === 'neutral' ? 0.7 : hpTier === 'hurt' ? 0.35 : 0.15;
  const neonFlicker = hpTier === 'hurt' ? '1;0.3;0.8;0.2;1' : hpTier === 'critical' ? '0.1;0.6;0;0.4;0.1' : '0.7;1;0.7';
  const neonDur = hpTier === 'critical' ? '0.6s' : hpTier === 'hurt' ? '1.2s' : '2s';
  const eyeColor = hpTier === 'critical' ? '#ff4444' : hpTier === 'hurt' ? '#ff8844' : undefined; // undefined = use color
  const coreColor = hpTier === 'critical' ? '#ff2222' : undefined;
  const corePulse = hpTier === 'critical' ? '0.2;0.8;0.2' : '0.5;1;0.5';
  const coreDur = hpTier === 'critical' ? '0.5s' : '1.5s';
  return { neonOpacity, neonFlicker, neonDur, eyeColor, coreColor, corePulse, coreDur };
}

/** Shared defs block for a skin */
function SkinDefs({ id, color, coreColor }: { id: string; color: string; coreColor: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a2a3e" />
        <stop offset="100%" stopColor="#0d0d1a" />
      </linearGradient>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3a3a5a" />
        <stop offset="100%" stopColor="#1a1a2e" />
      </linearGradient>
      <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <radialGradient id={`${id}-core`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={coreColor} stopOpacity="1" />
        <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** Shadow ellipse under bot */
function Shadow({ id }: { id: string }) {
  return <ellipse cx="90" cy="234" rx="48" ry="6" fill="rgba(0,0,0,0.5)" filter={`url(#${id}-glow)`} />;
}

/** Neon line with flicker */
function NeonLine({ x1, y1, x2, y2, color, n }: { x1: number; y1: number; x2: number; y2: number; color: string; n: ReturnType<typeof neonVals> }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" opacity={n.neonOpacity}>
      <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
    </line>
  );
}

/** Animated neon path */
function NeonPath({ d, color, n, width = 1 }: { d: string; color: string; n: ReturnType<typeof neonVals>; width?: number }) {
  return (
    <path d={d} stroke={color} strokeWidth={width} fill="none" opacity={n.neonOpacity}>
      <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
    </path>
  );
}

/** Core/reactor circle */
function Core({ cx, cy, r, color, n, id }: { cx: number; cy: number; r: number; color: string; n: ReturnType<typeof neonVals>; id: string }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-core)`} filter={`url(#${id}-glow)`}>
        <animate attributeName="r" values={`${r - 1};${r + 1};${r - 1}`} dur={n.coreDur} repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={r * 0.6} fill={color} opacity="0.8">
        <animate attributeName="opacity" values={n.corePulse} dur={n.coreDur} repeatCount="indefinite" />
      </circle>
    </>
  );
}

/** Cracks for hurt/critical */
function Cracks({ hpTier, paths }: { hpTier: HpTier; paths: { d: string; tier: 'hurt' | 'critical' }[] }) {
  return (
    <>
      {paths.map((p, i) => {
        if (p.tier === 'hurt' && (hpTier === 'hurt' || hpTier === 'critical')) {
          return <path key={i} d={p.d} stroke="rgba(255,100,50,0.35)" strokeWidth="1.5" fill="none" />;
        }
        if (p.tier === 'critical' && hpTier === 'critical') {
          return <path key={i} d={p.d} stroke="rgba(255,80,40,0.45)" strokeWidth="1.5" fill="none" />;
        }
        return null;
      })}
    </>
  );
}

/** Standard legs */
function Legs({ id, color, n, hpTier }: { id: string; color: string; n: ReturnType<typeof neonVals>; hpTier: HpTier }) {
  const s = hpTier === 'critical' ? 2 : 0;
  return (
    <>
      <rect x={58 + s} y="140" width="22" height="38" rx="3" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1.5" />
      <NeonLine x1={69 + s} y1={142} x2={69 + s} y2={176} color={color} n={n} />
      <rect x={100 - s} y="140" width="22" height="38" rx="3" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1.5" />
      <NeonLine x1={111 - s} y1={142} x2={111 - s} y2={176} color={color} n={n} />
    </>
  );
}

/** Standard feet */
function Feet({ id, color, n, hpTier }: { id: string; color: string; n: ReturnType<typeof neonVals>; hpTier: HpTier }) {
  const s = hpTier === 'critical' ? 2 : 0;
  return (
    <>
      <rect x={50 + s} y="178" width="32" height="14" rx="4" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" />
      <rect x={54 + s} y="188" width="24" height="3" rx="1.5" fill={color} opacity={n.neonOpacity * 0.6}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </rect>
      <rect x={98 - s} y="178" width="32" height="14" rx="4" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" />
      <rect x={102 - s} y="188" width="24" height="3" rx="1.5" fill={color} opacity={n.neonOpacity * 0.6}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </rect>
    </>
  );
}

// ─── SKIN 1: NeonViper (imported from BotSprites — use original) ──────────────
// Already in BotSprites.tsx, we just reference it

// ─── SKIN 2: CyberFang (imported from BotSprites — use original) ──────────────
// Already in BotSprites.tsx, we just reference it

// ─── SKIN 3: ShadowNinja — thin, hooded, triangular head ─────────────────────

function ShadowNinjaSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `ninja-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Hood / triangular head */}
      <polygon points="90,8 130,55 50,55" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      <polygon points="90,12 125,50 55,50" fill="rgba(0,0,0,0.3)" />
      {/* Single slit eye */}
      <rect x="72" y="36" width="36" height="6" rx="3" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <rect x="78" y="38" width="24" height="2" rx="1" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.8;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </rect>
      {/* Thin neck */}
      <rect x="82" y="55" width="16" height="8" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Narrow torso with cape hints */}
      <polygon points="62,63 118,63 114,138 66,138" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Scarf / cape tails */}
      <path d="M 62,63 L 42,80 L 38,120 L 46,118" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1" opacity="0.7" />
      <path d="M 118,63 L 138,80 L 142,120 L 134,118" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1" opacity="0.7" />
      {/* Neon lines */}
      <NeonLine x1={66} y1={70} x2={66} y2={130} color={color} n={n} />
      <NeonLine x1={114} y1={70} x2={114} y2={130} color={color} n={n} />
      <NeonPath d="M 72,90 L 90,96 L 108,90" color={color} n={n} />
      {/* Core */}
      <Core cx={90} cy={100} r={8} color={cc} n={n} id={id} />
      {/* Shuriken emblem */}
      <path d="M 90,82 L 94,86 L 90,90 L 86,86 Z" fill={color} opacity={hpTier === 'critical' ? 0.2 : 0.6} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 56 30 L 64 40 L 58 50', tier: 'hurt' },
        { d: 'M 80 10 L 86 24 L 78 36', tier: 'critical' },
        { d: 'M 70 68 L 78 82 L 72 96', tier: 'critical' },
      ]} />
      {/* Legs - thin */}
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 4: IronGolem — square, massive, no neck ─────────────────────────────

function IronGolemSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `golem-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Massive square head directly on body */}
      <rect x="38" y="10" width="104" height="54" rx="4" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2.5" />
      {/* Two small rectangular eyes */}
      <rect x="52" y="28" width="24" height="12" rx="2" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1.5" />
      <rect x="56" y="32" width="16" height="4" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.9;0.2' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.7s' : '2s'} repeatCount="indefinite" />
      </rect>
      <rect x="104" y="28" width="24" height="12" rx="2" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1.5" />
      <rect x="108" y="32" width="16" height="4" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.8;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.8s' : '2s'} repeatCount="indefinite" />
      </rect>
      {/* Jaw plate */}
      <rect x="56" y="48" width="68" height="8" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Huge shoulders */}
      <rect x="20" y="64" width="40" height="32" rx="4" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
      <rect x="120" y="64" width="40" height="32" rx="4" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
      {/* Wide torso */}
      <rect x="38" y="64" width="104" height="74" rx="6" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Neon lines */}
      <NeonLine x1={42} y1={72} x2={42} y2={134} color={color} n={n} />
      <NeonLine x1={138} y1={72} x2={138} y2={134} color={color} n={n} />
      <NeonLine x1={42} y1={100} x2={138} y2={100} color={color} n={n} />
      {/* Core */}
      <Core cx={90} cy={108} r={12} color={cc} n={n} id={id} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 44 18 L 54 32 L 46 44', tier: 'hurt' },
        { d: 'M 130 22 L 122 36 L 128 48', tier: 'hurt' },
        { d: 'M 60 66 L 70 84 L 62 100', tier: 'critical' },
      ]} />
      {/* Thick legs */}
      <rect x={54} y="138" width="28" height="40" rx="4" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      <rect x={98} y="138" width="28" height="40" rx="4" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      <NeonLine x1={68} y1={140} x2={68} y2={176} color={color} n={n} />
      <NeonLine x1={112} y1={140} x2={112} y2={176} color={color} n={n} />
      {/* Big feet */}
      <rect x={46} y="178" width="38" height="16" rx="5" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
      <rect x={96} y="178" width="38" height="16" rx="5" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
    </g>
  );
}

// ─── SKIN 5: LaserHawk — wings/fins, bird-like head ───────────────────────────

function LaserHawkSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `hawk-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Bird-like angular head with beak */}
      <polygon points="90,6 128,30 124,58 56,58 52,30" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Beak / visor point */}
      <polygon points="84,40 96,40 90,54" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Angular eyes */}
      <polygon points="60,28 78,28 76,38 62,38" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <polygon points="64,30 74,30 73,36 65,36" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.9;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </polygon>
      <polygon points="102,28 120,28 118,38 104,38" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <polygon points="106,30 116,30 115,36 107,36" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.8;0.2' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.7s' : '2s'} repeatCount="indefinite" />
      </polygon>
      {/* Neck */}
      <rect x="78" y="58" width="24" height="8" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Torso */}
      <polygon points="56,66 124,66 118,138 62,138" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Wing fins */}
      <polygon points="56,70 20,58 24,100 56,96" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" opacity="0.8" />
      <polygon points="124,70 160,58 156,100 124,96" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" opacity="0.8" />
      <NeonPath d="M 24,68 L 54,78" color={color} n={n} />
      <NeonPath d="M 156,68 L 126,78" color={color} n={n} />
      {/* Core */}
      <Core cx={90} cy={100} r={9} color={cc} n={n} id={id} />
      {/* Neon lines */}
      <NeonLine x1={62} y1={72} x2={62} y2={132} color={color} n={n} />
      <NeonLine x1={118} y1={72} x2={118} y2={132} color={color} n={n} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 58 24 L 66 36 L 60 48', tier: 'hurt' },
        { d: 'M 68 70 L 76 86 L 68 100', tier: 'critical' },
      ]} />
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 6: TechSamurai — helmet crest, angular ─────────────────────────────

function TechSamuraiSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `samurai-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Samurai crest */}
      <polygon points="90,2 78,18 102,18" fill={color} opacity={n.neonOpacity}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </polygon>
      <polygon points="90,4 82,16 98,16" fill={`url(#${id}-metal)`} />
      {/* Helmet */}
      <path d="M 46,20 L 134,20 L 130,36 L 128,56 L 52,56 L 50,36 Z" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Side flaps */}
      <polygon points="46,20 36,30 40,52 52,48" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      <polygon points="134,20 144,30 140,52 128,48" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Visor slit */}
      <rect x="58" y="34" width="64" height="8" rx="2" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <rect x="62" y="36" width="56" height="4" rx="1" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.7;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </rect>
      {/* Face guard */}
      <rect x="62" y="46" width="56" height="8" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Neck */}
      <rect x="76" y="56" width="28" height="10" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Shoulder armor (layered plates) */}
      <polygon points="28,68 60,66 58,96 24,92" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
      <polygon points="152,68 120,66 122,96 156,92" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
      {/* Torso with samurai skirt */}
      <polygon points="58,66 122,66 118,132 62,132" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Waist skirt plates */}
      <polygon points="56,126 124,126 130,142 50,142" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      <NeonLine x1={62} y1={72} x2={62} y2={126} color={color} n={n} />
      <NeonLine x1={118} y1={72} x2={118} y2={126} color={color} n={n} />
      {/* Core */}
      <Core cx={90} cy={98} r={9} color={cc} n={n} id={id} />
      {/* Kanji emblem */}
      <text x="90" y="86" textAnchor="middle" fill={color} fontSize="10" fontFamily="serif" opacity={hpTier === 'critical' ? 0.2 : 0.5}>武</text>
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 52 26 L 60 38 L 54 48', tier: 'hurt' },
        { d: 'M 80 4 L 86 18 L 78 32', tier: 'critical' },
      ]} />
      {/* Legs under skirt */}
      <rect x={60} y="142" width="22" height="36" rx="3" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1.5" />
      <rect x={98} y="142" width="22" height="36" rx="3" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1.5" />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 7: CrystalMage — crystals for shoulders ────────────────────────────

function CrystalMageSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `crystal-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Pointed head with crystal crown */}
      <polygon points="90,8 120,24 126,52 54,52 60,24" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Crystal spikes on head */}
      <polygon points="64,18 58,4 70,18" fill={color} opacity={n.neonOpacity * 0.7} />
      <polygon points="116,18 122,4 110,18" fill={color} opacity={n.neonOpacity * 0.7} />
      <polygon points="88,14 90,0 92,14" fill={color} opacity={n.neonOpacity * 0.5} />
      {/* Diamond eyes */}
      <polygon points="72,32 80,28 88,32 80,36" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.9;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </polygon>
      <polygon points="92,32 100,28 108,32 100,36" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.8;0.2' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.7s' : '2s'} repeatCount="indefinite" />
      </polygon>
      {/* Neck */}
      <rect x="80" y="52" width="20" height="8" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Crystal shoulders */}
      <polygon points="50,62 28,52 22,80 42,84 54,76" fill={color} opacity={n.neonOpacity * 0.4} stroke={color} strokeWidth="1.5" />
      <polygon points="130,62 152,52 158,80 138,84 126,76" fill={color} opacity={n.neonOpacity * 0.4} stroke={color} strokeWidth="1.5" />
      {/* Torso */}
      <polygon points="54,60 126,60 120,136 60,136" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Floating crystals around core */}
      <polygon points="76,92 72,80 80,92" fill={color} opacity={n.neonOpacity * 0.6}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </polygon>
      <polygon points="104,92 108,80 100,92" fill={color} opacity={n.neonOpacity * 0.6}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </polygon>
      {/* Core (big, magical) */}
      <Core cx={90} cy={98} r={11} color={cc} n={n} id={id} />
      {/* Neon */}
      <NeonPath d="M 60,66 L 60,130" color={color} n={n} />
      <NeonPath d="M 120,66 L 120,130" color={color} n={n} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 56 28 L 66 40 L 58 50', tier: 'hurt' },
        { d: 'M 68 64 L 76 80 L 68 96', tier: 'critical' },
      ]} />
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 8: StormTrooper — rounded helmet, mask ──────────────────────────────

function StormTrooperSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `trooper-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Rounded dome helmet */}
      <ellipse cx="90" cy="34" rx="44" ry="30" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      <ellipse cx="90" cy="28" rx="38" ry="16" fill="rgba(255,255,255,0.04)" />
      {/* T-shaped visor */}
      <path d="M 62,28 L 118,28 L 116,34 L 96,34 L 96,48 L 84,48 L 84,34 L 64,34 Z" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1.5" />
      <path d="M 66,30 L 82,30 L 82,32 L 66,32 Z" fill={ec} opacity="0.8">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.8;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.7s' : '2s'} repeatCount="indefinite" />
      </path>
      <path d="M 98,30 L 114,30 L 114,32 L 98,32 Z" fill={ec} opacity="0.8">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.7;0.2' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.8s' : '2s'} repeatCount="indefinite" />
      </path>
      {/* Neck */}
      <rect x="76" y="60" width="28" height="8" rx="3" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Rounded shoulders */}
      <ellipse cx="38" cy="80" rx="20" ry="14" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" />
      <ellipse cx="142" cy="80" rx="20" ry="14" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" />
      {/* Chest armor */}
      <rect x="50" y="68" width="80" height="68" rx="10" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Armor plates */}
      <rect x="56" y="74" width="32" height="20" rx="3" fill="rgba(255,255,255,0.03)" stroke={color} strokeWidth="0.8" opacity="0.5" />
      <rect x="92" y="74" width="32" height="20" rx="3" fill="rgba(255,255,255,0.03)" stroke={color} strokeWidth="0.8" opacity="0.5" />
      {/* Core */}
      <Core cx={90} cy={112} r={9} color={cc} n={n} id={id} />
      {/* Neon */}
      <NeonLine x1={54} y1={72} x2={54} y2={132} color={color} n={n} />
      <NeonLine x1={126} y1={72} x2={126} y2={132} color={color} n={n} />
      <NeonPath d="M 62,100 L 90,106 L 118,100" color={color} n={n} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 56 18 L 64 30 L 58 42', tier: 'hurt' },
        { d: 'M 60 72 L 68 88 L 62 104', tier: 'critical' },
      ]} />
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 9: PhantomWraith — ghostly, with cape ──────────────────────────────

function PhantomWraithSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `wraith-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Floating ghostly head — no neck, hovers */}
      <ellipse cx="90" cy="30" rx="32" ry="26" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" opacity="0.9" />
      {/* Hollow eyes */}
      <ellipse cx="76" cy="30" rx="8" ry="10" fill="rgba(0,0,0,0.8)" stroke={ec} strokeWidth="1" />
      <circle cx="76" cy="30" r="4" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.9;0' : '0.6;1;0.6'} dur={hpTier === 'critical' ? '0.5s' : '2.5s'} repeatCount="indefinite" />
      </circle>
      <ellipse cx="104" cy="30" rx="8" ry="10" fill="rgba(0,0,0,0.8)" stroke={ec} strokeWidth="1" />
      <circle cx="104" cy="30" r="4" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0;0.8;0.1' : '0.6;1;0.6'} dur={hpTier === 'critical' ? '0.6s' : '2.5s'} repeatCount="indefinite" />
      </circle>
      {/* Ghostly mouth */}
      <path d="M 80,42 Q 90,50 100,42" fill="none" stroke={ec} strokeWidth="1" opacity="0.4" />
      {/* Cape/cloak body — flowing shape */}
      <path d="M 48,56 Q 44,58 40,100 Q 36,140 50,180 L 70,178 Q 64,140 66,100 L 90,90 L 114,100 Q 116,140 110,178 L 130,180 Q 144,140 140,100 Q 136,58 132,56 Z"
        fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" opacity="0.85" />
      {/* Inner cloak glow */}
      <path d="M 56,64 Q 52,100 58,140 L 90,132 L 122,140 Q 128,100 124,64 Z"
        fill="rgba(0,0,0,0.3)" />
      {/* Core — floating in the cloak */}
      <Core cx={90} cy={100} r={10} color={cc} n={n} id={id} />
      {/* Ghost chains / neon wisps */}
      <NeonPath d="M 56,68 Q 48,90 54,120" color={color} n={n} />
      <NeonPath d="M 124,68 Q 132,90 126,120" color={color} n={n} />
      <NeonPath d="M 70,130 Q 90,140 110,130" color={color} n={n} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 66 16 L 74 28 L 68 40', tier: 'hurt' },
        { d: 'M 56 64 L 64 80 L 56 96', tier: 'critical' },
      ]} />
      {/* Wispy feet (no real legs) */}
      <path d="M 50,178 Q 60,188 70,180 Q 74,192 70,196" fill="none" stroke={color} strokeWidth="1.5" opacity={n.neonOpacity * 0.5} />
      <path d="M 130,178 Q 120,188 110,180 Q 106,192 110,196" fill="none" stroke={color} strokeWidth="1.5" opacity={n.neonOpacity * 0.5} />
    </g>
  );
}

// ─── SKIN 10: MechSpider — wide, 4 visible limbs ─────────────────────────────

function MechSpiderSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `spider-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Small round head with multiple eyes */}
      <circle cx="90" cy="28" r="22" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* 4 eyes cluster */}
      <circle cx="80" cy="22" r="5" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <circle cx="80" cy="22" r="3" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.8;0' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.5s' : '2s'} repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="22" r="5" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <circle cx="100" cy="22" r="3" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0;0.7;0.2' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </circle>
      <circle cx="86" cy="34" r="3" fill={ec} opacity="0.6" />
      <circle cx="94" cy="34" r="3" fill={ec} opacity="0.6" />
      {/* Short neck */}
      <rect x="82" y="50" width="16" height="6" rx="2" fill={`url(#${id}-metal)`} />
      {/* Wide oval body */}
      <ellipse cx="90" cy="90" rx="52" ry="34" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Spider legs — 4 pairs bending outward */}
      <path d="M 42,76 L 18,56 L 8,80" stroke={color} strokeWidth="2.5" fill="none" />
      <path d="M 138,76 L 162,56 L 172,80" stroke={color} strokeWidth="2.5" fill="none" />
      <path d="M 42,100 L 14,112 L 6,140" stroke={color} strokeWidth="2.5" fill="none" />
      <path d="M 138,100 L 166,112 L 174,140" stroke={color} strokeWidth="2.5" fill="none" />
      {/* Neon on legs */}
      <NeonPath d="M 42,76 L 18,56" color={color} n={n} />
      <NeonPath d="M 138,76 L 162,56" color={color} n={n} />
      {/* Core */}
      <Core cx={90} cy={90} r={10} color={cc} n={n} id={id} />
      {/* Neon ring on body */}
      <ellipse cx="90" cy="90" rx="38" ry="22" fill="none" stroke={color} strokeWidth="0.8" opacity={n.neonOpacity * 0.5}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </ellipse>
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 56 66 L 66 80 L 58 92', tier: 'hurt' },
        { d: 'M 100 68 L 108 82 L 100 96', tier: 'critical' },
      ]} />
      {/* Shorter legs (ground contact) */}
      <rect x={62} y="122" width="18" height="56" rx="3" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1.5" />
      <rect x={100} y="122" width="18" height="56" rx="3" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1.5" />
      {/* Feet */}
      <rect x={56} y="178" width="30" height="12" rx="4" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" />
      <rect x={94} y="178" width="30" height="12" rx="4" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" />
    </g>
  );
}

// ─── SKIN 11: DragonMech — wing inserts, horns ───────────────────────────────

function DragonMechSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `dragon-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Dragon horns */}
      <path d="M 58,20 Q 44,4 40,0" stroke={color} strokeWidth="2.5" fill="none" opacity={n.neonOpacity} />
      <path d="M 122,20 Q 136,4 140,0" stroke={color} strokeWidth="2.5" fill="none" opacity={n.neonOpacity} />
      {/* Head — angular dragon snout */}
      <polygon points="58,16 122,16 130,34 128,56 52,56 50,34" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Slitted eyes */}
      <ellipse cx="72" cy="34" rx="10" ry="6" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <ellipse cx="72" cy="34" rx="3" ry="6" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.9;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="108" cy="34" rx="10" ry="6" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <ellipse cx="108" cy="34" rx="3" ry="6" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.8;0.2' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.7s' : '2s'} repeatCount="indefinite" />
      </ellipse>
      {/* Snout ridge */}
      <path d="M 80,44 L 90,52 L 100,44" fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
      {/* Neck */}
      <rect x="76" y="56" width="28" height="10" rx="3" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Wings */}
      <polygon points="50,70 16,48 10,90 38,96 50,88" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" opacity="0.7" />
      <polygon points="130,70 164,48 170,90 142,96 130,88" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" opacity="0.7" />
      <NeonPath d="M 16,56 L 44,80" color={color} n={n} />
      <NeonPath d="M 164,56 L 136,80" color={color} n={n} />
      {/* Torso */}
      <polygon points="50,66 130,66 124,136 56,136" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Scale pattern neon */}
      <NeonPath d="M 60,80 L 90,86 L 120,80" color={color} n={n} />
      <NeonPath d="M 62,100 L 90,106 L 118,100" color={color} n={n} />
      {/* Dragon core — fiery */}
      <Core cx={90} cy={110} r={10} color={cc} n={n} id={id} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 54 22 L 62 36 L 56 48', tier: 'hurt' },
        { d: 'M 66 70 L 74 88 L 66 104', tier: 'critical' },
      ]} />
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 12: ArcticFrost — icy crystals, angular ────────────────────────────

function ArcticFrostSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `frost-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Angular icy head */}
      <polygon points="90,8 126,22 132,48 120,58 60,58 48,48 54,22" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Ice spike on top */}
      <polygon points="86,8 90,-4 94,8" fill={color} opacity={n.neonOpacity * 0.6} />
      {/* Hexagonal eyes */}
      <polygon points="68,30 76,26 82,30 82,38 76,42 68,38" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <polygon points="74,32 78,30 80,34 78,36 74,36 72,34" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.8;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </polygon>
      <polygon points="98,30 106,26 112,30 112,38 106,42 98,38" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <polygon points="104,32 108,30 110,34 108,36 104,36 102,34" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.7;0.2' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.7s' : '2s'} repeatCount="indefinite" />
      </polygon>
      {/* Neck */}
      <rect x="78" y="58" width="24" height="8" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Ice crystal shoulders */}
      <polygon points="48,66 26,56 20,82 44,86" fill={color} opacity={n.neonOpacity * 0.3} stroke={color} strokeWidth="1.5" />
      <polygon points="132,66 154,56 160,82 136,86" fill={color} opacity={n.neonOpacity * 0.3} stroke={color} strokeWidth="1.5" />
      {/* Angular torso */}
      <polygon points="48,66 132,66 126,136 54,136" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Frost pattern neon */}
      <NeonPath d="M 54,74 L 66,80 L 60,90 L 72,96" color={color} n={n} />
      <NeonPath d="M 126,74 L 114,80 L 120,90 L 108,96" color={color} n={n} />
      {/* Snowflake emblem */}
      <NeonPath d="M 90,82 L 90,92" color={color} n={n} />
      <NeonPath d="M 85,87 L 95,87" color={color} n={n} />
      <NeonPath d="M 86,83 L 94,91" color={color} n={n} />
      <NeonPath d="M 94,83 L 86,91" color={color} n={n} />
      {/* Core — icy blue */}
      <Core cx={90} cy={110} r={9} color={cc} n={n} id={id} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 52 20 L 60 34 L 54 46', tier: 'hurt' },
        { d: 'M 60 68 L 68 84 L 60 100', tier: 'critical' },
      ]} />
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 13: VolcanicCore — massive, lava cracks ────────────────────────────

function VolcanicCoreSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `volcanic-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Wide, flat head with vents */}
      <rect x="40" y="14" width="100" height="48" rx="8" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2.5" />
      {/* Smoke vents on top */}
      <rect x="56" y="10" width="8" height="8" rx="1" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      <rect x="116" y="10" width="8" height="8" rx="1" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Angry slit eyes */}
      <path d="M 54,32 L 78,28 L 78,38 L 54,42 Z" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1.5" />
      <path d="M 58,34 L 74,31 L 74,36 L 58,38 Z" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.9;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </path>
      <path d="M 126,32 L 102,28 L 102,38 L 126,42 Z" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1.5" />
      <path d="M 122,34 L 106,31 L 106,36 L 122,38 Z" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.8;0.2' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.7s' : '2s'} repeatCount="indefinite" />
      </path>
      {/* No neck — head sits on body */}
      {/* Massive torso */}
      <rect x="34" y="62" width="112" height="76" rx="8" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2.5" />
      {/* Lava crack lines (always present, brighter at lower HP) */}
      <path d="M 42,70 L 52,86 L 44,100 L 56,118" stroke={color} strokeWidth="1.5" fill="none" opacity={n.neonOpacity}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </path>
      <path d="M 138,72 L 128,88 L 136,104 L 124,120" stroke={color} strokeWidth="1.5" fill="none" opacity={n.neonOpacity}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </path>
      <path d="M 70,64 L 78,80 L 68,96" stroke={color} strokeWidth="1" fill="none" opacity={n.neonOpacity * 0.6}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </path>
      {/* Big core — lava reactor */}
      <Core cx={90} cy={100} r={14} color={cc} n={n} id={id} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 48 22 L 56 34 L 48 46', tier: 'hurt' },
        { d: 'M 80 16 L 86 30 L 78 44', tier: 'critical' },
      ]} />
      {/* Thick legs */}
      <rect x={52} y="138" width="28" height="40" rx="5" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      <rect x={100} y="138" width="28" height="40" rx="5" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Big stompy feet */}
      <rect x={44} y="178" width="40" height="16" rx="5" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
      <rect x={96} y="178" width="40" height="16" rx="5" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
    </g>
  );
}

// ─── SKIN 14: NeonRacer — streamlined, visor, fast ───────────────────────────

function NeonRacerSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `racer-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Aerodynamic head with visor */}
      <path d="M 56,14 Q 90,4 124,14 L 128,36 Q 90,42 52,36 Z" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Speed visor — full-width */}
      <path d="M 56,24 Q 90,18 124,24 L 122,34 Q 90,38 58,34 Z" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <path d="M 60,26 Q 90,22 120,26 L 119,32 Q 90,35 61,32 Z" fill={ec} opacity="0.6">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.7;0.1' : '0.5;0.9;0.5'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </path>
      {/* Chin spoiler */}
      <polygon points="64,36 116,36 112,46 68,46" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Thin neck */}
      <rect x="80" y="46" width="20" height="8" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Sleek torso — tapered */}
      <polygon points="52,54 128,54 118,136 62,136" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Speed stripes */}
      <NeonLine x1={58} y1={60} x2={58} y2={130} color={color} n={n} />
      <NeonLine x1={122} y1={60} x2={122} y2={130} color={color} n={n} />
      <NeonLine x1={66} y1={62} x2={66} y2={128} color={color} n={n} />
      <NeonLine x1={114} y1={62} x2={114} y2={128} color={color} n={n} />
      {/* Air intakes */}
      <rect x="48" y="70" width="10" height="20" rx="3" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      <rect x="122" y="70" width="10" height="20" rx="3" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Core */}
      <Core cx={90} cy={96} r={8} color={cc} n={n} id={id} />
      {/* Racing number */}
      <text x="90" y="122" textAnchor="middle" fill={color} fontSize="12" fontFamily="monospace" fontWeight="bold" opacity={hpTier === 'critical' ? 0.2 : 0.5}>01</text>
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 60 18 L 68 28 L 62 36', tier: 'hurt' },
        { d: 'M 66 58 L 74 74 L 66 90', tier: 'critical' },
      ]} />
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 15: BioHazard — organic shapes, biohazard symbol ───────────────────

function BioHazardSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `bio-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Organic blob-like head */}
      <ellipse cx="90" cy="32" rx="36" ry="26" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Bumps/tendrils on top */}
      <circle cx="72" cy="10" r="6" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1" />
      <circle cx="108" cy="10" r="6" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1" />
      <circle cx="90" cy="6" r="5" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1" />
      {/* Compound eyes */}
      <circle cx="76" cy="30" r="8" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1.5" />
      <circle cx="76" cy="30" r="4" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.9;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </circle>
      <circle cx="104" cy="30" r="8" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1.5" />
      <circle cx="104" cy="30" r="4" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.8;0.2' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.7s' : '2s'} repeatCount="indefinite" />
      </circle>
      {/* Neck */}
      <rect x="78" y="56" width="24" height="8" rx="4" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Organic torso — curved */}
      <ellipse cx="90" cy="100" rx="46" ry="38" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Organic shoulder bumps */}
      <circle cx="42" cy="84" r="14" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1.5" />
      <circle cx="138" cy="84" r="14" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1.5" />
      {/* Biohazard symbol on chest */}
      <circle cx="90" cy="92" r="12" fill="none" stroke={color} strokeWidth="1.5" opacity={n.neonOpacity * 0.6}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </circle>
      <path d="M 90,80 Q 96,86 90,92 Q 84,86 90,80" fill={color} opacity={n.neonOpacity * 0.4} />
      <path d="M 80,98 Q 86,92 90,98 Q 84,104 80,98" fill={color} opacity={n.neonOpacity * 0.4} />
      <path d="M 100,98 Q 94,92 90,98 Q 96,104 100,98" fill={color} opacity={n.neonOpacity * 0.4} />
      {/* Core */}
      <Core cx={90} cy={112} r={8} color={cc} n={n} id={id} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 60 16 L 68 28 L 62 40', tier: 'hurt' },
        { d: 'M 54 72 L 62 88 L 54 104', tier: 'critical' },
      ]} />
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 16: ThunderBolt — angular, lightning motif ─────────────────────────

function ThunderBoltSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `thunder-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Sharp angular head — lightning bolt shaped */}
      <polygon points="90,6 130,18 136,44 124,56 56,56 44,44 50,18" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Lightning bolt antennae */}
      <path d="M 56,16 L 48,6 L 52,12 L 44,2" stroke={color} strokeWidth="2" fill="none" opacity={n.neonOpacity}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </path>
      <path d="M 124,16 L 132,6 L 128,12 L 136,2" stroke={color} strokeWidth="2" fill="none" opacity={n.neonOpacity}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </path>
      {/* Sharp zigzag eyes */}
      <path d="M 62,30 L 72,26 L 82,30 L 72,34 Z" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.9;0.1' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.5s' : '2s'} repeatCount="indefinite" />
      </path>
      <path d="M 98,30 L 108,26 L 118,30 L 108,34 Z" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.8;0.2' : '0.6;1;0.6'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </path>
      {/* Neck */}
      <rect x="78" y="56" width="24" height="8" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Angular shoulders */}
      <polygon points="42,66 24,62 20,84 44,88" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" />
      <polygon points="138,66 156,62 160,84 136,88" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" />
      {/* Torso — angular */}
      <polygon points="48,64 132,64 126,136 54,136" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Lightning bolt emblem on chest */}
      <path d="M 84,76 L 92,76 L 88,88 L 96,88 L 82,108 L 86,96 L 80,96 Z" fill={color} opacity={hpTier === 'critical' ? 0.2 : 0.7}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </path>
      {/* Electric arcs */}
      <NeonPath d="M 52,72 L 56,80 L 48,88 L 56,96" color={color} n={n} />
      <NeonPath d="M 128,72 L 124,80 L 132,88 L 124,96" color={color} n={n} />
      {/* Core */}
      <Core cx={90} cy={116} r={8} color={cc} n={n} id={id} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 50 22 L 58 34 L 52 46', tier: 'hurt' },
        { d: 'M 62 68 L 70 84 L 62 100', tier: 'critical' },
      ]} />
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 17: GravityWell — sphere center, magnetic lines ────────────────────

function GravityWellSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `gravity-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Compact round head */}
      <circle cx="90" cy="28" r="22" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Single cyclopean visor */}
      <rect x="68" y="22" width="44" height="10" rx="5" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <rect x="74" y="24" width="32" height="6" rx="3" fill={ec} opacity="0.8">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.8;0.1' : '0.6;1;0.6'} dur={hpTier === 'critical' ? '0.6s' : '2s'} repeatCount="indefinite" />
      </rect>
      {/* Neck */}
      <rect x="82" y="50" width="16" height="8" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Body — frame/ring structure */}
      <rect x="46" y="58" width="88" height="80" rx="6" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Central gravity sphere */}
      <circle cx="90" cy="98" r="22" fill="rgba(0,0,0,0.6)" stroke={cc} strokeWidth="2" />
      <circle cx="90" cy="98" r="16" fill={`url(#${id}-core)`} filter={`url(#${id}-glow)`}>
        <animate attributeName="r" values="14;18;14" dur={n.coreDur} repeatCount="indefinite" />
      </circle>
      <circle cx="90" cy="98" r="10" fill={cc} opacity="0.7">
        <animate attributeName="opacity" values={n.corePulse} dur={n.coreDur} repeatCount="indefinite" />
      </circle>
      {/* Magnetic field lines */}
      <ellipse cx="90" cy="98" rx="34" ry="18" fill="none" stroke={color} strokeWidth="0.8" opacity={n.neonOpacity * 0.4}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="rotate" from="0 90 98" to="360 90 98" dur="6s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="90" cy="98" rx="18" ry="34" fill="none" stroke={color} strokeWidth="0.8" opacity={n.neonOpacity * 0.4}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="rotate" from="0 90 98" to="-360 90 98" dur="8s" repeatCount="indefinite" />
      </ellipse>
      {/* Side magnets */}
      <rect x="36" y="82" width="12" height="28" rx="3" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      <rect x="132" y="82" width="12" height="28" rx="3" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 72 14 L 78 26 L 72 38', tier: 'hurt' },
        { d: 'M 52 62 L 60 78 L 52 94', tier: 'critical' },
      ]} />
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 18: QuantumShift — glitch effects, double contour ──────────────────

function QuantumShiftSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `quantum-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Head — with glitch offset copy */}
      <rect x="56" y="12" width="68" height="46" rx="8" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Glitch double — offset slightly */}
      <rect x="59" y="10" width="68" height="46" rx="8" fill="none" stroke={color} strokeWidth="1" opacity={n.neonOpacity * 0.3}>
        <animate attributeName="x" values="59;62;57;59" dur="0.4s" repeatCount="indefinite" />
      </rect>
      {/* Square digital eyes */}
      <rect x="64" y="26" width="14" height="14" rx="2" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <rect x="68" y="30" width="6" height="6" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.9;0;0.6' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.4s' : '2s'} repeatCount="indefinite" />
      </rect>
      <rect x="102" y="26" width="14" height="14" rx="2" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1" />
      <rect x="106" y="30" width="6" height="6" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0;0.8;0.2;0.7' : '0.7;1;0.7'} dur={hpTier === 'critical' ? '0.5s' : '2s'} repeatCount="indefinite" />
      </rect>
      {/* Mouth — digital display */}
      <rect x="74" y="46" width="32" height="6" rx="1" fill="rgba(0,0,0,0.5)" stroke={color} strokeWidth="0.8" />
      {/* Neck */}
      <rect x="80" y="58" width="20" height="8" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Body — with glitch double */}
      <rect x="50" y="66" width="80" height="72" rx="6" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      <rect x="53" y="64" width="80" height="72" rx="6" fill="none" stroke={color} strokeWidth="1" opacity={n.neonOpacity * 0.25}>
        <animate attributeName="x" values="53;56;50;53" dur="0.5s" repeatCount="indefinite" />
      </rect>
      {/* Glitch scan lines */}
      {[76, 88, 100, 112, 124].map((y, i) => (
        <rect key={i} x="52" y={y} width="76" height="1" fill={color} opacity={n.neonOpacity * 0.2}>
          <animate attributeName="opacity" values={`${0.1 + i * 0.05};${0.3 + i * 0.05};${0.1 + i * 0.05}`} dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
        </rect>
      ))}
      {/* Shoulders */}
      <rect x="36" y="70" width="16" height="24" rx="3" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" />
      <rect x="128" y="70" width="16" height="24" rx="3" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" />
      {/* Core */}
      <Core cx={90} cy={102} r={9} color={cc} n={n} id={id} />
      {/* Neon */}
      <NeonLine x1={54} y1={70} x2={54} y2={134} color={color} n={n} />
      <NeonLine x1={126} y1={70} x2={126} y2={134} color={color} n={n} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 60 18 L 68 30 L 62 42', tier: 'hurt' },
        { d: 'M 56 70 L 64 86 L 56 102', tier: 'critical' },
      ]} />
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 19: VoidWalker — minimalist, dark, single eye ─────────────────────

function VoidWalkerSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `void-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Minimal oval head */}
      <ellipse cx="90" cy="30" rx="28" ry="24" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1.5" />
      {/* Single large eye */}
      <circle cx="90" cy="28" r="12" fill="rgba(0,0,0,0.8)" stroke={ec} strokeWidth="1.5" />
      <circle cx="90" cy="28" r="8" fill={ec} opacity="0.9" filter={`url(#${id}-glow)`}>
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.9;0;0.6;0.1' : '0.6;1;0.6'} dur={hpTier === 'critical' ? '0.5s' : '3s'} repeatCount="indefinite" />
        <animate attributeName="r" values="7;9;7" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="93" cy="25" r="3" fill="rgba(255,255,255,0.7)" />
      {/* Thin neck */}
      <rect x="84" y="52" width="12" height="10" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Slim body — minimal */}
      <rect x="58" y="62" width="64" height="74" rx="4" fill={`url(#${id}-body)`} stroke={color} strokeWidth="1.5" />
      {/* Void energy lines — sparse */}
      <NeonLine x1={62} y1={68} x2={62} y2={132} color={color} n={n} />
      <NeonLine x1={118} y1={68} x2={118} y2={132} color={color} n={n} />
      {/* Small core — subtle */}
      <Core cx={90} cy={98} r={7} color={cc} n={n} id={id} />
      {/* Void symbol — empty circle */}
      <circle cx="90" cy="82" r="5" fill="none" stroke={color} strokeWidth="1" opacity={n.neonOpacity * 0.5} />
      {/* Minimal shoulders */}
      <rect x="42" y="66" width="18" height="14" rx="4" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      <rect x="120" y="66" width="18" height="14" rx="4" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 72 14 L 78 26 L 72 38', tier: 'hurt' },
        { d: 'M 62 66 L 70 80 L 62 94', tier: 'critical' },
      ]} />
      <Legs id={id} color={color} n={n} hpTier={hpTier} />
      <Feet id={id} color={color} n={n} hpTier={hpTier} />
    </g>
  );
}

// ─── SKIN 20: OmegaPrime — final boss, most impressive ──────────────────────

function OmegaPrimeSVG({ hpTier, winning, botState, side, color }: SkinProps) {
  const n = neonVals(hpTier);
  const ec = n.eyeColor || color;
  const cc = n.coreColor || color;
  const id = `omega-${side}`;
  return (
    <g>
      <SkinDefs id={id} color={color} coreColor={cc} />
      <Shadow id={id} />
      {/* Crown/halo */}
      <ellipse cx="90" cy="8" rx="32" ry="6" fill="none" stroke={color} strokeWidth="1.5" opacity={n.neonOpacity}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </ellipse>
      {/* Tall angular head with crown points */}
      <polygon points="54,14 126,14 132,34 128,58 52,58 48,34" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      {/* Crown spikes */}
      <polygon points="60,14 56,2 64,14" fill={color} opacity={n.neonOpacity * 0.7} />
      <polygon points="88,14 90,-2 92,14" fill={color} opacity={n.neonOpacity * 0.8} />
      <polygon points="120,14 124,2 116,14" fill={color} opacity={n.neonOpacity * 0.7} />
      {/* Dual-slit eyes (imposing) */}
      <rect x="58" y="30" width="24" height="8" rx="2" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1.5" />
      <rect x="62" y="32" width="16" height="4" rx="1" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.1;0.9;0.1' : '0.8;1;0.8'} dur={hpTier === 'critical' ? '0.5s' : '1.5s'} repeatCount="indefinite" />
      </rect>
      <rect x="98" y="30" width="24" height="8" rx="2" fill="rgba(0,0,0,0.7)" stroke={ec} strokeWidth="1.5" />
      <rect x="102" y="32" width="16" height="4" rx="1" fill={ec} opacity="0.9">
        <animate attributeName="opacity" values={hpTier === 'critical' ? '0.2;0.8;0.2' : '0.8;1;0.8'} dur={hpTier === 'critical' ? '0.6s' : '1.5s'} repeatCount="indefinite" />
      </rect>
      {/* Head neon accents */}
      <NeonLine x1={52} y1={20} x2={52} y2={54} color={color} n={n} />
      <NeonLine x1={128} y1={20} x2={128} y2={54} color={color} n={n} />
      {/* Face plate */}
      <rect x="70" y="44" width="40" height="8" rx="2" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1" />
      {/* Thick neck */}
      <rect x="72" y="58" width="36" height="10" rx="3" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="1.5" />
      {/* Massive layered shoulders */}
      <polygon points="28,70 56,68 54,100 22,96" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
      <polygon points="20,76 28,74 26,94 16,92" fill={color} opacity={n.neonOpacity * 0.3} stroke={color} strokeWidth="1" />
      <polygon points="152,70 124,68 126,100 158,96" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
      <polygon points="160,76 152,74 154,94 164,92" fill={color} opacity={n.neonOpacity * 0.3} stroke={color} strokeWidth="1" />
      {/* Grand torso */}
      <polygon points="52,68 128,68 122,138 58,138" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2.5" />
      {/* Omega symbol on chest */}
      <text x="90" y="88" textAnchor="middle" fill={color} fontSize="16" fontFamily="serif" fontWeight="bold" opacity={hpTier === 'critical' ? 0.2 : 0.7}>Ω</text>
      {/* Dual cores */}
      <Core cx={76} cy={108} r={7} color={cc} n={n} id={id} />
      <Core cx={104} cy={108} r={7} color={cc} n={n} id={id} />
      {/* Connected beam between cores */}
      <line x1="83" y1="108" x2="97" y2="108" stroke={cc} strokeWidth="2" opacity={n.neonOpacity * 0.8}>
        <animate attributeName="opacity" values={n.corePulse} dur={n.coreDur} repeatCount="indefinite" />
      </line>
      {/* Neon frame lines */}
      <NeonLine x1={56} y1={74} x2={56} y2={134} color={color} n={n} />
      <NeonLine x1={124} y1={74} x2={124} y2={134} color={color} n={n} />
      <NeonPath d="M 62,100 L 90,106 L 118,100" color={color} n={n} />
      <NeonPath d="M 60,126 L 90,132 L 120,126" color={color} n={n} />
      {/* Cracks */}
      <Cracks hpTier={hpTier} paths={[
        { d: 'M 54 20 L 62 34 L 56 46', tier: 'hurt' },
        { d: 'M 128 22 L 120 36 L 126 48', tier: 'hurt' },
        { d: 'M 66 72 L 74 88 L 66 104', tier: 'critical' },
        { d: 'M 114 74 L 106 90 L 114 106', tier: 'critical' },
      ]} />
      {/* Powerful legs */}
      <rect x={56} y="138" width="26" height="40" rx="4" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      <NeonLine x1={69} y1={140} x2={69} y2={176} color={color} n={n} />
      <rect x={98} y="138" width="26" height="40" rx="4" fill={`url(#${id}-body)`} stroke={color} strokeWidth="2" />
      <NeonLine x1={111} y1={140} x2={111} y2={176} color={color} n={n} />
      {/* Grand feet */}
      <rect x={48} y="178" width="36" height="16" rx="5" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
      <rect x={52} y="190" width="28" height="3" rx="1.5" fill={color} opacity={n.neonOpacity * 0.6}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </rect>
      <rect x={96} y="178" width="36" height="16" rx="5" fill={`url(#${id}-metal)`} stroke={color} strokeWidth="2" />
      <rect x={100} y="190" width="28" height="3" rx="1.5" fill={color} opacity={n.neonOpacity * 0.6}>
        <animate attributeName="opacity" values={n.neonFlicker} dur={n.neonDur} repeatCount="indefinite" />
      </rect>
      {/* Winner boss aura */}
      {winning && (
        <>
          <circle cx="90" cy="98" r="40" fill="none" stroke={color} strokeWidth="1" opacity="0.2">
            <animate attributeName="r" values="38;48;38" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </g>
  );
}

// ─── SKIN REGISTRY ────────────────────────────────────────────────────────────

export interface SkinEntry {
  id: string;
  name: string;
  Component: React.FC<SkinProps>;
}

// We import NeonViper and CyberFang from BotSprites to keep originals
// But since they're already in BotSprites.tsx, we reference them as skin 0 and 1
// by re-exporting lightweight wrappers that match SkinProps

// Lightweight wrapper for NeonViper (uses original from BotSprites)
// We can't import circularly, so the registry will use indices
// BotSprites index 0 and 1 will be handled specially in getSkinForBot

export const BOT_SKINS: SkinEntry[] = [
  { id: 'neon-viper', name: 'NeonViper', Component: null as unknown as React.FC<SkinProps> },       // index 0 — handled in BotSprites
  { id: 'cyber-fang', name: 'CyberFang', Component: null as unknown as React.FC<SkinProps> },       // index 1 — handled in BotSprites
  { id: 'shadow-ninja', name: 'ShadowNinja', Component: ShadowNinjaSVG },
  { id: 'iron-golem', name: 'IronGolem', Component: IronGolemSVG },
  { id: 'laser-hawk', name: 'LaserHawk', Component: LaserHawkSVG },
  { id: 'tech-samurai', name: 'TechSamurai', Component: TechSamuraiSVG },
  { id: 'crystal-mage', name: 'CrystalMage', Component: CrystalMageSVG },
  { id: 'storm-trooper', name: 'StormTrooper', Component: StormTrooperSVG },
  { id: 'phantom-wraith', name: 'PhantomWraith', Component: PhantomWraithSVG },
  { id: 'mech-spider', name: 'MechSpider', Component: MechSpiderSVG },
  { id: 'dragon-mech', name: 'DragonMech', Component: DragonMechSVG },
  { id: 'arctic-frost', name: 'ArcticFrost', Component: ArcticFrostSVG },
  { id: 'volcanic-core', name: 'VolcanicCore', Component: VolcanicCoreSVG },
  { id: 'neon-racer', name: 'NeonRacer', Component: NeonRacerSVG },
  { id: 'bio-hazard', name: 'BioHazard', Component: BioHazardSVG },
  { id: 'thunder-bolt', name: 'ThunderBolt', Component: ThunderBoltSVG },
  { id: 'gravity-well', name: 'GravityWell', Component: GravityWellSVG },
  { id: 'quantum-shift', name: 'QuantumShift', Component: QuantumShiftSVG },
  { id: 'void-walker', name: 'VoidWalker', Component: VoidWalkerSVG },
  { id: 'omega-prime', name: 'OmegaPrime', Component: OmegaPrimeSVG },
];

/**
 * Get a skin Component for a given bot ID.
 * Pass opponentBotId to guarantee different skins in the same match.
 * Returns null for indices 0 and 1 (NeonViper/CyberFang — handled in BotSprites).
 */
export function getSkinForBot(botId: number, opponentBotId?: number): { index: number; skin: SkinEntry } {
  let index = ((botId % 20) + 20) % 20; // handle negatives
  // If opponent has the same skin index, shift this bot's skin by 1
  if (opponentBotId !== undefined) {
    const oppIndex = ((opponentBotId % 20) + 20) % 20;
    if (index === oppIndex) {
      index = (index + 1) % 20;
    }
  }
  return { index, skin: BOT_SKINS[index] };
}
