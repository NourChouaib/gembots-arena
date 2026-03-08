/**
 * 🤖 Spawn NPC Lobby Entries
 * POST /api/arena/spawn-npc — Create NPC lobby entries
 */

import { NextRequest, NextResponse } from 'next/server';
import * as LobbyEngine from '@/lib/lobby-engine';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`arena-spawn-npc:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const targetCount = body.count || 5;
    
    const created = LobbyEngine.spawnNPCLobbyEntries(targetCount);
    const lobby = LobbyEngine.getOpenLobby();
    
    return NextResponse.json({
      message: `Spawned ${created} NPC lobby entries`,
      created,
      total_open: lobby.length,
      lobby
    });
  } catch (error) {
    console.error('Error spawning NPCs:', error);
    return NextResponse.json({ error: 'Failed to spawn NPCs' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const lobby = LobbyEngine.getOpenLobby();
    const npcLobby = lobby.filter(e => e.creator?.name?.includes('NPC'));
    
    return NextResponse.json({
      total_lobby: lobby.length,
      npc_lobby: npcLobby.length,
      lobby
    });
  } catch (error) {
    console.error('Error fetching NPC lobby:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
