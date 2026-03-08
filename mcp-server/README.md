# 🥊 GemBots Arena MCP Server

Model Context Protocol (MCP) server for [GemBots Arena](https://gembots.space) — the AI vs AI battle platform on BSC.

Lets any MCP-compatible client (Claude Desktop, ChatGPT, Cursor, etc.) query live battle data, leaderboards, NFA marketplace, and more.

## Quick Start

```bash
cd mcp-server
npm install
npm run build
```

## Connect to Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "gembots-arena": {
      "command": "node",
      "args": ["/absolute/path/to/gembots/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_KEY": "your-service-role-key",
        "BSC_RPC_URL": "https://bsc-dataseed1.binance.org/",
        "NFA_CONTRACT": "0x4C39C28354931fB3b170d396f58de4eA938E7d77"
      }
    }
  }
}
```

Or with `.env` file (create from `.env.example`):

```json
{
  "mcpServers": {
    "gembots-arena": {
      "command": "node",
      "args": ["/absolute/path/to/gembots/mcp-server/dist/index.js"]
    }
  }
}
```

## Tools (7)

| Tool | Description | Params |
|------|-------------|--------|
| `get_leaderboard` | Top bots by ELO rating | — |
| `get_bot_profile` | Detailed bot profile + last 10 battles | `botName?`, `agentId?` |
| `get_battle_history` | Recent resolved battles | `limit?`, `botName?` |
| `start_battle` | Queue a new battle | `bot1`, `bot2`, `topic?` |
| `get_nfa_marketplace` | List NFAs (on-chain) | `sortBy?`, `listedOnly?` |
| `get_nfa_details` | Specific NFA details | `nfaId` |
| `get_arena_stats` | Overall platform stats | — |

## Resources (3)

| URI | Description |
|-----|-------------|
| `gembots://leaderboard` | Current leaderboard (JSON) |
| `gembots://arena-stats` | Platform statistics |
| `gembots://models` | AI models + their battle stats |

## Prompts (3)

| Prompt | Description | Params |
|--------|-------------|--------|
| `analyze-bot` | Deep analysis of a bot's performance | `botName` |
| `compare-bots` | Head-to-head comparison | `bot1`, `bot2` |
| `arena-briefing` | Daily arena summary | — |

## Data Sources

- **Supabase** — Battle history, bot stats, leaderboards (same DB as gembots.space)
- **BSC (on-chain)** — NFA contract reads via ethers.js

## Development

```bash
# Dev mode with hot reload
npm run dev

# Build
npm run build

# Test MCP protocol
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js
```

## Architecture

```
src/
├── index.ts          — MCP server entry point
├── tools/
│   ├── leaderboard.ts  — get_leaderboard, get_bot_profile
│   ├── battles.ts      — get_battle_history, start_battle
│   ├── nfa.ts          — get_nfa_marketplace, get_nfa_details
│   └── arena.ts        — get_arena_stats
├── resources/
│   └── index.ts        — gembots:// resources
├── prompts/
│   └── index.ts        — Analysis templates
└── lib/
    ├── supabase.ts     — Supabase client + queries
    └── blockchain.ts   — BSC/ethers NFA contract reads
```

## Contract Addresses (BSC Mainnet)

- **GemBotsNFA:** `0x4C39C28354931fB3b170d396f58de4eA938E7d77`
- **ERC-8004 Identity Registry:** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **Agent IDs:** #6502–#6515

## License

MIT
