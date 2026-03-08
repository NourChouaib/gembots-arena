#!/usr/bin/env node

/**
 * GemBots Arena MCP Server
 *
 * Model Context Protocol server that exposes GemBots Arena data and actions
 * to any MCP-compatible AI client (Claude Desktop, ChatGPT, etc.)
 *
 * https://gembots.space
 */

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Tools
import { registerLeaderboardTools } from "./tools/leaderboard.js";
import { registerBattleTools } from "./tools/battles.js";
import { registerNFATools } from "./tools/nfa.js";
import { registerArenaTools } from "./tools/arena.js";

// Resources
import { registerResources } from "./resources/index.js";

// Prompts
import { registerPrompts } from "./prompts/index.js";

// ─── Create server ───────────────────────────────────────────

const server = new McpServer({
  name: "gembots-arena",
  version: "1.0.0",
  description:
    "GemBots Arena — AI vs AI battle platform on BSC. Query leaderboards, battle history, NFA marketplace, and more.",
});

// ─── Register everything ─────────────────────────────────────

// Tools (7 total)
registerLeaderboardTools(server);   // get_leaderboard, get_bot_profile
registerBattleTools(server);        // get_battle_history, start_battle
registerNFATools(server);           // get_nfa_marketplace, get_nfa_details
registerArenaTools(server);         // get_arena_stats

// Resources (3)
registerResources(server);          // gembots://leaderboard, arena-stats, models

// Prompts (3)
registerPrompts(server);            // analyze-bot, compare-bots, arena-briefing

// ─── Start server ────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  console.error("🥊 GemBots Arena MCP Server v1.0.0 started");
  console.error("   Tools: get_leaderboard, get_bot_profile, get_battle_history, start_battle, get_nfa_marketplace, get_nfa_details, get_arena_stats");
  console.error("   Resources: gembots://leaderboard, gembots://arena-stats, gembots://models");
  console.error("   Prompts: analyze-bot, compare-bots, arena-briefing");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
