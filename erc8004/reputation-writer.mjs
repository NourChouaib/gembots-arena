import { ethers } from 'ethers';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
// Load .env.local manually
const envPath = path.resolve('../.env.local');
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch {};

// === CONFIG ===
const BSC_RPC = 'https://bsc-dataseed1.binance.org/';
const REPUTATION_REGISTRY = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';
const OWNER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const DB_PATH = path.resolve('../data/gembots.db');
const STATE_FILE = path.resolve('./reputation-state.json');

// Reviewer wallet (separate from agent owner, required by ERC-8004)
// Will be funded from owner wallet on first run
const REVIEWER_KEY = process.env.REVIEWER_PRIVATE_KEY;
if (!REVIEWER_KEY) throw new Error('REVIEWER_PRIVATE_KEY env variable required');
const REVIEWER_ADDRESS = process.env.REVIEWER_ADDRESS || '0x73126efb8fBaf8C28C040B76030c455012B515dc';

const REPUTATION_ABI = [
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external'
];

// Agent ID mapping
const AGENT_MAP = {
  'gpt4o': 6502,
  'claude-sonnet': 6503,
  'claude-haiku': 6504,
  'gemini-flash': 6505,
  'gemini-pro': 6506,
  'grok': 6507,
  'deepseek-r1': 6508,
  'llama-70b': 6509,
  'mistral-large': 6510,
  'qwen-72b': 6511,
  'command-r-plus': 6512,
  'phi-4': 6513,
  'nova-pro': 6514,
  'nemotron': 6515,
};

// Bot DB ID → model ID mapping (from api_bots table names)
const BOT_NAME_TO_MODEL = {
  '🔥 FireBot': 'gpt4o',
  '❄️ IceBot': 'claude-sonnet', 
  '⚡ ThunderBot': 'claude-haiku',
  '🌊 WaveBot': 'gemini-flash',
  '🌙 MoonBot': 'gemini-pro',
  '☀️ SunBot': 'grok',
  '🎯 NPC_Sniper': 'deepseek-r1',
  '🎲 NPC_Gambler': 'llama-70b',
  '🧠 NPC_Brain': 'mistral-large',
  '🐢 NPC_Turtle': 'qwen-72b',
  '🦅 NPC_Eagle': 'command-r-plus',
  '🐺 NPC_Wolf': 'phi-4',
  '🦊 NPC_Fox': 'nova-pro',
  '🐻 NPC_Bear': 'nemotron',
};

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastRun: null, lastPeriodEnd: null };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function ensureReviewerFunded(provider, ownerWallet) {
  const balance = await provider.getBalance(REVIEWER_ADDRESS);
  const minBalance = ethers.parseEther('0.002'); // Enough for ~10 rounds
  
  if (balance < minBalance) {
    console.log(`💸 Funding reviewer wallet (balance: ${ethers.formatEther(balance)} BNB)...`);
    const tx = await ownerWallet.sendTransaction({
      to: REVIEWER_ADDRESS,
      value: ethers.parseEther('0.005'), // Fund 0.005 BNB
    });
    await tx.wait();
    console.log(`   ✅ Sent 0.005 BNB → ${REVIEWER_ADDRESS}`);
  } else {
    console.log(`💰 Reviewer balance: ${ethers.formatEther(balance)} BNB (sufficient)`);
  }
}

async function main() {
  const state = loadState();
  const now = new Date();
  
  // Check if 3 days have passed
  if (state.lastRun) {
    const lastRun = new Date(state.lastRun);
    const daysSince = (now - lastRun) / (1000 * 60 * 60 * 24);
    if (daysSince < 2.5) { // Allow slight early run
      console.log(`⏳ Last run ${daysSince.toFixed(1)} days ago. Next run in ${(3 - daysSince).toFixed(1)} days.`);
      return;
    }
  }

  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  const ownerWallet = new ethers.Wallet(OWNER_KEY, provider);
  const reviewerWallet = new ethers.Wallet(REVIEWER_KEY, provider);
  const registry = new ethers.Contract(REPUTATION_REGISTRY, REPUTATION_ABI, reviewerWallet);

  // Ensure reviewer has BNB
  await ensureReviewerFunded(provider, ownerWallet);

  // Collect stats from Supabase (primary) or SQLite (fallback)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const periodStart = state.lastPeriodEnd || new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const periodEnd = now.toISOString();
  const periodLabel = `${periodStart.split('T')[0]}/${periodEnd.split('T')[0]}`;

  console.log(`\n📊 Collecting battle stats...`);
  console.log(`📅 Period: ${periodLabel}`);

  // Get stats per bot
  const botStats = {};

  // Try Supabase first
  // Map OpenRouter model_id → our AGENT_MAP keys
  const MODEL_ID_TO_AGENT = {
    'openai/gpt-4o': 'gpt4o',
    'openai/gpt-4.1-mini': 'gpt4o',
    'anthropic/claude-sonnet-4': 'claude-sonnet',
    'anthropic/claude-3.5-haiku': 'claude-haiku',
    'google/gemini-2.5-flash': 'gemini-flash',
    'google/gemini-2.0-flash': 'gemini-flash',
    'google/gemini-pro': 'gemini-pro',
    'x-ai/grok-3-mini-beta': 'grok',
    'deepseek/deepseek-r1': 'deepseek-r1',
    'deepseek/deepseek-r1-0528:free': 'deepseek-r1',
    'meta-llama/llama-4-maverick': 'llama-70b',
    'mistralai/mistral-small-3.1-24b-instruct:free': 'mistral-large',
    'qwen/qwen3-235b-a22b': 'qwen-72b',
    'nousresearch/hermes-3-llama-3.1-405b:free': 'command-r-plus',
    'google/gemma-3-27b-it:free': 'phi-4',
    'stepfun/step-3.5-flash:free': 'nova-pro',
    'custom-ai/general-assistant': 'nemotron',
  };

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      console.log('🔗 Fetching from Supabase...');
      const botsRes = await fetch(`${SUPABASE_URL}/rest/v1/bots?is_npc=eq.true&select=id,name,wins,losses,model_id`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      if (!botsRes.ok) throw new Error(`Supabase bots fetch failed: ${botsRes.status}`);
      const bots = await botsRes.json();
      
      // Aggregate by model_id (multiple bots may use same model)
      const modelAgg = {};
      for (const bot of bots) {
        const agentKey = MODEL_ID_TO_AGENT[bot.model_id] || BOT_NAME_TO_MODEL[bot.name];
        if (!agentKey) continue;
        if (!modelAgg[agentKey]) modelAgg[agentKey] = { wins: 0, losses: 0 };
        modelAgg[agentKey].wins += bot.wins || 0;
        modelAgg[agentKey].losses += bot.losses || 0;
      }

      for (const [agentKey, agg] of Object.entries(modelAgg)) {
        if (!AGENT_MAP[agentKey]) continue;
        const battles = agg.wins + agg.losses;
        botStats[agentKey] = {
          agentId: AGENT_MAP[agentKey],
          battles,
          wins: agg.wins,
          winRate: battles > 0 ? Math.round((agg.wins / battles) * 100) : 0,
        };
      }
      console.log(`✅ Got stats for ${Object.keys(botStats).length} agent models from Supabase (${bots.length} bots)`);
    } catch (e) {
      console.log(`⚠️ Supabase error: ${e.message}. Trying SQLite fallback...`);
    }
  }

  // Fallback to SQLite if Supabase failed
  if (Object.keys(botStats).length === 0) {
    console.log('📂 Trying SQLite fallback...');
    let db;
    try {
      db = new Database(DB_PATH, { readonly: true });
      const rows = db.prepare(`
        SELECT b.name, COUNT(*) as battles, SUM(CASE WHEN br.winner_id = b.id THEN 1 ELSE 0 END) as wins
        FROM api_bots b
        JOIN (
          SELECT bot1_id as bot_id, winner_id FROM battles WHERE status = 'resolved' AND started_at > ? AND started_at <= ?
          UNION ALL
          SELECT bot2_id as bot_id, winner_id FROM battles WHERE status = 'resolved' AND started_at > ? AND started_at <= ?
        ) br ON br.bot_id = b.id
        GROUP BY b.id, b.name
      `).all(periodStart, periodEnd, periodStart, periodEnd);
      for (const row of rows) {
        const modelId = BOT_NAME_TO_MODEL[row.name];
        if (modelId && AGENT_MAP[modelId]) {
          botStats[modelId] = {
            agentId: AGENT_MAP[modelId], battles: row.battles, wins: row.wins,
            winRate: row.battles > 0 ? Math.round((row.wins / row.battles) * 100) : 0,
          };
        }
      }
      db.close();
    } catch (e) {
      console.log(`⚠️ SQLite error: ${e.message}`);
      db?.close();
    }
  }

  // If no DB data, write basic "active" feedback for all agents
  if (Object.keys(botStats).length === 0) {
    console.log('📝 No battle data found, writing "active" status for all agents...');
    for (const [modelId, agentId] of Object.entries(AGENT_MAP)) {
      botStats[modelId] = { agentId, battles: 0, wins: 0, winRate: 0 };
    }
  }

  // Write to Reputation Registry
  console.log(`\n🔗 Writing ${Object.keys(botStats).length} feedbacks to Reputation Registry...\n`);
  
  let successCount = 0;
  for (const [modelId, stats] of Object.entries(botStats)) {
    const { agentId, battles, wins, winRate } = stats;
    
    console.log(`  📝 Agent #${agentId} (${modelId}): ${wins}W/${battles}B = ${winRate}%`);
    
    try {
      const tx = await registry.giveFeedback(
        agentId,
        winRate,        // value: win rate percentage
        0,              // decimals: 0 (integer %)
        'winRate',      // tag1: metric type
        periodLabel,    // tag2: period
        `https://gembots.space/api/agents/${modelId}`, // endpoint
        '',             // feedbackURI (empty for now)
        ethers.ZeroHash // feedbackHash
      );
      
      await tx.wait();
      console.log(`     ✅ TX: ${tx.hash}`);
      successCount++;
      
    } catch (e) {
      console.log(`     ❌ Failed: ${e.message?.substring(0, 100)}`);
    }
  }

  // Update state
  saveState({
    lastRun: now.toISOString(),
    lastPeriodEnd: periodEnd,
    lastResults: { total: Object.keys(botStats).length, success: successCount },
  });

  console.log(`\n✅ Done! ${successCount}/${Object.keys(botStats).length} feedbacks written.`);
  
  const finalBal = await provider.getBalance(REVIEWER_ADDRESS);
  console.log(`💰 Reviewer balance: ${ethers.formatEther(finalBal)} BNB`);
}

main().catch(console.error);
