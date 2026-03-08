#!/usr/bin/env node

/**
 * GemBots Tournament Engine
 * 
 * Creates and manages weekly bracket tournaments.
 * Uses a JSON state file + Supabase battles for actual fights.
 * 
 * Usage:
 *   node tournament-engine.js create   -- Create new tournament from top 8 bots
 *   node tournament-engine.js status   -- Show current tournament status
 *   node tournament-engine.js advance  -- Advance to next round (resolve pending matches)
 */

const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !key.startsWith('#')) process.env[key.trim()] = val.join('=').trim();
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const STATE_FILE = path.join(__dirname, '..', 'data', 'tournament.json');
const BOT_TOKEN = process.env.BOT_TOKEN || '';

// Ensure data dir
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

async function supabaseQuery(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

async function supabaseInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return null;
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ============================================
// CREATE TOURNAMENT
// ============================================

async function createTournament() {
  const existing = loadState();
  if (existing && existing.status !== 'finished') {
    console.log('⚠️  Active tournament exists! Finish it first or delete data/tournament.json');
    console.log(`   ${existing.name} — Round ${existing.currentRound}/${existing.totalRounds}`);
    return;
  }

  // Get top 8 active bots by ELO (with HP > 0)
  const bots = await supabaseQuery('bots', '?select=id,name,elo,league,hp,strategy&hp=gt.0&order=elo.desc&limit=8');
  
  if (!bots || bots.length < 4) {
    console.log('❌ Need at least 4 active bots with HP > 0 for a tournament');
    return;
  }

  const bracketSize = bots.length >= 8 ? 8 : 4;
  const participants = bots.slice(0, bracketSize);
  const totalRounds = bracketSize === 8 ? 3 : 2; // 8→QF→SF→Final, 4→SF→Final

  // Seed: #1 vs #8, #2 vs #7, etc.
  const seeded = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    seeded.push({
      matchOrder: i + 1,
      bot1: participants[i],
      bot2: participants[bracketSize - 1 - i],
    });
  }

  const weekNum = getWeekNumber();
  const tournament = {
    id: `week-${weekNum}-${Date.now()}`,
    name: `Weekly Tournament #${weekNum}`,
    status: 'active',
    bracketSize,
    totalRounds,
    currentRound: 1,
    participants: participants.map(b => ({ id: b.id, name: b.name, elo: b.elo, seed: participants.indexOf(b) + 1 })),
    rounds: {
      1: seeded.map(m => ({
        matchOrder: m.matchOrder,
        bot1Id: m.bot1.id,
        bot1Name: m.bot1.name,
        bot2Id: m.bot2.id,
        bot2Name: m.bot2.name,
        winnerId: null,
        battleId: null,
        status: 'pending',
      })),
    },
    createdAt: new Date().toISOString(),
    startsAt: new Date().toISOString(),
  };

  saveState(tournament);

  console.log(`\n🏆 Tournament Created: ${tournament.name}`);
  console.log(`   Bracket: ${bracketSize} bots, ${totalRounds} rounds`);
  console.log(`\n📋 Round 1 Matches:`);
  for (const m of tournament.rounds[1]) {
    console.log(`   Match ${m.matchOrder}: ${m.bot1Name} (ELO ${participants.find(p => p.id === m.bot1Id)?.elo}) vs ${m.bot2Name} (ELO ${participants.find(p => p.id === m.bot2Id)?.elo})`);
  }

  // Start Round 1 battles via matchmaker
  console.log('\n🚀 Starting Round 1 battles...');
  for (const match of tournament.rounds[1]) {
    await startTournamentBattle(tournament, 1, match);
  }
  
  saveState(tournament);
  console.log('\n✅ All Round 1 battles queued!');
}

async function startTournamentBattle(tournament, round, match) {
  // Pick a random BSC token
  const tokens = ['BNB', 'BTC', 'ETH', 'SOL', 'CAKE', 'XRP', 'LINK', 'ADA'];
  const tokenSymbol = tokens[Math.floor(Math.random() * tokens.length)];
  
  // BSC token addresses (major crypto + BNB ecosystem)
  const tokenAddresses = {
    'BNB':  '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    'BTC':  '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    'ETH':  '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    'SOL':  '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF',
    'CAKE': '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    'XRP':  '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
    'LINK': '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
    'ADA':  '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
  };

  const room = await supabaseInsert('rooms', {
    host_bot_id: match.bot1Id,
    challenger_bot_id: match.bot2Id,
    status: 'waiting',
    token_symbol: tokenSymbol,
    token_address: tokenAddresses[tokenSymbol] || tokenAddresses['BONK'],
    duration_minutes: 1,
    stake_amount: 0,
  });

  if (room && room[0]) {
    match.battleId = room[0].id;
    match.status = 'active';
    console.log(`   ⚔️ Match ${match.matchOrder}: ${match.bot1Name} vs ${match.bot2Name} on $${tokenSymbol} (room: ${room[0].id})`);
  } else {
    console.log(`   ❌ Failed to create battle for Match ${match.matchOrder}:`, room);
  }
}

// ============================================
// CHECK & ADVANCE
// ============================================

async function advanceTournament() {
  const state = loadState();
  if (!state || state.status === 'finished') {
    console.log('No active tournament. Run: node tournament-engine.js create');
    return;
  }

  const currentRound = state.currentRound;
  const matches = state.rounds[currentRound];
  
  console.log(`\n🏆 ${state.name} — Round ${currentRound}/${state.totalRounds}`);
  
  // Check battle results for current round
  let allResolved = true;
  for (const match of matches) {
    if (match.status === 'finished') continue;
    
    if (!match.battleId) {
      console.log(`   ⏳ Match ${match.matchOrder}: No battle yet`);
      allResolved = false;
      continue;
    }

    // Check battles directly (room status unreliable with matchmaker re-matching)
    const battles = await supabaseQuery('battles', `?room_id=eq.${match.battleId}&select=id,status,winner_id,bot1_id,bot2_id&order=created_at.desc&limit=1`);
    
    if (battles && battles[0] && battles[0].status === 'resolved' && battles[0].winner_id) {
      match.winnerId = battles[0].winner_id;
      match.status = 'finished';
      const winnerName = match.winnerId === match.bot1Id ? match.bot1Name : match.bot2Name;
      console.log(`   ✅ Match ${match.matchOrder}: ${winnerName} wins!`);
      
      // Mark room as finished to stop matchmaker from re-matching
      await fetch(`${SUPABASE_URL}/rest/v1/rooms?id=eq.${match.battleId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ status: 'finished' }),
      });
    } else if (!battles || battles.length === 0) {
      // No battle yet — room still waiting for matchmaker
      console.log(`   ⏳ Match ${match.matchOrder}: ${match.bot1Name} vs ${match.bot2Name} — waiting for battle`);
      allResolved = false;
    } else {
      console.log(`   ⏳ Match ${match.matchOrder}: ${match.bot1Name} vs ${match.bot2Name} — ${battles[0]?.status || 'unknown'}`);
      allResolved = false;
    }
  }

  if (!allResolved) {
    console.log('\n⏳ Waiting for battles to finish...');
    saveState(state);
    return;
  }

  // All matches resolved — advance or finish
  if (currentRound >= state.totalRounds) {
    // Tournament finished!
    const finalMatch = matches[0];
    const champion = state.participants.find(p => p.id === finalMatch.winnerId);
    state.status = 'finished';
    state.champion = champion;
    state.finishedAt = new Date().toISOString();
    saveState(state);

    console.log(`\n🏆🏆🏆 TOURNAMENT CHAMPION: ${champion?.name} 🏆🏆🏆`);
    return;
  }

  // Create next round
  const nextRound = currentRound + 1;
  const winners = matches.map(m => {
    const winner = state.participants.find(p => p.id === m.winnerId);
    return { id: m.winnerId, name: m.winnerId === m.bot1Id ? m.bot1Name : m.bot2Name };
  });

  // Pair winners: match1 winner vs match2 winner, etc.
  const nextMatches = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      nextMatches.push({
        matchOrder: nextMatches.length + 1,
        bot1Id: winners[i].id,
        bot1Name: winners[i].name,
        bot2Id: winners[i + 1].id,
        bot2Name: winners[i + 1].name,
        winnerId: null,
        battleId: null,
        status: 'pending',
      });
    }
  }

  state.rounds[nextRound] = nextMatches;
  state.currentRound = nextRound;
  saveState(state);

  const roundNames = { 2: 'Semi-Finals', 3: 'FINAL' };
  console.log(`\n🔥 ${roundNames[nextRound] || `Round ${nextRound}`}:`);
  
  for (const match of nextMatches) {
    await startTournamentBattle(state, nextRound, match);
    console.log(`   ⚔️ ${match.bot1Name} vs ${match.bot2Name}`);
  }

  saveState(state);
  console.log('\n✅ Next round started!');
}

// ============================================
// STATUS
// ============================================

function showStatus() {
  const state = loadState();
  if (!state) {
    console.log('No tournament. Run: node tournament-engine.js create');
    return;
  }

  console.log(`\n🏆 ${state.name}`);
  console.log(`   Status: ${state.status} | Bracket: ${state.bracketSize} | Round: ${state.currentRound}/${state.totalRounds}`);
  console.log(`   Created: ${state.createdAt}`);
  
  if (state.champion) {
    console.log(`   🏆 Champion: ${state.champion.name}`);
  }

  console.log('\n📋 Bracket:');
  for (const [round, matches] of Object.entries(state.rounds)) {
    const roundNames = { '1': 'Quarter-Finals', '2': 'Semi-Finals', '3': 'FINAL' };
    console.log(`\n   ${roundNames[round] || `Round ${round}`}:`);
    for (const m of matches) {
      const status = m.status === 'finished' 
        ? `✅ Winner: ${m.winnerId === m.bot1Id ? m.bot1Name : m.bot2Name}`
        : m.status === 'active' ? '⚔️ Fighting...' : '⏳ Pending';
      console.log(`   Match ${m.matchOrder}: ${m.bot1Name} vs ${m.bot2Name} — ${status}`);
    }
  }
}

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

// ============================================
// MAIN
// ============================================

const command = process.argv[2] || 'status';

switch (command) {
  case 'create':
    createTournament().catch(console.error);
    break;
  case 'advance':
    advanceTournament().catch(console.error);
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log('Usage: node tournament-engine.js [create|status|advance]');
}
