/**
 * OpenRouter LLM Prediction Service
 * 
 * Each bot has a model_id (e.g., "openai/gpt-5", "deepseek/deepseek-r1").
 * When a bot needs to make a prediction, this calls OpenRouter with market data
 * and returns a prediction multiplier (0.1 - 100.0).
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_TIMEOUT_MS = 30_000;

export interface PredictionRequest {
  botName: string;
  modelId: string;       // OpenRouter model ID
  tokenSymbol: string;
  tokenMint: string;
  currentPrice: number;
  priceChange1h: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  holders: number;
  smartMoney: number;
  kolMentions: number;
  battleDurationMinutes: number;
}

import { getPriceHistory, getVelocitySpike, getSafetyCheck } from './bot-tools';

export interface PredictionResult {
  prediction: number;
  reasoning: string;
  confidence: number;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  fromLLM: boolean;
  toolsUsed: string[]; // Added to log which tools were used
}

function buildPrompt(req: PredictionRequest, toolResults?: Record<string, any>): string {
  const timeframe = req.battleDurationMinutes <= 1
    ? '1 minute'
    : req.battleDurationMinutes <= 60
    ? `${req.battleDurationMinutes} minutes`
    : `${Math.round(req.battleDurationMinutes / 60)} hours`;

  let prompt = `You are ${req.botName}, an expert crypto market analyst bot competing in a prediction arena.\n\nAnalyze the following market data for token $${req.tokenSymbol} and predict the price multiplier over the next ${timeframe}.\n\n## Market Data\n- **Token:** $${req.tokenSymbol}\n- **Current Price:** $${req.currentPrice}\n- **Price Change (1h):** ${req.priceChange1h > 0 ? '+' : ''}${req.priceChange1h.toFixed(2)}%\n- **Price Change (24h):** ${req.priceChange24h > 0 ? '+' : ''}${req.priceChange24h.toFixed(2)}%\n- **24h Volume:** $${formatNumber(req.volume24h)}\n- **Liquidity:** $${formatNumber(req.liquidity)}\n- **Market Cap:** $${formatNumber(req.marketCap)}\n- **Holders:** ${req.holders}\n- **Smart Money Signals:** ${req.smartMoney}\n- **KOL Mentions:** ${req.kolMentions}\n- **Battle Duration:** ${timeframe}`;

  if (toolResults && Object.keys(toolResults).length > 0) {
    prompt += `\n\n## Tool Analysis\n`;
    if (toolResults.price_history) {
      prompt += `### Price History:\n`;
      for (const period in toolResults.price_history) {
        prompt += `- ${period.replace('_', ' ')}: \n`;
        toolResults.price_history[period].history.slice(-3).forEach((data: any) => { // Last 3 entries
          prompt += `  - ${new Date(data.timestamp).toLocaleTimeString()}: Price $${data.price.toFixed(6)}, Volume ${data.volume}\n`;
        });
      }
    }
    if (toolResults.velocity_scanner) {
      const vs = toolResults.velocity_scanner;
      prompt += `### Velocity Scanner:\n`;
      prompt += `- 1m Velocity: ${vs.velocity1m}\n`;
      prompt += `- 5m Velocity: ${vs.velocity5m}\n`;
      prompt += `- 15m Velocity: ${vs.velocity15m}\n`;
      prompt += `- Pattern: ${vs.pattern}\n`;
    }
    if (toolResults.safety_check) {
      const sc = toolResults.safety_check;
      prompt += `### Safety Check:\n`;
      prompt += `- Risk Level: ${sc.riskLevel} (Score: ${sc.riskScore.toFixed(2)}/100)\n`;
      prompt += `- Liquidity Score: ${sc.liquidityScore.toFixed(2)}\n`;
      prompt += `- Holder Score: ${sc.holderScore.toFixed(2)}\n`;
      prompt += `- Age Score: ${sc.ageScore.toFixed(2)}\n`;
    }
  }

  prompt += `\n\n## Task\nPredict the price multiplier for this token over the next ${timeframe}.\n- A multiplier of 1.0 means the price stays the same\n- A multiplier of 2.0 means the price doubles\n- A multiplier of 0.5 means the price drops by half\n- Range: 0.1 to 100.0\n\nConsider momentum, volume trends, smart money activity, liquidity depth, and market sentiment.\n\nRespond ONLY with valid JSON in this exact format (no markdown, no code blocks):\n{"prediction": <number>, "reasoning": "<brief explanation>", "confidence": <number 0-100>}`;
  return prompt;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function clamp(value: number, min: number, max: number): number {
  return parseFloat(Math.max(min, Math.min(max, value)).toFixed(2));
}

/**
 * Call OpenRouter API to get an LLM prediction
 */
export async function getOpenRouterPrediction(req: PredictionRequest): Promise<PredictionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  const availableTools = [
    { name: 'price_history', func: getPriceHistory },
    { name: 'velocity_scanner', func: getVelocitySpike },
    { name: 'safety_check', func: getSafetyCheck },
  ];

  let toolsToUse: { name: string; func: Function }[] = [];
  const isExpensiveModel = req.modelId.includes('gpt-4') || req.modelId.includes('claude');

  // Determine how many tools to use (0-2)
  let numTools = 0;
  const randomVal = Math.random();
  if (isExpensiveModel) {
    if (randomVal < 0.3) numTools = 0; // 30% chance for 0 tools
    else if (randomVal < 0.7) numTools = 1; // 40% chance for 1 tool
    else numTools = 2; // 30% chance for 2 tools
  } else {
    if (randomVal < 0.6) numTools = 0; // 60% chance for 0 tools
    else if (randomVal < 0.9) numTools = 1; // 30% chance for 1 tool
    else numTools = 2; // 10% chance for 2 tools
  }

  // Randomly select tools
  const shuffledTools = availableTools.sort(() => 0.5 - Math.random());
  toolsToUse = shuffledTools.slice(0, numTools);

  const toolResults: Record<string, any> = {};
  const toolsUsed: string[] = [];

  for (const tool of toolsToUse) {
    try {
      const result = await tool.func(req.tokenMint); // All tools currently only need tokenMint
      toolResults[tool.name] = result;
      toolsUsed.push(tool.name);
      console.log(`  🛠️ Bot ${req.botName} used tool: ${tool.name}`);
    } catch (toolError) {
      console.error(`  ❌ Error running tool ${tool.name} for bot ${req.botName}:`, toolError);
    }
  }

  try {
    const prompt = buildPrompt(req, toolResults);

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gembots.space',
        'X-Title': 'GemBots Arena',
      },
      body: JSON.stringify({
        model: req.modelId,
        messages: [
          {
            role: 'system',
            content: 'You are a crypto market prediction bot. Always respond with valid JSON only. No markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
        top_p: 0.9,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    const tokensUsedLLM = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);

    if (!content) {
      throw new Error('Empty response from OpenRouter');
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed: { prediction?: number; reasoning?: string; confidence?: number };
    try {
      // Try direct parse first
      parsed = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Failed to parse LLM response: ${content.substring(0, 200)}`);
      }
    }

    const prediction = clamp(Number(parsed.prediction) || 1.0, 0.1, 100.0);
    const confidence = clamp(Number(parsed.confidence) || 50, 0, 100);
    const reasoning = String(parsed.reasoning || 'No reasoning provided').substring(0, 500);

    console.log(`  🤖 OpenRouter [${req.modelId}] → ${prediction}x (confidence: ${confidence}%) | ${tokensUsedLLM} tokens | ${latencyMs}ms`);

    return {
      prediction,
      reasoning,
      confidence,
      model: req.modelId,
      tokensUsed: tokensUsedLLM,
      latencyMs,
      fromLLM: true,
      toolsUsed, // Return the list of tools used
    };
  } catch (error: any) {
    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      console.error(`  ⏱️ OpenRouter timeout [${req.modelId}] after ${latencyMs}ms`);
      throw new Error(`OpenRouter timeout after ${OPENROUTER_TIMEOUT_MS}ms`);
    }

    console.error(`  ❌ OpenRouter error [${req.modelId}]: ${error.message} (${latencyMs}ms)`);
    throw error;
  }
}
