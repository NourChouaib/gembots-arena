# Adding AI Models to GemBots Arena

GemBots uses a pluggable provider system. You can add any AI model (OpenAI, Anthropic, local LLMs, etc.) by implementing the `AIProvider` interface.

## The AIProvider Interface

```typescript
export interface AIProvider {
  name: string;
  generateStrategy(prompt: string): Promise<string>;
  generateAvatar(params: { name: string; emoji: string; style?: string }): Promise<string>; // returns URL
  chat(messages: Array<{role: string; content: string}>): Promise<string>;
  auditContract?(code: string): Promise<string>; // optional
}
```

### Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `generateStrategy` | Generate a trading strategy from a prompt | Strategy text |
| `generateAvatar` | Create a bot avatar image | Image URL |
| `chat` | General chat completion | Response text |
| `auditContract` | (Optional) Smart contract security audit | Audit report |

## Step-by-Step: Creating a Provider

### 1. Create the Directory

```bash
mkdir -p providers/my-provider
```

### 2. Create the Provider Module

Create `providers/my-provider/index.js`:

```javascript
// providers/my-provider/index.js

const PROVIDER_NAME = 'my-provider';
const API_KEY = process.env.MY_PROVIDER_API_KEY;
const API_URL = 'https://api.my-provider.com/v1/chat/completions';

async function callAPI(messages) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'my-model-name',
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`${PROVIDER_NAME} API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

module.exports = {
  name: PROVIDER_NAME,

  async generateStrategy(prompt) {
    return callAPI([
      { role: 'system', content: 'You are a crypto trading strategy generator. Return only the strategy description.' },
      { role: 'user', content: prompt },
    ]);
  },

  async generateAvatar({ name, emoji, style }) {
    // Option 1: Use an image generation API
    // Option 2: Return a placeholder URL
    // Option 3: Generate SVG data URI
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
  },

  async chat(messages) {
    return callAPI(messages);
  },

  async auditContract(code) {
    return callAPI([
      { role: 'system', content: 'You are a smart contract security auditor. Analyze the following Solidity code for vulnerabilities.' },
      { role: 'user', content: code },
    ]);
  },
};
```

### 3. Add Your API Key

Add to `.env.local`:

```bash
AI_PROVIDER=my-provider
MY_PROVIDER_API_KEY=your-api-key-here
```

### 4. Test Your Provider

```bash
# Start the dev server
npm run dev

# Create a bot — the generateStrategy and generateAvatar methods will be called
# Check the console for any errors from your provider
```

Quick smoke test (Node REPL):

```javascript
// test-provider.js
require('dotenv').config({ path: '.env.local' });
const provider = require('./providers/my-provider');

async function test() {
  console.log('Provider:', provider.name);
  
  const strategy = await provider.generateStrategy('Create a momentum trading strategy');
  console.log('Strategy:', strategy.substring(0, 100) + '...');
  
  const avatar = await provider.generateAvatar({ name: 'TestBot', emoji: '🤖' });
  console.log('Avatar URL:', avatar);
  
  const chat = await provider.chat([{ role: 'user', content: 'Hello!' }]);
  console.log('Chat:', chat);
}

test().catch(console.error);
```

```bash
node test-provider.js
```

## Example: OpenRouter Provider

```javascript
// providers/openrouter/index.js
const API_KEY = process.env.OPENROUTER_API_KEY;

async function callOpenRouter(messages, model = 'anthropic/claude-sonnet-4-20250514') {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model, messages }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

module.exports = {
  name: 'openrouter',
  async generateStrategy(prompt) {
    return callOpenRouter([
      { role: 'system', content: 'Generate a crypto trading strategy. Be specific about entry/exit signals.' },
      { role: 'user', content: prompt },
    ]);
  },
  async generateAvatar({ name, emoji }) {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
  },
  async chat(messages) {
    return callOpenRouter(messages);
  },
};
```

## Submitting Your Provider as a PR

1. Fork the repository
2. Create `providers/your-provider/index.js`
3. Add a `providers/your-provider/README.md` explaining setup
4. Update `.env.example` with any new required variables
5. Test that `npm run build` passes
6. Open a PR with title: `feat: Add [Provider Name] AI provider`

## Guidelines

- **No hardcoded API keys** — always use environment variables
- **Handle errors gracefully** — return fallback text on API failure, don't crash
- **Keep it simple** — a provider is just 4 functions
- **Document your model** — which model/version are you using?
