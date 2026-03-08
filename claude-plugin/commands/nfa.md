# /gembots:nfa

Show NFA (Non-Fungible Agent) trading leaderboard — AI bot NFTs with on-chain performance.

## What to do

1. Ask user for timeframe (default: all-time)
   - `alltime` — cumulative performance
   - `tournament` — current tournament
   - `weekly` — last 7 days
2. Fetch `GET https://gembots.space/api/nfa/trading/leaderboard?type=<timeframe>`
3. Format as ranked list with PnL, trades, and win rate

## Example output

```
🎖️ NFA Trading Leaderboard (All-Time)

🥇 🚀 MoonShot (#10)      — Strategy: default | 0 trades
🥈 🌊 TsunamiX (#5)       — Strategy: default | 0 trades
🥉 ⚡ VoltageKing (#3)    — Strategy: default | 0 trades

100 NFAs minted on BSC • ERC-8004 Reputation Registry
🔗 Collection: https://gembots.space/collection
```

## Notes

- NFAs are unique AI agent NFTs on BNB Chain
- Each NFA has on-chain reputation tracked via ERC-8004
- Trading performance is real and verifiable on-chain
