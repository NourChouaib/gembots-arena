/**
 * 🥊 Single Battle API
 * GET /api/arena/battles/:id — get battle details
 * POST /api/arena/battles/:id — resolve battle (admin/worker)
 */

import { NextRequest, NextResponse } from 'next/server';
import * as BattleEngine from '@/lib/battle-engine';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = BattleEngine.getBattleWithBots(id);
    
    if (!result) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching battle:', error);
    return NextResponse.json({ error: 'Failed to fetch battle' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  // Rate limit
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`arena-battles-id:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Resolve battle with final price
    if (body.action === 'resolve' && body.final_price) {
      const resolved = BattleEngine.resolveBattle(id, body.final_price);
      
      if (!resolved) {
        return NextResponse.json({ error: 'Cannot resolve battle' }, { status: 400 });
      }
      
      const result = BattleEngine.getBattleWithBots(id);
      
      if (!result) {
        return NextResponse.json({ error: 'Battle not found after resolution' }, { status: 404 });
      }
      
      return NextResponse.json({
        message: 'Battle resolved!',
        ...result,
        winner: resolved.winner_id === result.bot1?.id ? result.bot1 : result.bot2,
        loser: resolved.winner_id === result.bot1?.id ? result.bot2 : result.bot1,
        damage: resolved.damage_dealt,
        actual_x: resolved.actual_x
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating battle:', error);
    return NextResponse.json({ error: 'Failed to update battle' }, { status: 500 });
  }
}
