import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: bots, error } = await supabase
      .from('bots')
      .select('id, name, strategy, ai_model, model_id, trading_style, wins, losses, total_battles, elo, league, special, hp')
      .order('elo', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ bots: bots || [] });
  } catch (e) {
    return NextResponse.json({ bots: [], error: (e as Error).message }, { status: 500 });
  }
}
