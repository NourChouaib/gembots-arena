import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: botId } = await params;

    // Get bot details
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

    // Get bot predictions
    const { data: predictions, error: predictionsError } = await supabase
      .from('predictions')
      .select('*')
      .eq('bot_id', botId)
      .order('predicted_at', { ascending: false })
      .limit(50);

    if (predictionsError) {
      console.error('Predictions fetch error:', predictionsError);
    }

    // Get bot daily stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyStats, error: statsError } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('bot_id', botId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (statsError) {
      console.error('Daily stats fetch error:', statsError);
    }

    // Calculate additional metrics
    const totalPredictions = predictions?.length || 0;
    const resolvedPredictions = predictions?.filter(p => p.status === 'resolved') || [];
    const correctPredictions = resolvedPredictions.filter(p => p.x_multiplier && p.x_multiplier >= 2);
    const averageConfidence = totalPredictions > 0 
      ? predictions!.reduce((sum, p) => sum + p.confidence, 0) / totalPredictions 
      : 0;
    const averageXFound = correctPredictions.length > 0
      ? correctPredictions.reduce((sum, p) => sum + (p.x_multiplier || 0), 0) / correctPredictions.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        bot: {
          id: bot.id,
          name: bot.name,
          walletAddress: bot.wallet_address,
          reputation: bot.reputation,
          totalPredictions: bot.total_predictions,
          correctPredictions: bot.correct_predictions,
          totalXFound: bot.total_x_found,
          streakDays: bot.streak_days,
          stakedAmount: bot.staked_amount,
          createdAt: bot.created_at
        },
        predictions: predictions?.map(p => ({
          id: p.id,
          botId: p.bot_id,
          tokenMint: p.token_mint,
          tokenSymbol: p.token_symbol,
          priceAtPrediction: p.price_at_prediction,
          confidence: p.confidence,
          predictedAt: p.predicted_at,
          resolvedAt: p.resolved_at,
          maxPrice24h: p.max_price_24h,
          xMultiplier: p.x_multiplier,
          status: p.status,
          rewardEarned: p.reward_earned
        })) || [],
        dailyStats: dailyStats || [],
        metrics: {
          totalPredictions,
          resolvedPredictions: resolvedPredictions.length,
          correctPredictions: correctPredictions.length,
          accuracy: resolvedPredictions.length > 0 
            ? correctPredictions.length / resolvedPredictions.length 
            : 0,
          averageConfidence,
          averageXFound,
          winRate: resolvedPredictions.length > 0
            ? correctPredictions.length / resolvedPredictions.length
            : 0
        }
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}