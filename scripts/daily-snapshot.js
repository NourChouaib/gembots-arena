#!/usr/bin/env node
/**
 * GemBots Daily Snapshot — записывает итоги дня в BSC блокчейн
 * 
 * Одна транзакция в день: 0 BNB transfer на свой адрес с JSON в input data.
 * Данные: дата, турнир, топ ботов (ELO, HP, wins, losses), итого боёв за день.
 * 
 * Запуск: node scripts/daily-snapshot.js [--date 2026-02-25] [--dry-run]
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !key.startsWith('#') && val.length) {
      process.env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

// Also load contracts/.env for DEPLOYER_PRIVATE_KEY
const contractsEnvPath = path.join(__dirname, '..', 'contracts', 'bsc', '.env');
if (fs.existsSync(contractsEnvPath)) {
  fs.readFileSync(contractsEnvPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !key.startsWith('#') && val.length && !process.env[key.trim()]) {
      process.env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const { ethers } = require('ethers');

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BSC_RPC = 'https://bsc-dataseed1.binance.org';
const DEPLOYER_PK = process.env.DEPLOYER_PRIVATE_KEY;
const WALLET_ADDRESS = '0x133C89BC9Dc375fBc46493A92f4Fd2486F8F0d76';

// --- Args ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dateArg = args.find((a, i) => args[i - 1] === '--date');

// Default: yesterday (so we snapshot a complete day)
function getSnapshotDate() {
  if (dateArg) return dateArg;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

// --- Supabase helper (with pagination for large result sets) ---
async function supaQuery(table, query = '', fetchAll = false) {
  if (!fetchAll) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`Supabase ${table}: ${res.status} ${await res.text()}`);
    return res.json();
  }
  
  // Paginated fetch
  let all = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const sep = query ? '&' : '';
    const url = `${SUPABASE_URL}/rest/v1/${table}?${query}${sep}limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`Supabase ${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    all = all.concat(page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function main() {
  const snapshotDate = getSnapshotDate();
  console.log(`📸 GemBots Daily Snapshot for ${snapshotDate}`);
  console.log(`   Mode: ${dryRun ? '🧪 DRY RUN' : '🔗 ON-CHAIN'}`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
  }

  // 1. Get all resolved battles for this date
  const dayStart = `${snapshotDate}T00:00:00Z`;
  const dayEnd = `${snapshotDate}T23:59:59Z`;
  
  const battles = await supaQuery('battles', 
    `status=eq.resolved&finished_at=gte.${dayStart}&finished_at=lte.${dayEnd}&select=id,bot1_id,bot2_id,winner_id,token_symbol,bot1_prediction,bot2_prediction,actual_x,duration_minutes&order=finished_at.asc`,
    true  // paginate to get ALL battles
  );

  console.log(`   ⚔️ Battles resolved: ${battles.length}`);

  if (battles.length === 0) {
    console.log('   ℹ️ No battles to snapshot. Exiting.');
    return;
  }

  // 2. Get current bot stats
  const bots = await supaQuery('bots', 'select=id,name,elo,hp,wins,losses,nfa_id&order=elo.desc');

  // 3. Compute daily stats per bot
  const botStats = {};
  for (const b of battles) {
    for (const botId of [b.bot1_id, b.bot2_id]) {
      if (!botStats[botId]) botStats[botId] = { wins: 0, losses: 0, battles: 0, perfectPredictions: 0 };
      botStats[botId].battles++;
      if (b.winner_id === botId) {
        botStats[botId].wins++;
      } else {
        botStats[botId].losses++;
      }
    }
  }

  // 4. Build snapshot payload
  const topBots = bots.slice(0, 20).map(b => ({
    name: b.name,
    elo: b.elo,
    hp: b.hp,
    w: b.wins,
    l: b.losses,
    nfa: b.nfa_id || null,
    today: botStats[b.id] || { wins: 0, losses: 0, battles: 0 },
  }));

  // Token distribution
  const tokenCounts = {};
  for (const b of battles) {
    tokenCounts[b.token_symbol] = (tokenCounts[b.token_symbol] || 0) + 1;
  }

  const snapshot = {
    v: 1,
    app: 'GemBots',
    url: 'https://gembots.space',
    date: snapshotDate,
    totalBattles: battles.length,
    tokens: tokenCounts,
    leaderboard: topBots,
    ts: new Date().toISOString(),
  };

  const jsonStr = JSON.stringify(snapshot);
  const dataBytes = ethers.toUtf8Bytes(jsonStr);
  
  console.log(`   📦 Payload: ${jsonStr.length} bytes`);
  console.log(`   🏆 Top 3:`);
  topBots.slice(0, 3).forEach((b, i) => {
    console.log(`      ${i + 1}. ${b.name} — ELO ${b.elo} | HP ${b.hp} | Today: ${b.today.wins}W/${b.today.losses}L`);
  });

  if (dryRun) {
    console.log('\n🧪 DRY RUN — snapshot NOT sent to blockchain');
    console.log(`   Would send tx with ${dataBytes.length} bytes data to ${WALLET_ADDRESS}`);
    console.log(`   JSON: ${jsonStr.substring(0, 200)}...`);
    return;
  }

  // 5. Send on-chain
  if (!DEPLOYER_PK) {
    console.error('❌ Missing DEPLOYER_PRIVATE_KEY');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  const wallet = new ethers.Wallet(DEPLOYER_PK, provider);
  
  console.log(`   🔑 Wallet: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`   💰 Balance: ${ethers.formatEther(balance)} BNB`);

  if (balance === 0n) {
    console.error('❌ No BNB for gas');
    process.exit(1);
  }

  try {
    // Send to null address (0x0...dead) — we just need the data in the tx, not the recipient
    const SNAPSHOT_TARGET = '0x000000000000000000000000000000000000dEaD';
    const tx = await wallet.sendTransaction({
      to: SNAPSHOT_TARGET,
      value: 0,
      data: ethers.hexlify(dataBytes),
      gasLimit: 21000 + dataBytes.length * 68,
    });
    
    console.log(`   📤 TX sent: ${tx.hash}`);
    console.log(`   ⏳ Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   🔗 https://bscscan.com/tx/${tx.hash}`);
    
    // Save record locally
    const recordPath = path.join(__dirname, '..', 'data', 'snapshots.json');
    let records = [];
    try { records = JSON.parse(fs.readFileSync(recordPath, 'utf8')); } catch {}
    records.push({
      date: snapshotDate,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      battles: battles.length,
      gasUsed: receipt.gasUsed.toString(),
      ts: new Date().toISOString(),
    });
    fs.writeFileSync(recordPath, JSON.stringify(records, null, 2));
    console.log(`   💾 Saved to data/snapshots.json`);
    
  } catch (e) {
    console.error(`   ❌ TX failed: ${e.message}`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
