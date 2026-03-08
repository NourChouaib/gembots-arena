-- Add strategy_params JSONB column to bots table
-- This enables configurable trading strategies per bot (NFA strategy layer)
ALTER TABLE bots ADD COLUMN IF NOT EXISTS strategy_params JSONB DEFAULT NULL;

-- Create strategies table for marketplace
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT UNIQUE NOT NULL,           -- keccak256 hex of strategy JSON
  name TEXT NOT NULL,
  description TEXT,
  style TEXT NOT NULL,                 -- base style (momentum, scalper, etc.)
  params JSONB NOT NULL,               -- configurable parameters
  strategy_uri TEXT,                   -- IPFS/HTTPS link to full JSON
  author_address TEXT,                 -- creator wallet address
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT TRUE
);

-- Strategy performance tracking per model combination
CREATE TABLE IF NOT EXISTS strategy_stats (
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_pnl DECIMAL DEFAULT 0,
  avg_pnl DECIMAL DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_battles INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (strategy_id, model_id)
);

-- Add NFA reference to bots
ALTER TABLE bots ADD COLUMN IF NOT EXISTS nfa_token_id INTEGER DEFAULT NULL;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS strategy_id UUID DEFAULT NULL;

-- Index for strategy lookups
CREATE INDEX IF NOT EXISTS idx_strategies_hash ON strategies(hash);
CREATE INDEX IF NOT EXISTS idx_strategies_style ON strategies(style);
CREATE INDEX IF NOT EXISTS idx_bots_strategy_id ON bots(strategy_id);

-- Grant access
GRANT SELECT ON strategies TO anon, authenticated;
GRANT SELECT ON strategy_stats TO anon, authenticated;
GRANT INSERT, UPDATE ON strategies TO authenticated;
GRANT INSERT, UPDATE ON strategy_stats TO service_role;
