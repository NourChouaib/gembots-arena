# GemBots Strategy Architecture

## Concept: NFA = Model + Strategy

Each NFA (Non-Fungible Agent) is a unique combination of:
- **AI Model** — the LLM brain (GPT-4.1-mini, Claude Haiku, Gemini Flash, etc.)
- **Strategy** — trading logic config that defines behavior

Same model + different strategy = completely different bot with different win rates.

## Strategy JSON Schema

```json
{
  "version": 1,
  "name": "Aggressive Momentum Scalper",
  "description": "Catches momentum spikes, fast in/out with tight stops",
  "style": "momentum",
  "params": {
    "entry_threshold": 0.005,
    "exit_threshold": 0.003,
    "trend_lookback": 5,
    "max_hold_ticks": 8,
    "position_size_pct": 50,
    "stop_loss_pct": 2.0,
    "take_profit_pct": 5.0,
    "noise_factor": 0.01,
    "boredom_trade_chance": 0.3,
    "leverage": 10
  },
  "llm_prompt_override": null,
  "created_at": "2026-02-20T08:00:00Z",
  "author": "0x..."
}
```

## Strategy Styles (Extensible)

Base styles with configurable parameters:
1. **momentum** — buy rising, sell falling
2. **mean_reversion** — buy dips, sell rips
3. **scalper** — fast in/out, high frequency
4. **swing** — hold longer, bigger moves
5. **contrarian** — trade against the crowd
6. **hybrid** — mix of multiple styles (weights configurable)
7. **llm_pure** — 100% LLM decisions (no hardcoded logic)

## Data Flow

```
User creates strategy (frontend)
  → JSON stored on IPFS
  → strategyHash = keccak256(JSON)
  → Mint NFA on BSC: (modelId, strategyHash, strategyURI, configURI)
  → Bot registered in Supabase with strategy_config
  → Tournament picks bots → loads strategy → runs with those params
```

## Supabase Schema Changes

```sql
-- New table: strategies
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT UNIQUE NOT NULL,           -- keccak256 hex
  name TEXT NOT NULL,
  description TEXT,
  style TEXT NOT NULL,                 -- base style name
  params JSONB NOT NULL,               -- full params object
  strategy_uri TEXT,                   -- IPFS/HTTPS link
  author_address TEXT,                 -- creator wallet
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT TRUE       -- visible on marketplace
);

-- Add to bots table
ALTER TABLE bots ADD COLUMN strategy_id UUID REFERENCES strategies(id);
ALTER TABLE bots ADD COLUMN nfa_token_id INTEGER;

-- Strategy performance tracking
CREATE TABLE strategy_stats (
  strategy_id UUID REFERENCES strategies(id),
  model_id TEXT NOT NULL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_pnl DECIMAL DEFAULT 0,
  avg_pnl DECIMAL DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (strategy_id, model_id)
);
```

## Implementation Phases

### Phase 1: Backend Strategy Engine (NOW)
- [ ] Refactor `aiDecision()` to accept strategy JSON params instead of hardcoded style
- [ ] Add strategy_config to Supabase bots table
- [ ] Tournament loads strategy params from bot data
- [ ] Default strategies for existing bots (auto-generate from current hardcoded params)

### Phase 2: Smart Contract (Эдичка - in progress)
- [ ] Add modelId, strategyHash, strategyURI to NFA struct
- [ ] View functions for strategy queries
- [ ] Verify strategy hash on-chain

### Phase 3: Frontend - Strategy Builder
- [ ] Create strategy page with param sliders
- [ ] Preview mode (backtest against history)
- [ ] Mint NFA with strategy

### Phase 4: Marketplace
- [ ] List/buy strategies (the NFA itself)
- [ ] Leaderboard by strategy performance
- [ ] "Clone" popular strategies with tweaks
