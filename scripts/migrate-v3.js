#!/usr/bin/env node
/**
 * GemBots V3 Migration: Schema Fixes + ELO
 * 
 * Since we can't run raw SQL via REST API, this script:
 * 1. Tests which columns exist by trying to read them
 * 2. For missing columns, uses workarounds (insert with new fields, etc.)
 * 3. Updates existing bots with calculated ELO
 * 
 * NOTE: For ALTER TABLE, you MUST run supabase-v3-migration.sql 
 * in the Supabase Dashboard SQL Editor. This script handles the DATA migration.
 */

const SUPABASE_URL = 'process.env.SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ;

async function supabaseRequest(endpoint, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function calculateELO(wins, losses) {
  // Base ELO is 1000
  // Each win/loss adjusts by K-factor
  const totalGames = wins + losses;
  const K = totalGames < 10 ? 40 : totalGames < 30 ? 20 : 15;
  
  // Simple ELO estimation from win/loss record
  const elo = Math.max(100, 1000 + (wins - losses) * K);
  const peakElo = Math.max(1000, 1000 + wins * K);
  
  return { elo, peakElo, totalBattles: totalGames };
}

function getLeague(elo) {
  if (elo >= 2000) return 'diamond';
  if (elo >= 1500) return 'gold';
  if (elo >= 1000) return 'silver';
  return 'bronze';
}

async function main() {
  console.log('🚀 GemBots V3 Migration — Data Update\n');
  
  // Step 1: Check current state
  console.log('📊 Step 1: Checking current schema...');
  
  const bots = await supabaseRequest('bots?select=*&order=wins.desc&limit=50');
  console.log(`   Found ${bots.length} bots`);
  
  const hasElo = bots[0] && 'elo' in bots[0];
  console.log(`   ELO column exists: ${hasElo}`);
  
  if (!hasElo) {
    console.log('\n⚠️  ELO column not found! Run supabase-v3-migration.sql first!');
    console.log('   Go to: Supabase Dashboard → SQL Editor → New Query');
    console.log('   Paste contents of supabase-v3-migration.sql and run it.\n');
    
    // Still calculate what ELO would be for reporting
    console.log('📊 Preview — ELO calculations for existing bots:');
    for (const bot of bots.filter(b => b.wins > 0 || b.losses > 0)) {
      const { elo, peakElo } = calculateELO(bot.wins, bot.losses);
      const league = getLeague(elo);
      console.log(`   ${bot.name}: W${bot.wins}/L${bot.losses} → ELO ${elo} (${league})`);
    }
    return;
  }
  
  // Step 2: Update bots with ELO
  console.log('\n🧠 Step 2: Updating ELO ratings...');
  
  let updated = 0;
  for (const bot of bots) {
    const { elo, peakElo, totalBattles } = calculateELO(bot.wins, bot.losses);
    const league = getLeague(elo);
    
    if (bot.elo !== elo || bot.league !== league) {
      try {
        await supabaseRequest(`bots?id=eq.${bot.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            elo,
            peak_elo: peakElo,
            total_battles: totalBattles,
            league,
          }),
          prefer: 'return=minimal',
        });
        console.log(`   ✅ ${bot.name}: ELO ${bot.elo || 1000} → ${elo} (${league})`);
        updated++;
      } catch (e) {
        console.error(`   ❌ ${bot.name}: ${e.message}`);
      }
    }
  }
  
  console.log(`\n   Updated ${updated}/${bots.length} bots`);
  
  // Step 3: Verify
  console.log('\n📊 Step 3: Leaderboard by ELO:');
  const topBots = await supabaseRequest('bots?select=name,elo,league,wins,losses&order=elo.desc&limit=10');
  for (const bot of topBots) {
    console.log(`   ${bot.league === 'diamond' ? '💎' : bot.league === 'gold' ? '🥇' : bot.league === 'silver' ? '🥈' : '🥉'} ${bot.name}: ELO ${bot.elo} (${bot.league}) W${bot.wins}/L${bot.losses}`);
  }
  
  console.log('\n✅ Migration complete!');
}

main().catch(console.error);
