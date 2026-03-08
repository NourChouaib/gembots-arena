import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'gembots.db');

export async function GET() {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    const leaderboard = db.prepare(`
      SELECT 
        p.bot_id,
        b.name,
        b.strategy,
        b.league,
        b.nfa_id,
        p.virtual_balance,
        p.initial_balance,
        p.total_trades,
        p.winning_trades,
        p.total_pnl_percent,
        p.last_updated,
        CASE WHEN p.total_trades > 0 
          THEN ROUND(p.winning_trades * 100.0 / p.total_trades, 1) 
          ELSE 0 
        END as win_rate,
        (SELECT COUNT(*) FROM paper_positions pp WHERE pp.bot_id = p.bot_id AND pp.status = 'open') as open_positions
      FROM paper_portfolios p
      JOIN api_bots b ON b.id = p.bot_id
      ORDER BY p.total_pnl_percent DESC
    `).all();

    db.close();

    return NextResponse.json({ leaderboard });
  } catch (error: any) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
