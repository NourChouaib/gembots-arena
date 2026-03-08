/**
 * 🎯 Lobby Engine — Open battles waiting for opponents
 */

import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import * as BattleEngine from './battle-engine';

// BSC tokens — major crypto + BNB ecosystem
const TRENDING_TOKENS = [
  { mint: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'BNB', price: 625.80 },
  { mint: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTC', price: 68328.54 },
  { mint: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', price: 1986.11 },
  { mint: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF', symbol: 'SOL', price: 86.08 },
  { mint: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', price: 1.32 },
  { mint: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', symbol: 'XRP', price: 1.44 },
  { mint: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', symbol: 'LINK', price: 8.88 },
  { mint: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', symbol: 'ADA', price: 0.28 },
];

const DEFAULT_STAKE = 0.01; // SOL
const LOBBY_EXPIRY_HOURS = 2;

export interface LobbyEntry {
  id: string;
  creator_id: number;
  token_mint: string;
  token_symbol: string;
  entry_price: number;
  creator_prediction: number;
  stake_amount: number;
  created_at: string;
  expires_at: string;
  status: string;
  creator?: BattleEngine.Bot;
}

/**
 * Get all open lobby entries
 */
export function getOpenLobby(): LobbyEntry[] {
  // Clean up expired entries first
  db.prepare(`
    UPDATE lobby SET status = 'expired' 
    WHERE status = 'open' AND expires_at < datetime('now')
  `).run();
  
  const entries = db.prepare(`
    SELECT l.*, b.name as creator_name, b.hp as creator_hp, b.wins as creator_wins, b.avatar_state
    FROM lobby l
    JOIN api_bots b ON l.creator_id = b.id
    WHERE l.status = 'open'
    ORDER BY l.created_at DESC
  `).all() as any[];
  
  return entries.map(e => ({
    ...e,
    creator: {
      id: e.creator_id,
      name: e.creator_name,
      hp: e.creator_hp,
      wins: e.creator_wins,
      avatar_state: e.avatar_state
    }
  }));
}

/**
 * Create a new lobby entry (bot offers a battle)
 */
export function createLobbyEntry(
  creatorId: number,
  tokenMint: string,
  tokenSymbol: string,
  entryPrice: number,
  prediction: number,
  stakeAmount: number = DEFAULT_STAKE
): LobbyEntry {
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + LOBBY_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
  
  db.prepare(`
    INSERT INTO lobby (id, creator_id, token_mint, token_symbol, entry_price, creator_prediction, stake_amount, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, creatorId, tokenMint, tokenSymbol, entryPrice, prediction, stakeAmount, expiresAt);
  
  return {
    id,
    creator_id: creatorId,
    token_mint: tokenMint,
    token_symbol: tokenSymbol,
    entry_price: entryPrice,
    creator_prediction: prediction,
    stake_amount: stakeAmount,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    status: 'open'
  };
}

/**
 * Join a lobby entry (start the battle)
 */
export function joinLobby(lobbyId: string, joinerId: number, joinerPrediction: number): BattleEngine.Battle | null {
  const entry = db.prepare('SELECT * FROM lobby WHERE id = ? AND status = ?').get(lobbyId, 'open') as LobbyEntry;
  if (!entry) return null;
  
  // Can't join your own lobby
  if (entry.creator_id === joinerId) return null;
  
  // Mark lobby as matched
  db.prepare("UPDATE lobby SET status = 'matched' WHERE id = ?").run(lobbyId);
  
  // Create the battle
  const token = {
    mint: entry.token_mint,
    symbol: entry.token_symbol,
    price: entry.entry_price
  };
  
  const battle = BattleEngine.createBattle(entry.creator_id, joinerId, token);
  
  // Submit predictions
  BattleEngine.submitPrediction(battle.id, entry.creator_id, entry.creator_prediction);
  BattleEngine.submitPrediction(battle.id, joinerId, joinerPrediction);
  
  return BattleEngine.getBattleWithBots(battle.id)?.battle || null;
}

/**
 * Cancel a lobby entry
 */
export function cancelLobbyEntry(lobbyId: string, botId: number): boolean {
  const result = db.prepare(`
    UPDATE lobby SET status = 'cancelled' 
    WHERE id = ? AND creator_id = ? AND status = 'open'
  `).run(lobbyId, botId);
  
  return result.changes > 0;
}

/**
 * Get random token for NPC
 */
function getRandomToken() {
  return TRENDING_TOKENS[Math.floor(Math.random() * TRENDING_TOKENS.length)];
}

/**
 * Generate NPC prediction based on "personality"
 */
function generateNPCPrediction(npcName: string): number {
  if (npcName.includes('Sniper') || npcName.includes('Brain')) {
    // Conservative: 1.5-2.5x
    return 1.5 + Math.random() * 1.0;
  } else if (npcName.includes('Gambler') || npcName.includes('Bull')) {
    // Aggressive: 3-6x
    return 3.0 + Math.random() * 3.0;
  } else if (npcName.includes('Turtle') || npcName.includes('Bear')) {
    // Very conservative: 1.2-1.8x
    return 1.2 + Math.random() * 0.6;
  } else {
    // Balanced: 2-4x
    return 2.0 + Math.random() * 2.0;
  }
}

/**
 * NPC creates lobby entries to keep the lobby active
 */
export function spawnNPCLobbyEntries(targetCount: number = 5): number {
  // Get NPC bots
  const npcs = db.prepare(`
    SELECT * FROM api_bots 
    WHERE name LIKE '%NPC_%' AND hp > 0 AND in_battle = 0
  `).all() as BattleEngine.Bot[];
  
  // Count current open NPC lobbies
  const currentOpen = db.prepare(`
    SELECT COUNT(*) as count FROM lobby l
    JOIN api_bots b ON l.creator_id = b.id
    WHERE l.status = 'open' AND b.name LIKE '%NPC_%'
  `).get() as { count: number };
  
  const needed = targetCount - currentOpen.count;
  if (needed <= 0) return 0;
  
  let created = 0;
  const availableNPCs = npcs.filter(npc => {
    // Check if NPC already has an open lobby
    const hasOpen = db.prepare(`
      SELECT COUNT(*) as count FROM lobby 
      WHERE creator_id = ? AND status = 'open'
    `).get(npc.id) as { count: number };
    return hasOpen.count === 0;
  });
  
  for (let i = 0; i < Math.min(needed, availableNPCs.length); i++) {
    const npc = availableNPCs[i];
    const token = getRandomToken();
    const prediction = generateNPCPrediction(npc.name);
    
    createLobbyEntry(
      npc.id,
      token.mint,
      token.symbol,
      token.price,
      Math.round(prediction * 100) / 100,
      DEFAULT_STAKE
    );
    created++;
  }
  
  return created;
}

/**
 * Get trending tokens for bots
 */
export function getTrendingTokens() {
  return TRENDING_TOKENS;
}
