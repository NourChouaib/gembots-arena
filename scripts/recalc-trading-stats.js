#!/usr/bin/env node
/**
 * Recalculate nfa_trading_stats from nfa_trades data in Supabase.
 * Also updates trading_tournament_entries for the active tournament.
 * 
 * Run once to bootstrap stats from existing trades.
 */

const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && !key.startsWith('#')) process.env[key.trim()] = vals.join('=').trim();
  });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const INITIAL_BALANCE = 10000;

async function main() {
  console.log('📊 Recalculating trading stats from nfa_trades...\n');

  // Get all closed trades
  const { data: closedTrades, error: e1 } = await supabase
    .from('nfa_trades')
    .select('*')
    .eq('status', 'closed')
    .order('close_at', { ascending: true });

  if (e1) { console.error('Error fetching closed trades:', e1); return; }
  console.log(`Found ${closedTrades.length} closed trades`);

  // Get all open trades
  const { data: openTrades, error: e2 } = await supabase
    .from('nfa_trades')
    .select('*')
    .eq('status', 'open');

  if (e2) { console.error('Error fetching open trades:', e2); return; }
  console.log(`Found ${openTrades.length} open trades`);

  // Get all bots
  const { data: bots, error: e3 } = await supabase
    .from('bots')
    .select('id, nfa_id, name')
    .not('nfa_id', 'is', null);

  if (e3) { console.error('Error fetching bots:', e3); return; }

  // Aggregate stats per bot_id
  const statsMap = new Map();

  for (const bot of bots) {
    statsMap.set(bot.id, {
      nfa_id: bot.nfa_id,
      bot_id: bot.id,
      bot_name: bot.name,
      total_trades: 0,
      open_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      total_pnl_usd: 0,
      pnl_values: [],
      best_trade_pnl: 0,
      worst_trade_pnl: 0,
      current_streak: 0,
      best_streak: 0,
      total_hold_minutes: 0,
      open_size_usd: 0
    });
  }

  // Process closed trades
  for (const trade of closedTrades) {
    const s = statsMap.get(trade.bot_id);
    if (!s) continue;

    const pnl = trade.pnl_usd || 0;
    s.total_trades++;
    s.total_pnl_usd += pnl;
    s.pnl_values.push(pnl);

    if (pnl > 0) {
      s.winning_trades++;
      s.current_streak = s.current_streak > 0 ? s.current_streak + 1 : 1;
    } else {
      s.losing_trades++;
      s.current_streak = s.current_streak < 0 ? s.current_streak - 1 : -1;
    }
    if (Math.abs(s.current_streak) > s.best_streak) s.best_streak = Math.abs(s.current_streak);
    if (pnl > s.best_trade_pnl) s.best_trade_pnl = pnl;
    if (pnl < s.worst_trade_pnl) s.worst_trade_pnl = pnl;

    // Hold time
    if (trade.open_at && trade.close_at) {
      const holdMs = new Date(trade.close_at) - new Date(trade.open_at);
      s.total_hold_minutes += holdMs / 60000;
    }
  }

  // Process open trades
  for (const trade of openTrades) {
    const s = statsMap.get(trade.bot_id);
    if (!s) continue;
    s.open_trades++;
    s.open_size_usd += trade.size_usd || 0;
  }

  // Upsert stats
  let updated = 0;
  for (const [botId, s] of statsMap) {
    if (s.total_trades === 0 && s.open_trades === 0) continue;

    const winRate = s.total_trades > 0 ? (s.winning_trades / s.total_trades) * 100 : 0;
    const avgPnlPct = s.total_trades > 0 ? (s.total_pnl_usd / (s.total_trades * 100)) * 100 : 0; // avg per $100 trade
    const avgHoldMin = s.total_trades > 0 ? s.total_hold_minutes / s.total_trades : 0;
    const paperBalance = INITIAL_BALANCE + s.total_pnl_usd - s.open_size_usd;

    // Sharpe ratio (simplified)
    let sharpe = 0;
    if (s.pnl_values.length > 1) {
      const mean = s.total_pnl_usd / s.pnl_values.length;
      const variance = s.pnl_values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / s.pnl_values.length;
      const stdDev = Math.sqrt(variance);
      sharpe = stdDev > 0 ? mean / stdDev : 0;
    }

    const { error } = await supabase
      .from('nfa_trading_stats')
      .upsert({
        nfa_id: s.nfa_id,
        bot_id: s.bot_id,
        total_trades: s.total_trades,
        open_trades: s.open_trades,
        winning_trades: s.winning_trades,
        losing_trades: s.losing_trades,
        win_rate: winRate,
        total_pnl_usd: s.total_pnl_usd,
        avg_pnl_pct: avgPnlPct,
        best_trade_pnl: s.best_trade_pnl,
        worst_trade_pnl: s.worst_trade_pnl,
        sharpe_ratio: sharpe,
        current_streak: s.current_streak,
        best_streak: s.best_streak,
        avg_hold_minutes: avgHoldMin,
        paper_balance_usd: paperBalance,
        updated_at: new Date().toISOString()
      }, { onConflict: 'nfa_id' });

    if (error) {
      console.error(`Error upserting stats for bot ${s.bot_name} (nfa_id=${s.nfa_id}):`, error);
    } else {
      if (s.total_trades > 0) {
        console.log(`✅ ${s.bot_name}: ${s.total_trades} trades, WR ${winRate.toFixed(1)}%, PnL $${s.total_pnl_usd.toFixed(2)}, Balance $${paperBalance.toFixed(2)}`);
        updated++;
      }
    }
  }

  console.log(`\n📊 Updated ${updated} bot stats`);

  // Now update tournament entries
  const { data: activeTournaments } = await supabase
    .from('trading_tournaments')
    .select('*')
    .eq('status', 'active');

  if (!activeTournaments || activeTournaments.length === 0) {
    console.log('No active tournament found');
    return;
  }

  const tournament = activeTournaments[0];
  console.log(`\n🏆 Updating tournament: ${tournament.name}`);

  // Get all stats
  const { data: allStats } = await supabase
    .from('nfa_trading_stats')
    .select('*')
    .gt('total_trades', 0)
    .order('total_pnl_usd', { ascending: false });

  if (!allStats) return;

  // Get bot names
  const botNameMap = new Map(bots.map(b => [b.id, b.name]));

  // Upsert tournament entries
  let entryCount = 0;
  for (const stat of allStats) {
    const botName = botNameMap.get(stat.bot_id) || `NFA #${stat.nfa_id}`;

    const { error: upsertErr } = await supabase
      .from('trading_tournament_entries')
      .upsert({
        tournament_id: tournament.id,
        bot_id: stat.bot_id,
        nfa_id: stat.nfa_id,
        bot_name: botName,
        strategy: 'default',
        start_pnl_usd: 0,
        current_pnl_usd: stat.total_pnl_usd,
        tournament_pnl_usd: stat.total_pnl_usd,
        tournament_pnl_pct: stat.total_pnl_usd / INITIAL_BALANCE * 100,
        trades_count: stat.total_trades,
        win_rate: stat.win_rate,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tournament_id,bot_id' });

    if (upsertErr) {
      console.error(`Error upserting tournament entry for ${botName}:`, upsertErr);
    } else {
      entryCount++;
    }
  }

  // Update ranks
  const { data: allEntries } = await supabase
    .from('trading_tournament_entries')
    .select('id, tournament_pnl_usd')
    .eq('tournament_id', tournament.id)
    .order('tournament_pnl_usd', { ascending: false });

  if (allEntries) {
    for (let i = 0; i < allEntries.length; i++) {
      await supabase
        .from('trading_tournament_entries')
        .update({ rank: i + 1 })
        .eq('id', allEntries[i].id);
    }
  }

  // Update tournament participant count
  await supabase
    .from('trading_tournaments')
    .update({ total_participants: entryCount })
    .eq('id', tournament.id);

  console.log(`✅ Updated ${entryCount} tournament entries with ranks`);
  console.log('\n🎉 Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
