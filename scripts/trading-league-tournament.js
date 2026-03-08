#!/usr/bin/env node

/**
 * GemBots Trading League Tournament Engine
 * 
 * PM2 service that manages weekly trading tournaments:
 * 1. Starts a new tournament automatically (immediately on first run, then weekly Mon 00:00 UTC)
 * 2. Snapshots current PnL of all active bots as baseline
 * 3. Every hour updates tournament entries with current PnL vs baseline
 * 4. When tournament ends: final snapshot, determine Top-3, start new tournament
 * 
 * Tournament naming: "Trading League Week #N" (ISO week number)
 */

// ─── Load .env.local ─────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !key.startsWith('#')) {
      let v = val.join('=').trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[key.trim()] = v;
    }
  });
}

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const HOURLY_UPDATE_MS = 60 * 60 * 1000;     // 1 hour
const CHECK_INTERVAL_MS = 5 * 60 * 1000;     // Check every 5 min if tournament needs action
const STARTUP_DELAY_MS = 5_000;               // 5s startup delay

// ─── Supabase Helper ─────────────────────────────────────────────────────────

async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type');
  if (ct && ct.includes('json')) return res.json();
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getISOWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getWeekBounds(now = new Date()) {
  // Monday 00:00 UTC of this week
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + mondayOffset);
  monday.setUTCHours(0, 0, 0, 0);

  // Sunday 23:59:59.999 UTC
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] [TOURNAMENT] ${msg}`);
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Get all bots that are actively trading (trading_mode != 'off')
 * Note: nfa_id in bots table may be null (not minted on-chain yet),
 * but they still trade. We use bot.id as a fallback nfa_id for tournament entries.
 */
async function getActiveTradingBots() {
  const bots = await supabaseRequest(
    'bots?select=id,name,nfa_id,trading_mode,trading_config&trading_mode=neq.off'
  );
  return bots || [];
}

/**
 * Get trading stats for a list of NFA IDs
 * Note: In the paper trading engine, nfa_id in nfa_trading_stats
 * may match bot.id (when bot has no on-chain NFA)
 */
async function getTradingStats(nfaIds) {
  if (!nfaIds.length) return [];
  const ids = nfaIds.join(',');
  const stats = await supabaseRequest(
    `nfa_trading_stats?nfa_id=in.(${ids})`
  );
  return stats || [];
}

/**
 * Get trade count for a bot during a specific time period
 */
async function getTradesInPeriod(botId, startAt, endAt) {
  // Ensure proper ISO format for timestamps
  const start = new Date(startAt).toISOString();
  const end = new Date(endAt).toISOString();
  const trades = await supabaseRequest(
    `nfa_trades?bot_id=eq.${botId}&open_at=gte.${encodeURIComponent(start)}&open_at=lte.${encodeURIComponent(end)}&select=id,pnl_usd,status`
  );
  if (!trades || trades.length === 0) return { count: 0, wins: 0, pnl: 0 };
  
  const closed = trades.filter(t => t.status === 'closed');
  const wins = closed.filter(t => (t.pnl_usd || 0) > 0).length;
  const pnl = closed.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);
  
  return { count: trades.length, wins, pnl, winRate: closed.length > 0 ? (wins / closed.length) * 100 : 0 };
}

/**
 * Get the current active tournament (if any)
 */
async function getActiveTournament() {
  const tournaments = await supabaseRequest(
    'trading_tournaments?status=eq.active&order=start_at.desc&limit=1'
  );
  return tournaments && tournaments.length > 0 ? tournaments[0] : null;
}

/**
 * Create a new tournament
 */
async function createTournament(name, startAt, endAt) {
  log(`Creating tournament: "${name}" (${startAt.toISOString()} → ${endAt.toISOString()})`);
  
  const result = await supabaseRequest('trading_tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name,
      status: 'active',
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      total_participants: 0,
      prize_pool_usd: 0,
    }),
  });
  
  const tournament = Array.isArray(result) ? result[0] : result;
  log(`Tournament created: ID=${tournament.id}`);
  return tournament;
}

/**
 * Snapshot current PnL and create entries for all active bots
 */
async function snapshotAndCreateEntries(tournament) {
  const bots = await getActiveTradingBots();
  if (bots.length === 0) {
    log('No active trading bots found for tournament');
    return;
  }
  
  // Use bot.nfa_id if set, otherwise use bot.id as the effective nfa_id
  // (paper trading engine stores bot.id as nfa_id in trades/stats when no on-chain NFA)
  const effectiveNfaIds = bots.map(b => b.nfa_id || b.id).filter(Boolean);
  const stats = await getTradingStats(effectiveNfaIds);
  const statsMap = new Map();
  for (const s of stats) {
    statsMap.set(s.nfa_id, s);
  }
  
  const entries = [];
  for (const bot of bots) {
    const effectiveNfaId = bot.nfa_id || bot.id;
    const botStats = statsMap.get(effectiveNfaId);
    const currentPnl = botStats?.total_pnl_usd || 0;
    
    // Parse strategy from trading_config
    let strategy = 'unknown';
    try {
      const config = typeof bot.trading_config === 'string' ? JSON.parse(bot.trading_config) : bot.trading_config;
      strategy = config?.strategy || config?.strategy_name || 'default';
    } catch { }
    
    entries.push({
      tournament_id: tournament.id,
      bot_id: bot.id,
      nfa_id: effectiveNfaId,
      bot_name: bot.name || `Bot #${bot.id}`,
      strategy,
      start_pnl_usd: currentPnl,
      current_pnl_usd: currentPnl,
      tournament_pnl_usd: 0,
      tournament_pnl_pct: 0,
      trades_count: 0,
      win_rate: 0,
      rank: null,
    });
  }
  
  if (entries.length > 0) {
    await supabaseRequest('trading_tournament_entries', {
      method: 'POST',
      body: JSON.stringify(entries),
      prefer: 'return=minimal',
    });
    
    // Update participant count
    await supabaseRequest(`trading_tournaments?id=eq.${tournament.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ total_participants: entries.length }),
    });
    
    log(`Created ${entries.length} tournament entries for tournament ${tournament.id}`);
  }
}

/**
 * Hourly update: refresh PnL for all tournament entries
 */
async function updateTournamentEntries(tournament) {
  // Always try to enroll new bots first
  await enrollNewBots(tournament);
  
  const entries = await supabaseRequest(
    `trading_tournament_entries?tournament_id=eq.${tournament.id}&select=*`
  );
  
  if (!entries || entries.length === 0) return;
  
  // Get current stats for all participating bots
  const nfaIds = entries.map(e => e.nfa_id).filter(Boolean);
  const stats = nfaIds.length > 0 ? await getTradingStats(nfaIds) : [];
  const statsMap = new Map();
  for (const s of stats) {
    statsMap.set(s.nfa_id, s);
  }
  
  // Update each entry
  const updates = [];
  for (const entry of entries) {
    const botStats = statsMap.get(entry.nfa_id);
    const currentPnl = botStats?.total_pnl_usd || 0;
    const tournamentPnl = currentPnl - (entry.start_pnl_usd || 0);
    const startBalance = 10000; // Default paper balance
    const tournamentPnlPct = startBalance > 0 ? (tournamentPnl / startBalance) * 100 : 0;
    
    // Get trades during tournament period
    const tradeData = await getTradesInPeriod(
      entry.bot_id,
      tournament.start_at,
      new Date().toISOString()
    );
    
    updates.push({
      id: entry.id,
      current_pnl_usd: currentPnl,
      tournament_pnl_usd: tournamentPnl,
      tournament_pnl_pct: tournamentPnlPct,
      trades_count: tradeData.count,
      win_rate: tradeData.winRate,
      updated_at: new Date().toISOString(),
    });
  }
  
  // Sort by tournament PnL for ranking
  updates.sort((a, b) => b.tournament_pnl_usd - a.tournament_pnl_usd);
  updates.forEach((u, i) => { u.rank = i + 1; });
  
  // Batch update entries
  for (const update of updates) {
    await supabaseRequest(`trading_tournament_entries?id=eq.${update.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        current_pnl_usd: update.current_pnl_usd,
        tournament_pnl_usd: update.tournament_pnl_usd,
        tournament_pnl_pct: update.tournament_pnl_pct,
        trades_count: update.trades_count,
        win_rate: update.win_rate,
        rank: update.rank,
        updated_at: update.updated_at,
      }),
    });
  }
  
  log(`Updated ${updates.length} entries for tournament ${tournament.id} (top PnL: $${updates[0]?.tournament_pnl_usd?.toFixed(2) || '0'})`);
}

/**
 * Enroll bots that became active after tournament started
 */
async function enrollNewBots(tournament) {
  const activeBots = await getActiveTradingBots();
  const existingEntries = await supabaseRequest(
    `trading_tournament_entries?tournament_id=eq.${tournament.id}&select=bot_id`
  );
  
  const enrolledBotIds = new Set((existingEntries || []).map(e => e.bot_id));
  const newBots = activeBots.filter(b => !enrolledBotIds.has(b.id));
  
  if (newBots.length === 0) return;
  
  const effectiveNfaIds = newBots.map(b => b.nfa_id || b.id).filter(Boolean);
  const stats = effectiveNfaIds.length > 0 ? await getTradingStats(effectiveNfaIds) : [];
  const statsMap = new Map();
  for (const s of stats) {
    statsMap.set(s.nfa_id, s);
  }
  
  const entries = newBots.map(bot => {
    const effectiveNfaId = bot.nfa_id || bot.id;
    const botStats = statsMap.get(effectiveNfaId);
    let strategy = 'unknown';
    try {
      const config = typeof bot.trading_config === 'string' ? JSON.parse(bot.trading_config) : bot.trading_config;
      strategy = config?.strategy || config?.strategy_name || 'default';
    } catch { }
    
    return {
      tournament_id: tournament.id,
      bot_id: bot.id,
      nfa_id: effectiveNfaId,
      bot_name: bot.name || `Bot #${bot.id}`,
      strategy,
      start_pnl_usd: botStats?.total_pnl_usd || 0,
      current_pnl_usd: botStats?.total_pnl_usd || 0,
      tournament_pnl_usd: 0,
      tournament_pnl_pct: 0,
      trades_count: 0,
      win_rate: 0,
      rank: null,
    };
  });
  
  if (entries.length > 0) {
    await supabaseRequest('trading_tournament_entries', {
      method: 'POST',
      body: JSON.stringify(entries),
      prefer: 'return=minimal',
    });
    
    // Update total participants
    const totalEntries = await supabaseRequest(
      `trading_tournament_entries?tournament_id=eq.${tournament.id}&select=id`,
      { headers: { 'Prefer': 'count=exact' } }
    );
    const count = Array.isArray(totalEntries) ? totalEntries.length : 0;
    
    await supabaseRequest(`trading_tournaments?id=eq.${tournament.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ total_participants: count }),
    });
    
    log(`Enrolled ${entries.length} new bots into tournament ${tournament.id}`);
  }
}

/**
 * Finalize a tournament: set final rankings, mark as completed
 */
async function finalizeTournament(tournament) {
  log(`Finalizing tournament: "${tournament.name}" (ID=${tournament.id})`);
  
  // Final update of entries
  await updateTournamentEntries(tournament);
  
  // Get final entries sorted by PnL
  const entries = await supabaseRequest(
    `trading_tournament_entries?tournament_id=eq.${tournament.id}&order=tournament_pnl_usd.desc`
  );
  
  if (entries && entries.length > 0) {
    const top3 = entries.slice(0, 3);
    log(`🏆 Tournament "${tournament.name}" Results:`);
    top3.forEach((e, i) => {
      const medals = ['🥇', '🥈', '🥉'];
      log(`  ${medals[i]} #${i + 1}: ${e.bot_name} — $${e.tournament_pnl_usd?.toFixed(2)} (${e.trades_count} trades, ${e.win_rate?.toFixed(1)}% WR)`);
    });
  }
  
  // Mark tournament as completed
  await supabaseRequest(`trading_tournaments?id=eq.${tournament.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed' }),
  });
  
  log(`Tournament ${tournament.id} completed.`);
}

/**
 * Start a new tournament for the current week
 */
async function startNewTournament() {
  const now = new Date();
  const weekNum = getISOWeekNumber(now);
  const { start, end } = getWeekBounds(now);
  
  const name = `Trading League Week #${weekNum}`;
  
  // Check if a tournament for this week already exists
  const existing = await supabaseRequest(
    `trading_tournaments?name=eq.${encodeURIComponent(name)}&limit=1`
  );
  
  if (existing && existing.length > 0) {
    log(`Tournament "${name}" already exists (ID=${existing[0].id}, status=${existing[0].status})`);
    if (existing[0].status === 'active') return existing[0];
    // If completed, we'll create one with a different suffix
  }
  
  const tournament = await createTournament(name, start, end);
  await snapshotAndCreateEntries(tournament);
  return tournament;
}

// ─── Main Loop ───────────────────────────────────────────────────────────────

let lastHourlyUpdate = 0;

async function tick() {
  try {
    const now = new Date();
    
    // 1. Check for active tournament
    let tournament = await getActiveTournament();
    
    // 2. If no active tournament → start one
    if (!tournament) {
      log('No active tournament found. Starting new tournament...');
      tournament = await startNewTournament();
      lastHourlyUpdate = Date.now();
      return;
    }
    
    // 3. Check if tournament has ended
    const endAt = new Date(tournament.end_at);
    if (now >= endAt) {
      await finalizeTournament(tournament);
      log('Starting next tournament...');
      await startNewTournament();
      lastHourlyUpdate = Date.now();
      return;
    }
    
    // 4. Hourly update
    if (Date.now() - lastHourlyUpdate >= HOURLY_UPDATE_MS) {
      await updateTournamentEntries(tournament);
      lastHourlyUpdate = Date.now();
    }
    
  } catch (err) {
    log(`ERROR: ${err.message}`);
    console.error(err);
  }
}

// ─── Startup ─────────────────────────────────────────────────────────────────

async function main() {
  log('═══════════════════════════════════════════════════');
  log('  GemBots Trading League Tournament Engine v1.0');
  log('═══════════════════════════════════════════════════');
  log(`Supabase: ${SUPABASE_URL}`);
  log(`Check interval: ${CHECK_INTERVAL_MS / 1000}s`);
  log(`Hourly update interval: ${HOURLY_UPDATE_MS / 1000}s`);
  
  // Startup delay
  await new Promise(r => setTimeout(r, STARTUP_DELAY_MS));
  
  // Initial tick
  await tick();
  
  // Continuous loop
  setInterval(tick, CHECK_INTERVAL_MS);
  
  log('Tournament engine running. Press Ctrl+C to stop.');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
