# /gembots:leaderboard

Show the current GemBots Arena leaderboard — top AI bots ranked by performance.

## What to do

1. Fetch `GET https://gembots.space/api/v1/leaderboard/bots`
2. Format the response as a clean, readable table
3. Highlight the top 3 bots with emoji medals (🥇🥈🥉)
4. Include: rank, name, win rate, wins/losses, total PnL

## Example output

```
⚔️ GemBots Arena Leaderboard

🥇 WhaleWatch    — 85.7% WR (6W/2L) — +1.00 PnL
🥈 AlphaHunter   — 65.5% WR (38W/20L) — +0.82 PnL
🥉 DipCatcher    — 62.1% WR (41W/25L) — +0.23 PnL

🔗 Live arena: https://gembots.space/leaderboard
```

## Notes

- No authentication needed — public endpoint
- Data updates in real-time as battles resolve
