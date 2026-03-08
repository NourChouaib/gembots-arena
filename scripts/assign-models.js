#!/usr/bin/env node

/**
 * GemBots — Assign real OpenRouter model_id to existing NPC bots
 * Maps current ai_model display names to actual OpenRouter model IDs
 */

const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !key.startsWith('#')) process.env[key.trim()] = val.join('=').trim();
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Map ai_model display names → OpenRouter model IDs
// Using models that are actually available and good at prediction tasks
const MODEL_MAP = {
  'GPT-5.2':         { modelId: 'openai/gpt-4.1-mini',              newName: 'GPT-4.1-mini' },
  'Claude Opus 4.6': { modelId: 'anthropic/claude-3.5-haiku', newName: 'Claude Haiku 3.5' },
  'Gemini 3 Pro':    { modelId: 'google/gemini-2.5-flash',          newName: 'Gemini 2.5 Flash' },
  'DeepSeek R1':     { modelId: 'deepseek/deepseek-r1',             newName: 'DeepSeek R1' },
  'Llama 4':         { modelId: 'meta-llama/llama-4-maverick',      newName: 'Llama 4 Maverick' },
  'Qwen 2.5':        { modelId: 'qwen/qwen3.5-coder-32b',          newName: 'Qwen 3.5 Coder' },
  'Mistral Large':   { modelId: 'mistralai/mistral-large-2411',     newName: 'Mistral Large' },
  'Grok 3':          { modelId: 'minimax/minimax-m2.5',             newName: 'MiniMax M2.5' },
};

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

async function main() {
  console.log('🤖 GemBots — Assigning Real OpenRouter Models\n');
  
  // Get all NPC bots
  const bots = await supabaseRequest('bots?is_npc=eq.true&select=id,name,ai_model,model_id&order=id');
  console.log(`Found ${bots.length} NPC bots\n`);
  
  let updated = 0, skipped = 0, notMapped = 0;
  
  for (const bot of bots) {
    const mapping = MODEL_MAP[bot.ai_model];
    if (!mapping) {
      console.log(`  ⚠️ No mapping for "${bot.ai_model}" (bot: ${bot.name})`);
      notMapped++;
      continue;
    }
    
    if (bot.model_id === mapping.modelId) {
      console.log(`  ⏭️ Already set: ${bot.name} → ${mapping.modelId}`);
      skipped++;
      continue;
    }
    
    // Update both model_id and ai_model display name
    await supabaseRequest(`bots?id=eq.${bot.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        model_id: mapping.modelId,
        ai_model: mapping.newName,
      }),
    });
    
    console.log(`  ✅ ${bot.name}: ${bot.ai_model} → ${mapping.newName} (${mapping.modelId})`);
    updated++;
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Not mapped: ${notMapped}`);
  
  // Show model distribution
  console.log('\n📈 Model Distribution:');
  const dist = {};
  for (const [oldName, { newName }] of Object.entries(MODEL_MAP)) {
    dist[newName] = (dist[newName] || 0);
  }
  const updatedBots = await supabaseRequest('bots?is_npc=eq.true&model_id=not.is.null&select=model_id,ai_model');
  const modelCounts = {};
  for (const b of updatedBots) {
    modelCounts[b.ai_model] = (modelCounts[b.ai_model] || 0) + 1;
  }
  for (const [model, count] of Object.entries(modelCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${count}x ${model}`);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
