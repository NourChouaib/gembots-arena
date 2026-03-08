import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_KEY environment variables"
    );
  }

  _client = createClient(url, key);
  return _client;
}

// ─── Bot types ───────────────────────────────────────────────

export interface SupaBot {
  id: number;
  name: string;
  wins: number;
  losses: number;
  hp: number;
  league: string;
  elo: number;
  peak_elo: number;
  total_battles: number;
  win_streak: number;
  ai_model: string | null;
  trading_style: string | null;
  model_id: string | null;
  avatar_state: string | null;
  telegram_id: string | null;
}

// ─── Query helpers ───────────────────────────────────────────

export async function fetchBots(limit = 50): Promise<SupaBot[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("bots")
    .select(
      "id, name, wins, losses, hp, league, elo, peak_elo, total_battles, win_streak, ai_model, trading_style, model_id, avatar_state, telegram_id"
    )
    .order("elo", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as SupaBot[];
}

export async function fetchBotByName(name: string): Promise<SupaBot | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("bots")
    .select("*")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as SupaBot | null;
}

export async function fetchBotById(id: number): Promise<SupaBot | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("bots")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as SupaBot | null;
}

export interface SupaBattle {
  id: number;
  bot1_id: number;
  bot2_id: number;
  winner_id: number | null;
  token_symbol: string | null;
  status: string;
  created_at: string;
  finished_at: string | null;
}

export async function fetchBattles(
  limit = 20,
  botId?: number
): Promise<SupaBattle[]> {
  const sb = getSupabase();
  let q = sb
    .from("battles")
    .select(
      "id, bot1_id, bot2_id, winner_id, token_symbol, status, created_at, finished_at"
    )
    .eq("status", "resolved")
    .order("finished_at", { ascending: false })
    .limit(limit);

  if (botId !== undefined) {
    q = q.or(`bot1_id.eq.${botId},bot2_id.eq.${botId}`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SupaBattle[];
}

export async function fetchBattleCount(): Promise<number> {
  const sb = getSupabase();
  const { count, error } = await sb
    .from("battles")
    .select("id", { count: "exact", head: true })
    .eq("status", "resolved");

  if (error) throw error;
  return count ?? 0;
}

export async function fetchBotCount(): Promise<number> {
  const sb = getSupabase();
  const { count, error } = await sb
    .from("bots")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function insertBattleRequest(
  bot1Id: number,
  bot2Id: number,
  topic?: string
): Promise<number> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("battles")
    .insert({
      bot1_id: bot1Id,
      bot2_id: bot2Id,
      token_symbol: topic ?? "BTC",
      status: "pending_predictions",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Fetch model-level stats (aggregated across bots using the same model)
 */
export async function fetchModelStats(): Promise<
  Array<{
    model_id: string;
    wins: number;
    losses: number;
    total_battles: number;
    avg_elo: number;
    peak_elo: number;
    bot_count: number;
  }>
> {
  const sb = getSupabase();

  // Try the model_stats view first
  const { data: viewData, error: viewErr } = await sb
    .from("model_stats")
    .select("*")
    .order("avg_elo", { ascending: false });

  if (!viewErr && viewData && viewData.length > 0) {
    return viewData.map((m: any) => ({
      model_id: m.model_id,
      wins: Number(m.wins) || 0,
      losses: Number(m.losses) || 0,
      total_battles: Number(m.total_battles) || 0,
      avg_elo: Number(m.avg_elo) || 1000,
      peak_elo: Number(m.peak_elo) || 0,
      bot_count: Number(m.bot_count) || 0,
    }));
  }

  // Fallback: aggregate from bots table
  const { data: bots, error: botsErr } = await sb
    .from("bots")
    .select("model_id, wins, losses, elo, peak_elo")
    .not("model_id", "is", null);

  if (botsErr) throw botsErr;

  const map = new Map<
    string,
    {
      model_id: string;
      wins: number;
      losses: number;
      elo_sum: number;
      count: number;
      peak: number;
    }
  >();

  for (const b of bots ?? []) {
    if (!b.model_id) continue;
    const cur = map.get(b.model_id) || {
      model_id: b.model_id,
      wins: 0,
      losses: 0,
      elo_sum: 0,
      count: 0,
      peak: 0,
    };
    cur.wins += b.wins || 0;
    cur.losses += b.losses || 0;
    cur.elo_sum += b.elo || 1000;
    cur.count += 1;
    cur.peak = Math.max(cur.peak, b.peak_elo || 0);
    map.set(b.model_id, cur);
  }

  return Array.from(map.values())
    .map((m) => ({
      model_id: m.model_id,
      wins: m.wins,
      losses: m.losses,
      total_battles: m.wins + m.losses,
      avg_elo: m.count > 0 ? Math.round(m.elo_sum / m.count) : 1000,
      peak_elo: m.peak,
      bot_count: m.count,
    }))
    .sort((a, b) => b.avg_elo - a.avg_elo);
}
