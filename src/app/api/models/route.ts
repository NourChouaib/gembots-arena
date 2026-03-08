import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getModelDisplayName, getProviderEmoji, MODEL_DISPLAY_NAMES } from '@/lib/model-display';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Display names and emojis imported from @/lib/model-display

function getDisplayName(modelId: string): string {
  return getModelDisplayName(modelId);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();

    // Try to use the model_stats view first
    const { data: modelStats, error: viewError } = await supabase
      .from('model_stats')
      .select('*')
      .order('avg_elo', { ascending: false });

    if (viewError) {
      // Fallback: aggregate from bots table directly
      console.warn('model_stats view not available, aggregating from bots table:', viewError.message);
      
      const { data: bots, error: botsError } = await supabase
        .from('bots')
        .select('model_id, wins, losses, elo, peak_elo')
        .not('model_id', 'is', null);

      if (botsError) {
        console.error('Failed to fetch bots:', botsError);
        return NextResponse.json({ error: 'Failed to fetch model data' }, { status: 500 });
      }

      // Aggregate manually
      const modelMap = new Map<string, {
        model_id: string;
        total_battles: number;
        wins: number;
        losses: number;
        elo_sum: number;
        bot_count: number;
        peak_elo: number;
      }>();

      for (const bot of bots || []) {
        if (!bot.model_id) continue;
        const existing = modelMap.get(bot.model_id) || {
          model_id: bot.model_id,
          total_battles: 0,
          wins: 0,
          losses: 0,
          elo_sum: 0,
          bot_count: 0,
          peak_elo: 0,
        };
        existing.wins += bot.wins || 0;
        existing.losses += bot.losses || 0;
        existing.total_battles += (bot.wins || 0) + (bot.losses || 0);
        existing.elo_sum += bot.elo || 1000;
        existing.bot_count += 1;
        existing.peak_elo = Math.max(existing.peak_elo, bot.peak_elo || 0);
        modelMap.set(bot.model_id, existing);
      }

      const leaderboard = Array.from(modelMap.values())
        .map((m) => ({
          model_id: m.model_id,
          display_name: getDisplayName(m.model_id),
          emoji: getProviderEmoji(m.model_id),
          total_battles: m.total_battles,
          wins: m.wins,
          losses: m.losses,
          win_rate: m.total_battles > 0
            ? Math.round((m.wins / m.total_battles) * 10000) / 100
            : 0,
          avg_elo: m.bot_count > 0 ? Math.round(m.elo_sum / m.bot_count) : 1000,
          peak_elo: m.peak_elo,
          avg_accuracy: m.total_battles > 0
            ? Math.round((m.wins / m.total_battles) * 10000) / 100
            : 0,
          bot_count: m.bot_count,
        }))
        .sort((a, b) => b.avg_elo - a.avg_elo || b.win_rate - a.win_rate);

      return NextResponse.json({
        leaderboard,
        stats: {
          totalModels: leaderboard.length,
          totalBattles: Math.round(leaderboard.reduce((sum, m) => sum + m.total_battles, 0) / 2),
          topWinRate: leaderboard.length > 0 ? leaderboard[0].win_rate : 0,
        },
      });
    }

    // Format model_stats view data
    const leaderboard = (modelStats || []).map((m: any) => ({
      model_id: m.model_id,
      display_name: getDisplayName(m.model_id),
      emoji: getProviderEmoji(m.model_id),
      total_battles: Number(m.total_battles) || 0,
      wins: Number(m.wins) || 0,
      losses: Number(m.losses) || 0,
      win_rate: Number(m.win_rate) || 0,
      avg_elo: Number(m.avg_elo) || 1000,
      peak_elo: Number(m.peak_elo) || 0,
      avg_accuracy: Number(m.avg_accuracy) || 0,
      bot_count: Number(m.bot_count) || 0,
      total_pnl: Number(m.total_pnl) || 0,
    }));

    return NextResponse.json({
      leaderboard,
      stats: {
        totalModels: leaderboard.length,
        totalBattles: Math.round(leaderboard.reduce((sum: number, m: any) => sum + m.total_battles, 0) / 2),
        topWinRate: leaderboard.length > 0 ? leaderboard[0].win_rate : 0,
      },
    });
  } catch (error: any) {
    console.error('Models API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
