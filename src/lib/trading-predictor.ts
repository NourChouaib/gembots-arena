import { MarketSnapshot, TradingDecision } from './trading-engine';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  momentum: `You are a MOMENTUM trader. Follow the trend aggressively.
- If price is rising (positive 1h/24h change, EMA9 > EMA21) → BUY with conviction
- If price is falling (negative changes, EMA9 < EMA21) → SELL (short) with conviction
- Use higher leverage (5-15x) when trend is strong
- Avoid HOLD — momentum traders always have a position`,

  trend_follower: `You are a TREND FOLLOWER. Identify and ride longer-term trends.
- Look at 24h change and EMA crossovers for trend direction
- BUY in uptrends, SELL (short) in downtrends
- Use moderate leverage (3-8x) and wider stop-losses
- HOLD only when no clear trend (choppy/sideways market)`,

  scalper: `You are a SCALPER. Make quick, small profits with tight risk management.
- Use small size (0.1-0.3) but high leverage (10-20x)
- Set tight take_profit (0.1-0.3%) and stop_loss (0.1-0.2%)
- React to short-term signals: RSI extremes, orderbook imbalance
- BUY on oversold RSI (<30), SELL on overbought RSI (>70)
- Quick in, quick out — don't hold through uncertainty`,

  swing: `You are a SWING trader. Take large positions on high-conviction setups.
- Use larger size (0.3-0.7) with moderate leverage (3-10x)
- Look for reversals: RSI extremes + MACD crossovers
- Set wider TP (0.5-1.5%) and SL (0.3-0.8%)
- BUY when oversold with bullish divergence, SELL when overbought with bearish divergence
- Patience — HOLD if no clear setup, but go big when you see one`,

  contrarian: `You are a CONTRARIAN trader. Trade AGAINST the crowd.
- If price pumped hard (1h change > +2%) → SELL (short) — expect mean reversion
- If price dumped hard (1h change < -2%) → BUY — expect bounce
- Use moderate size (0.2-0.5) and leverage (3-8x)
- RSI > 70 → SELL, RSI < 30 → BUY
- You profit when the herd is wrong — be bold going against the trend`,
};

const BASE_SYSTEM_PROMPT = `You are an expert crypto trader competing in GemBots Trading Arena.
You receive real-time market data and must make a trading decision.
Your goal: maximize profit over 15 minutes.

Respond ONLY with valid JSON:
{
  "action": "BUY" | "SELL" | "HOLD",
  "size": 0.1,
  "leverage": 5,
  "confidence": 0.8,
  "take_profit": 0.5,
  "stop_loss": 0.3,
  "reasoning": "brief explanation"
}

Rules:
- size: 0.0 to 1.0 (fraction of balance to use)
- leverage: 1 to 20
- take_profit/stop_loss: percentage of price move (e.g. 0.5 = 0.5%)
- HOLD means no position (safe but no profit)
- BUY = long (profit when price goes UP)
- SELL = short (profit when price goes DOWN)
- Be strategic: sometimes HOLD is the best move
- IMPORTANT: Consider SELL (short) equally with BUY. In a bearish/falling market, SELL is the profitable move. Don't default to BUY — analyze the data objectively.`;

function buildSystemPrompt(strategy?: string): string {
  const strategyDesc = strategy ? STRATEGY_DESCRIPTIONS[strategy] : null;
  if (!strategyDesc) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}\n\n## Your Trading Strategy\n${strategyDesc}`;
}

export async function getTradingDecision(model: string, snapshot: MarketSnapshot, strategy?: string): Promise<TradingDecision> {
  if (!OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is not set.");
    return {
      action: 'HOLD',
      size: 0,
      leverage: 1,
      confidence: 0,
      take_profit: 0,
      stop_loss: 0,
      reasoning: "API key not configured."
    };
  }

  const systemPrompt = buildSystemPrompt(strategy);

  const userMessage = `Current market data for ${snapshot.symbol}:
Price: ${snapshot.price}
1h Change: ${snapshot.price_1h_pct}%
24h Change: ${snapshot.price_24h_pct}%
24h Volume: ${snapshot.volume_24h}
Orderbook Imbalance: ${snapshot.orderbook_imbalance}
Funding Rate: ${snapshot.funding_rate}
Open Interest: ${snapshot.open_interest}
RSI (14): ${snapshot.rsi_14}
EMA (9): ${snapshot.ema_9}
EMA (21): ${snapshot.ema_21}
MACD: ${JSON.stringify(snapshot.macd)}

Make your trading decision.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        timeout: 30 * 1000, // 30 seconds
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    // Strip markdown code fences if present
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const rawDecision = JSON.parse(content) as Partial<TradingDecision>;

    // Validate and clamp values
    const decision: TradingDecision = {
      action: rawDecision.action || 'HOLD',
      size: Math.max(0, Math.min(1, rawDecision.size || 0)),
      leverage: Math.max(1, Math.min(20, rawDecision.leverage || 1)),
      confidence: Math.max(0, Math.min(1, rawDecision.confidence || 0)),
      take_profit: Math.max(0, rawDecision.take_profit || 0),
      stop_loss: Math.max(0, rawDecision.stop_loss || 0),
      reasoning: rawDecision.reasoning || "No reasoning provided.",
    };

    // If action is HOLD, force size, leverage, TP, SL to 0
    if (decision.action === 'HOLD') {
      decision.size = 0;
      decision.leverage = 1;
      decision.take_profit = 0;
      decision.stop_loss = 0;
    }

    return decision;

  } catch (error) {
    console.error("Error getting trading decision from AI:", error);
    // Fallback on error
    return {
      action: 'HOLD',
      size: 0,
      leverage: 1,
      confidence: 0,
      take_profit: 0,
      stop_loss: 0,
      reasoning: `Error in AI prediction: ${error instanceof Error ? error.message : String(error)}. Falling back to HOLD.`
    };
  }
}
