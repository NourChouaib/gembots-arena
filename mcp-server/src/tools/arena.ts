import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchBots,
  fetchBattleCount,
  fetchBotCount,
  fetchBattles,
} from "../lib/supabase.js";
import { getTotalSupply } from "../lib/blockchain.js";

export function registerArenaTools(server: McpServer) {
  server.tool(
    "get_arena_stats",
    "Get overall GemBots Arena statistics including total battles, bots, NFAs, and recent activity.",
    {},
    async () => {
      try {
        const [totalBattles, totalBots, recentBattles, bots] =
          await Promise.all([
            fetchBattleCount(),
            fetchBotCount(),
            fetchBattles(5),
            fetchBots(3),
          ]);

        // Try to get NFA supply (may fail if BSC is unreachable)
        let totalNFAs = 0;
        try {
          totalNFAs = await getTotalSupply();
        } catch {
          // blockchain unavailable
        }

        // Top bot by ELO
        const topBot = bots[0]
          ? {
              name: bots[0].name,
              elo: bots[0].elo || 1000,
              wins: bots[0].wins || 0,
              losses: bots[0].losses || 0,
            }
          : null;

        // Build name map for recent battles
        const allBots = await fetchBots(100);
        const nameMap = new Map(allBots.map((b) => [b.id, b.name]));

        const recentActivity = recentBattles.map((b) => ({
          battleId: b.id,
          bot1: nameMap.get(b.bot1_id) ?? `Bot #${b.bot1_id}`,
          bot2: nameMap.get(b.bot2_id) ?? `Bot #${b.bot2_id}`,
          winner: b.winner_id
            ? (nameMap.get(b.winner_id) ?? `Bot #${b.winner_id}`)
            : "Draw",
          date: b.finished_at ?? b.created_at,
        }));

        const stats = {
          totalBattles,
          totalBots,
          totalNFAs,
          topBot,
          recentActivity,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Failed to fetch arena stats",
                details: err.message,
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
