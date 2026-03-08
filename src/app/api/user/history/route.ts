import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  
  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    
    // Get all finished/resolved battles for this wallet
    const { data: battles, error } = await supabase
      .from('battles')
      .select('*')
      .or(`bot1_wallet.eq.${wallet},bot2_wallet.eq.${wallet}`)
      .in('status', ['finished', 'resolved'])
      .order('finished_at', { ascending: false })
      .limit(100);

    if (error || !battles || battles.length === 0) {
      return NextResponse.json({ 
        battles: [],
        stats: {
          totalBattles: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalProfit: 0,
        }
      });
    }

    // Process battles for user perspective
    let wins = 0;
    let losses = 0;
    let totalProfit = 0;

    const processedBattles = battles.map((battle) => {
      const isBot1 = battle.bot1_wallet === wallet;
      
      const myPrediction = isBot1 ? battle.bot1_prediction : battle.bot2_prediction;
      const opponentPrediction = isBot1 ? battle.bot2_prediction : battle.bot1_prediction;
      const opponentName = isBot1 ? battle.bot2_name : battle.bot1_name;
      
      const myDiff = Math.abs((battle.actual_x || 1) - myPrediction);
      const opponentDiff = Math.abs((battle.actual_x || 1) - opponentPrediction);
      const won = myDiff < opponentDiff;
      
      const stakeAmount = battle.stake_amount || 0;
      const profit = won ? stakeAmount : -stakeAmount;
      
      if (won) {
        wins++;
      } else {
        losses++;
      }
      totalProfit += profit;

      return {
        id: battle.id,
        date: battle.finished_at || battle.created_at,
        tokenSymbol: battle.token_symbol || 'UNKNOWN',
        myPrediction,
        opponentPrediction,
        opponentName: opponentName || 'Unknown',
        actualX: battle.actual_x || 1,
        won,
        profit,
        stakeAmount,
      };
    });

    const totalBattles = wins + losses;
    const winRate = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;

    return NextResponse.json({
      battles: processedBattles,
      stats: {
        totalBattles,
        wins,
        losses,
        winRate,
        totalProfit: Math.round(totalProfit * 1000) / 1000,
      }
    });
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
