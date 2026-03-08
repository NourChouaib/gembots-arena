import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/nfa/trading/tournament/history
 * Returns past completed tournaments with their top-3 entries
 */
export async function GET() {
  try {
    // Get completed tournaments, newest first
    const { data: tournaments, error: tError } = await supabase
      .from('trading_tournaments')
      .select('*')
      .eq('status', 'completed')
      .order('end_at', { ascending: false })
      .limit(20);

    if (tError) {
      console.error('Tournament history query error:', tError);
      return NextResponse.json({ tournaments: [] });
    }

    if (!tournaments || tournaments.length === 0) {
      return NextResponse.json({ tournaments: [] });
    }

    // For each tournament, fetch top-3 entries
    const tournamentsWithWinners = await Promise.all(
      tournaments.map(async (t) => {
        const { data: entries } = await supabase
          .from('trading_tournament_entries')
          .select('*')
          .eq('tournament_id', t.id)
          .order('tournament_pnl_usd', { ascending: false })
          .limit(3);

        return {
          ...t,
          top3: entries || [],
        };
      })
    );

    return NextResponse.json({ tournaments: tournamentsWithWinners });
  } catch (err) {
    console.error('GET /api/nfa/trading/tournament/history error:', err);
    return NextResponse.json({ tournaments: [] });
  }
}
