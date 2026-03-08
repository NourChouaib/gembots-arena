/**
 * 🥊 Battle Engine — Core logic for PvP prediction battles
 */

import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

// Constants
export const BASE_DAMAGE = 10;
export const HEAL_AMOUNT = 5;
export const MAX_HP = 100;
export const ROUND_DURATION_MS = 60 * 60 * 1000; // 1 hour for quick battles

export interface Bot {
  id: number;
  name: string;
  hp: number;
  wins: number;
  losses: number;
  win_streak: number;
  league: string;
  avatar_state: string;
  in_battle: number;
}

export interface Battle {
  id: string;
  round_number: number;
  bot1_id: number;
  bot2_id: number;
  token_mint: string;
  token_symbol: string;
  entry_price: number;
  started_at: string;
  resolves_at: string;
  status: 'active' | 'pending_predictions' | 'resolved' | 'cancelled';
  final_price?: number;
  actual_x?: number;
  winner_id?: number;
  bot1_prediction?: number;
  bot2_prediction?: number;
  bot1_accuracy?: number;
  bot2_accuracy?: number;
  damage_dealt?: number;
}

export interface TrendingToken {
  mint: string;
  symbol: string;
  price: number;
}

/**
 * Get available bots for matchmaking (not in battle, HP > 0)
 */
export function getAvailableBots(): Bot[] {
  const stmt = db.prepare(`
    SELECT id, name, hp, wins, losses, win_streak, league, avatar_state, in_battle
    FROM api_bots 
    WHERE hp > 0 AND in_battle = 0
    ORDER BY hp DESC
  `);
  return stmt.all() as Bot[];
}

/**
 * Get bot by ID
 */
export function getBot(botId: number): Bot | undefined {
  const stmt = db.prepare('SELECT * FROM api_bots WHERE id = ?');
  return stmt.get(botId) as Bot | undefined;
}

/**
 * Get active battles
 */
export function getActiveBattles(): Battle[] {
  const stmt = db.prepare(`
    SELECT * FROM battles 
    WHERE status IN ('active', 'pending_predictions')
    ORDER BY started_at DESC
  `);
  return stmt.all() as Battle[];
}

/**
 * Get battle by ID with bot info
 */
export function getBattleWithBots(battleId: string) {
  const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId) as Battle;
  if (!battle) return null;
  
  const bot1 = getBot(battle.bot1_id);
  const bot2 = getBot(battle.bot2_id);
  
  return { battle, bot1, bot2 };
}

/**
 * Get current round number
 */
export function getCurrentRound(): number {
  const stmt = db.prepare('SELECT MAX(round_number) as max_round FROM battles');
  const result = stmt.get() as { max_round: number | null };
  return (result.max_round || 0) + 1;
}

/**
 * Create a new battle between two bots
 */
export function createBattle(
  bot1Id: number, 
  bot2Id: number, 
  token: TrendingToken
): Battle {
  const battleId = uuidv4();
  const roundNumber = getCurrentRound();
  const resolvesAt = new Date(Date.now() + ROUND_DURATION_MS).toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO battles (id, round_number, bot1_id, bot2_id, token_mint, token_symbol, entry_price, resolves_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_predictions')
  `);
  
  stmt.run(battleId, roundNumber, bot1Id, bot2Id, token.mint, token.symbol, token.price, resolvesAt);
  
  // Mark bots as in battle
  db.prepare('UPDATE api_bots SET in_battle = 1 WHERE id IN (?, ?)').run(bot1Id, bot2Id);
  
  return {
    id: battleId,
    round_number: roundNumber,
    bot1_id: bot1Id,
    bot2_id: bot2Id,
    token_mint: token.mint,
    token_symbol: token.symbol,
    entry_price: token.price,
    started_at: new Date().toISOString(),
    resolves_at: resolvesAt,
    status: 'pending_predictions'
  };
}

/**
 * Submit prediction for a battle
 */
export function submitPrediction(battleId: string, botId: number, predictedX: number): boolean {
  const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId) as Battle;
  if (!battle) return false;
  if (battle.status !== 'pending_predictions') return false;
  
  const isBot1 = battle.bot1_id === botId;
  const isBot2 = battle.bot2_id === botId;
  if (!isBot1 && !isBot2) return false;
  
  const column = isBot1 ? 'bot1_prediction' : 'bot2_prediction';
  db.prepare(`UPDATE battles SET ${column} = ? WHERE id = ?`).run(predictedX, battleId);
  
  // Check if both predictions are in
  const updated = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId) as Battle;
  if (updated.bot1_prediction && updated.bot2_prediction) {
    db.prepare("UPDATE battles SET status = 'active' WHERE id = ?").run(battleId);
  }
  
  return true;
}

/**
 * Resolve a battle — calculate winner and apply damage
 */
export function resolveBattle(battleId: string, finalPrice: number): Battle | null {
  const battle = db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId) as Battle;
  if (!battle || battle.status !== 'active') return null;
  
  const actualX = finalPrice / battle.entry_price;
  
  // Calculate accuracy (lower is better)
  const bot1Error = Math.abs((battle.bot1_prediction || 1) - actualX) / actualX;
  const bot2Error = Math.abs((battle.bot2_prediction || 1) - actualX) / actualX;
  
  const bot1Accuracy = Math.max(0, 1 - bot1Error);
  const bot2Accuracy = Math.max(0, 1 - bot2Error);
  
  // Determine winner
  const winnerId = bot1Accuracy >= bot2Accuracy ? battle.bot1_id : battle.bot2_id;
  const loserId = winnerId === battle.bot1_id ? battle.bot2_id : battle.bot1_id;
  const loserError = winnerId === battle.bot1_id ? bot2Error : bot1Error;
  
  // Calculate damage (more error = more damage)
  const damage = Math.round(BASE_DAMAGE * (1 + loserError));
  
  // Get current HP
  const winner = getBot(winnerId)!;
  const loser = getBot(loserId)!;
  
  const winnerHpBefore = winner.hp;
  const loserHpBefore = loser.hp;
  
  // Apply HP changes
  const newWinnerHp = Math.min(MAX_HP, winner.hp + HEAL_AMOUNT);
  const newLoserHp = Math.max(0, loser.hp - damage);
  
  // Update bots
  db.prepare(`
    UPDATE api_bots SET 
      hp = ?, 
      wins = wins + 1, 
      win_streak = win_streak + 1,
      avatar_state = 'winning',
      in_battle = 0
    WHERE id = ?
  `).run(newWinnerHp, winnerId);
  
  const newLoserState = newLoserHp <= 20 ? 'critical' : (newLoserHp === 0 ? 'ko' : 'losing');
  db.prepare(`
    UPDATE api_bots SET 
      hp = ?, 
      losses = losses + 1, 
      win_streak = 0,
      avatar_state = ?,
      in_battle = 0
    WHERE id = ?
  `).run(newLoserHp, newLoserState, loserId);
  
  // Update battle
  db.prepare(`
    UPDATE battles SET 
      status = 'resolved',
      final_price = ?,
      actual_x = ?,
      winner_id = ?,
      bot1_accuracy = ?,
      bot2_accuracy = ?,
      damage_dealt = ?
    WHERE id = ?
  `).run(finalPrice, actualX, winnerId, bot1Accuracy, bot2Accuracy, damage, battleId);
  
  // Log battle results
  db.prepare(`
    INSERT INTO battle_log (battle_id, bot_id, opponent_id, result, hp_before, hp_after, damage_taken, accuracy, prediction)
    VALUES (?, ?, ?, 'win', ?, ?, 0, ?, ?)
  `).run(battleId, winnerId, loserId, winnerHpBefore, newWinnerHp, 
         winnerId === battle.bot1_id ? bot1Accuracy : bot2Accuracy,
         winnerId === battle.bot1_id ? battle.bot1_prediction : battle.bot2_prediction);
  
  db.prepare(`
    INSERT INTO battle_log (battle_id, bot_id, opponent_id, result, hp_before, hp_after, damage_taken, accuracy, prediction)
    VALUES (?, ?, ?, 'loss', ?, ?, ?, ?, ?)
  `).run(battleId, loserId, winnerId, loserHpBefore, newLoserHp, damage,
         loserId === battle.bot1_id ? bot1Accuracy : bot2Accuracy,
         loserId === battle.bot1_id ? battle.bot1_prediction : battle.bot2_prediction);
  
  return db.prepare('SELECT * FROM battles WHERE id = ?').get(battleId) as Battle;
}

/**
 * Get leaderboard
 */
export function getLeaderboard(limit = 10): Bot[] {
  const stmt = db.prepare(`
    SELECT * FROM api_bots 
    ORDER BY wins DESC, hp DESC 
    LIMIT ?
  `);
  return stmt.all(limit) as Bot[];
}

/**
 * Matchmaking — pair bots for battle
 */
export function matchmakeBots(): [Bot, Bot] | null {
  const available = getAvailableBots();
  if (available.length < 2) return null;
  
  // League-aware matchmaking: prefer same league, then adjacent leagues
  const leagueOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary'];
  
  // Pick first bot randomly
  const shuffled = available.sort(() => Math.random() - 0.5);
  const bot1 = shuffled[0];
  const bot1League = leagueOrder.indexOf(bot1.league?.toLowerCase() || 'bronze');
  
  // Find best opponent: same league first, then ±1 league, then anyone
  const candidates = shuffled.slice(1);
  
  // Score candidates: 0 = same league, 1 = adjacent, 2+ = further
  const scored = candidates.map(bot => {
    const botLeague = leagueOrder.indexOf(bot.league?.toLowerCase() || 'bronze');
    const leagueDiff = Math.abs(bot1League - botLeague);
    const hpDiff = Math.abs((bot1.hp || 100) - (bot.hp || 100));
    return { bot, score: leagueDiff * 100 + hpDiff };
  });
  
  scored.sort((a, b) => a.score - b.score);
  
  // 70% chance to pick best match, 30% random (to keep variety)
  const bot2 = Math.random() < 0.7 ? scored[0].bot : scored[Math.floor(Math.random() * Math.min(3, scored.length))].bot;
  
  return [bot1, bot2];
}

/**
 * Auto-generate prediction for bot (simple strategy)
 */
export function autoPredict(bot: Bot, entryPrice: number): number {
  // Different strategies based on bot name/config
  const baseX = 1.5 + Math.random() * 2; // 1.5x to 3.5x
  
  // Add some variance based on win_streak (confident bots predict higher)
  const streakBonus = bot.win_streak * 0.1;
  
  return Math.round((baseX + streakBonus) * 100) / 100;
}
