import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/nfa/trading/analytics/revenue
 * 
 * Returns daily revenue breakdown.
 * Query params:
 *   days=30 (default) — number of days to look back (30/60/90)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const validDays = [30, 60, 90].includes(days) ? days : 30;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - validDays);
    const sinceDateStr = sinceDate.toISOString().split('T')[0];

    const { data: revenue, error } = await supabase
      .from('platform_revenue')
      .select('*')
      .gte('date', sinceDateStr)
      .order('date', { ascending: true });

    if (error) {
      console.error('Revenue query error:', error);
      return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 });
    }

    // Fill in missing days with zeros
    const filledData: Array<{
      date: string;
      commissions_bnb: number;
      commissions_usd: number;
      trade_count: number;
      volume_bnb: number;
      volume_usd: number;
      active_traders: number;
    }> = [];

    const revenueMap = new Map((revenue || []).map(r => [r.date, r]));
    const current = new Date(sinceDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      const row = revenueMap.get(dateStr);
      
      filledData.push({
        date: dateStr,
        commissions_bnb: row?.total_commissions_bnb || 0,
        commissions_usd: row?.total_commissions_usd || 0,
        trade_count: row?.trade_count || 0,
        volume_bnb: row?.trade_volume_bnb || 0,
        volume_usd: row?.trade_volume_usd || 0,
        active_traders: row?.active_traders || 0,
      });

      current.setDate(current.getDate() + 1);
    }

    // Summary
    const totalCommBnb = filledData.reduce((s, d) => s + d.commissions_bnb, 0);
    const totalCommUsd = filledData.reduce((s, d) => s + d.commissions_usd, 0);
    const totalTrades = filledData.reduce((s, d) => s + d.trade_count, 0);
    const totalVolBnb = filledData.reduce((s, d) => s + d.volume_bnb, 0);
    const totalVolUsd = filledData.reduce((s, d) => s + d.volume_usd, 0);

    return NextResponse.json({
      days: validDays,
      daily: filledData,
      summary: {
        totalCommissionsBnb: parseFloat(totalCommBnb.toFixed(6)),
        totalCommissionsUsd: parseFloat(totalCommUsd.toFixed(2)),
        totalTrades,
        totalVolumeBnb: parseFloat(totalVolBnb.toFixed(4)),
        totalVolumeUsd: parseFloat(totalVolUsd.toFixed(2)),
        avgDailyRevenue: parseFloat((totalCommUsd / Math.max(1, filledData.length)).toFixed(2)),
      },
    });
  } catch (err) {
    console.error('GET /api/nfa/trading/analytics/revenue error:', err);
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 });
  }
}
