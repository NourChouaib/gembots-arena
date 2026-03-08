import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/nfa/trading/analytics/performance
 * 
 * Returns top performers leaderboard with detailed stats and commission contribution.
 * Query params:
 *   limit=20 (default)
 *   sort=pnl (default) | trades | winrate | commissions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sort = searchParams.get('sort') || 'pnl';

    // Get all trading stats
    const { data: stats, error: statsErr } = await supabase
      .from('nfa_trading_stats')
      .select('*')
      .gt('total_trades', 0)
      .order('total_pnl_usd', { ascending: false })
      .limit(100);

    if (statsErr) {
      console.error('Performance stats error:', statsErr);
      return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
    }

    if (!stats || stats.length === 0) {
      return NextResponse.json({ performers: [], total: 0 });
    }

    // Get bot info for each
    const nfaIds = stats.map(s => s.nfa_id);
    const { data: bots } = await supabase
      .from('bots')
      .select('id, nfa_id, name, strategy, trading_mode')
      .in('nfa_id', nfaIds);

    const botMap = new Map((bots || []).map(b => [b.nfa_id, b]));

    // Get commissions per bot
    const { data: commissions } = await supabase
      .from('trading_commissions')
      .select('nfa_id, amount_bnb, amount_usd')
      .in('nfa_id', nfaIds);

    const commMap = new Map<number, { totalBnb: number; totalUsd: number; count: number }>();
    for (const c of (commissions || [])) {
      const existing = commMap.get(c.nfa_id) || { totalBnb: 0, totalUsd: 0, count: 0 };
      existing.totalBnb += c.amount_bnb || 0;
      existing.totalUsd += c.amount_usd || 0;
      existing.count += 1;
      commMap.set(c.nfa_id, existing);
    }

    // Build performers list
    let performers = stats.map((s, i) => {
      const bot = botMap.get(s.nfa_id);
      const comm = commMap.get(s.nfa_id) || { totalBnb: 0, totalUsd: 0, count: 0 };

      return {
        rank: i + 1,
        nfaId: s.nfa_id,
        botName: bot?.name || `NFA #${s.nfa_id}`,
        strategy: bot?.strategy || 'unknown',
        tradingMode: bot?.trading_mode || 'off',
        totalPnlUsd: s.total_pnl_usd || 0,
        totalTrades: s.total_trades || 0,
        winRate: s.win_rate || 0,
        winningTrades: s.winning_trades || 0,
        losingTrades: s.losing_trades || 0,
        bestTradePnl: s.best_trade_pnl || 0,
        worstTradePnl: s.worst_trade_pnl || 0,
        sharpeRatio: s.sharpe_ratio || 0,
        maxDrawdownPct: s.max_drawdown_pct || 0,
        avgPnlPct: s.avg_pnl_pct || 0,
        avgHoldMinutes: s.avg_hold_minutes || 0,
        currentStreak: s.current_streak || 0,
        bestStreak: s.best_streak || 0,
        paperBalance: s.paper_balance_usd || 10000,
        commissionsBnb: parseFloat(comm.totalBnb.toFixed(6)),
        commissionsUsd: parseFloat(comm.totalUsd.toFixed(2)),
        commissionCount: comm.count,
      };
    });

    // Sort based on parameter
    switch (sort) {
      case 'trades':
        performers.sort((a, b) => b.totalTrades - a.totalTrades);
        break;
      case 'winrate':
        performers.sort((a, b) => b.winRate - a.winRate);
        break;
      case 'commissions':
        performers.sort((a, b) => b.commissionsUsd - a.commissionsUsd);
        break;
      default: // pnl
        performers.sort((a, b) => b.totalPnlUsd - a.totalPnlUsd);
    }

    // Re-rank after sort
    performers = performers.slice(0, limit).map((p, i) => ({ ...p, rank: i + 1 }));

    return NextResponse.json({
      performers,
      total: stats.length,
      sort,
    });
  } catch (err) {
    console.error('GET /api/nfa/trading/analytics/performance error:', err);
    return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
  }
}
