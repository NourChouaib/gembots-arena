# GemBots Arena — Trading Strategies

## Overview

Each bot in GemBots Arena uses a **strategy** to predict token price movements. A strategy takes market data for a token and returns a prediction multiplier (e.g., `2.3` means "I think this token goes 2.3x").

## Built-in Strategies

### 🎯 Trend Follower (`trend_follower`)
Follows the momentum. Looks at `price_change_1h`:
- Strong uptrend (>50%) → bullish 2.5–3.5x
- Moderate uptrend (>20%) → bullish 1.8–2.5x
- Sideways → near 1.0x
- Downtrend → bearish 0.3–0.9x

**Best against:** Mean reversion bots in trending markets.

### 🐋 Whale Watcher (`whale_watcher`)
Tracks smart money activity. Primary signal: `smart_money` score.
- Heavy smart money (5+) → very bullish 2.5x+
- No smart money → cautious, below 1.0x
- KOL mentions and v2_score provide secondary signals

**Best against:** Random/chaos bots. Weak when whales exit.

### 🎲 Chaos (`chaos`)
Pure randomness. Generates predictions between 0.5–5.0x with a slight bias toward the 1–2x range.

**Best against:** Unpredictable, occasionally beats conservative strategies by luck.

### 📊 Mean Reversion (`mean_reversion`)
Bets that prices revert to the mean. Fades big moves:
- Token pumped hard → predicts pullback (lower multiplier)
- Token dumped → predicts recovery (higher multiplier)

**Best against:** Trend followers after blow-off tops.

### 🤖 Smart AI (`smart_ai`)
Uses the AI provider to generate predictions. Combines multiple data points (price, volume, holders, liquidity) into a prompt and asks the AI for analysis.

**Best against:** Varies by AI model quality. Strong with good providers.

### ⚡ Aggressive (`aggressive`)
Always leans bullish. Amplifies positive signals, ignores negative ones. High risk, high reward.

### 🛡️ Conservative (`conservative`)
Stays close to 1.0x. Small adjustments based on data. Rarely predicts extreme moves.

### 🎰 Random (`random`)
Similar to chaos but with uniform distribution. Testing/baseline strategy.

## Market Data Available to Strategies

```typescript
interface MarketToken {
  symbol: string;          // Token ticker
  address: string;         // Contract address
  price_usd?: number;      // Current price
  market_cap?: number;     // Market capitalization
  volume_1h?: number;      // Trading volume (1h)
  holders?: number;        // Number of holders
  liquidity?: number;      // Liquidity pool size
  age_minutes?: number;    // Token age
  kol_mentions?: number;   // KOL mention count
  smart_money?: number;    // Smart money score
  v2_score?: number;       // V2 composite score
  price_change_1h?: number; // Price change % (1h)
  swaps_count?: number;    // Number of swaps
  risk_score?: number;     // Risk assessment
}
```

## Creating a Custom Strategy

### 1. Define Your Function

A strategy is a function that takes `MarketToken` and returns a `number` (the prediction multiplier):

```typescript
function myStrategy(token: MarketToken): number {
  // Your logic here
  // Return a number: 0.1 (90% crash) to 10.0 (10x pump)
  
  const liquidity = token.liquidity ?? 0;
  const holders = token.holders ?? 0;
  
  if (liquidity > 100000 && holders > 500) {
    return 1.8; // Strong fundamentals → bullish
  }
  
  return 0.9; // Default: slightly bearish
}
```

### 2. Register It

Add your strategy to the strategy map in the codebase and submit a PR.

## ELO Rating System

Bots earn/lose ELO based on battle outcomes:

- **K-factor:** Decreases with experience (new bots gain/lose more)
- **Perfect prediction bonus:** If prediction is within 0.1x of actual → extra ELO
- **Upset bonus:** Lower-rated bot beats higher-rated → extra ELO for the winner
- **Minimum ELO:** 100 (floor, can't go lower)

### Leagues

| League | Emoji | Min ELO | Color |
|--------|-------|---------|-------|
| Diamond | 💎 | 2000 | Blue |
| Gold | 🥇 | 1500 | Gold |
| Silver | 🥈 | 1000 | Silver |
| Bronze | 🥉 | 0 | Bronze |

## Evolution Engine

The Evolution Engine is GemBots' mechanism for strategy improvement over time:

1. **Performance Tracking:** Every battle outcome is recorded with the strategy used
2. **Fitness Scoring:** Strategies are scored by win rate, average accuracy, and consistency
3. **Mutation:** Top-performing strategies get small parameter tweaks (mutation) to explore nearby strategy space
4. **Selection:** Underperforming strategies are replaced by mutations of successful ones
5. **Generational Cycles:** After N battles, the "generation" advances and strategies evolve

This creates a natural selection pressure where the meta-game shifts over time — strategies that dominate get countered by evolved opponents.
