#!/usr/bin/env node
/**
 * GemBots Test Bot
 * 
 * Simulates an external AI bot connecting to the arena.
 * Uses a simple random strategy for testing.
 */

const API_BASE = 'https://gembots.space/api/v1';

// Generate a random Solana-like wallet address
function randomWallet() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let wallet = '';
  for (let i = 0; i < 44; i++) {
    wallet += chars[Math.floor(Math.random() * chars.length)];
  }
  return wallet;
}

// Simple analysis - random prediction based on v2_score
function analyzeAndPredict(token) {
  const baseMultiplier = 1.0;
  const v2Bonus = (token.v2_score || 50) / 100; // 0-1
  const momentumBonus = Math.min(0.5, (token.price_change_1h || 0) / 200);
  
  // Add some randomness
  const noise = (Math.random() - 0.5) * 0.3;
  
  return Math.max(0.5, Math.min(3.0, baseMultiplier + v2Bonus + momentumBonus + noise));
}

async function runBot(botName, wallet) {
  console.log(`\n🤖 ${botName} starting...`);
  console.log(`   Wallet: ${wallet.slice(0, 8)}...`);
  
  try {
    // 1. Get market data
    console.log('   📊 Fetching market data...');
    const marketRes = await fetch(`${API_BASE}/market?limit=10`);
    const marketData = await marketRes.json();
    
    if (!marketData.tokens?.length) {
      console.log('   ❌ No market data available');
      return;
    }
    
    // 2. Pick best token
    const bestToken = marketData.tokens[0]; // Top by v2_score
    const prediction = analyzeAndPredict(bestToken);
    
    console.log(`   🎯 Picked: ${bestToken.symbol} (v2=${bestToken.v2_score})`);
    console.log(`   📈 Prediction: ${prediction.toFixed(2)}x`);
    
    // 3. Check open battles
    console.log('   ⚔️ Looking for battles...');
    const arenaRes = await fetch(`${API_BASE}/arena/open`);
    const arenaData = await arenaRes.json();
    
    const openRooms = arenaData.open_rooms || [];
    
    if (openRooms.length > 0) {
      // Join existing battle
      const room = openRooms[Math.floor(Math.random() * openRooms.length)];
      console.log(`   🎮 Joining room: ${room.room_id.slice(0, 8)}... vs ${room.host?.name}`);
      
      const joinRes = await fetch(`${API_BASE}/arena/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: room.room_id,
          prediction: parseFloat(prediction.toFixed(2)),
          wallet: wallet,
          bot_name: botName,
        }),
      });
      
      const joinData = await joinRes.json();
      
      if (joinData.success) {
        console.log(`   ✅ Battle started! ID: ${joinData.battle?.id?.slice(0, 8)}`);
        console.log(`   ⏱️ Resolves at: ${joinData.battle?.resolves_at}`);
      } else {
        console.log(`   ❌ Join failed: ${joinData.error}`);
      }
      
    } else {
      // Create new battle
      console.log('   📝 No open rooms, creating new battle...');
      
      const createRes = await fetch(`${API_BASE}/arena/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: wallet,
          token_address: bestToken.address,
          token_symbol: bestToken.symbol,
          prediction: parseFloat(prediction.toFixed(2)),
          bot_name: botName,
        }),
      });
      
      const createData = await createRes.json();
      
      if (createData.success) {
        console.log(`   ✅ Room created! ID: ${createData.room?.id?.slice(0, 8)}`);
        console.log(`   ⏳ Waiting for challenger...`);
      } else {
        console.log(`   ❌ Create failed: ${createData.error}`);
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🎮 GemBots Test Bot Swarm\n');
  
  const bots = [
    { name: '🧪 TestBot-Alpha', wallet: randomWallet() },
    { name: '🔬 TestBot-Beta', wallet: randomWallet() },
    { name: '⚗️ TestBot-Gamma', wallet: randomWallet() },
  ];
  
  // Run bots sequentially with small delay
  for (const bot of bots) {
    await runBot(bot.name, bot.wallet);
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\n✅ Test bots completed!\n');
  
  // Check arena status
  console.log('📊 Arena status:');
  const arenaRes = await fetch(`${API_BASE}/arena/open`);
  const arenaData = await arenaRes.json();
  console.log(`   Open rooms: ${arenaData.open_rooms?.length || 0}`);
  console.log(`   Active battles: ${arenaData.active_battles?.length || 0}`);
}

main().catch(console.error);
