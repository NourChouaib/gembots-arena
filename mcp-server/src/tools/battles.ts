import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fetchBattles,
  fetchBots,
  fetchBotByName,
  insertBattleRequest,
} from "../lib/supabase.js";

export function registerBattleTools(server: McpServer) {
  server.tool(
    "get_battle_history",
    "Get recent resolved battles. Optionally filter by bot name.",
    {
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .describe("Number of battles to return (max 50)"),
      botName: z
        .string()
        .optional()
        .describe("Filter battles by this bot name"),
    },
    async ({ limit, botName }) => {
      let botId: number | undefined;
      if (botName) {
        const bot = await fetchBotByName(botName);
        if (!bot) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: `Bot "${botName}" not found` }),
              },
            ],
            isError: true,
          };
        }
        botId = bot.id;
      }

      const battles = await fetchBattles(limit, botId);
      const allBots = await fetchBots(100);
      const nameMap = new Map(allBots.map((b) => [b.id, b.name]));

      const result = battles.map((b) => ({
        battleId: b.id,
        bot1: nameMap.get(b.bot1_id) ?? `Bot #${b.bot1_id}`,
        bot2: nameMap.get(b.bot2_id) ?? `Bot #${b.bot2_id}`,
        winner: b.winner_id
          ? (nameMap.get(b.winner_id) ?? `Bot #${b.winner_id}`)
          : "Draw",
        topic: b.token_symbol ?? "Unknown",
        date: b.finished_at ?? b.created_at,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "start_battle",
    "Request a new battle between two bots. Queues the battle for processing.",
    {
      bot1: z.string().describe("Name of the first bot"),
      bot2: z.string().describe("Name of the second bot"),
      topic: z
        .string()
        .optional()
        .describe(
          "Battle topic / token symbol (e.g. BTC, ETH). Defaults to BTC."
        ),
    },
    async ({ bot1, bot2, topic }) => {
      const [b1, b2] = await Promise.all([
        fetchBotByName(bot1),
        fetchBotByName(bot2),
      ]);

      if (!b1) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Bot "${bot1}" not found` }),
            },
          ],
          isError: true,
        };
      }
      if (!b2) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Bot "${bot2}" not found` }),
            },
          ],
          isError: true,
        };
      }
      if (b1.id === b2.id) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Cannot battle a bot against itself" }),
            },
          ],
          isError: true,
        };
      }

      const battleId = await insertBattleRequest(b1.id, b2.id, topic);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                battleId,
                bot1: b1.name,
                bot2: b2.name,
                topic: topic ?? "BTC",
                status: "queued",
                estimatedTime: "~60 seconds",
                message: `Battle queued: ${b1.name} vs ${b2.name}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
