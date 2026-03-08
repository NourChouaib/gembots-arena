import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(path.join(DATA_DIR, 'gembots.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS stakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    token_mint TEXT NOT NULL,
    token_symbol TEXT,
    amount_sol REAL NOT NULL,
    entry_price REAL NOT NULL,
    target_multiplier REAL DEFAULT 2.0,
    result TEXT DEFAULT 'pending',
    exit_price REAL,
    payout_sol REAL,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    wallet_address TEXT UNIQUE NOT NULL,
    reputation INTEGER DEFAULT 100,
    total_predictions INTEGER DEFAULT 0,
    successful_predictions INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS api_bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    wallet_address TEXT UNIQUE NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    webhook_url TEXT,
    webhook_secret TEXT NOT NULL,
    total_bets INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_active_at TEXT
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id INTEGER,
    token_mint TEXT NOT NULL,
    token_symbol TEXT,
    prediction_type TEXT NOT NULL,
    target_price REAL,
    confidence REAL,
    result TEXT DEFAULT 'pending',
    actual_price REAL,
    predicted_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (bot_id) REFERENCES bots(id)
  );

  CREATE TABLE IF NOT EXISTS token_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_mint TEXT NOT NULL,
    price REAL NOT NULL,
    timestamp TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    total_stakes_sol REAL DEFAULT 0,
    total_losers_sol REAL DEFAULT 0,
    platform_fee_sol REAL DEFAULT 0,
    winners_payout_sol REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS trade_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_name TEXT NOT NULL,
    action TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    token_mint TEXT,
    price REAL NOT NULL,
    amount REAL NOT NULL,
    confidence REAL DEFAULT 0.8,
    timestamp TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_stakes_wallet ON stakes(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_stakes_result ON stakes(result);
  CREATE INDEX IF NOT EXISTS idx_stakes_created ON stakes(created_at);
  CREATE INDEX IF NOT EXISTS idx_predictions_result ON predictions(result);
  CREATE INDEX IF NOT EXISTS idx_token_prices_mint ON token_prices(token_mint);
  CREATE INDEX IF NOT EXISTS idx_trade_events_time ON trade_events(timestamp);
`);

// Stakes functions
export function createStake(data: {
  walletAddress: string;
  tokenMint: string;
  tokenSymbol?: string;
  amountSol: number;
  entryPrice: number;
  targetMultiplier?: number;
}) {
  const stmt = db.prepare(`
    INSERT INTO stakes (wallet_address, token_mint, token_symbol, amount_sol, entry_price, target_multiplier)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.walletAddress,
    data.tokenMint,
    data.tokenSymbol || null,
    data.amountSol,
    data.entryPrice,
    data.targetMultiplier || 2.0
  );
  return result.lastInsertRowid;
}

export function getStakesByWallet(walletAddress: string) {
  return db.prepare(`
    SELECT * FROM stakes WHERE wallet_address = ? ORDER BY created_at DESC
  `).all(walletAddress);
}

export function getActiveStakes() {
  return db.prepare(`
    SELECT * FROM stakes WHERE result = 'pending' ORDER BY created_at DESC
  `).all();
}

export function getPendingStakesForResolution() {
  // Get stakes from yesterday that need resolution
  return db.prepare(`
    SELECT * FROM stakes 
    WHERE result = 'pending' 
    AND date(created_at) < date('now')
    ORDER BY created_at ASC
  `).all();
}

export function resolveStake(id: number, data: {
  result: 'win' | 'lose';
  exitPrice: number;
  payoutSol: number;
}) {
  const stmt = db.prepare(`
    UPDATE stakes 
    SET result = ?, exit_price = ?, payout_sol = ?, resolved_at = datetime('now')
    WHERE id = ?
  `);
  return stmt.run(data.result, data.exitPrice, data.payoutSol, id);
}

// Stats functions
export function getTodayStats() {
  return db.prepare(`
    SELECT 
      COUNT(*) as total_stakes,
      SUM(amount_sol) as total_sol,
      SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN result = 'lose' THEN 1 ELSE 0 END) as losses
    FROM stakes 
    WHERE date(created_at) = date('now')
  `).get();
}

export function getLeaderboard(limit = 10) {
  return db.prepare(`
    SELECT 
      wallet_address,
      COUNT(*) as total_stakes,
      SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
      SUM(payout_sol) as total_winnings,
      SUM(amount_sol) as total_staked
    FROM stakes
    GROUP BY wallet_address
    ORDER BY total_winnings DESC
    LIMIT ?
  `).all(limit);
}

// Token price tracking
export function saveTokenPrice(tokenMint: string, price: number) {
  const stmt = db.prepare(`
    INSERT INTO token_prices (token_mint, price) VALUES (?, ?)
  `);
  return stmt.run(tokenMint, price);
}

export function getLatestPrice(tokenMint: string) {
  return db.prepare(`
    SELECT price FROM token_prices 
    WHERE token_mint = ? 
    ORDER BY timestamp DESC 
    LIMIT 1
  `).get(tokenMint) as { price: number } | undefined;
}

export function getPriceChange(tokenMint: string, minutesAgo: number): number {
  const current = getLatestPrice(tokenMint);
  if (!current) return 0;
  
  const historical = db.prepare(`
    SELECT price FROM token_prices 
    WHERE token_mint = ? AND timestamp <= datetime('now', ? || ' minutes')
    ORDER BY timestamp DESC 
    LIMIT 1
  `).get(tokenMint, `-${minutesAgo}`) as { price: number } | undefined;
  
  if (!historical || historical.price === 0) return 0;
  return ((current.price - historical.price) / historical.price) * 100;
}

// Trade events functions
export function saveTradeEvent(data: {
  botName: string;
  action: string;
  tokenSymbol: string;
  tokenMint?: string;
  price: number;
  amount: number;
  confidence?: number;
}) {
  const stmt = db.prepare(`
    INSERT INTO trade_events (bot_name, action, token_symbol, token_mint, price, amount, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(data.botName, data.action, data.tokenSymbol, data.tokenMint || null, data.price, data.amount, data.confidence || 0.8);
}

export function getTokenVolume24h(tokenMint: string): number {
  const result = db.prepare(`
    SELECT COALESCE(SUM(price * amount), 0) as volume
    FROM trade_events
    WHERE token_mint = ? AND timestamp >= datetime('now', '-24 hours')
  `).get(tokenMint) as { volume: number } | undefined;
  return result?.volume || 0;
}

export function getRecentTradeEvents(limit: number = 20) {
  return db.prepare(`
    SELECT id, bot_name, action, token_symbol, token_mint, price, amount, confidence, timestamp
    FROM trade_events
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit) as Array<{
    id: number; bot_name: string; action: string; token_symbol: string;
    token_mint: string | null; price: number; amount: number; confidence: number; timestamp: string;
  }>;
}

// API Bots functions
export function createApiBot(data: {
  name: string;
  walletAddress: string;
  webhookUrl?: string;
}) {
  const crypto = require('crypto');
  const apiKey = `bot_${crypto.randomBytes(20).toString('hex')}`;
  const webhookSecret = crypto.randomBytes(32).toString('hex');
  
  const stmt = db.prepare(`
    INSERT INTO api_bots (name, wallet_address, api_key, webhook_url, webhook_secret)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.name,
    data.walletAddress,
    apiKey,
    data.webhookUrl || null,
    webhookSecret
  );
  
  return {
    id: result.lastInsertRowid,
    apiKey,
    webhookSecret
  };
}

export function getBotByApiKey(apiKey: string) {
  return db.prepare(`
    SELECT * FROM api_bots WHERE api_key = ?
  `).get(apiKey);
}

export function updateBotStats(apiKey: string, result: 'win' | 'lose') {
  const updateField = result === 'win' ? 'wins = wins + 1' : 'losses = losses + 1';
  
  const stmt = db.prepare(`
    UPDATE api_bots 
    SET total_bets = total_bets + 1, ${updateField}, last_active_at = datetime('now')
    WHERE api_key = ?
  `);
  return stmt.run(apiKey);
}

export function getApiBotsLeaderboard() {
  return db.prepare(`
    SELECT 
      name,
      wins,
      losses,
      total_bets,
      CASE WHEN total_bets > 0 THEN ROUND((wins * 100.0 / total_bets), 2) ELSE 0 END as win_rate,
      created_at
    FROM api_bots
    WHERE total_bets > 0
    ORDER BY wins DESC, win_rate DESC
    LIMIT 20
  `).all();
}

export function linkBetToBot(betId: number, apiKey: string) {
  // Add bot_api_key column to stakes if it doesn't exist
  try {
    db.exec('ALTER TABLE stakes ADD COLUMN bot_api_key TEXT');
  } catch (e) {
    // Column already exists
  }
  
  const stmt = db.prepare(`
    UPDATE stakes SET bot_api_key = ? WHERE id = ?
  `);
  return stmt.run(apiKey, betId);
}

export default db;
