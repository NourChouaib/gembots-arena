import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function supaFetch(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    next: { revalidate: 10 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // Fetch bot
    const bots = await supaFetch(`bots?id=eq.${id}&select=*`);
    if (!bots || bots.length === 0) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }
    const bot = bots[0];

    // Fetch recent battles (where this bot participated)
    const battles1 = await supaFetch(
      `battles?bot1_id=eq.${id}&status=eq.resolved&select=id,token_symbol,bot1_prediction,bot2_prediction,actual_x,winner_id,created_at,bot2_id&order=created_at.desc&limit=20`
    ) || [];
    
    const battles2 = await supaFetch(
      `battles?bot2_id=eq.${id}&status=eq.resolved&select=id,token_symbol,bot1_prediction,bot2_prediction,actual_x,winner_id,created_at,bot1_id&order=created_at.desc&limit=20`
    ) || [];

    // Get opponent names
    const opponentIds = new Set<number>();
    battles1.forEach((b: any) => opponentIds.add(b.bot2_id));
    battles2.forEach((b: any) => opponentIds.add(b.bot1_id));
    
    const opponentMap: Record<number, string> = {};
    if (opponentIds.size > 0) {
      const ids = Array.from(opponentIds).join(',');
      const opponents = await supaFetch(`bots?id=in.(${ids})&select=id,name`) || [];
      opponents.forEach((o: any) => { opponentMap[o.id] = o.name; });
    }

    // Merge and format battles
    const allBattles = [
      ...battles1.map((b: any) => ({
        id: b.id,
        token_symbol: b.token_symbol || '???',
        actual_x: b.actual_x,
        winner_id: b.winner_id,
        created_at: b.created_at,
        opponent_name: opponentMap[b.bot2_id] || `Bot #${b.bot2_id}`,
        opponent_id: b.bot2_id,
        was_winner: b.winner_id === parseInt(id),
        my_prediction: b.bot1_prediction,
        opp_prediction: b.bot2_prediction,
      })),
      ...battles2.map((b: any) => ({
        id: b.id,
        token_symbol: b.token_symbol || '???',
        actual_x: b.actual_x,
        winner_id: b.winner_id,
        created_at: b.created_at,
        opponent_name: opponentMap[b.bot1_id] || `Bot #${b.bot1_id}`,
        opponent_id: b.bot1_id,
        was_winner: b.winner_id === parseInt(id),
        my_prediction: b.bot2_prediction,
        opp_prediction: b.bot1_prediction,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
     .slice(0, 20);

    return NextResponse.json({ bot, battles: allBattles });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
