#!/usr/bin/env node
/**
 * Add new AI models to GemBots Arena
 * Reassigns low-ELO bots to new models: Grok, DeepSeek R1 Free, Mistral Small, Gemma 3
 */

const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabaseRequest(pathStr, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${pathStr}`;
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
  return res.json();
}

// New models to add
const NEW_MODELS = [
  {
    ai_model: 'Grok 4.1',
    model_id: 'x-ai/grok-4.1-fast',
    // Reassign these bots
    botIds: [51, 17, 20],  // WildCard, HotShot, TestBot
    emoji: '🤖',
  },
  {
    ai_model: 'DeepSeek R1 Free',
    model_id: 'deepseek/deepseek-r1-0528:free',
    botIds: [49, 43],  // CosmicBet (NPC), TestAI-Beta-SB
    emoji: '🔬',
  },
  {
    ai_model: 'Mistral Small 3.1',
    model_id: 'mistralai/mistral-small-3.1-24b-instruct:free',
    botIds: [4, 19],  // TsunamiX, AlphaTrader
    emoji: '🌊',
  },
  {
    ai_model: 'Gemma 3 27B',
    model_id: 'google/gemma-3-27b-it:free',
    botIds: [15, 35],  // OracleAI, a random low-elo
    emoji: '💎',
  },
];

async function main() {
  console.log('🤖 Adding new AI models to GemBots Arena\n');

  for (const model of NEW_MODELS) {
    console.log(`\n${model.emoji} ${model.ai_model} (${model.model_id})`);
    console.log(`  Assigning to bots: ${model.botIds.join(', ')}`);

    for (const botId of model.botIds) {
      try {
        const result = await supabaseRequest(`bots?id=eq.${botId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ai_model: model.ai_model,
            model_id: model.model_id,
          }),
        });
        const bot = result[0];
        console.log(`  ✅ #${botId} ${bot?.name || '?'} → ${model.ai_model}`);
      } catch (e) {
        console.log(`  ❌ #${botId} failed: ${e.message}`);
      }
    }
  }

  // Show final distribution
  console.log('\n\n📊 Final model distribution:');
  const allBots = await supabaseRequest('bots?select=ai_model&is_npc=eq.true');
  const dist = {};
  for (const b of allBots) {
    const m = b.ai_model || 'none';
    dist[m] = (dist[m] || 0) + 1;
  }
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  for (const [model, count] of sorted) {
    console.log(`  ${model}: ${count} bots`);
  }
  
  console.log('\n✅ Done! Restart perpetual-tournament to pick up new models.');
}

main().catch(console.error);
