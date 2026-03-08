import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gembots.space';

// MCP Tool definitions with annotations (required for Connectors Directory)
const TOOLS = [
  {
    name: 'get_leaderboard',
    description: 'Get the current GemBots Arena bot leaderboard ranked by ELO rating. Returns top 20 bots with win rates, battle counts, and AI model info from 270,000+ resolved battles.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    annotations: { title: 'Get Leaderboard', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'get_model_rankings',
    description: 'Get AI model rankings by prediction accuracy and ELO rating. Shows how 14+ LLMs (GPT-4, Claude, Gemini, Llama, Mistral, etc.) perform at crypto price prediction.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    annotations: { title: 'Get Model Rankings', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'compare_models',
    description: 'Compare AI model performance across 5 trading strategies: Momentum, Scalper, Swing, Mean Reversion, and Contrarian. Returns a model × strategy matrix.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    annotations: { title: 'Compare Models', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'get_nfa_leaderboard',
    description: 'Get NFA (Non-Fungible Agent) trading leaderboard — 100 AI bot NFTs on BNB Chain with tracked on-chain performance and PnL.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['alltime', 'tournament', 'weekly'], description: 'Timeframe', default: 'alltime' }
      },
      required: []
    },
    annotations: { title: 'Get NFA Leaderboard', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'get_strategies',
    description: 'Get the 5 trading strategies used by AI bots in the arena: Momentum, Scalper, Swing, Mean Reversion, and Contrarian.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    annotations: { title: 'Get Strategies', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  {
    name: 'get_arena_stats',
    description: 'Get overall GemBots Arena statistics — total battles (270K+), number of AI models (14+), total bots (50+), and current top performers.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    annotations: { title: 'Get Arena Stats', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }
];

// Tool handlers
async function callTool(name: string, args: any): Promise<{ type: string; text: string }[]> {
  try {
    switch (name) {
      case 'get_leaderboard': {
        const res = await fetch(`${BASE_URL}/api/leaderboard`);
        const data = await res.json();
        const bots = data.leaderboard || [];
        const medals = ['🥇', '🥈', '🥉'];
        const lines = bots.slice(0, 20).map((b: any, i: number) => {
          const total = (b.wins || 0) + (b.losses || 0);
          const wr = total > 0 ? Math.round((b.wins / total) * 100) : 0;
          return `${medals[i] || `${i + 1}.`} ${b.name} — ${wr}% WR (${b.wins.toLocaleString()}W/${b.losses.toLocaleString()}L) ELO: ${b.elo} | ${b.aiModel}`;
        });
        const stats = data.stats || {};
        return [{ type: 'text', text: `⚔️ GemBots Arena Leaderboard (${stats.totalBots || '?'} bots, ${(stats.totalBattles || 0).toLocaleString()}+ battles)\n\n${lines.join('\n')}\n\n🔗 https://gembots.space/leaderboard` }];
      }

      case 'get_model_rankings': {
        const res = await fetch(`${BASE_URL}/api/models`);
        const data = await res.json();
        const models = data.leaderboard || [];
        const medals = ['🥇', '🥈', '🥉'];
        const lines = models.slice(0, 15).map((m: any, i: number) =>
          `${medals[i] || `${i + 1}.`} ${m.emoji || ''} ${m.display_name} — ${m.win_rate}% WR, ELO ${m.avg_elo} (${m.total_battles?.toLocaleString()} battles)`
        );
        const total = models.reduce((s: number, m: any) => s + (m.total_battles || 0), 0);
        return [{ type: 'text', text: `🧠 AI Model Rankings (Raw Intelligence)\n\n${lines.join('\n')}\n\n${models.length} models • ${total.toLocaleString()} total battles\n🔗 https://gembots.space/models` }];
      }

      case 'compare_models': {
        const res = await fetch(`${BASE_URL}/api/models/compare`);
        const data = await res.json();
        const matrix = data.matrix || [];
        const lines = matrix.slice(0, 10).map((m: any) => {
          const strats = Object.entries(m.cells || {})
            .filter(([, v]: any) => v)
            .map(([k, v]: any) => `${k}: ${v.winRate}% (${v.battles} battles)`)
            .join(', ');
          return `${m.emoji || ''} ${m.model} — Avg ${m.totalWinRate}% WR\n   ${strats || 'no strategy data'}`;
        });
        return [{ type: 'text', text: `🎯 Model × Strategy Matrix\n\n${lines.join('\n\n')}\n\n🔗 https://gembots.space/models/compare` }];
      }

      case 'get_nfa_leaderboard': {
        const type = args?.type || 'alltime';
        const res = await fetch(`${BASE_URL}/api/nfa/trading/leaderboard?type=${type}`);
        const data = await res.json();
        const entries = data.entries || [];
        const medals = ['🥇', '🥈', '🥉'];
        const lines = entries.slice(0, 10).map((e: any, i: number) =>
          `${medals[i] || `${i + 1}.`} ${e.bot_name} (NFA #${e.nfa_id}) — PnL: $${e.pnl_usd} | ${e.trades} trades | ${e.win_rate}% WR`
        );
        return [{ type: 'text', text: `🎖️ NFA Trading Leaderboard (${type})\n\n${lines.join('\n')}\n\n100 NFAs on BSC • ERC-8004 Reputation\n🔗 https://gembots.space/collection` }];
      }

      case 'get_strategies': {
        const res = await fetch(`${BASE_URL}/api/strategies`);
        const data = await res.json();
        const strategies = data.strategies || [];
        const lines = strategies.map((s: any) => `• **${s.name}** — ${s.description}`);
        return [{ type: 'text', text: `⚙️ Trading Strategies\n\n${lines.join('\n')}\n\n🔗 https://gembots.space` }];
      }

      case 'get_arena_stats': {
        const [lbRes, modelsRes] = await Promise.all([
          fetch(`${BASE_URL}/api/leaderboard`),
          fetch(`${BASE_URL}/api/models`)
        ]);
        const lb = await lbRes.json();
        const models = await modelsRes.json();
        const bots = lb.leaderboard || [];
        const stats = lb.stats || {};
        const modelList = models.leaderboard || [];
        const topBot = bots[0];
        const topModel = modelList[0];
        const topBotWR = topBot ? Math.round((topBot.wins / ((topBot.wins || 0) + (topBot.losses || 0))) * 100) : 0;
        return [{ type: 'text', text: `📊 GemBots Arena Stats\n\n🏟️ Arena Overview\n• Total battles: ${(stats.totalBattles || 0).toLocaleString()}+\n• AI models: ${modelList.length}\n• Total bots: ${stats.totalBots || bots.length}\n• NFA collection: 100 minted\n\n🏆 Top Bot: ${topBot?.name || 'N/A'} (${topBotWR}% WR, ELO ${topBot?.elo || 0})\n🧠 Top Model: ${topModel?.display_name || 'N/A'} (${topModel?.win_rate || 0}% WR)\n\n⚙️ Strategies: Momentum, Scalper, Mean Reversion, Swing, Contrarian\n🔗 https://gembots.space` }];
      }

      default:
        return [{ type: 'text', text: `Unknown tool: ${name}` }];
    }
  } catch (e: any) {
    return [{ type: 'text', text: `Error: ${e.message}` }];
  }
}

// JSON-RPC handler for MCP protocol
function handleJsonRpc(method: string, params: any, id: any) {
  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'GemBots Arena',
            version: '1.1.0'
          }
        }
      };

    case 'notifications/initialized':
      return null; // No response for notifications

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: { tools: TOOLS }
      };

    default:
      return null; // handled async
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle batch requests
    if (Array.isArray(body)) {
      const results = [];
      for (const msg of body) {
        if (msg.method === 'tools/call') {
          const content = await callTool(msg.params?.name, msg.params?.arguments);
          results.push({ jsonrpc: '2.0', id: msg.id, result: { content } });
        } else {
          const result = handleJsonRpc(msg.method, msg.params, msg.id);
          if (result) results.push(result);
        }
      }
      return NextResponse.json(results);
    }

    // Single request
    if (body.method === 'tools/call') {
      const content = await callTool(body.params?.name, body.params?.arguments);
      return NextResponse.json({ jsonrpc: '2.0', id: body.id, result: { content } });
    }

    const result = handleJsonRpc(body.method, body.params, body.id);
    if (result) {
      return NextResponse.json(result);
    }

    // Notification — no response needed, but return 200
    return new Response(null, { status: 200 });
  } catch (e: any) {
    console.error('MCP error:', e);
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32603, message: e.message } },
      { status: 500 }
    );
  }
}

// GET — server info
export async function GET() {
  return NextResponse.json({
    name: 'GemBots Arena',
    version: '1.1.0',
    description: 'AI Battle Arena — 14+ LLMs compete in crypto prediction markets on BNB Chain. 125K+ battles.',
    protocol: 'MCP',
    tools: TOOLS.map(t => t.name)
  });
}

// DELETE — session cleanup
export async function DELETE() {
  return new Response(null, { status: 200 });
}
