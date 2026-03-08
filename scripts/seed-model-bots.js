#!/usr/bin/env node

/**
 * GemBots — Seed Model Assignments
 * 
 * Updates existing NPC bots in Supabase with model_id assignments.
 * Matches bots by name to assign OpenRouter model IDs.
 * 
 * Usage: node scripts/seed-model-bots.js
 */

// Load env
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

// Bot name → model_id mapping
// The script will match by bot name (case-insensitive, partial match)
const MODEL_ROSTER = [
  // === Budget tier ($0.15-0.40/M prompt) ===
  { name: 'Llama 4',        modelId: 'meta-llama/llama-4-maverick' },      // $0.15/$0.60
  { name: 'Qwen 3.5',       modelId: 'qwen/qwen3.5-397b-a17b' },          // $0.15/$1.00
  { name: 'Gemini Flash',   modelId: 'google/gemini-2.5-flash' },          // $0.30/$2.50
  { name: 'MiniMax M2.5',   modelId: 'minimax/minimax-m2.5' },             // $0.30/$1.10
  { name: 'GLM-5',          modelId: 'z-ai/glm-5' },                       // $0.30/$2.55
  { name: 'GPT-4.1-mini',   modelId: 'openai/gpt-4.1-mini' },             // $0.40/$1.60
  { name: 'Qwen 3.5 Plus',  modelId: 'qwen/qwen3.5-plus-02-15' },         // $0.40/$2.40
  // === Mid tier ($0.50-1.00/M prompt) ===
  { name: 'Mistral Large',  modelId: 'mistralai/mistral-large-2512' },     // $0.50/$1.50
  { name: 'Gemini 3 Flash', modelId: 'google/gemini-3-flash-preview' },    // $0.50/$3.00
  { name: 'DeepSeek R1',    modelId: 'deepseek/deepseek-r1' },             // $0.70/$2.50
];

async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
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
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('json')) return res.json();
  return null;
}

async function main() {
  console.log('🤖 GemBots Model Assignment Seeder\n');

  // Fetch all NPC bots
  const bots = await supabaseRequest('bots?is_npc=eq.true&select=id,name,model_id');
  console.log(`Found ${bots.length} NPC bots\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const entry of MODEL_ROSTER) {
    // Find bot by name (case-insensitive partial match)
    const bot = bots.find(b => 
      b.name.toLowerCase().includes(entry.name.toLowerCase()) ||
      entry.name.toLowerCase().includes(b.name.toLowerCase())
    );

    if (!bot) {
      console.log(`  ❌ Bot not found for "${entry.name}" → ${entry.modelId}`);
      notFound++;
      continue;
    }

    if (bot.model_id === entry.modelId) {
      console.log(`  ⏭️  ${bot.name} already has model_id=${entry.modelId}`);
      skipped++;
      continue;
    }

    // Update bot with model_id
    try {
      await supabaseRequest(`bots?id=eq.${bot.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ model_id: entry.modelId }),
        prefer: 'return=minimal',
      });
      console.log(`  ✅ ${bot.name} (id:${bot.id}) → model_id="${entry.modelId}"`);
      updated++;
    } catch (e) {
      console.error(`  ❌ Failed to update ${bot.name}: ${e.message}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (already set): ${skipped}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`\n✅ Done!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
