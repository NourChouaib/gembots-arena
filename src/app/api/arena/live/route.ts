// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/arena/live - Get all live battles and waiting rooms
export async function GET(request: NextRequest) {
  try {
    // Get active battles
    const { data: battles, error: battlesError } = await supabase
      .from('battles')
      .select(`
        *,
        bot1:bots!battles_bot1_id_fkey(id, name, hp, wins, losses, public_key),
        bot2:bots!battles_bot2_id_fkey(id, name, hp, wins, losses, public_key)
      `)
      .in('status', ['active', 'resolved'])
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Get waiting rooms (NPC bots looking for opponents)
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select(`
        *,
        host:bots!rooms_host_bot_id_fkey(id, name, hp, wins, losses, league)
      `)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (battlesError) {
      console.error('Fetch battles error:', battlesError);
    }
    
    // Calculate current X and countdown for active battles
    const now = Date.now();
    const liveBattles = (battles || []).map((battle) => {
      const resolveTime = new Date(battle.resolves_at).getTime();
      const durationSec = (battle.duration_minutes || 1) * 60;
      const countdown = Math.max(0, Math.floor((resolveTime - now) / 1000));
      
      const isResolved = battle.status === 'resolved';
      const elapsedRatio = isResolved ? 1 : (1 - (countdown / durationSec));
      const currentX = isResolved 
        ? (battle.actual_x || 1.0)
        : (0.95 + Math.random() * 0.1 + (elapsedRatio * 0.05));
      
      return {
        id: battle.id,
        bot1: {
          id: battle.bot1?.id,
          name: battle.bot1?.name || 'Unknown',
          prediction: battle.bot1_prediction,
        },
        bot2: {
          id: battle.bot2?.id,
          name: battle.bot2?.name || 'Unknown',
          prediction: battle.bot2_prediction,
        },
        bot1_wallet: battle.bot1?.public_key || null,
        bot2_wallet: battle.bot2?.public_key || null,
        token_symbol: battle.token_symbol,
        duration_minutes: battle.duration_minutes || 1,
        current_x: parseFloat(currentX.toFixed(4)),
        countdown,
        status: isResolved ? 'resolved' : 'active',
        winner_id: battle.winner_id || null,
        actual_x: battle.actual_x || null,
        finished_at: battle.finished_at || null,
      };
    })
    // Filter out resolved battles older than 30 seconds (show result briefly)
    .filter((b) => {
      if (b.status !== 'resolved') return true;
      if (!b.finished_at) return false;
      const finishedAgo = now - new Date(b.finished_at).getTime();
      return finishedAgo < 30000; // Show result for 30 seconds
    });
    
    // Convert waiting rooms to "open" battles (looking for opponent)
    const openBattles = (rooms || []).map((room) => ({
      id: room.id,
      bot1: {
        id: room.host?.id,
        name: room.host?.name || 'NPC Bot',
        prediction: null, // Prediction made when battle starts
      },
      bot2: null, // Waiting for opponent
      token_symbol: room.token_symbol || null,
      duration_minutes: room.duration_minutes || 1,
      stake_amount: room.stake_amount || 0,
      league: room.host?.league || 'bronze',
      current_x: null,
      countdown: null,
      status: 'waiting',
    }));
    
    return NextResponse.json({ 
      battles: liveBattles,
      openBattles: openBattles,
    });
    
  } catch (error) {
    console.error('Live battles error:', error);
    return NextResponse.json({ battles: [], openBattles: [] });
  }
}
