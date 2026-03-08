#!/usr/bin/env node
// Load env from .env file
const fs = require('fs');
const envPath = require('path').join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !key.startsWith('#') && val.length) {
      process.env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}
/**
 * GemBots Battle Resolver v2 — with ELO Rating + On-Chain Recording
 * 
 * Runs every 10 seconds:
 * 1. Finds battles with status='active' where resolves_at has passed
 * 2. Fetches real token price from DexScreener
 * 3. Calculates actual_x multiplier
 * 4. Determines winner (closest prediction)
 * 5. Updates HP, wins/losses, ELO rating, league
 * 6. Resolves battle
 */

const { ethers } = require('ethers');

// ============================================
// ON-CHAIN BATTLE RECORDER
// ============================================
const BATTLE_RECORDER_ADDRESS = '0x4BaA0bCCD27D68a9A752c0a603b3C0b6E870b3F0';
const BSC_RPC = 'https://bsc-dataseed1.binance.org';
const RECORDER_ABI = [
  'function recordBattle(string battleId, uint256 winnerNfaId, uint256 loserNfaId, string token, uint64 winnerAccuracy, uint64 loserAccuracy, uint64 damage) external',
  'function totalBattlesRecorded() view returns (uint256)',
];

let recorderContract = null;
try {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (pk) {
    const provider = new ethers.JsonRpcProvider(BSC_RPC);
    const wallet = new ethers.Wallet(pk, provider);
    recorderContract = new ethers.Contract(BATTLE_RECORDER_ADDRESS, RECORDER_ABI, wallet);
    console.log('🔗 On-chain BattleRecorder connected');
  } else {
    console.warn('⚠️ No DEPLOYER_PRIVATE_KEY — on-chain recording disabled');
  }
} catch (e) {
  console.warn('⚠️ BattleRecorder init failed:', e.message);
}

/**
 * Record battle result on-chain (non-blocking, fire-and-forget)
 */
async function recordBattleOnChain(battleId, winnerNfaId, loserNfaId, tokenSymbol, winnerAccBps, loserAccBps, damage) {
  if (!recorderContract) return;
  if (!winnerNfaId || !loserNfaId) {
    console.log('   ⏭️ Skip on-chain: one or both bots have no NFA');
    return;
  }
  try {
    const tx = await recorderContract.recordBattle(
      battleId,
      winnerNfaId,
      loserNfaId,
      tokenSymbol,
      winnerAccBps,
      loserAccBps,
      damage
    );
    console.log(`   ⛓️ On-chain TX: ${tx.hash}`);
    // Don't await receipt — fire and forget to not block resolver
    tx.wait().then(receipt => {
      console.log(`   ⛓️ Confirmed in block ${receipt.blockNumber} (gas: ${receipt.gasUsed})`);
    }).catch(err => {
      console.warn(`   ⚠️ On-chain TX failed: ${err.message}`);
    });
  } catch (e) {
    console.warn(`   ⚠️ On-chain record failed: ${e.message}`);
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ;

const RESOLVE_INTERVAL = 10000; // 10 seconds
const HP_DAMAGE = 10; // HP lost by loser
const BOT_TOKEN = process.env.BOT_TOKEN;

// ============================================
// TELEGRAM NOTIFICATIONS
// ============================================

async function sendTelegramNotification(telegramId, message) {
  if (!telegramId || !BOT_TOKEN) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🎮 Open Arena', web_app: { url: 'https://gembots.space' } }
          ]]
        }
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      // Silently ignore - user may have blocked the bot
      if (!err.includes('bot was blocked') && !err.includes('chat not found')) {
        console.log(`   📱 TG notify failed for ${telegramId}: ${res.status}`);
      }
    }
  } catch (e) {
    // Non-critical, don't crash resolver
  }
}

async function notifyBattleResult(winner, loser, battle, actual_x, eloResult) {
  const tokenSymbol = battle.token_symbol || '???';
  const stakeAmount = battle.stake_sol || 0;
  
  // Notify winner
  if (winner.telegram_id) {
    const winMsg = stakeAmount > 0
      ? `🏆 *Victory!* Your bot *${winner.name}* beat *${loser.name}*!\n\n` +
        `📈 Token: $${tokenSymbol} | Result: ${actual_x.toFixed(2)}x\n` +
        `🎯 Your prediction: ${battle[`bot${battle.bot1_id === winner.id ? '1' : '2'}_prediction`]}x\n` +
        `💰 Won: ${stakeAmount} SOL\n` +
        `📊 ELO: ${eloResult.winnerNewElo} (+${eloResult.winnerDelta})`
      : `🏆 *Victory!* Your bot *${winner.name}* beat *${loser.name}*!\n\n` +
        `📈 Token: $${tokenSymbol} | Result: ${actual_x.toFixed(2)}x\n` +
        `🎯 Your prediction: ${battle[`bot${battle.bot1_id === winner.id ? '1' : '2'}_prediction`]}x\n` +
        `📊 ELO: ${eloResult.winnerNewElo} (+${eloResult.winnerDelta})`;
    await sendTelegramNotification(winner.telegram_id, winMsg);
  }
  
  // Notify loser
  if (loser.telegram_id) {
    const newHp = Math.max(0, (loser.hp || 100) - HP_DAMAGE);
    const loseMsg = `⚔️ *Battle Lost!* *${loser.name}* lost to *${winner.name}*\n\n` +
      `📈 Token: $${tokenSymbol} | Result: ${actual_x.toFixed(2)}x\n` +
      `❤️ HP: ${newHp}/100\n` +
      `📊 ELO: ${eloResult.loserNewElo} (${eloResult.loserDelta})` +
      (newHp === 0 ? '\n\n💀 *Bot eliminated!* Time to rebuild...' : '');
    await sendTelegramNotification(loser.telegram_id, loseMsg);
  }
}

// ============================================
// ELO SYSTEM (mirrors src/lib/elo.ts)
// ============================================

function getKFactor(totalGames) {
  if (totalGames < 10) return 40;
  if (totalGames < 30) return 25;
  return 16;
}

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calculateElo(winnerElo, loserElo, winnerGames, loserGames, predictionDiff) {
  winnerElo = winnerElo || 1000;
  loserElo = loserElo || 1000;
  winnerGames = winnerGames || 0;
  loserGames = loserGames || 0;
  predictionDiff = predictionDiff || 1.0;

  const kWinner = getKFactor(winnerGames);
  const kLoser = getKFactor(loserGames);
  
  const expWin = expectedScore(winnerElo, loserElo);
  const expLose = expectedScore(loserElo, winnerElo);
  
  let winnerDelta = Math.round(kWinner * (1 - expWin));
  let loserDelta = Math.round(kLoser * (0 - expLose));
  
  // Perfect prediction bonus (diff < 0.1x)
  const isPerfect = predictionDiff < 0.1;
  if (isPerfect) winnerDelta = Math.round(winnerDelta * 1.5);
  
  // Upset bonus (lower ELO beats higher by 100+)
  const isUpset = loserElo - winnerElo >= 100;
  if (isUpset) winnerDelta = Math.round(winnerDelta * 1.25);
  
  winnerDelta = Math.max(winnerDelta, 1);
  loserDelta = Math.min(loserDelta, -1);
  
  return {
    winnerNewElo: Math.max(100, winnerElo + winnerDelta),
    loserNewElo: Math.max(100, loserElo + loserDelta),
    winnerDelta,
    loserDelta,
    isPerfect,
    isUpset,
  };
}

function getLeagueName(elo) {
  if (elo >= 2000) return 'diamond';
  if (elo >= 1500) return 'gold';
  if (elo >= 1000) return 'silver';
  return 'bronze';
}

// ============================================
// SUPABASE HELPERS
// ============================================

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
  if (!res.ok) {
    throw new Error(`Supabase error: ${res.status} - ${text}`);
  }
  
  return text ? JSON.parse(text) : null;
}

async function fetchTokenPrice(address) {
  // Try DexScreener with retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'GemBots/1.0' }
      });
      const text = await res.text();
      if (text.startsWith('<')) throw new Error('Got HTML instead of JSON (Cloudflare block)');
      const data = JSON.parse(text);
      
      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        return {
          price: parseFloat(pair.priceUsd) || 0,
          priceChange5m: parseFloat(pair.priceChange?.m5) || 0,
          priceChange1h: parseFloat(pair.priceChange?.h1) || 0,
          source: 'dexscreener',
        };
      }
    } catch (e) {
      console.warn(`DexScreener attempt ${attempt + 1} failed:`, e.message);
      if (attempt === 0) await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
    }
  }

  // Fallback: Jupiter Price API v2
  try {
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${address}`);
    const data = await res.json();
    if (data.data && data.data[address]) {
      const price = parseFloat(data.data[address].price) || 0;
      console.log(`Jupiter fallback price for ${address}: $${price}`);
      return {
        price,
        priceChange5m: 0, // Jupiter doesn't provide change data
        priceChange1h: 0,
        source: 'jupiter',
      };
    }
  } catch (e) {
    console.warn('Jupiter fallback failed:', e.message);
  }

  // Last resort: simulate
  console.warn(`All price sources failed for ${address}, using simulation`);
  return {
    price: 0,
    priceChange5m: (Math.random() - 0.3) * 50,
    priceChange1h: (Math.random() - 0.3) * 100,
    source: 'simulated',
  };
}

// ============================================
// BATTLE RESOLUTION
// ============================================

async function resolveBattle(battle, bot1, bot2) {
  console.log(`\n⚔️ Resolving battle ${battle.id.slice(0, 8)}...`);
  console.log(`   Token: ${battle.token_symbol}`);
  console.log(`   ${bot1.name} (ELO:${bot1.elo || 1000}): ${battle.bot1_prediction}x | ${bot2.name} (ELO:${bot2.elo || 1000}): ${battle.bot2_prediction}x`);
  
  // Fetch current price data
  const priceData = await fetchTokenPrice(battle.token_address);
  const actual_x = Math.max(0.1, 1 + (priceData.priceChange5m / 100));
  
  console.log(`   Actual result: ${actual_x.toFixed(4)}x`);
  
  // Determine winner (closest to actual)
  const diff1 = Math.abs(battle.bot1_prediction - actual_x);
  const diff2 = Math.abs(battle.bot2_prediction - actual_x);
  
  const bot1Wins = diff1 <= diff2;
  const winner = bot1Wins ? bot1 : bot2;
  const loser = bot1Wins ? bot2 : bot1;
  const winnerDiff = Math.min(diff1, diff2);
  
  console.log(`   Winner: ${winner.name} (diff: ${winnerDiff.toFixed(2)})`);
  
  // Calculate ELO changes
  const winnerTotalGames = (winner.wins || 0) + (winner.losses || 0);
  const loserTotalGames = (loser.wins || 0) + (loser.losses || 0);
  
  const eloResult = calculateElo(
    winner.elo || 1000,
    loser.elo || 1000,
    winnerTotalGames,
    loserTotalGames,
    winnerDiff,
  );
  
  const winnerLeague = getLeagueName(eloResult.winnerNewElo);
  const loserLeague = getLeagueName(eloResult.loserNewElo);
  
  if (eloResult.isPerfect) console.log(`   🎯 PERFECT prediction!`);
  if (eloResult.isUpset) console.log(`   ⚡ UPSET win!`);
  console.log(`   ELO: ${winner.name} ${winner.elo||1000}→${eloResult.winnerNewElo} (+${eloResult.winnerDelta}) | ${loser.name} ${loser.elo||1000}→${eloResult.loserNewElo} (${eloResult.loserDelta})`);
  
  // Update battle status
  const battleUpdate = {
    status: 'resolved',
    actual_x: parseFloat(actual_x.toFixed(4)),
    winner_id: winner.id,
    damage_dealt: HP_DAMAGE,
  };
  
  // Only set finished_at if column exists (graceful)
  try {
    battleUpdate.finished_at = new Date().toISOString();
    await supabaseRequest(`battles?id=eq.${battle.id}`, {
      method: 'PATCH',
      body: JSON.stringify(battleUpdate),
    });
  } catch (e) {
    // If finished_at fails, retry without it
    if (e.message.includes('finished_at')) {
      delete battleUpdate.finished_at;
      await supabaseRequest(`battles?id=eq.${battle.id}`, {
        method: 'PATCH',
        body: JSON.stringify(battleUpdate),
      });
    } else {
      throw e;
    }
  }
  
  // Update winner: +1 win, ELO, league, win_streak, peak_elo
  const winnerUpdate = {
    wins: (winner.wins || 0) + 1,
    win_streak: (winner.win_streak || 0) + 1,
  };
  
  // Add ELO fields if they exist in schema
  if ('elo' in winner) {
    winnerUpdate.elo = eloResult.winnerNewElo;
    winnerUpdate.peak_elo = Math.max(winner.peak_elo || 1000, eloResult.winnerNewElo);
    winnerUpdate.total_battles = winnerTotalGames + 1;
    winnerUpdate.league = winnerLeague;
  }
  
  await supabaseRequest(`bots?id=eq.${winner.id}`, {
    method: 'PATCH',
    body: JSON.stringify(winnerUpdate),
    prefer: 'return=minimal',
  });
  
  // Update loser: +1 loss, HP, ELO, league, reset win_streak
  const newHp = Math.max(0, (loser.hp || 100) - HP_DAMAGE);
  const loserUpdate = {
    losses: (loser.losses || 0) + 1,
    hp: newHp,
    win_streak: 0,
  };
  
  if ('elo' in loser) {
    loserUpdate.elo = eloResult.loserNewElo;
    loserUpdate.total_battles = loserTotalGames + 1;
    loserUpdate.league = loserLeague;
  }
  
  await supabaseRequest(`bots?id=eq.${loser.id}`, {
    method: 'PATCH',
    body: JSON.stringify(loserUpdate),
    prefer: 'return=minimal',
  });
  
  // Update room status
  if (battle.room_id) {
    // Check if room was created by a human/guest — if so, finish it (no auto-rematch)
    const [room] = await supabaseRequest(`rooms?id=eq.${battle.room_id}&select=host_bot_id`);
    let newRoomStatus = 'waiting'; // NPC rooms cycle back to waiting
    if (room) {
      const [hostBot] = await supabaseRequest(`bots?id=eq.${room.host_bot_id}&select=is_npc`);
      if (hostBot && !hostBot.is_npc) {
        newRoomStatus = 'finished'; // Human rooms don't auto-rematch
      }
    }
    await supabaseRequest(`rooms?id=eq.${battle.room_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newRoomStatus }),
      prefer: 'return=minimal',
    });
  }
  
  console.log(`   ✅ Battle resolved! ${loser.name} HP: ${newHp}`);
  
  // Send Telegram notifications (non-blocking)
  notifyBattleResult(winner, loser, battle, actual_x, eloResult).catch(() => {});
  
  // Record on-chain (non-blocking) — only for NFA-linked bots
  try {
    // Fetch NFA IDs for winner and loser
    const [winnerNfaArr] = await Promise.all([
      supabaseRequest(`bots?id=eq.${winner.id}&select=nfa_id`),
    ]);
    const [loserNfaArr] = await Promise.all([
      supabaseRequest(`bots?id=eq.${loser.id}&select=nfa_id`),
    ]);
    const winnerNfaId = Array.isArray(winnerNfaArr) ? winnerNfaArr[0]?.nfa_id : winnerNfaArr?.nfa_id;
    const loserNfaId = Array.isArray(loserNfaArr) ? loserNfaArr[0]?.nfa_id : loserNfaArr?.nfa_id;
    
    // Calculate accuracy in basis points (0-10000)
    const winnerAccBps = Math.round(Math.max(0, 1 - Math.min(diff1, diff2) / actual_x) * 10000);
    const loserAccBps = Math.round(Math.max(0, 1 - Math.max(diff1, diff2) / actual_x) * 10000);
    
    // DISABLED: on-chain recording too expensive (~$760/day at current battle rate)
    // TODO: implement daily batch snapshot instead
    // recordBattleOnChain(
    //   battle.id,
    //   winnerNfaId,
    //   loserNfaId,
    //   battle.token_symbol || 'UNKNOWN',
    //   winnerAccBps,
    //   loserAccBps,
    //   HP_DAMAGE
    // );
    console.log('   📝 Battle recorded off-chain (on-chain recording paused)');
  } catch (e) {
    console.warn('   ⚠️ On-chain NFA lookup failed:', e.message);
  }
  
  return { winnerId: winner.id, loserId: loser.id, actual_x, eloResult };
}

async function checkAndResolveBattles() {
  try {
    const now = new Date().toISOString();
    
    const battles = await supabaseRequest(
      `battles?status=eq.active&resolves_at=lt.${now}&select=*`
    );
    
    if (!battles || battles.length === 0) return;
    
    console.log(`\n🔍 Found ${battles.length} battles to resolve`);
    
    for (const battle of battles) {
      try {
        // Fetch full bot data including ELO
        const selectFields = 'id,name,hp,wins,losses,win_streak,elo,peak_elo,total_battles,league,telegram_id';
        const [bot1arr, bot2arr] = await Promise.all([
          supabaseRequest(`bots?id=eq.${battle.bot1_id}&select=${selectFields}`),
          supabaseRequest(`bots?id=eq.${battle.bot2_id}&select=${selectFields}`),
        ]);
        
        const bot1 = bot1arr?.[0];
        const bot2 = bot2arr?.[0];
        
        if (!bot1 || !bot2) {
          console.error(`   Missing bot data for battle ${battle.id}`);
          continue;
        }
        
        await resolveBattle(battle, bot1, bot2);
      } catch (e) {
        console.error(`Failed to resolve battle ${battle.id}:`, e.message);
      }
    }
  } catch (e) {
    console.error('Check battles error:', e.message);
  }
}

async function main() {
  console.log('🤖 GemBots Battle Resolver v2 (with ELO) started');
  console.log(`   Checking every ${RESOLVE_INTERVAL / 1000}s\n`);
  
  await checkAndResolveBattles();
  setInterval(checkAndResolveBattles, RESOLVE_INTERVAL);
}

main().catch(console.error);
