#!/usr/bin/env node
/**
 * Export strategy performance report from GemBots battles.
 * Aggregates by trading_style, ai_model, and token — for real trading analysis.
 * 
 * Usage: node scripts/export-strategy-report.js [--days 7] [--output report.json]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const args = process.argv.slice(2);
const daysBack = parseInt(args.find((a, i) => args[i-1] === '--days') || '7');
const outputFile = args.find((a, i) => args[i-1] === '--output') || null;

async function main() {
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();
  
  // 1. Get all resolved battles
  const { data: battles, error: bErr } = await supabase
    .from('battles')
    .select('*')
    .eq('status', 'resolved')
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  
  if (bErr) { console.error('Error fetching battles:', bErr); process.exit(1); }
  
  // 2. Get all bots
  const { data: bots, error: botErr } = await supabase
    .from('bots')
    .select('id,name,strategy,ai_model,trading_style,elo,wins,losses');
  
  if (botErr) { console.error('Error fetching bots:', botErr); process.exit(1); }
  
  const botMap = {};
  bots.forEach(b => { botMap[b.id] = b; });
  
  console.log(`\n📊 GemBots Strategy Report (last ${daysBack} days)`);
  console.log(`Total resolved battles: ${battles.length}\n`);
  
  // 3. Aggregate by trading_style
  const byStyle = {};
  const byModel = {};
  const byToken = {};
  const detailedLog = [];
  
  for (const battle of battles) {
    const bot1 = botMap[battle.bot1_id];
    const bot2 = botMap[battle.bot2_id];
    if (!bot1 || !bot2) continue;
    
    const winner = botMap[battle.winner_id];
    const loser = battle.winner_id === battle.bot1_id ? bot2 : bot1;
    
    // Price movement
    const priceChange = battle.actual_x ? (battle.actual_x - 1) * 100 : 0; // percentage
    
    // Log detailed entry
    detailedLog.push({
      timestamp: battle.created_at,
      token: battle.token_symbol,
      token_address: battle.token_address,
      actual_x: battle.actual_x,
      price_change_pct: parseFloat(priceChange.toFixed(4)),
      winner: winner?.name,
      winner_style: winner?.trading_style,
      winner_model: winner?.ai_model,
      winner_prediction: battle.winner_id === battle.bot1_id ? battle.bot1_prediction : battle.bot2_prediction,
      loser: loser?.name,
      loser_style: loser?.trading_style,
      loser_model: loser?.ai_model,
      loser_prediction: battle.winner_id === battle.bot1_id ? battle.bot2_prediction : battle.bot1_prediction,
      duration_minutes: battle.duration_minutes,
    });
    
    // Aggregate winner stats by trading style
    if (winner) {
      const style = winner.trading_style || 'unknown';
      if (!byStyle[style]) byStyle[style] = { wins: 0, total: 0, predictions: [], actual_xs: [] };
      byStyle[style].wins++;
      byStyle[style].total++;
      byStyle[style].predictions.push(battle.winner_id === battle.bot1_id ? battle.bot1_prediction : battle.bot2_prediction);
      byStyle[style].actual_xs.push(battle.actual_x);
    }
    if (loser) {
      const style = loser.trading_style || 'unknown';
      if (!byStyle[style]) byStyle[style] = { wins: 0, total: 0, predictions: [], actual_xs: [] };
      byStyle[style].total++;
    }
    
    // By AI model
    if (winner) {
      const model = winner.ai_model || 'unknown';
      if (!byModel[model]) byModel[model] = { wins: 0, total: 0 };
      byModel[model].wins++;
      byModel[model].total++;
    }
    if (loser) {
      const model = loser.ai_model || 'unknown';
      if (!byModel[model]) byModel[model] = { wins: 0, total: 0 };
      byModel[model].total++;
    }
    
    // By token
    const tkn = battle.token_symbol || 'unknown';
    if (!byToken[tkn]) byToken[tkn] = { battles: 0, avg_x: 0, xs: [], address: battle.token_address };
    byToken[tkn].battles++;
    if (battle.actual_x) byToken[tkn].xs.push(battle.actual_x);
  }
  
  // Print style stats
  console.log('=== BY TRADING STYLE ===');
  for (const [style, s] of Object.entries(byStyle).sort((a,b) => b[1].wins/b[1].total - a[1].wins/a[1].total)) {
    const wr = (s.wins / s.total * 100).toFixed(1);
    const avgPred = s.predictions.length ? (s.predictions.reduce((a,b) => a+b, 0) / s.predictions.length).toFixed(3) : '?';
    const avgX = s.actual_xs.filter(x => x).length ? (s.actual_xs.filter(x => x).reduce((a,b) => a+b, 0) / s.actual_xs.filter(x => x).length).toFixed(4) : '?';
    console.log(`  ${style.padEnd(18)} | WR: ${wr}% | Battles: ${s.total} | Avg prediction: ${avgPred}x | Avg actual: ${avgX}x`);
  }
  
  console.log('\n=== BY AI MODEL ===');
  for (const [model, s] of Object.entries(byModel).sort((a,b) => b[1].wins/b[1].total - a[1].wins/a[1].total)) {
    const wr = (s.wins / s.total * 100).toFixed(1);
    console.log(`  ${model.padEnd(20)} | WR: ${wr}% | Battles: ${s.total}`);
  }
  
  console.log('\n=== BY TOKEN (top 10 by battles) ===');
  const tokensSorted = Object.entries(byToken).sort((a,b) => b[1].battles - a[1].battles).slice(0, 10);
  for (const [tkn, t] of tokensSorted) {
    const avgX = t.xs.length ? (t.xs.reduce((a,b) => a+b, 0) / t.xs.length).toFixed(4) : '?';
    const volatility = t.xs.length > 1 ? Math.sqrt(t.xs.reduce((sum, x) => sum + (x - parseFloat(avgX)) ** 2, 0) / t.xs.length).toFixed(4) : '?';
    console.log(`  ${tkn.padEnd(12)} | Battles: ${String(t.battles).padStart(3)} | Avg X: ${avgX} | Volatility: ${volatility}`);
  }
  
  // Save full report
  const report = {
    generated_at: new Date().toISOString(),
    period_days: daysBack,
    total_battles: battles.length,
    by_trading_style: byStyle,
    by_ai_model: byModel,
    by_token: byToken,
    top_bots: bots.filter(b => b.wins + b.losses > 10).sort((a,b) => b.elo - a.elo).slice(0, 15).map(b => ({
      name: b.name,
      elo: b.elo,
      win_rate: ((b.wins / (b.wins + b.losses)) * 100).toFixed(1) + '%',
      ai_model: b.ai_model,
      trading_style: b.trading_style,
      total_battles: b.wins + b.losses,
    })),
    detailed_battles: detailedLog,
  };
  
  const outPath = outputFile || path.join(__dirname, '..', 'data', `strategy-report-${new Date().toISOString().split('T')[0]}.json`);
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Full report saved to: ${outPath}`);
  console.log(`   ${detailedLog.length} detailed battle entries with predictions & actual prices`);
}

main().catch(console.error);
