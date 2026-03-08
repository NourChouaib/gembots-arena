/**
 * 🥊 Battle Arena API
 * GET /api/arena/battles — list active battles
 * POST /api/arena/battles — create new battle (matchmaking)
 */

import { NextRequest, NextResponse } from 'next/server';
import * as BattleEngine from '@/lib/battle-engine';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// BSC tokens — major crypto + BNB ecosystem
const TRENDING_TOKENS: BattleEngine.TrendingToken[] = [
  { mint: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'BNB', price: 625.80 },
  { mint: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTC', price: 68328.54 },
  { mint: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', price: 1986.11 },
  { mint: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF', symbol: 'SOL', price: 86.08 },
  { mint: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', price: 1.32 },
];

function getRandomToken(): BattleEngine.TrendingToken {
  return TRENDING_TOKENS[Math.floor(Math.random() * TRENDING_TOKENS.length)];
}

export async function GET(request: NextRequest) {
  try {
    const battles = BattleEngine.getActiveBattles();
    const leaderboard = BattleEngine.getLeaderboard(10);
    
    // Enrich battles with bot info
    const enrichedBattles = battles.map(battle => {
      const bot1 = BattleEngine.getBot(battle.bot1_id);
      const bot2 = BattleEngine.getBot(battle.bot2_id);
      return { ...battle, bot1, bot2 };
    });
    
    return NextResponse.json({
      battles: enrichedBattles,
      leaderboard,
      next_round_in: 900, // seconds until next matchmaking
    });
  } catch (error) {
    console.error('Error fetching battles:', error);
    return NextResponse.json({ error: 'Failed to fetch battles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`arena-battles:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    // Matchmaking
    const match = BattleEngine.matchmakeBots();
    if (!match) {
      return NextResponse.json({ 
        error: 'Not enough bots available for matchmaking',
        available_bots: BattleEngine.getAvailableBots().length 
      }, { status: 400 });
    }
    
    const [bot1, bot2] = match;
    const token = getRandomToken();
    
    // Create battle
    const battle = BattleEngine.createBattle(bot1.id, bot2.id, token);
    
    // Auto-generate predictions for both bots
    const bot1Prediction = BattleEngine.autoPredict(bot1, token.price);
    const bot2Prediction = BattleEngine.autoPredict(bot2, token.price);
    
    BattleEngine.submitPrediction(battle.id, bot1.id, bot1Prediction);
    BattleEngine.submitPrediction(battle.id, bot2.id, bot2Prediction);
    
    // Get updated battle
    const result = BattleEngine.getBattleWithBots(battle.id);
    
    return NextResponse.json({
      message: 'Battle created!',
      battle: result?.battle,
      bot1: result?.bot1,
      bot2: result?.bot2,
      predictions: {
        bot1: bot1Prediction,
        bot2: bot2Prediction
      }
    });
  } catch (error) {
    console.error('Error creating battle:', error);
    return NextResponse.json({ error: 'Failed to create battle' }, { status: 500 });
  }
}
