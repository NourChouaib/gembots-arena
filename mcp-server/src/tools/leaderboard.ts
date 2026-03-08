import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchBots, fetchBotByName, fetchBotById, fetchBattles, type SupaBot } from "../lib/supabase.js";

// ─── Display helpers ─────────────────────────────────────────

const MODEL_DISPLAY: Record<string, string> = {
  "openai/gpt-5": "GPT-5",
  "openai/gpt-4.1-mini": "GPT-4.1 Mini",
  "deepseek/deepseek-r1": "DeepSeek R1",
  "deepseek/deepseek-v3.2": "DeepSeek V3.2",
  "google/gemini-2.5-pro": "Gemini 2.5 Pro",
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "anthropic/claude-sonnet-4.6": "Claude Sonnet 4.6",
  "anthropic/claude-haiku-4.5": "Claude Haiku 4.5",
  "meta-llama/llama-4-maverick": "Llama 4 Maverick",
  "mistralai/mistral-large-2512": "Mistral Large",
  "x-ai/grok-4.1-fast": "Grok 4.1",
  "minimax/minimax-m2.5": "MiniMax M2.5",
  "qwen/qwen3.5-coder-32b": "Qwen 3.5 Coder",
  "cohere/command-r-08-2024": "Command R",
  "microsoft/phi-4": "Phi-4",
};

function displayModel(modelId: string | null): string {
  if (!modelId) return "Unknown";
  return MODEL_DISPLAY[modelId] ?? modelId.split("/").pop() ?? modelId;
}

function tierFromElo(elo: number): string {
  if (elo >= 1500) return "Diamond";
  if (elo >= 1300) return "Gold";
  if (elo >= 1150) return "Silver";
  return "Bronze";
}

function botToEntry(bot: SupaBot) {
  const total = (bot.wins || 0) + (bot.losses || 0);
  const winRate = total > 0 ? Math.round((bot.wins / total) * 10000) / 100 : 0;
  return {
    botName: bot.name,
    model: displayModel(bot.ai_model || bot.model_id),
    wins: bot.wins || 0,
    losses: bot.losses || 0,
    winRate,
    elo: bot.elo || 1000,
    tier: tierFromElo(bot.elo || 1000),
    agentId: bot.id,
    winStreak: bot.win_streak || 0,
  };
}

// ─── Register tools ──────────────────────────────────────────

export function registerLeaderboardTools(server: McpServer) {
  server.tool(
    "get_leaderboard",
    "Get current bot rankings sorted by ELO rating. Returns top bots with win rates, tiers, and model info.",
    {},
    async () => {
      const bots = await fetchBots(50);
      const leaderboard = bots
        .filter((b) => (b.wins || 0) + (b.losses || 0) >= 5)
        .map(botToEntry)
        .sort((a, b) => b.elo - a.elo)
        .slice(0, 20);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(leaderboard, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "get_bot_profile",
    "Get detailed profile for a specific bot including battle history. Use botName for name lookup or agentId for ID lookup.",
    {
      botName: z.string().optional().describe("Bot name (case-insensitive)"),
      agentId: z.number().optional().describe("Bot ID number"),
    },
    async ({ botName, agentId }) => {
      let bot: SupaBot | null = null;

      if (agentId !== undefined) {
        bot = await fetchBotById(agentId);
      } else if (botName) {
        bot = await fetchBotByName(botName);
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Provide either botName or agentId" }),
            },
          ],
          isError: true,
        };
      }

      if (!bot) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Bot not found" }),
            },
          ],
          isError: true,
        };
      }

      // Fetch last 10 battles for this bot
      const battles = await fetchBattles(10, bot.id);
      const allBots = await fetchBots(100);
      const nameMap = new Map(allBots.map((b) => [b.id, b.name]));

      const battleHistory = battles.map((b) => ({
        battleId: b.id,
        bot1: nameMap.get(b.bot1_id) ?? `Bot #${b.bot1_id}`,
        bot2: nameMap.get(b.bot2_id) ?? `Bot #${b.bot2_id}`,
        winner: b.winner_id
          ? (nameMap.get(b.winner_id) ?? `Bot #${b.winner_id}`)
          : "Draw",
        topic: b.token_symbol ?? "Unknown",
        date: b.finished_at ?? b.created_at,
        won: b.winner_id === bot!.id,
      }));

      const entry = botToEntry(bot);

      const profile = {
        name: bot.name,
        model: entry.model,
        provider: (bot.ai_model || bot.model_id || "").split("/")[0] || "unknown",
        wins: entry.wins,
        losses: entry.losses,
        winRate: entry.winRate,
        elo: entry.elo,
        peakElo: bot.peak_elo || entry.elo,
        streak: bot.win_streak || 0,
        tier: entry.tier,
        league: bot.league || "bronze",
        agentId: bot.id,
        hp: bot.hp || 100,
        battleHistory,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    }
  );
}
