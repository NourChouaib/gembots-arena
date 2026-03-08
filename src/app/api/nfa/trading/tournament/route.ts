import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/nfa/trading/tournament
 * Returns the current active tournament + its entries (ranked)
 */
export async function GET() {
  try {
    // Get active tournament
    const { data: tournaments, error: tError } = await supabase
      .from('trading_tournaments')
      .select('*')
      .eq('status', 'active')
      .order('start_at', { ascending: false })
      .limit(1);

    if (tError) {
      console.error('Tournament query error:', tError);
      return NextResponse.json({ tournament: null, entries: [] });
    }

    const tournament = tournaments && tournaments.length > 0 ? tournaments[0] : null;

    if (!tournament) {
      return NextResponse.json({ tournament: null, entries: [] });
    }

    // Get entries for this tournament, ranked by PnL
    const { data: entries, error: eError } = await supabase
      .from('trading_tournament_entries')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('tournament_pnl_usd', { ascending: false });

    if (eError) {
      console.error('Tournament entries query error:', eError);
      return NextResponse.json({ tournament, entries: [] });
    }

    return NextResponse.json({
      tournament,
      entries: entries || [],
    });
  } catch (err) {
    console.error('GET /api/nfa/trading/tournament error:', err);
    return NextResponse.json({ tournament: null, entries: [] });
  }
}
