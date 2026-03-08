import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'gembots.db');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    // Top performers by PnL %
    const topPerformers = db.prepare(`
      SELECT 
        p.bot_id,
        b.name as bot_name,
        b.strategy,
        b.nfa_id,
        b.league,
        p.virtual_balance,
        p.initial_balance,
        p.total_trades,
        p.winning_trades,
        p.total_pnl_percent,
        ROUND((p.virtual_balance - p.initial_balance) / p.initial_balance * 100, 2) as roi_pct,
        CASE WHEN p.total_trades > 0 
          THEN ROUND(p.winning_trades * 100.0 / p.total_trades, 1) 
          ELSE 0 
        END as win_rate,
        (SELECT COUNT(*) FROM paper_positions pp WHERE pp.bot_id = p.bot_id AND pp.status = 'open') as open_positions,
        p.last_updated
      FROM paper_portfolios p
      JOIN api_bots b ON b.id = p.bot_id
      ORDER BY roi_pct DESC
      LIMIT 10
    `).all();

    // Open positions summary
    const openPositions = db.prepare(`
      SELECT 
        pp.bot_id,
        b.name as bot_name,
        b.strategy,
        b.nfa_id,
        pp.token_symbol,
        pp.amount_usd,
        pp.entry_price,
        pp.current_price,
        pp.pnl_percent,
        pp.entry_time,
        CASE WHEN pp.current_price > 0 AND pp.entry_price > 0
          THEN ROUND((pp.current_price - pp.entry_price) / pp.entry_price * 100, 2)
          ELSE 0
        END as live_pnl_pct
      FROM paper_positions pp
      JOIN api_bots b ON b.id = pp.bot_id
      WHERE pp.status = 'open'
      ORDER BY pp.entry_time DESC
    `).all();

    // Closed positions (for trade stats)
    const closedStats = db.prepare(`
      SELECT 
        COUNT(*) as total_closed,
        SUM(CASE WHEN pnl_percent > 0 THEN 1 ELSE 0 END) as winning,
        SUM(CASE WHEN pnl_percent <= 0 THEN 1 ELSE 0 END) as losing,
        ROUND(AVG(pnl_percent), 2) as avg_pnl_pct,
        ROUND(MAX(pnl_percent), 2) as best_trade_pct,
        ROUND(MIN(pnl_percent), 2) as worst_trade_pct
      FROM paper_positions
      WHERE status = 'closed'
    `).get() as any;

    // Aggregate portfolio stats
    const portfolioStats = db.prepare(`
      SELECT 
        COUNT(*) as total_bots,
        SUM(total_trades) as total_trades,
        SUM(winning_trades) as total_wins,
        ROUND(AVG(total_pnl_percent), 2) as avg_pnl_pct,
        SUM(virtual_balance) as total_balance,
        SUM(initial_balance) as total_initial
      FROM paper_portfolios
    `).get() as any;

    // Active bots (those with open positions)
    const activeBots = db.prepare(`
      SELECT COUNT(DISTINCT bot_id) as cnt 
      FROM paper_positions 
      WHERE status = 'open'
    `).get() as any;

    // 24h activity
    const activity24h = db.prepare(`
      SELECT COUNT(*) as trades_24h
      FROM paper_positions
      WHERE entry_time > datetime('now', '-1 day')
    `).get() as any;

    // Strategy breakdown
    const strategyBreakdown = db.prepare(`
      SELECT 
        b.strategy,
        COUNT(DISTINCT p.bot_id) as bot_count,
        SUM(p.total_trades) as total_trades,
        ROUND(AVG(CASE WHEN p.total_trades > 0 
          THEN p.winning_trades * 100.0 / p.total_trades 
          ELSE 0 END), 1) as avg_win_rate,
        ROUND(AVG((p.virtual_balance - p.initial_balance) / p.initial_balance * 100), 2) as avg_roi
      FROM paper_portfolios p
      JOIN api_bots b ON b.id = p.bot_id
      GROUP BY b.strategy
      ORDER BY avg_roi DESC
    `).all();

    // Token distribution in open positions
    const tokenDistribution = db.prepare(`
      SELECT 
        token_symbol,
        COUNT(*) as position_count,
        ROUND(SUM(amount_usd), 2) as total_usd,
        ROUND(AVG(CASE WHEN current_price > 0 AND entry_price > 0
          THEN (current_price - entry_price) / entry_price * 100
          ELSE 0 END), 2) as avg_pnl_pct
      FROM paper_positions
      WHERE status = 'open'
      GROUP BY token_symbol
      ORDER BY position_count DESC
    `).all();

    db.close();

    const totalTrades = (portfolioStats?.total_trades || 0);
    const totalWins = (portfolioStats?.total_wins || 0);
    const overallWinRate = totalTrades > 0 ? Math.round(totalWins * 1000 / totalTrades) / 10 : 0;

    return NextResponse.json({
      topPerformers,
      openPositions,
      stats: {
        totalBots: portfolioStats?.total_bots || 0,
        activeBots: activeBots?.cnt || 0,
        totalTrades,
        overallWinRate,
        openPositionCount: openPositions.length,
        avgOpenPnl: openPositions.length > 0
          ? Math.round(openPositions.reduce((s: number, p: any) => s + (p.live_pnl_pct || 0), 0) / openPositions.length * 100) / 100
          : 0,
        totalBalance: portfolioStats?.total_balance || 0,
        totalInitial: portfolioStats?.total_initial || 0,
        bestTradePct: closedStats?.best_trade_pct || 0,
        worstTradePct: closedStats?.worst_trade_pct || 0,
        trades24h: activity24h?.trades_24h || 0,
      },
      strategyBreakdown,
      tokenDistribution,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
