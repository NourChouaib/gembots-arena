import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'gembots.db');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  try {
    const { botId } = await params;
    const db = new Database(DB_PATH, { readonly: true });

    // Get portfolio
    const portfolio = db.prepare(`
      SELECT p.*, b.name, b.strategy, b.wins, b.losses, b.league
      FROM paper_portfolios p
      JOIN api_bots b ON b.id = p.bot_id
      WHERE p.bot_id = ?
    `).get(Number(botId)) as any;

    if (!portfolio) {
      db.close();
      return NextResponse.json({ error: 'Bot not found or no paper trading data' }, { status: 404 });
    }

    // Get open positions
    const openPositions = db.prepare(`
      SELECT * FROM paper_positions
      WHERE bot_id = ? AND status = 'open'
      ORDER BY entry_time DESC
    `).all(Number(botId));

    // Get recent closed trades
    const recentTrades = db.prepare(`
      SELECT * FROM paper_positions
      WHERE bot_id = ? AND status = 'closed'
      ORDER BY exit_time DESC
      LIMIT 20
    `).all(Number(botId));

    // Get trade events
    const tradeEvents = db.prepare(`
      SELECT * FROM trade_events
      WHERE bot_name = ?
      ORDER BY timestamp DESC
      LIMIT 30
    `).all(portfolio.name);

    // Calculate stats
    const winRate = portfolio.total_trades > 0
      ? ((portfolio.winning_trades / portfolio.total_trades) * 100).toFixed(1)
      : '0';

    const totalPnlBnb = portfolio.virtual_balance - portfolio.initial_balance;

    db.close();

    return NextResponse.json({
      bot: {
        id: Number(botId),
        name: portfolio.name,
        strategy: portfolio.strategy,
        league: portfolio.league,
        battleWins: portfolio.wins,
        battleLosses: portfolio.losses,
      },
      portfolio: {
        virtualBalance: portfolio.virtual_balance,
        initialBalance: portfolio.initial_balance,
        totalPnlBnb: totalPnlBnb,
        totalPnlPercent: portfolio.total_pnl_percent,
        totalTrades: portfolio.total_trades,
        winningTrades: portfolio.winning_trades,
        winRate: Number(winRate),
        lastUpdated: portfolio.last_updated,
      },
      openPositions,
      recentTrades,
      tradeEvents,
    });
  } catch (error: any) {
    console.error('Paper trading API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
