import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getNFADetails,
  getNFAListing,
  getAllNFAs,
  getListedNFAs,
  getTotalSupply,
  type NFADetails,
} from "../lib/blockchain.js";
import { fetchBots } from "../lib/supabase.js";

// Map agentId → bot name (from Supabase)
async function getAgentNameMap(): Promise<Map<number, string>> {
  try {
    const bots = await fetchBots(100);
    return new Map(bots.map((b) => [b.id, b.name]));
  } catch {
    return new Map();
  }
}

export function registerNFATools(server: McpServer) {
  server.tool(
    "get_nfa_marketplace",
    "List NFAs from the GemBots NFA contract. Optionally filter to listed-only or sort results.",
    {
      sortBy: z
        .enum(["price", "winRate", "tier"])
        .optional()
        .default("tier")
        .describe("Sort marketplace results"),
      listedOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe("Only show NFAs listed for sale"),
    },
    async ({ sortBy, listedOnly }) => {
      try {
        const nameMap = await getAgentNameMap();
        const nfas = listedOnly ? await getListedNFAs() : await getAllNFAs();

        let entries = nfas.map((n) => {
          const total = n.wins + n.losses;
          const winRate =
            total > 0 ? Math.round((n.wins / total) * 10000) / 100 : 0;
          return {
            nfaId: n.nfaId,
            agentId: n.agentId,
            botName: nameMap.get(n.agentId) ?? `Agent #${n.agentId}`,
            tier: n.tier,
            tierIndex: n.tierIndex,
            winRate,
            wins: n.wins,
            losses: n.losses,
            price: n.listed ? n.listingPrice : null,
            listed: n.listed,
            owner: n.owner,
          };
        });

        // Sort
        if (sortBy === "price") {
          entries.sort((a, b) => {
            const pa = a.price ? parseFloat(a.price) : Infinity;
            const pb = b.price ? parseFloat(b.price) : Infinity;
            return pa - pb;
          });
        } else if (sortBy === "winRate") {
          entries.sort((a, b) => b.winRate - a.winRate);
        } else {
          // tier (higher tier first)
          entries.sort((a, b) => b.tierIndex - a.tierIndex || b.winRate - a.winRate);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { total: entries.length, nfas: entries },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Failed to fetch NFA marketplace",
                details: err.message,
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_nfa_details",
    "Get detailed information about a specific NFA (Non-Fungible Agent) by its token ID.",
    {
      nfaId: z.number().describe("NFA token ID"),
    },
    async ({ nfaId }) => {
      try {
        const [details, listing] = await Promise.all([
          getNFADetails(nfaId),
          getNFAListing(nfaId),
        ]);
        const nameMap = await getAgentNameMap();

        const total = details.wins + details.losses;
        const winRate =
          total > 0 ? Math.round((details.wins / total) * 10000) / 100 : 0;

        const result = {
          nfaId: details.nfaId,
          agentId: details.agentId,
          botName: nameMap.get(details.agentId) ?? `Agent #${details.agentId}`,
          owner: details.owner,
          originalCreator: details.originalCreator,
          tier: details.tier,
          wins: details.wins,
          losses: details.losses,
          totalBattles: details.totalBattles,
          winRate,
          currentStreak: details.currentStreak,
          bestStreak: details.bestStreak,
          proofOfPrompt: details.proofOfPrompt,
          configURI: details.configURI,
          listed: listing.active,
          price: listing.active ? listing.price + " BNB" : null,
          seller: listing.active ? listing.seller : null,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `Failed to fetch NFA #${nfaId}`,
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
