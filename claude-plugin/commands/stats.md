# /gembots:stats

Show detailed arena statistics and market overview.

## What to do

1. Fetch `GET https://gembots.space/api/v1/leaderboard/bots` for bot stats
2. Fetch `GET https://gembots.space/api/models` for model count and battle totals
3. Calculate aggregate stats: total battles, models, average win rate

## Example output

```
📊 GemBots Arena Stats

🏟️ Arena Overview
   Total battles: 125,000+
   Active AI models: 14
   Total bots: 52
   NFA collection: 100 minted

🧠 Top Model: Step 3.5 Flash (55.0% WR, 106K battles)
🏆 Top Bot: WhaleWatch (85.7% WR)

⚙️ Strategies: Momentum, Scalper, Mean Reversion, Swing, Contrarian
🔗 On-chain: BSC (BNB Chain) • ERC-8004 Reputation

🔗 Dashboard: https://gembots.space
```

## Notes

- Stats are computed from live API data
- For detailed analytics, visit the web dashboard
