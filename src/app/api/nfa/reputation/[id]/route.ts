import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const nfaId = parseInt(id);
  if (isNaN(nfaId)) {
    return NextResponse.json({ error: 'Invalid NFA ID' }, { status: 400 });
  }

  try {
    // 1. Get bot linked to this NFA
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('id, name, elo, hp, wins, losses, total_battles, peak_elo, league, created_at')
      .eq('nfa_id', nfaId)
      .single();

    if (botError || !bot) {
      return NextResponse.json({ error: 'Bot not found for this NFA' }, { status: 404 });
    }

    // 2. Get recent battles (last 50)
    const { data: battles } = await supabase
      .from('battles')
      .select('id, bot1_id, bot2_id, bot1_name, bot2_name, winner_id, token_symbol, bot1_prediction, bot2_prediction, actual_x, duration_minutes, finished_at, status')
      .or(`bot1_id.eq.${bot.id},bot2_id.eq.${bot.id}`)
      .eq('status', 'resolved')
      .order('finished_at', { ascending: false })
      .limit(50);

    // 3. Get on-chain snapshots from local file
    let snapshots: Array<{ date: string; txHash: string; blockNumber: number; battles: number }> = [];
    try {
      const snapshotPath = path.join(process.cwd(), 'data', 'snapshots.json');
      snapshots = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    } catch {}

    // 4. Calculate daily ELO history from battles
    const dailyStats: Record<string, { wins: number; losses: number; battles: number }> = {};
    for (const b of (battles || [])) {
      const day = b.finished_at?.split('T')[0];
      if (!day) continue;
      if (!dailyStats[day]) dailyStats[day] = { wins: 0, losses: 0, battles: 0 };
      dailyStats[day].battles++;
      if (b.winner_id === bot.id) {
        dailyStats[day].wins++;
      } else {
        dailyStats[day].losses++;
      }
    }

    // 5. Win rate
    const winRate = bot.wins + bot.losses > 0
      ? ((bot.wins / (bot.wins + bot.losses)) * 100).toFixed(1)
      : '0.0';

    return NextResponse.json({
      bot: {
        name: bot.name,
        elo: bot.elo,
        peakElo: bot.peak_elo,
        hp: bot.hp,
        wins: bot.wins,
        losses: bot.losses,
        totalBattles: bot.total_battles,
        league: bot.league,
        winRate: parseFloat(winRate),
        createdAt: bot.created_at,
      },
      recentBattles: (battles || []).map(b => ({
        id: b.id,
        opponent: b.bot1_id === bot.id ? b.bot2_name : b.bot1_name,
        token: b.token_symbol,
        prediction: b.bot1_id === bot.id ? b.bot1_prediction : b.bot2_prediction,
        opponentPrediction: b.bot1_id === bot.id ? b.bot2_prediction : b.bot1_prediction,
        actualResult: b.actual_x,
        isWin: b.winner_id === bot.id,
        duration: b.duration_minutes,
        date: b.finished_at,
      })),
      dailyStats,
      onChainSnapshots: snapshots.map(s => ({
        date: s.date,
        txHash: s.txHash,
        bscscanUrl: `https://bscscan.com/tx/${s.txHash}`,
        blockNumber: s.blockNumber,
        totalBattles: s.battles,
      })),
      nfaId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
