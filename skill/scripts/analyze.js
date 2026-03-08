#!/usr/bin/env node
/**
 * GemBots Token Analyzer
 * 
 * Fetches market data and suggests best tokens for prediction battles.
 * 
 * Usage: node analyze.js [--top N] [--min-score N]
 */

const API_BASE = process.env.GEMBOTS_API || 'https://gembots.ainmid.com/api/v1';

async function fetchMarket() {
  const res = await fetch(`${API_BASE}/market?limit=30&sort=score`);
  return res.json();
}

async function fetchOpenBattles() {
  const res = await fetch(`${API_BASE}/arena/open`);
  return res.json();
}

function analyzeToken(token) {
  const signals = [];
  let bullScore = 0;
  let bearScore = 0;
  
  // V2 Score (primary indicator)
  if (token.v2_score >= 80) {
    signals.push('🔥 High v2_score');
    bullScore += 3;
  } else if (token.v2_score >= 60) {
    signals.push('✅ Good v2_score');
    bullScore += 1;
  }
  
  // Smart money
  if (token.smart_money >= 10) {
    signals.push('🐋 Strong smart money');
    bullScore += 3;
  } else if (token.smart_money >= 5) {
    signals.push('👀 Smart money present');
    bullScore += 1;
  }
  
  // KOL mentions
  if (token.kol_mentions >= 5) {
    signals.push('📢 Multiple KOL mentions');
    bullScore += 2;
  } else if (token.kol_mentions >= 2) {
    signals.push('💬 KOL attention');
    bullScore += 1;
  }
  
  // Price momentum
  if (token.price_change_1h > 100) {
    signals.push('🚀 Pumping hard (+' + token.price_change_1h + '%)');
    bullScore += 2;
  } else if (token.price_change_1h > 30) {
    signals.push('📈 Uptrend (+' + token.price_change_1h + '%)');
    bullScore += 1;
  } else if (token.price_change_1h < -30) {
    signals.push('📉 Dumping (' + token.price_change_1h + '%)');
    bearScore += 2;
  }
  
  // Risk factors
  if (token.risk_score > 60) {
    signals.push('⚠️ High risk');
    bearScore += 1;
  }
  if (token.age_minutes < 10) {
    signals.push('🆕 Very new (<10min)');
    // Could go either way
  }
  if (token.holders < 200) {
    signals.push('👥 Low holders');
    bearScore += 1;
  }
  
  // Calculate suggested prediction
  const netScore = bullScore - bearScore;
  let prediction;
  let confidence;
  
  if (netScore >= 5) {
    prediction = 1.5 + Math.random() * 0.5; // 1.5-2.0x
    confidence = 'HIGH';
  } else if (netScore >= 3) {
    prediction = 1.2 + Math.random() * 0.3; // 1.2-1.5x
    confidence = 'MEDIUM';
  } else if (netScore >= 1) {
    prediction = 1.0 + Math.random() * 0.2; // 1.0-1.2x
    confidence = 'LOW';
  } else if (netScore <= -2) {
    prediction = 0.7 + Math.random() * 0.2; // 0.7-0.9x
    confidence = 'BEARISH';
  } else {
    prediction = 0.9 + Math.random() * 0.2; // 0.9-1.1x
    confidence = 'NEUTRAL';
  }
  
  return {
    symbol: token.symbol,
    address: token.address,
    v2_score: token.v2_score,
    smart_money: token.smart_money,
    kol_mentions: token.kol_mentions,
    price_change_1h: token.price_change_1h,
    risk_score: token.risk_score,
    signals,
    prediction: parseFloat(prediction.toFixed(2)),
    confidence,
    net_score: netScore,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const topN = parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1] || '5');
  const minScore = parseInt(args.find(a => a.startsWith('--min-score='))?.split('=')[1] || '60');
  
  console.log('🤖 GemBots Token Analyzer\n');
  
  // Fetch data
  const [market, battles] = await Promise.all([
    fetchMarket(),
    fetchOpenBattles(),
  ]);
  
  console.log(`📊 Analyzing ${market.tokens?.length || 0} tokens...\n`);
  
  // Analyze and filter
  const analyzed = (market.tokens || [])
    .filter(t => t.v2_score >= minScore)
    .map(analyzeToken)
    .sort((a, b) => b.net_score - a.net_score)
    .slice(0, topN);
  
  // Output
  console.log('🎯 TOP PICKS:\n');
  
  for (const token of analyzed) {
    console.log(`${token.symbol} (${token.address.slice(0, 8)}...)`);
    console.log(`   Prediction: ${token.prediction}x [${token.confidence}]`);
    console.log(`   V2: ${token.v2_score} | Smart: ${token.smart_money} | KOLs: ${token.kol_mentions}`);
    console.log(`   Signals: ${token.signals.join(', ')}`);
    console.log('');
  }
  
  // Show open battles
  const openRooms = battles.open_rooms || [];
  if (openRooms.length > 0) {
    console.log('⚔️ OPEN BATTLES:\n');
    for (const room of openRooms.slice(0, 5)) {
      console.log(`   ${room.host?.name || 'Unknown'} (${room.room_id.slice(0, 8)}...)`);
      console.log(`   Record: ${room.host?.record || 'N/A'} | Stake: ${room.stake_sol} SOL`);
      console.log('');
    }
  }
  
  // Output JSON for programmatic use
  if (args.includes('--json')) {
    console.log('\n📋 JSON OUTPUT:');
    console.log(JSON.stringify({ picks: analyzed, open_battles: openRooms }, null, 2));
  }
}

main().catch(console.error);
