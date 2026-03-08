// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/arena/lobby - List rooms with bots from Supabase
export async function GET(request: NextRequest) {
  try {
    // Get rooms with host bot info
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select(`
        *,
        host_bot:bots!rooms_host_bot_id_fkey(id, name, hp, wins, losses, win_streak, league),
        challenger_bot:bots!rooms_challenger_bot_id_fkey(id, name, hp, wins, losses, win_streak, league)
      `)
      .in('status', ['waiting', 'ready', 'in_battle'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (roomsError) {
      console.error('Rooms error:', roomsError);
      
      // Fallback: create rooms from NPC bots if no rooms exist
      const { data: bots } = await supabase
        .from('bots')
        .select('*')
        .eq('is_npc', true)
        .order('wins', { ascending: false });
      
      if (bots && bots.length > 0) {
        // Auto-create rooms for NPC bots
        const npcRooms = bots.map((bot, index) => ({
          id: `temp-${bot.id}`,
          host_bot: bot,
          status: 'waiting',
          stake_amount: index === 0 ? 0.1 : index === 3 ? 0.5 : null,
          created_at: new Date(Date.now() - index * 60000).toISOString(),
          spectators: Math.floor(Math.random() * 15),
        }));
        
        return NextResponse.json({ rooms: npcRooms, total: npcRooms.length, source: 'fallback' });
      }
    }

    // If no rooms, create them from NPC bots
    if (!rooms || rooms.length === 0) {
      const { data: bots } = await supabase
        .from('bots')
        .select('*')
        .eq('is_npc', true)
        .order('wins', { ascending: false });

      if (bots && bots.length > 0) {
        // Create actual rooms in DB for each NPC
        const roomsToInsert = bots.map((bot, index) => ({
          host_bot_id: bot.id,
          status: 'waiting',
          stake_amount: index === 0 ? 0.1 : index === 3 ? 0.5 : index === 7 ? 1.0 : null,
          spectators: Math.floor(Math.random() * 15),
        }));

        const { data: insertedRooms, error: insertError } = await supabase
          .from('rooms')
          .insert(roomsToInsert)
          .select(`
            *,
            host_bot:bots!rooms_host_bot_id_fkey(id, name, hp, wins, losses, win_streak, league)
          `);

        if (insertError) {
          console.error('Insert error:', insertError);
          // Return mock data
          const mockRooms = bots.map((bot, index) => ({
            id: `mock-${bot.id}`,
            host_bot: bot,
            status: 'waiting',
            stake_amount: index === 0 ? 0.1 : index === 3 ? 0.5 : null,
            created_at: new Date().toISOString(),
            spectators: Math.floor(Math.random() * 15),
          }));
          return NextResponse.json({ rooms: mockRooms, total: mockRooms.length });
        }

        return NextResponse.json({ rooms: insertedRooms, total: insertedRooms?.length || 0 });
      }
    }

    return NextResponse.json({ rooms: rooms || [], total: rooms?.length || 0 });

  } catch (error) {
    console.error('Error fetching lobby:', error);
    return NextResponse.json({ error: 'Failed to fetch lobby' }, { status: 500 });
  }
}

// POST /api/arena/lobby - Create room or join
export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`arena-lobby:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const body = await request.json();
    const { action, bot_id, stake_amount, room_id } = body;

    if (action === 'create') {
      // Get bot info
      const { data: bot, error: botError } = await supabase
        .from('bots')
        .select('*')
        .eq('id', bot_id)
        .single();

      if (botError || !bot) {
        return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
      }

      // Create room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          host_bot_id: bot.id,
          status: 'waiting',
          stake_amount: stake_amount || null,
          spectators: 0,
        })
        .select(`
          *,
          host_bot:bots!rooms_host_bot_id_fkey(id, name, hp, wins, losses, win_streak, league)
        `)
        .single();

      if (roomError) {
        console.error('Create room error:', roomError);
        return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
      }

      return NextResponse.json({ success: true, room });

    } else if (action === 'join') {
      // Join existing room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .update({
          challenger_bot_id: bot_id,
          status: 'ready',
        })
        .eq('id', room_id)
        .eq('status', 'waiting')
        .select()
        .single();

      if (roomError) {
        return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Joined room, battle starting...',
        room,
        redirect: '/battle',
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in lobby action:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
