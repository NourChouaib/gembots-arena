import { NextRequest, NextResponse } from 'next/server';
import { supabase, createPrediction } from '../../../lib/supabase';
import { PREDICTION_CONFIG } from '../../../lib/constants';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function GET() {
  try {
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        bots (
          name,
          wallet_address,
          reputation
        )
      `)
      .order('predicted_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: predictions || []
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`predictions:${ip}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const body = await request.json();
    const { mint, confidence, botId } = body;

    // Validation
    if (!mint || !confidence || !botId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: mint, confidence, botId'
      }, { status: 400 });
    }

    if (confidence < 1 || confidence > PREDICTION_CONFIG.maxConfidence) {
      return NextResponse.json({
        success: false,
        error: `Confidence must be between 1 and ${PREDICTION_CONFIG.maxConfidence}`
      }, { status: 400 });
    }

    // Check if bot exists and has enough stake
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return NextResponse.json({
        success: false,
        error: 'Bot not found'
      }, { status: 404 });
    }

    if (bot.staked_amount < PREDICTION_CONFIG.minStake) {
      return NextResponse.json({
        success: false,
        error: `Insufficient stake. Minimum: ${PREDICTION_CONFIG.minStake} $GEM`
      }, { status: 400 });
    }

    // Check daily prediction limit
    const today = new Date().toISOString().split('T')[0];
    const { data: todayPredictions, error: countError } = await supabase
      .from('predictions')
      .select('id')
      .eq('bot_id', botId)
      .gte('predicted_at', `${today}T00:00:00Z`)
      .lt('predicted_at', `${today}T23:59:59Z`);

    if (countError) throw countError;

    if (todayPredictions && todayPredictions.length >= PREDICTION_CONFIG.maxDaily) {
      return NextResponse.json({
        success: false,
        error: `Daily prediction limit reached (${PREDICTION_CONFIG.maxDaily})`
      }, { status: 429 });
    }

    // Check cooldown
    const { data: lastPrediction, error: lastError } = await supabase
      .from('predictions')
      .select('predicted_at')
      .eq('bot_id', botId)
      .order('predicted_at', { ascending: false })
      .limit(1)
      .single();

    if (lastPrediction && !lastError) {
      const timeSinceLastPrediction = Date.now() - new Date(lastPrediction.predicted_at).getTime();
      const cooldownMs = PREDICTION_CONFIG.cooldownHours * 60 * 60 * 1000;
      
      if (timeSinceLastPrediction < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastPrediction) / (60 * 1000));
        return NextResponse.json({
          success: false,
          error: `Cooldown active. Try again in ${remainingMinutes} minutes`
        }, { status: 429 });
      }
    }

    // Create prediction
    const prediction = await createPrediction({
      botId,
      tokenMint: mint,
      priceAtPrediction: 0.001, // This should be fetched from price API
      confidence,
      status: 'pending',
      rewardEarned: 0
    });

    // Calculate remaining slots
    const remainingSlots = PREDICTION_CONFIG.maxDaily - (todayPredictions?.length || 0) - 1;

    return NextResponse.json({
      success: true,
      data: {
        prediction_id: prediction.id,
        slot: (todayPredictions?.length || 0) + 1,
        remaining_slots: remainingSlots,
        staked_amount: PREDICTION_CONFIG.minStake,
        resolves_at: new Date(Date.now() + PREDICTION_CONFIG.trackingHours * 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}