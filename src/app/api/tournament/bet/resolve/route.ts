import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const PLATFORM_FEE_PERCENT = 5; // 5% platform fee

/**
 * POST /api/tournament/bet/resolve
 * Resolve bets for a finished match.
 * Body: { matchId, winningSide: 'A'|'B' }
 * 
 * Pool model:
 * - Total pool = all bets
 * - Platform fee = 5% of total pool
 * - Remaining pool distributed proportionally to winners
 * - If no winners, losers get refunded (minus fee)
 * - If no bets on either side, everyone gets refunded
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, winningSide } = body;

    if (!matchId || !winningSide) {
      return NextResponse.json(
        { error: 'Missing required fields: matchId, winningSide' },
        { status: 400 }
      );
    }

    if (winningSide !== 'A' && winningSide !== 'B') {
      return NextResponse.json(
        { error: 'winningSide must be "A" or "B"' },
        { status: 400 }
      );
    }

    // Get all confirmed bets for this match
    const { data: bets, error: fetchError } = await supabase
      .from('battle_stakes')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'confirmed');

    if (fetchError) {
      console.error('Fetch bets error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch bets' },
        { status: 500 }
      );
    }

    if (!bets || bets.length === 0) {
      return NextResponse.json({
        matchId,
        winningSide,
        resolved: 0,
        message: 'No bets to resolve',
      });
    }

    const losingSide = winningSide === 'A' ? 'B' : 'A';

    const winnerBets = bets.filter((b: any) => b.bot_side === winningSide);
    const loserBets = bets.filter((b: any) => b.bot_side === losingSide);

    const totalPool = bets.reduce((sum: number, b: any) => sum + (b.amount_sol || 0), 0);
    const winnerPool = winnerBets.reduce((sum: number, b: any) => sum + (b.amount_sol || 0), 0);
    const platformFee = totalPool * (PLATFORM_FEE_PERCENT / 100);
    const payoutPool = totalPool - platformFee;

    let results = { winners: 0, losers: 0, refunded: 0 };

    if (winnerBets.length === 0) {
      // No one bet on the winner — refund all losers (minus platform fee split)
      for (const bet of loserBets) {
        const refund = bet.amount_sol * (1 - PLATFORM_FEE_PERCENT / 100);
        await supabase
          .from('battle_stakes')
          .update({
            status: 'refunded',
            payout_amount_sol: parseFloat(refund.toFixed(6)),
            resolved_at: new Date().toISOString(),
          })
          .eq('id', bet.id);
        results.refunded++;
      }
    } else if (loserBets.length === 0) {
      // No one bet on the loser — refund all winners (no profit to distribute)
      for (const bet of winnerBets) {
        const refund = bet.amount_sol * (1 - PLATFORM_FEE_PERCENT / 100);
        await supabase
          .from('battle_stakes')
          .update({
            status: 'refunded',
            payout_amount_sol: parseFloat(refund.toFixed(6)),
            resolved_at: new Date().toISOString(),
          })
          .eq('id', bet.id);
        results.refunded++;
      }
    } else {
      // Normal case: winners share the payout pool proportionally
      for (const bet of winnerBets) {
        const share = bet.amount_sol / winnerPool;
        const payout = payoutPool * share;

        await supabase
          .from('battle_stakes')
          .update({
            status: 'won',
            payout_amount_sol: parseFloat(payout.toFixed(6)),
            resolved_at: new Date().toISOString(),
          })
          .eq('id', bet.id);
        results.winners++;
      }

      // Mark losers
      for (const bet of loserBets) {
        await supabase
          .from('battle_stakes')
          .update({
            status: 'lost',
            payout_amount_sol: 0,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', bet.id);
        results.losers++;
      }
    }

    console.log(`[BET RESOLVE] Match ${matchId}: Winner=${winningSide}, Pool=${totalPool.toFixed(4)} SOL, Fee=${platformFee.toFixed(4)} SOL, Winners=${results.winners}, Losers=${results.losers}, Refunded=${results.refunded}`);

    return NextResponse.json({
      matchId,
      winningSide,
      totalPool: parseFloat(totalPool.toFixed(4)),
      platformFee: parseFloat(platformFee.toFixed(4)),
      payoutPool: parseFloat(payoutPool.toFixed(4)),
      resolved: bets.length,
      results,
    });
  } catch (error: any) {
    console.error('Tournament bet resolve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
