import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
  // ─── Analyze Bot ───────────────────────────────────────────

  server.prompt(
    "analyze-bot",
    "Analyze a bot's performance, strengths, and weaknesses in GemBots Arena",
    { botName: z.string().describe("Name of the bot to analyze") },
    ({ botName }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Analyze the GemBots Arena bot "${botName}". Please:

1. **Use the get_bot_profile tool** to fetch the bot's full profile and recent battle history.
2. **Check the leaderboard** with get_leaderboard to see where this bot ranks.

Then provide a comprehensive analysis including:
- **Overall Performance**: Win rate, ELO rating, current tier, and ranking
- **Battle Patterns**: Any patterns in wins/losses, strong/weak matchups
- **Streaks**: Current and best win streaks, momentum assessment
- **Model Analysis**: How this AI model performs compared to others
- **Verdict**: Is this bot rising, declining, or stable? Investment-worthy as an NFA?

Format as a sports analyst-style breakdown. Be specific with numbers.`,
          },
        },
      ],
    })
  );

  // ─── Compare Bots ──────────────────────────────────────────

  server.prompt(
    "compare-bots",
    "Compare two bots head-to-head in GemBots Arena",
    {
      bot1: z.string().describe("First bot name"),
      bot2: z.string().describe("Second bot name"),
    },
    ({ bot1, bot2 }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Compare these two GemBots Arena bots head-to-head: "${bot1}" vs "${bot2}".

1. **Fetch both profiles** using get_bot_profile for each bot.
2. **Check the leaderboard** for their relative rankings.
3. **Check battle history** to see if they've fought each other.

Provide a detailed comparison:
- **Stats Comparison Table**: ELO, win rate, wins, losses, streaks, tier
- **Head-to-Head Record**: Past matchups between these two (if any)
- **Model Matchup**: How their underlying AI models compare
- **Strengths & Weaknesses**: Where each bot excels
- **Prediction**: If they fought right now, who would likely win and why?
- **Betting Angle**: Which one is the better value play?

Present this as a pre-fight analysis card, like a boxing match preview.`,
          },
        },
      ],
    })
  );

  // ─── Arena Briefing ────────────────────────────────────────

  server.prompt(
    "arena-briefing",
    "Get a daily summary of GemBots Arena activity",
    {},
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Give me today's GemBots Arena briefing. Use the available tools:

1. **get_arena_stats** — Overall platform stats and recent activity
2. **get_leaderboard** — Current rankings
3. **get_battle_history** (limit: 10) — Recent battles

Then produce a concise daily briefing covering:
- **Arena Snapshot**: Total battles, active bots, platform health
- **Leaderboard Highlights**: Top 5 bots, any ranking changes
- **Recent Battles**: Notable results from recent fights
- **Hot Streaks**: Bots on winning/losing streaks
- **Model Wars**: Which AI providers are dominating
- **NFA Market**: Any notable NFA activity (use get_nfa_marketplace if available)
- **Today's Pick**: One bot to watch and why

Format as a sports news briefing — punchy, data-driven, entertaining. 🥊`,
          },
        },
      ],
    })
  );
}
