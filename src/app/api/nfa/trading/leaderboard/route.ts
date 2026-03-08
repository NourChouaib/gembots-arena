import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/nfa/trading/leaderboard
 * 
 * Query params:
 *   type=tournament  — current tournament ranking
 *   type=alltime     — all-time by total_pnl
 *   type=weekly      — last 7 days
 *   tournament_id=X  — specific tournament
 *   (no params)      — legacy: returns all bots with stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const tournamentId = searchParams.get('tournament_id');

    // ─── Tournament leaderboard (specific or current) ───
    if (type === 'tournament' || tournamentId) {
      return await getTournamentLeaderboard(tournamentId ? parseInt(tournamentId) : null);
    }

    // ─── All-time leaderboard ───
    if (type === 'alltime') {
      return await getAllTimeLeaderboard();
    }

    // ─── Weekly leaderboard ───
    if (type === 'weekly') {
      return await getWeeklyLeaderboard();
    }

    // ─── Legacy: all bots with stats (backward compat) ───
    return await getLegacyLeaderboard();
  } catch (err) {
    console.error('GET /api/nfa/trading/leaderboard error:', err);
    return NextResponse.json({ bots: [], entries: [], tournament: null });
  }
}

async function getTournamentLeaderboard(tournamentId: number | null) {
  let tournament;

  if (tournamentId) {
    const { data } = await supabase
      .from('trading_tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();
    tournament = data;
  } else {
    const { data } = await supabase
      .from('trading_tournaments')
      .select('*')
      .eq('status', 'active')
      .order('start_at', { ascending: false })
      .limit(1);
    tournament = data && data.length > 0 ? data[0] : null;
  }

  if (!tournament) {
    return NextResponse.json({ tournament: null, entries: [] });
  }

  const { data: entries } = await supabase
    .from('trading_tournament_entries')
    .select('*')
    .eq('tournament_id', tournament.id)
    .order('tournament_pnl_usd', { ascending: false });

  return NextResponse.json({
    tournament,
    entries: (entries || []).map((e, i) => ({
      rank: e.rank || i + 1,
      bot_id: e.bot_id,
      nfa_id: e.nfa_id,
      bot_name: e.bot_name,
      strategy: e.strategy,
      pnl_usd: e.tournament_pnl_usd,
      pnl_pct: e.tournament_pnl_pct,
      trades: e.trades_count,
      win_rate: e.win_rate,
      start_pnl_usd: e.start_pnl_usd,
      current_pnl_usd: e.current_pnl_usd,
      updated_at: e.updated_at,
    })),
  });
}

async function getAllTimeLeaderboard() {
  // Get all bots with their trading stats
  const { data: bots } = await supabase
    .from('bots')
    .select('id, nfa_id, name, trading_mode')
    .not('nfa_id', 'is', null)
    .not('trading_mode', 'eq', 'off');

  if (!bots || bots.length === 0) {
    return NextResponse.json({ tournament: null, entries: [] });
  }

  const nfaIds = bots.map(b => b.nfa_id).filter(Boolean);
  const { data: stats } = await supabase
    .from('nfa_trading_stats')
    .select('*')
    .in('nfa_id', nfaIds);

  const statsMap = new Map<number, (typeof stats extends (infer T)[] | null ? T : never)>();
  if (stats) {
    for (const s of stats) statsMap.set(s.nfa_id, s);
  }

  const entries = bots
    .map(bot => {
      const s = statsMap.get(bot.nfa_id!);
      return {
        bot_id: bot.id,
        nfa_id: bot.nfa_id,
        bot_name: bot.name || `NFA #${bot.nfa_id}`,
        strategy: s?.best_strategy || 'default',
        pnl_usd: s?.total_pnl_usd || 0,
        pnl_pct: s?.paper_balance_usd ? ((s.total_pnl_usd || 0) / 10000) * 100 : 0,
        trades: s?.total_trades || 0,
        win_rate: s?.win_rate || 0,
      };
    })
    .sort((a, b) => b.pnl_usd - a.pnl_usd)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  return NextResponse.json({ tournament: null, entries });
}

async function getWeeklyLeaderboard() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get trades from last 7 days, grouped by bot
  const { data: trades } = await supabase
    .from('nfa_trades')
    .select('bot_id, nfa_id, pnl_usd, status')
    .gte('open_at', weekAgo)
    .eq('status', 'closed');

  if (!trades || trades.length === 0) {
    return NextResponse.json({ tournament: null, entries: [] });
  }

  // Aggregate by bot
  const botMap = new Map<number, { pnl: number; trades: number; wins: number; nfa_id: number }>();
  for (const t of trades) {
    if (!t.bot_id) continue;
    const existing = botMap.get(t.bot_id) || { pnl: 0, trades: 0, wins: 0, nfa_id: t.nfa_id };
    existing.pnl += t.pnl_usd || 0;
    existing.trades += 1;
    if ((t.pnl_usd || 0) > 0) existing.wins += 1;
    existing.nfa_id = t.nfa_id;
    botMap.set(t.bot_id, existing);
  }

  // Get bot names
  const botIds = [...botMap.keys()];
  const { data: bots } = await supabase
    .from('bots')
    .select('id, name, nfa_id')
    .in('id', botIds);

  const nameMap = new Map<number, string>();
  if (bots) {
    for (const b of bots) nameMap.set(b.id, b.name || `NFA #${b.nfa_id}`);
  }

  const entries = [...botMap.entries()]
    .map(([botId, data]) => ({
      bot_id: botId,
      nfa_id: data.nfa_id,
      bot_name: nameMap.get(botId) || `Bot #${botId}`,
      strategy: 'default',
      pnl_usd: data.pnl,
      pnl_pct: (data.pnl / 10000) * 100,
      trades: data.trades,
      win_rate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
    }))
    .sort((a, b) => b.pnl_usd - a.pnl_usd)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  return NextResponse.json({ tournament: null, entries });
}

async function getLegacyLeaderboard() {
  // Original behavior: return all bots with stats
  const { data: bots, error: botsError } = await supabase
    .from('bots')
    .select('id, nfa_id, name, trading_wallet_address, trading_mode')
    .not('nfa_id', 'is', null)
    .not('trading_wallet_address', 'is', null)
    .order('nfa_id', { ascending: true });

  if (botsError) {
    console.error('Leaderboard bots query error:', botsError);
    return NextResponse.json({ bots: [] });
  }

  if (!bots || bots.length === 0) {
    return NextResponse.json({ bots: [] });
  }

  const nfaIds = bots.map(b => b.nfa_id).filter(Boolean);
  const { data: allStats } = await supabase
    .from('nfa_trading_stats')
    .select('*')
    .in('nfa_id', nfaIds);

  const statsMap = new Map<number, (typeof allStats extends (infer T)[] | null ? T : never)>();
  if (allStats) {
    for (const s of allStats) statsMap.set(s.nfa_id, s);
  }

  const result = bots.map(bot => ({
    id: bot.id,
    nfa_id: bot.nfa_id,
    name: bot.name,
    trading_wallet_address: bot.trading_wallet_address,
    trading_mode: bot.trading_mode || 'off',
    stats: statsMap.get(bot.nfa_id!) || null,
  }));

  return NextResponse.json({ bots: result });
}
