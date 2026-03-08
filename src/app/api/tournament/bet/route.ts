import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'data', 'tournament.json');
const MIN_BET_SOL = 0.01;

/**
 * POST /api/tournament/bet
 * Place a bet on a tournament match.
 * Body: { matchId, botSide: 'A'|'B', amount, txSignature, wallet }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, botSide, amount, txSignature, wallet } = body;

    // Validate required fields
    if (!matchId || !botSide || !amount || !txSignature || !wallet) {
      return NextResponse.json(
        { error: 'Missing required fields: matchId, botSide, amount, txSignature, wallet' },
        { status: 400 }
      );
    }

    // Validate botSide
    if (botSide !== 'A' && botSide !== 'B') {
      return NextResponse.json(
        { error: 'botSide must be "A" or "B"' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < MIN_BET_SOL) {
      return NextResponse.json(
        { error: `Minimum bet is ${MIN_BET_SOL} SOL` },
        { status: 400 }
      );
    }

    // Read tournament state to validate match is still fighting
    if (!fs.existsSync(STATE_FILE)) {
      return NextResponse.json(
        { error: 'No active tournament' },
        { status: 400 }
      );
    }

    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const currentMatch = state.currentMatch;

    if (!currentMatch || currentMatch.status !== 'fighting') {
      return NextResponse.json(
        { error: 'No active match to bet on' },
        { status: 400 }
      );
    }

    // Check duplicate bet — one bet per wallet per match
    const { data: existingBet } = await supabase
      .from('battle_stakes')
      .select('id')
      .eq('match_id', matchId)
      .eq('wallet', wallet)
      .limit(1);

    if (existingBet && existingBet.length > 0) {
      return NextResponse.json(
        { error: 'You already placed a bet on this match' },
        { status: 400 }
      );
    }

    // Insert bet into battle_stakes
    const { data: bet, error: insertError } = await supabase
      .from('battle_stakes')
      .insert({
        match_id: matchId,
        wallet,
        amount_sol: amountNum,
        tx_signature: txSignature,
        bot_side: botSide,
        treasury_address: 'qcBTcq9kWMEUtETmgehEcCwgkbLrafZ61nsuwGHy77b',
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert bet error:', insertError);
      return NextResponse.json(
        { error: 'Failed to record bet: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      betId: bet.id,
      status: 'confirmed',
      matchId,
      botSide,
      amount: amountNum,
    });
  } catch (error: any) {
    console.error('Tournament bet error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tournament/bet?matchId=xxx&wallet=yyy
 * Get bets for a match (pool sizes, user's bet).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const wallet = searchParams.get('wallet');

    if (!matchId) {
      return NextResponse.json(
        { error: 'matchId is required' },
        { status: 400 }
      );
    }

    // Get all bets for this match
    const { data: bets, error } = await supabase
      .from('battle_stakes')
      .select('*')
      .eq('match_id', matchId)
      .in('status', ['confirmed', 'won', 'lost']);

    if (error) {
      console.error('Get bets error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bets' },
        { status: 500 }
      );
    }

    const allBets = bets || [];

    // Calculate pools
    const poolA = allBets
      .filter((b: any) => b.bot_side === 'A')
      .reduce((sum: number, b: any) => sum + (b.amount_sol || 0), 0);
    const poolB = allBets
      .filter((b: any) => b.bot_side === 'B')
      .reduce((sum: number, b: any) => sum + (b.amount_sol || 0), 0);

    // User's bet
    let userBet = null;
    if (wallet) {
      const ub = allBets.find((b: any) => b.wallet === wallet);
      if (ub) {
        userBet = {
          id: ub.id,
          botSide: ub.bot_side,
          amount: ub.amount_sol,
          status: ub.status,
          payoutAmount: ub.payout_amount_sol || null,
        };
      }
    }

    return NextResponse.json({
      matchId,
      poolA: parseFloat(poolA.toFixed(4)),
      poolB: parseFloat(poolB.toFixed(4)),
      totalPool: parseFloat((poolA + poolB).toFixed(4)),
      totalBets: allBets.length,
      userBet,
    });
  } catch (error: any) {
    console.error('Tournament bet GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
