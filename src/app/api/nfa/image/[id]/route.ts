import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SITE_URL = 'https://gembots.space';

const ROBOT_IMAGES = [
  'neon-viper', 'dragon-mech', 'arctic-frost', 'bio-hazard', 'crystal-mage',
  'cyber-fang', 'gravity-well', 'iron-golem', 'laser-hawk', 'mech-spider',
  'neon-racer', 'omega-prime', 'phantom-wraith', 'quantum-shift', 'shadow-ninja',
  'storm-trooper', 'tech-samurai', 'thunder-bolt', 'void-walker', 'volcanic-core',
];

const TIER_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
  Bronze:    { bg: '#CD7F32', text: '#FFF', glow: '#CD7F3280' },
  Silver:    { bg: '#C0C0C0', text: '#333', glow: '#C0C0C080' },
  Gold:      { bg: '#FFD700', text: '#333', glow: '#FFD70080' },
  Diamond:   { bg: '#B9F2FF', text: '#333', glow: '#B9F2FF80' },
  Legendary: { bg: '#FF6B6B', text: '#FFF', glow: '#FF6B6B80' },
};

/**
 * Generate an SVG card for NFA — serves as the dynamic image
 * Marketplaces will display this as the NFT image
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id) || id < 0) {
    return new NextResponse('Invalid ID', { status: 400 });
  }

  // Fetch metadata from our own API
  let meta: any;
  try {
    const res = await fetch(`${SITE_URL}/api/nfa/metadata/${id}`, {
      signal: AbortSignal.timeout(10000),
    });
    meta = await res.json();
  } catch {
    // Fallback
    meta = {
      name: `GemBot #${id}`,
      attributes: [
        { trait_type: 'Tier', value: 'Bronze' },
        { trait_type: 'Strategy', value: 'Neural Network' },
        { trait_type: 'Win Rate', value: 0 },
        { trait_type: 'Total Battles', value: 0 },
      ],
    };
  }

  const getAttr = (key: string) => meta.attributes?.find((a: any) => a.trait_type === key)?.value;
  const tier = getAttr('Tier') || 'Bronze';
  const strategy = getAttr('Strategy') || 'Neural Network';
  const winRate = getAttr('Win Rate') || 0;
  const totalBattles = getAttr('Total Battles') || 0;
  const wins = getAttr('Wins') || 0;
  const isGenesis = getAttr('Genesis') === 'Yes';
  const aiModel = getAttr('AI Model') || 'Neural Network';
  const colors = TIER_COLORS[tier] || TIER_COLORS.Bronze;
  const robotDesign = ROBOT_IMAGES[id % ROBOT_IMAGES.length];
  const robotUrl = `${SITE_URL}/robots/${robotDesign}.png`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="600" height="800" viewBox="0 0 600 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a1a"/>
      <stop offset="50%" stop-color="#1a1a3e"/>
      <stop offset="100%" stop-color="#0a0a2a"/>
    </linearGradient>
    <linearGradient id="tierGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${colors.bg}"/>
      <stop offset="100%" stop-color="${colors.bg}CC"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="600" height="800" fill="url(#bg)" rx="20"/>
  <rect width="600" height="800" fill="none" stroke="${colors.bg}" stroke-width="2" rx="20" opacity="0.5"/>

  <!-- Top bar -->
  <rect x="0" y="0" width="600" height="60" fill="${colors.bg}" opacity="0.15" rx="20"/>
  <text x="30" y="40" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="${colors.bg}" filter="url(#glow)">GemBots NFA</text>
  <text x="570" y="40" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="${colors.bg}" text-anchor="end">#${id}</text>

  <!-- Robot image placeholder (circle) -->
  <circle cx="300" cy="230" r="130" fill="#1a1a3e" stroke="${colors.bg}" stroke-width="3" opacity="0.8"/>
  <image href="${robotUrl}" x="170" y="100" width="260" height="260" clip-path="circle(130px at 130px 130px)"/>

  ${isGenesis ? `<text x="300" y="390" font-family="Arial, sans-serif" font-size="14" fill="#FFD700" text-anchor="middle" letter-spacing="3">⭐ GENESIS COLLECTION ⭐</text>` : ''}

  <!-- Name -->
  <text x="300" y="420" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(meta.name || `GemBot #${id}`)}</text>

  <!-- Tier badge -->
  <rect x="220" y="438" width="160" height="32" fill="url(#tierGrad)" rx="16"/>
  <text x="300" y="460" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${colors.text}" text-anchor="middle">${tier.toUpperCase()} TIER</text>

  <!-- Stats grid -->
  <rect x="30" y="490" width="540" height="180" fill="#ffffff08" rx="12" stroke="#ffffff15" stroke-width="1"/>

  <!-- Win Rate -->
  <text x="160" y="530" font-family="Arial, sans-serif" font-size="14" fill="#888" text-anchor="middle">WIN RATE</text>
  <text x="160" y="565" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="${Number(winRate) >= 50 ? '#4ade80' : Number(winRate) >= 30 ? '#fbbf24' : '#f87171'}" text-anchor="middle">${winRate}%</text>

  <!-- Total Battles -->
  <text x="440" y="530" font-family="Arial, sans-serif" font-size="14" fill="#888" text-anchor="middle">BATTLES</text>
  <text x="440" y="565" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">${formatNumber(totalBattles)}</text>

  <!-- Wins -->
  <text x="110" y="620" font-family="Arial, sans-serif" font-size="13" fill="#888" text-anchor="middle">WINS</text>
  <text x="110" y="648" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#4ade80" text-anchor="middle">${formatNumber(wins)}</text>

  <!-- Strategy -->
  <text x="300" y="620" font-family="Arial, sans-serif" font-size="13" fill="#888" text-anchor="middle">STRATEGY</text>
  <text x="300" y="648" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#a78bfa" text-anchor="middle">${escapeXml(strategy)}</text>

  <!-- AI Model -->
  <text x="490" y="620" font-family="Arial, sans-serif" font-size="13" fill="#888" text-anchor="middle">AI MODEL</text>
  <text x="490" y="648" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#38bdf8" text-anchor="middle">${escapeXml(aiModel.slice(0, 18))}</text>

  <!-- Footer -->
  <line x1="30" y1="700" x2="570" y2="700" stroke="#ffffff15" stroke-width="1"/>
  <text x="300" y="735" font-family="Arial, sans-serif" font-size="13" fill="#666" text-anchor="middle">gembots.space • BNB Chain • ERC-721</text>
  <text x="300" y="760" font-family="Arial, sans-serif" font-size="11" fill="#555" text-anchor="middle">Not just a JPEG — it's an AI agent that trades for you</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}
