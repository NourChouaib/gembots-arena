/**
 * GemBets Engine — 5-minute BTC prediction markets (client-side simulation)
 * 
 * Every 5 minutes, a new "market" is created:
 * - Record BTC price at start
 * - After 5 min, compare current price → UP or DOWN
 * - AI bots place bets with strategy-based bias
 * - Track history and leaderboard
 */

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type BetDirection = 'up' | 'down';
export type MarketStatus = 'open' | 'resolved';

export interface AITrader {
  id: string;
  name: string;
  emoji: string;
  strategy: string;         // bias description
  upBias: number;           // 0-1, probability of betting UP
  totalBets: number;
  wins: number;
  currentBet: BetDirection | null;
  streak: number;
}

export interface Market {
  id: number;
  startTime: number;        // timestamp ms
  endTime: number;          // timestamp ms
  startPrice: number;
  endPrice: number | null;
  result: BetDirection | null;
  status: MarketStatus;
  bets: { traderId: string; direction: BetDirection }[];
  upPercent: number;        // 0-100
}

// ─── AI TRADERS ─────────────────────────────────────────────────────────────

export const AI_TRADERS: AITrader[] = [
  {
    id: 'trend-surfer',
    name: 'TrendSurfer',
    emoji: '🏄',
    strategy: 'Follows momentum — biased UP in bull markets',
    upBias: 0.62,
    totalBets: 0,
    wins: 0,
    currentBet: null,
    streak: 0,
  },
  {
    id: 'bear-hunter',
    name: 'BearHunter',
    emoji: '🐻',
    strategy: 'Contrarian — often bets DOWN expecting corrections',
    upBias: 0.38,
    totalBets: 0,
    wins: 0,
    currentBet: null,
    streak: 0,
  },
  {
    id: 'crystal-bot',
    name: 'CrystalBot',
    emoji: '🔮',
    strategy: 'Pattern recognition — balanced predictions',
    upBias: 0.50,
    totalBets: 0,
    wins: 0,
    currentBet: null,
    streak: 0,
  },
  {
    id: 'rocket-ai',
    name: 'RocketAI',
    emoji: '🚀',
    strategy: 'Extreme bull — almost always bets UP',
    upBias: 0.75,
    totalBets: 0,
    wins: 0,
    currentBet: null,
    streak: 0,
  },
  {
    id: 'ice-queen',
    name: 'IceQueen',
    emoji: '❄️',
    strategy: 'Cautious — slightly favors DOWN to hedge',
    upBias: 0.42,
    totalBets: 0,
    wins: 0,
    currentBet: null,
    streak: 0,
  },
];

// ─── MARKET INTERVAL ────────────────────────────────────────────────────────

export const MARKET_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate the current 5-minute epoch aligned to clock time.
 * Markets align to 00:00, 00:05, 00:10, etc. UTC.
 */
export function getCurrentEpoch(): { startTime: number; endTime: number; marketId: number } {
  const now = Date.now();
  const epochMs = MARKET_DURATION_MS;
  const startTime = Math.floor(now / epochMs) * epochMs;
  const endTime = startTime + epochMs;
  const marketId = Math.floor(startTime / epochMs);
  return { startTime, endTime, marketId };
}

/**
 * Time remaining in current market (ms)
 */
export function getTimeRemaining(): number {
  const { endTime } = getCurrentEpoch();
  return Math.max(0, endTime - Date.now());
}

/**
 * Format milliseconds to MM:SS
 */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ─── BOT BETTING ────────────────────────────────────────────────────────────

/**
 * Generate a bet for an AI trader based on their bias + some randomness
 */
export function generateBotBet(trader: AITrader): BetDirection {
  // Add some noise to make it interesting
  const noise = (Math.random() - 0.5) * 0.15;
  const effectiveBias = Math.max(0.1, Math.min(0.9, trader.upBias + noise));
  return Math.random() < effectiveBias ? 'up' : 'down';
}

/**
 * Generate all bot bets for a market
 */
export function generateAllBotBets(traders: AITrader[]): { traderId: string; direction: BetDirection }[] {
  return traders.map(t => ({
    traderId: t.id,
    direction: generateBotBet(t),
  }));
}

/**
 * Calculate the UP/DOWN percentage from bets
 */
export function calculatePoolPercent(bets: { direction: BetDirection }[]): number {
  if (bets.length === 0) return 50;
  const upCount = bets.filter(b => b.direction === 'up').length;
  return Math.round((upCount / bets.length) * 100);
}

// ─── MARKET RESOLUTION ──────────────────────────────────────────────────────

/**
 * Resolve a market: compare end price to start price
 */
export function resolveMarket(startPrice: number, endPrice: number): BetDirection {
  // If exactly equal, treat as "up" (edge case)
  return endPrice >= startPrice ? 'up' : 'down';
}

/**
 * Update trader stats after market resolution
 */
export function updateTraderStats(
  traders: AITrader[],
  bets: { traderId: string; direction: BetDirection }[],
  result: BetDirection
): AITrader[] {
  return traders.map(trader => {
    const bet = bets.find(b => b.traderId === trader.id);
    if (!bet) return trader;

    const won = bet.direction === result;
    return {
      ...trader,
      totalBets: trader.totalBets + 1,
      wins: trader.wins + (won ? 1 : 0),
      currentBet: bet.direction,
      streak: won ? trader.streak + 1 : 0,
    };
  });
}

/**
 * Get win rate as a percentage string
 */
export function getWinRate(wins: number, total: number): string {
  if (total === 0) return '—';
  return `${((wins / total) * 100).toFixed(1)}%`;
}

// ─── PRICE HISTORY FOR CHART ────────────────────────────────────────────────

export interface PricePoint {
  time: number;  // timestamp ms
  price: number;
}

/**
 * Generate mock initial price history (30 minutes, 1 point per 30 seconds)
 * Used when we don't have real history yet
 */
export function generateMockHistory(currentPrice: number, points: number = 60): PricePoint[] {
  const now = Date.now();
  const interval = 30_000; // 30 seconds
  const history: PricePoint[] = [];
  let price = currentPrice * (1 - 0.001); // Start slightly lower
  
  for (let i = points; i >= 0; i--) {
    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * currentPrice * 0.0003;
    price += change;
    price = Math.max(price, currentPrice * 0.998); // Don't deviate too far
    
    history.push({
      time: now - i * interval,
      price: i === 0 ? currentPrice : price,
    });
  }
  
  return history;
}
