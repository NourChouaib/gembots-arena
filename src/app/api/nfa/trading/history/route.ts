import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ─── GET: Get trade history for NFA ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const nfaId = request.nextUrl.searchParams.get('nfaId');
  const status = request.nextUrl.searchParams.get('status'); // 'open' | 'closed' | null (all)
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

  if (!nfaId) {
    return NextResponse.json({ error: 'nfaId is required' }, { status: 400 });
  }

  try {
    let query = supabase
      .from('nfa_trades')
      .select('*', { count: 'exact' })
      .eq('nfa_id', parseInt(nfaId))
      .order('open_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ['open', 'closed'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: trades, error, count } = await query;

    if (error) {
      console.error('Trade history query error:', error);
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
    }

    // Also get stats
    const { data: stats } = await supabase
      .from('nfa_trading_stats')
      .select('*')
      .eq('nfa_id', parseInt(nfaId))
      .single();

    return NextResponse.json({
      nfaId: parseInt(nfaId),
      trades: trades || [],
      total: count || 0,
      stats: stats || null,
      pagination: {
        offset,
        limit,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (err) {
    console.error('GET /api/nfa/trading/history error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
