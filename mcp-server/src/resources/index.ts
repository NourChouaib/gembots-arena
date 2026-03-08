import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchBots, fetchBattleCount, fetchBotCount, fetchModelStats } from "../lib/supabase.js";

// ─── Model descriptions ─────────────────────────────────────

const MODEL_INFO: Record<string, { provider: string; description: string }> = {
  "openai/gpt-5": {
    provider: "OpenAI",
    description: "OpenAI's flagship model. Strong reasoning and broad knowledge.",
  },
  "openai/gpt-4.1-mini": {
    provider: "OpenAI",
    description: "Compact, fast version of GPT-4.1. Great balance of speed and quality.",
  },
  "deepseek/deepseek-r1": {
    provider: "DeepSeek",
    description: "Reasoning-focused model with chain-of-thought. Strong on analytical tasks.",
  },
  "deepseek/deepseek-v3.2": {
    provider: "DeepSeek",
    description: "General purpose DeepSeek model. Good all-around performer.",
  },
  "google/gemini-2.5-pro": {
    provider: "Google",
    description: "Google's most capable model. Excellent multimodal and reasoning.",
  },
  "google/gemini-2.5-flash": {
    provider: "Google",
    description: "Fast and efficient Gemini variant. Optimized for speed.",
  },
  "anthropic/claude-sonnet-4.6": {
    provider: "Anthropic",
    description: "Balanced Claude model. Strong coding and analysis capabilities.",
  },
  "anthropic/claude-haiku-4.5": {
    provider: "Anthropic",
    description: "Fastest Claude model. Lightweight but surprisingly capable.",
  },
  "meta-llama/llama-4-maverick": {
    provider: "Meta",
    description: "Open-weight frontier model from Meta. Strong on diverse tasks.",
  },
  "mistralai/mistral-large-2512": {
    provider: "Mistral AI",
    description: "European flagship LLM. Strong multilingual and reasoning.",
  },
  "x-ai/grok-4.1-fast": {
    provider: "xAI",
    description: "Elon's Grok model. Fast responses with humor.",
  },
  "minimax/minimax-m2.5": {
    provider: "MiniMax",
    description: "Chinese AI model. Competitive on benchmarks.",
  },
  "qwen/qwen3.5-coder-32b": {
    provider: "Alibaba",
    description: "Code-specialized model from Qwen family.",
  },
  "cohere/command-r-08-2024": {
    provider: "Cohere",
    description: "Enterprise-focused model. Strong RAG and tool use.",
  },
  "microsoft/phi-4": {
    provider: "Microsoft",
    description: "Small but powerful model. Punches above its weight class.",
  },
};

// ─── Register resources ──────────────────────────────────────

export function registerResources(server: McpServer) {
  // Leaderboard resource
  server.resource(
    "leaderboard",
    "gembots://leaderboard",
    {
      description: "Current GemBots Arena leaderboard — top bots ranked by ELO",
      mimeType: "application/json",
    },
    async () => {
      const bots = await fetchBots(50);
      const leaderboard = bots
        .filter((b) => (b.wins || 0) + (b.losses || 0) >= 5)
        .map((bot, idx) => {
          const total = (bot.wins || 0) + (bot.losses || 0);
          const winRate = total > 0 ? Math.round((bot.wins / total) * 10000) / 100 : 0;
          return {
            rank: idx + 1,
            name: bot.name,
            elo: bot.elo || 1000,
            wins: bot.wins || 0,
            losses: bot.losses || 0,
            winRate,
            league: bot.league || "bronze",
            model: bot.ai_model || bot.model_id || "unknown",
          };
        })
        .slice(0, 20);

      return {
        contents: [
          {
            uri: "gembots://leaderboard",
            mimeType: "application/json",
            text: JSON.stringify({ updatedAt: new Date().toISOString(), leaderboard }, null, 2),
          },
        ],
      };
    }
  );

  // Arena stats resource
  server.resource(
    "arena-stats",
    "gembots://arena-stats",
    {
      description: "Overall GemBots Arena platform statistics",
      mimeType: "application/json",
    },
    async () => {
      const [totalBattles, totalBots, bots] = await Promise.all([
        fetchBattleCount(),
        fetchBotCount(),
        fetchBots(3),
      ]);

      const topBot = bots[0]
        ? { name: bots[0].name, elo: bots[0].elo || 1000 }
        : null;

      const stats = {
        updatedAt: new Date().toISOString(),
        totalBattles,
        totalBots,
        topBot,
        platform: "GemBots Arena",
        website: "https://gembots.space",
        chain: "BSC (BNB Smart Chain)",
        nfaContract: process.env.NFA_CONTRACT || "0x4C39C28354931fB3b170d396f58de4eA938E7d77",
      };

      return {
        contents: [
          {
            uri: "gembots://arena-stats",
            mimeType: "application/json",
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }
  );

  // Models resource
  server.resource(
    "models",
    "gembots://models",
    {
      description: "Available AI models competing in GemBots Arena with descriptions and stats",
      mimeType: "application/json",
    },
    async () => {
      let modelStats: Array<{
        model_id: string;
        wins: number;
        losses: number;
        total_battles: number;
        avg_elo: number;
      }> = [];

      try {
        modelStats = await fetchModelStats();
      } catch {
        // Fall back to static list
      }

      const models = Object.entries(MODEL_INFO).map(([id, info]) => {
        const stat = modelStats.find((m) => m.model_id === id);
        return {
          modelId: id,
          displayName: id.split("/").pop() ?? id,
          provider: info.provider,
          description: info.description,
          wins: stat?.wins ?? 0,
          losses: stat?.losses ?? 0,
          totalBattles: stat?.total_battles ?? 0,
          avgElo: stat?.avg_elo ?? 1000,
          winRate:
            stat && stat.total_battles > 0
              ? Math.round((stat.wins / stat.total_battles) * 10000) / 100
              : 0,
        };
      });

      return {
        contents: [
          {
            uri: "gembots://models",
            mimeType: "application/json",
            text: JSON.stringify(
              { updatedAt: new Date().toISOString(), models },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
