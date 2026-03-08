/**
 * ⚡ Post-Mint Arena Activation
 * POST /api/arena/activate-nfa
 * 
 * After minting an NFA, this endpoint:
 * 1. Registers the bot in the arena's SQLite battle engine (api_bots)
 * 2. Creates a lobby entry so the bot can be matched
 * 3. Returns arena status
 * 
 * Body: { botId: number, nfaId: number, botName: string, strategy: string, evmAddress: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as BattleEngine from '@/lib/battle-engine';
import * as LobbyEngine from '@/lib/lobby-engine';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// Ensure api_bots has the columns we need
try {
  db.exec('ALTER TABLE api_bots ADD COLUMN nfa_id INTEGER');
} catch { /* column exists */ }
try {
  db.exec('ALTER TABLE api_bots ADD COLUMN strategy TEXT');
} catch { /* column exists */ }
try {
  db.exec('ALTER TABLE api_bots ADD COLUMN evm_address TEXT');
} catch { /* column exists */ }
try {
  db.exec('ALTER TABLE api_bots ADD COLUMN hp INTEGER DEFAULT 100');
} catch { /* column exists */ }
try {
  db.exec('ALTER TABLE api_bots ADD COLUMN win_streak INTEGER DEFAULT 0');
} catch { /* column exists */ }
try {
  db.exec('ALTER TABLE api_bots ADD COLUMN league TEXT DEFAULT "bronze"');
} catch { /* column exists */ }
try {
  db.exec('ALTER TABLE api_bots ADD COLUMN avatar_state TEXT DEFAULT "idle"');
} catch { /* column exists */ }
try {
  db.exec('ALTER TABLE api_bots ADD COLUMN in_battle INTEGER DEFAULT 0');
} catch { /* column exists */ }

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`arena-activate-nfa:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { botId, nfaId, botName, strategy, evmAddress } = body;

    if (!botId || !nfaId || !botName || !evmAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: botId, nfaId, botName, evmAddress' },
        { status: 400 }
      );
    }

    // Check if bot already registered in arena by nfa_id
    const existing = db.prepare(
      'SELECT * FROM api_bots WHERE nfa_id = ?'
    ).get(nfaId) as BattleEngine.Bot | undefined;

    let arenaBot: BattleEngine.Bot;

    if (existing) {
      // Already registered — update and re-activate
      db.prepare(`
        UPDATE api_bots 
        SET strategy = ?, in_battle = 0, avatar_state = 'idle', last_active_at = datetime('now')
        WHERE nfa_id = ?
      `).run(strategy || 'DragonScale', nfaId);
      arenaBot = db.prepare('SELECT * FROM api_bots WHERE nfa_id = ?').get(nfaId) as BattleEngine.Bot;
    } else {
      // Register new bot in arena
      const crypto = require('crypto');
      const apiKey = `nfa_${crypto.randomBytes(16).toString('hex')}`;
      const webhookSecret = crypto.randomBytes(32).toString('hex');

      db.prepare(`
        INSERT INTO api_bots (
          name, wallet_address, api_key, webhook_secret, 
          nfa_id, strategy, evm_address, hp, wins, losses, win_streak, league, avatar_state, in_battle
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 100, 0, 0, 0, 'bronze', 'idle', 0)
      `).run(
        `${botName} #${nfaId}`,
        evmAddress.toLowerCase(),
        apiKey,
        webhookSecret,
        nfaId,
        strategy || 'DragonScale',
        evmAddress.toLowerCase()
      );

      arenaBot = db.prepare('SELECT * FROM api_bots WHERE nfa_id = ?').get(nfaId) as BattleEngine.Bot;
    }

    // Create a lobby entry for this bot — put it in matchmaking queue
    let lobbyEntry = null;
    try {
      const tokens = LobbyEngine.getTrendingTokens();
      const token = tokens[Math.floor(Math.random() * tokens.length)];
      // Generate a reasonable prediction based on strategy
      const prediction = generatePrediction(strategy);
      lobbyEntry = LobbyEngine.createLobbyEntry(
        arenaBot.id,
        token.mint,
        token.symbol,
        token.price,
        prediction,
        0.01 // default stake
      );
    } catch (lobbyErr) {
      console.warn('Failed to create lobby entry:', lobbyErr);
      // Non-critical — bot is registered but just not in lobby yet
    }

    // Try to auto-match if there's a waiting opponent
    let matchResult = null;
    try {
      const match = BattleEngine.matchmakeBots();
      if (match) {
        const [bot1, bot2] = match;
        const tokens = LobbyEngine.getTrendingTokens();
        const token = tokens[Math.floor(Math.random() * tokens.length)];
        const battle = BattleEngine.createBattle(bot1.id, bot2.id, token);
        
        // Auto-submit predictions
        const pred1 = BattleEngine.autoPredict(bot1, token.price);
        const pred2 = BattleEngine.autoPredict(bot2, token.price);
        BattleEngine.submitPrediction(battle.id, bot1.id, pred1);
        BattleEngine.submitPrediction(battle.id, bot2.id, pred2);
        
        matchResult = {
          battleId: battle.id,
          opponent: bot1.id === arenaBot.id ? bot2.name : bot1.name,
          token: token.symbol,
        };
      }
    } catch (matchErr) {
      console.warn('Auto-match failed:', matchErr);
    }

    console.log(`⚡ NFA #${nfaId} (${botName}) activated on arena — bot id: ${arenaBot.id}${matchResult ? `, matched into battle ${matchResult.battleId}` : ', waiting in lobby'}`);

    return NextResponse.json({
      success: true,
      arenaBot: {
        id: arenaBot.id,
        name: arenaBot.name,
        hp: 100,
        league: 'bronze',
        status: matchResult ? 'in_battle' : 'in_lobby',
      },
      lobby: lobbyEntry ? {
        id: lobbyEntry.id,
        token: lobbyEntry.token_symbol,
        prediction: lobbyEntry.creator_prediction,
      } : null,
      match: matchResult,
    });
  } catch (error: unknown) {
    const e = error as Error;
    console.error('Arena activation error:', e.message);
    return NextResponse.json(
      { error: e.message || 'Failed to activate on arena' },
      { status: 500 }
    );
  }
}

/**
 * Generate prediction based on strategy name
 */
function generatePrediction(strategy?: string): number {
  switch (strategy) {
    case 'WhaleWatch':
    case 'FrostMaster':
    case 'EqniMb':
      // Conservative: 1.3-2.0x
      return Math.round((1.3 + Math.random() * 0.7) * 100) / 100;
    case 'MoonShot':
    case 'SolarFlare':
    case 'PyroBot':
      // Aggressive: 3-6x
      return Math.round((3.0 + Math.random() * 3.0) * 100) / 100;
    case 'TsunamiX':
    case 'SharkBite':
    case 'LunarPredator':
      // Mid-aggressive: 2-4x
      return Math.round((2.0 + Math.random() * 2.0) * 100) / 100;
    default:
      // Balanced: 1.5-3x
      return Math.round((1.5 + Math.random() * 1.5) * 100) / 100;
  }
}
