// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { payoutWinner } from '@/lib/escrow';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Random guest bot names
const GUEST_NAMES = [
  '🎲 LuckyGuest', '🌟 StarPlayer', '🔥 HotShot', '⚡ QuickDraw',
  '🎯 SharpEye', '💫 CosmicBet', '🚀 RocketMan', '🎪 WildCard',
  '🦊 CleverFox', '🐺 LoneWolf', '🦁 BraveLion', '🐉 DragonBet',
];

// Fetch real trending token from GMGN
async function getRandomTrendingToken() {
  try {
    const res = await fetch('https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/1h?limit=20', {
      headers: { 'User-Agent': 'GemBots/1.0' },
    });
    const data = await res.json();
    
    if (data.code === 0 && data.data?.rank?.length > 0) {
      // Pick random token from top 20
      const tokens = data.data.rank;
      const token = tokens[Math.floor(Math.random() * Math.min(tokens.length, 10))];
      return {
        symbol: token.symbol,
        address: token.address,
        price: token.price,
        name: token.name,
        logo: token.logo,
      };
    }
  } catch (error) {
    console.error('Failed to fetch GMGN tokens:', error);
  }
  
  // Fallback
  return {
    symbol: 'UNKNOWN',
    address: 'unknown',
    price: 0.0001,
    name: 'Unknown Token',
    logo: null,
  };
}

// Fetch current price for token
async function getTokenPrice(address: string): Promise<number | null> {
  try {
    const res = await fetch(`https://gmgn.ai/defi/quotation/v1/tokens/sol/${address}`, {
      headers: { 'User-Agent': 'GemBots/1.0' },
    });
    const data = await res.json();
    
    if (data.code === 0 && data.data?.token?.price) {
      return data.data.token.price;
    }
  } catch (error) {
    console.error('Failed to fetch token price:', error);
  }
  return null;
}

// GET /api/arena/fight/[roomId] - Initialize fight
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  
  try {
    // Get room with host bot
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select(`
        *,
        host_bot:bots!rooms_host_bot_id_fkey(*)
      `)
      .eq('id', roomId)
      .single();
    
    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    if (!['waiting', 'in_battle'].includes(room.status)) {
      return NextResponse.json({ error: 'Room is not available' }, { status: 400 });
    }
    
    // Create guest bot
    const guestName = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
    const { data: guestBot, error: guestError } = await supabase
      .from('bots')
      .insert({
        name: guestName,
        telegram_id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        hp: 100,
        wins: 0,
        losses: 0,
        win_streak: 0,
        league: 'bronze',
        is_npc: false,
        avatar_state: 'neutral',
      })
      .select()
      .single();
    
    if (guestError) {
      console.error('Failed to create guest bot:', guestError);
      return NextResponse.json({ error: 'Failed to create guest bot' }, { status: 500 });
    }
    
    // Update room status
    await supabase
      .from('rooms')
      .update({
        challenger_bot_id: guestBot.id,
        status: 'in_battle',
        started_at: new Date().toISOString(),
      })
      .eq('id', roomId);
    
    // Get real trending token from GMGN
    const token = await getRandomTrendingToken();
    
    return NextResponse.json({
      room,
      hostBot: room.host_bot,
      guestBot,
      token: {
        symbol: token.symbol,
        address: token.address,
        price: token.price,
        name: token.name,
        logo: token.logo,
      },
    });
    
  } catch (error) {
    console.error('Fight init error:', error);
    return NextResponse.json({ error: 'Failed to initialize fight' }, { status: 500 });
  }
}

// POST /api/arena/fight/[roomId] - Submit prediction or resolve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  // Rate limit
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`arena-fight:${ip}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const { roomId } = await params;
  const body = await request.json();
  const { action, prediction, guestBotId, token: tokenData } = body;
  
  console.log(`[FIGHT API] Action: ${action}, roomId: ${roomId}`);
  console.log(`[FIGHT API] Token data received:`, JSON.stringify(tokenData));
  
  try {
    if (action === 'predict') {
      // Get room
      const { data: room } = await supabase
        .from('rooms')
        .select('*, host_bot:bots!rooms_host_bot_id_fkey(*)')
        .eq('id', roomId)
        .single();
      
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      
      // NPC makes prediction based on recent price action
      // For 60 seconds, realistic change is 0.95x - 1.05x
      const opponentPrediction = 0.95 + Math.random() * 0.1; // 0.95x - 1.05x (realistic)
      
      // Use token data from frontend (real GMGN token)
      console.log(`[FIGHT API] Creating battle with token: ${tokenData?.symbol}, price: ${tokenData?.price}, address: ${tokenData?.address}`);
      
      const { data: battle, error: battleError } = await supabase
        .from('battles')
        .insert({
          room_id: roomId,
          round_number: 1,
          bot1_id: room.host_bot.id,
          bot2_id: guestBotId,
          token_symbol: tokenData?.symbol || 'UNKNOWN',
          token_address: tokenData?.address || 'unknown',
          entry_price: tokenData?.price || 0.0001,
          bot1_prediction: opponentPrediction,
          bot2_prediction: prediction,
          status: 'active',
          resolves_at: new Date(Date.now() + 60000).toISOString(),
        })
        .select()
        .single();
      
      if (battleError) {
        console.error('[FIGHT API] Battle insert error:', battleError);
      }
      
      return NextResponse.json({
        success: true,
        opponentPrediction: parseFloat(opponentPrediction.toFixed(2)),
        battleId: battle?.id,
      });
      
    } else if (action === 'resolve') {
      // Get battle
      const { data: battle } = await supabase
        .from('battles')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!battle) {
        return NextResponse.json({ error: 'No active battle' }, { status: 404 });
      }
      
      // Get REAL current price from GMGN
      let actualResult: number;
      const currentPrice = await getTokenPrice(battle.token_address);
      
      if (currentPrice && battle.entry_price > 0) {
        // Calculate real X based on price change
        actualResult = currentPrice / battle.entry_price;
        console.log(`[FIGHT] Real price: entry=${battle.entry_price}, current=${currentPrice}, X=${actualResult.toFixed(4)}`);
      } else {
        // Fallback to simulation if price fetch fails
        actualResult = 0.5 + Math.random() * 2; // 0.5x - 2.5x (realistic for 60 sec)
        console.log(`[FIGHT] Simulated result: ${actualResult.toFixed(4)} (price fetch failed)`);
      }
      
      // Calculate winner
      const bot1Diff = Math.abs(battle.bot1_prediction - actualResult);
      const bot2Diff = Math.abs(battle.bot2_prediction - actualResult);
      
      const winnerId = bot1Diff < bot2Diff ? battle.bot1_id : battle.bot2_id;
      const loserId = winnerId === battle.bot1_id ? battle.bot2_id : battle.bot1_id;
      
      // Calculate damage (5-20)
      const damage = 5 + Math.floor(Math.random() * 15);
      
      // Update battle
      await supabase
        .from('battles')
        .update({
          actual_x: actualResult,
          winner_id: winnerId,
          damage_dealt: damage,
          status: 'resolved',
        })
        .eq('id', battle.id);
      
      // Get bots
      const { data: winner } = await supabase.from('bots').select('*').eq('id', winnerId).single();
      const { data: loser } = await supabase.from('bots').select('*').eq('id', loserId).single();
      
      // Update winner
      await supabase
        .from('bots')
        .update({
          wins: (winner?.wins || 0) + 1,
          win_streak: (winner?.win_streak || 0) + 1,
          avatar_state: 'winning',
        })
        .eq('id', winnerId);
      
      // Update loser
      const newHp = Math.max(0, (loser?.hp || 100) - damage);
      await supabase
        .from('bots')
        .update({
          losses: (loser?.losses || 0) + 1,
          win_streak: 0,
          hp: newHp,
          avatar_state: newHp <= 20 ? 'critical' : 'losing',
        })
        .eq('id', loserId);
      
      // Update room
      await supabase
        .from('rooms')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
        })
        .eq('id', roomId);
      
      // 💰 PAYOUT: Check for stakes and pay winner
      let payoutResult = null;
      try {
        // Get all confirmed stakes for this room
        const { data: stakes } = await supabase
          .from('battle_stakes')
          .select('*')
          .eq('room_id', roomId)
          .eq('status', 'confirmed');

        if (stakes && stakes.length > 0) {
          const totalPot = stakes.reduce((sum: number, s: any) => sum + (s.verified_amount_sol || s.amount_sol), 0);
          
          // Find the winner's wallet — the stake from the user whose bot won
          // Winner bot could be host or guest
          // We need to figure out which wallet bet on the winning bot
          // For now: host = first joiner (bot1), guest = second joiner (bot2)
          // The guest_bot is created when someone visits the fight page
          // Since we don't track which wallet owns which bot yet,
          // we determine winner based on prediction accuracy
          
          // If there are 2+ stakes (PvP), winner gets the pot
          // If only 1 stake, refund (no opponent to beat)
          if (stakes.length >= 2) {
            // Determine which bot the winner played
            // host_bot = bot1, guest = bot2
            // We need to map wallets to bots — check who joined first
            const winnerIsHost = winnerId === battle.bot1_id;
            
            // Sort stakes by created_at — first staker = host side, second = guest side
            const sortedStakes = stakes.sort((a: any, b: any) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            
            const winnerStake = winnerIsHost ? sortedStakes[0] : sortedStakes[1];
            const winnerWallet = winnerStake?.wallet;
            
            if (winnerWallet && totalPot > 0) {
              console.log(`[PAYOUT] Winner: ${winnerWallet}, Pot: ${totalPot} SOL, Room: ${roomId}`);
              
              const payout = await payoutWinner(winnerWallet, totalPot);
              
              if (payout.success) {
                // Update stake records with payout info
                await supabase
                  .from('battle_stakes')
                  .update({
                    payout_tx: payout.txSignature,
                    payout_amount_sol: payout.winnerPayout,
                    platform_fee_sol: payout.platformFee,
                    paid_out_at: new Date().toISOString(),
                  })
                  .eq('room_id', roomId)
                  .eq('wallet', winnerWallet)
                  .eq('status', 'confirmed');
                
                payoutResult = {
                  winner_wallet: winnerWallet,
                  payout_sol: payout.winnerPayout,
                  platform_fee_sol: payout.platformFee,
                  tx_signature: payout.txSignature,
                };
                
                console.log(`[PAYOUT] ✅ Sent ${payout.winnerPayout?.toFixed(6)} SOL to ${winnerWallet}`);
              } else {
                console.error(`[PAYOUT] ❌ Failed:`, payout.error);
                payoutResult = { error: payout.error };
              }
            }
          } else if (stakes.length === 1) {
            // Only 1 staker — refund them (no opponent)
            console.log(`[PAYOUT] Only 1 stake in room ${roomId}, skipping payout (consider refund)`);
            payoutResult = { note: 'single_stake_no_payout' };
          }
        }
      } catch (payoutErr: any) {
        console.error('[PAYOUT] Error:', payoutErr);
        payoutResult = { error: payoutErr.message };
      }

      // Get updated bots
      const { data: updatedHostBot } = await supabase.from('bots').select('*').eq('id', battle.bot1_id).single();
      const { data: updatedGuestBot } = await supabase.from('bots').select('*').eq('id', battle.bot2_id).single();
      
      return NextResponse.json({
        success: true,
        actualResult: parseFloat(actualResult.toFixed(2)),
        winnerId,
        loserId,
        damage,
        updatedHostBot,
        updatedGuestBot,
        payout: payoutResult,
      });
      
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Fight action error:', error);
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 });
  }
}
