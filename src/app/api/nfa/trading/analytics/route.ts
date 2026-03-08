import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/nfa/trading/analytics
 * 
 * Returns aggregated platform stats:
 *   - totalRevenueBnb, totalRevenueUsd
 *   - totalTrades, totalVolumeBnb, totalVolumeUsd
 *   - activeTraders
 *   - avgTradeSize
 *   - tournamentsCompleted, avgParticipants, totalPrizeDistributed
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nfaId = searchParams.get('nfaId');

    // ─── Per-bot commission summary ───
    if (nfaId) {
      const { data: commissions } = await supabase
        .from('trading_commissions')
        .select('amount_bnb, amount_usd, commission_type, created_at')
        .eq('nfa_id', parseInt(nfaId))
        .order('created_at', { ascending: false });

      const totalFeeBnb = (commissions || []).reduce((s, c) => s + (c.amount_bnb || 0), 0);
      const totalFeeUsd = (commissions || []).reduce((s, c) => s + (c.amount_usd || 0), 0);
      const tradeFees = (commissions || []).filter(c => c.commission_type === 'trade_fee');
      const tournamentFees = (commissions || []).filter(c => c.commission_type === 'tournament_entry');

      return NextResponse.json({
        nfaId: parseInt(nfaId),
        totalFeeBnb,
        totalFeeUsd,
        tradeFeesCount: tradeFees.length,
        tournamentFeesCount: tournamentFees.length,
        commissions: (commissions || []).slice(0, 50),
      });
    }

    // ─── Platform-wide analytics ───

    // Revenue from platform_revenue table
    const { data: revenueData } = await supabase
      .from('platform_revenue')
      .select('*')
      .order('date', { ascending: false });

    const totalRevenueBnb = (revenueData || []).reduce((s, r) => s + (r.total_commissions_bnb || 0), 0);
    const totalRevenueUsd = (revenueData || []).reduce((s, r) => s + (r.total_commissions_usd || 0), 0);
    const totalTrades = (revenueData || []).reduce((s, r) => s + (r.trade_count || 0), 0);
    const totalVolumeBnb = (revenueData || []).reduce((s, r) => s + (r.trade_volume_bnb || 0), 0);
    const totalVolumeUsd = (revenueData || []).reduce((s, r) => s + (r.trade_volume_usd || 0), 0);

    // Active traders: distinct nfa_ids with trades
    const { data: tradersData } = await supabase
      .from('nfa_trading_stats')
      .select('nfa_id')
      .gt('total_trades', 0);
    const activeTraders = tradersData?.length || 0;

    // Average trade size
    const avgTradeSize = totalTrades > 0 ? totalVolumeUsd / totalTrades : 0;

    // Tournament stats
    const { data: tournaments } = await supabase
      .from('trading_tournaments')
      .select('id, status, total_participants, prize_pool_usd');
    
    const completedTournaments = (tournaments || []).filter(t => t.status === 'completed');
    const tournamentsCompleted = completedTournaments.length;
    const avgParticipants = tournamentsCompleted > 0
      ? completedTournaments.reduce((s, t) => s + (t.total_participants || 0), 0) / tournamentsCompleted
      : (tournaments || []).reduce((s, t) => s + (t.total_participants || 0), 0) / Math.max(1, (tournaments || []).length);
    const totalPrizeDistributed = completedTournaments.reduce((s, t) => s + (t.prize_pool_usd || 0), 0);

    return NextResponse.json({
      totalRevenueBnb: parseFloat(totalRevenueBnb.toFixed(6)),
      totalRevenueUsd: parseFloat(totalRevenueUsd.toFixed(2)),
      totalTrades,
      totalVolumeBnb: parseFloat(totalVolumeBnb.toFixed(4)),
      totalVolumeUsd: parseFloat(totalVolumeUsd.toFixed(2)),
      activeTraders,
      avgTradeSize: parseFloat(avgTradeSize.toFixed(2)),
      tournamentsCompleted,
      totalTournamentsRun: (tournaments || []).length,
      avgParticipants: parseFloat(avgParticipants.toFixed(1)),
      totalPrizeDistributed: parseFloat(totalPrizeDistributed.toFixed(2)),
      daysTracked: (revenueData || []).length,
    });
  } catch (err) {
    console.error('GET /api/nfa/trading/analytics error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
