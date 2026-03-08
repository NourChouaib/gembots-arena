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
  try {
    const supabase = getSupabase();
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || '20'), 50);

    // Fetch recent resolved battles
    const { data: battles, error } = await supabase
      .from('battles')
      .select('id, bot1_id, bot2_id, bot1_name, bot2_name, token_symbol, winner_id, bot1_prediction, bot2_prediction, actual_x, damage_dealt, status, created_at, finished_at')
      .eq('status', 'resolved')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Recent battles fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch battles' }, { status: 500 });
    }

    if (!battles || battles.length === 0) {
      return NextResponse.json({ battles: [], stats: { total: 0 } });
    }

    // Collect unique bot IDs to fetch names for those missing bot names
    const botIds = new Set<number>();
    battles.forEach(b => {
      if (!b.bot1_name && b.bot1_id) botIds.add(b.bot1_id);
      if (!b.bot2_name && b.bot2_id) botIds.add(b.bot2_id);
    });

    let botNames: Record<number, string> = {};
    if (botIds.size > 0) {
      const { data: bots } = await supabase
        .from('bots')
        .select('id, name')
        .in('id', Array.from(botIds));
      if (bots) {
        bots.forEach(bot => { botNames[bot.id] = bot.name; });
      }
    }

    // Process battles — match the format expected by the Watch page frontend
    const processed = battles.map(b => {
      const bot1Name = b.bot1_name || botNames[b.bot1_id] || `Bot #${b.bot1_id}`;
      const bot2Name = b.bot2_name || botNames[b.bot2_id] || `Bot #${b.bot2_id}`;
      const winnerName = b.winner_id === b.bot1_id ? bot1Name : bot2Name;

      // Calculate accuracy (how close prediction was to actual)
      const bot1Accuracy = b.actual_x && b.bot1_prediction
        ? Math.max(0, 100 - Math.abs(b.bot1_prediction - b.actual_x) / Math.max(b.actual_x, 0.01) * 100)
        : null;
      const bot2Accuracy = b.actual_x && b.bot2_prediction
        ? Math.max(0, 100 - Math.abs(b.bot2_prediction - b.actual_x) / Math.max(b.actual_x, 0.01) * 100)
        : null;

      return {
        id: b.id,
        bot1_id: b.bot1_id,
        bot2_id: b.bot2_id,
        bot1_name: bot1Name,
        bot2_name: bot2Name,
        token_symbol: b.token_symbol || '???',
        winner_id: b.winner_id,
        winner_name: winnerName,
        bot1_prediction: b.bot1_prediction,
        bot2_prediction: b.bot2_prediction,
        actual_x: b.actual_x,
        bot1_accuracy: bot1Accuracy !== null ? Math.round(bot1Accuracy * 10) / 10 : null,
        bot2_accuracy: bot2Accuracy !== null ? Math.round(bot2Accuracy * 10) / 10 : null,
        damage_dealt: b.damage_dealt,
        created_at: b.created_at,
        finished_at: b.finished_at || b.created_at,
      };
    });

    return NextResponse.json({ battles: processed });
  } catch (error) {
    console.error('Recent battles API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
