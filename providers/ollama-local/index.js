/**
 * GemBots Provider: Ollama Local (Alpha-Machine)
 * 
 * Connects to Ollama running on Alpha-Machine via Tailscale.
 * Used for fine-tuned GemBots Trader model.
 * 
 * Setup:
 *   1. Install Ollama on Alpha-Machine
 *   2. Load model: ollama create gembots-trader -f Modelfile
 *   3. Set OLLAMA_HOST in .env.local (default: http://localhost:11434)
 * 
 * Environment:
 *   OLLAMA_HOST - Ollama API URL (default: http://localhost:11434)
 *   OLLAMA_MODEL - Model name (default: gembots-trader)
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gembots-nemo-12b';

async function ollamaGenerate(prompt, options = {}) {
  const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens || 200,
        top_p: 0.9,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.response;
}

async function ollamaChat(messages, options = {}) {
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens || 200,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

// ---- GemBots AIProvider Interface ----

/**
 * Generate trading strategy/prediction
 * @param {string} prompt - Market analysis prompt
 * @returns {string} - Prediction text
 */
async function generateStrategy(prompt) {
  return ollamaGenerate(prompt, { temperature: 0.7, maxTokens: 200 });
}

/**
 * Generate avatar description (not primary use case, but required by interface)
 */
async function generateAvatar({ name, emoji, style }) {
  return ollamaGenerate(
    `Describe a trading bot avatar: ${name} ${emoji}, style: ${style}. One sentence.`,
    { temperature: 0.9, maxTokens: 50 }
  );
}

/**
 * Chat interface
 * @param {Array} messages - [{role, content}]
 * @returns {string}
 */
async function chat(messages) {
  return ollamaChat(messages, { temperature: 0.7, maxTokens: 300 });
}

/**
 * Health check - verify Ollama is reachable and model is loaded
 */
async function healthCheck() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`);
    const data = await res.json();
    const models = data.models?.map(m => m.name) || [];
    const hasModel = models.some(m => m.includes(OLLAMA_MODEL));
    return {
      ok: res.ok && hasModel,
      host: OLLAMA_HOST,
      model: OLLAMA_MODEL,
      available: models,
      hasModel,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = {
  generateStrategy,
  generateAvatar,
  chat,
  healthCheck,
  // Metadata
  name: 'ollama-local',
  displayName: 'GemBots Trader (Fine-tuned Mistral Nemo 12B)',
  description: 'Mistral Nemo 12B fine-tuned on 29K crypto trading examples (BTC/ETH/SOL). Runs locally via Ollama.',
};
