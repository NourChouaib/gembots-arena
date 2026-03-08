import { NextRequest, NextResponse } from 'next/server';
import { getArenaManager } from '../../../../lib/arena-websocket';
import { getBotByApiKey, saveTradeEvent, getRecentTradeEvents } from '../../../../lib/db';
import type { BotTradeEvent } from '../../../../types/arena';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// POST endpoint для уведомления о торговле бота
export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`arena-bot-trade:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const body = await request.json();
    const { 
      api_key,
      action, // 'BUY' | 'SELL'
      token_mint,
      token_symbol,
      price,
      amount,
      confidence = 0.8
    } = body;

    // Проверяем API key
    if (!api_key) {
      return NextResponse.json({ error: 'API key required' }, { status: 400 });
    }

    const bot = getBotByApiKey(api_key) as { name: string; id: number } | undefined;
    if (!bot) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Валидируем данные
    if (!action || !['BUY', 'SELL'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!token_mint || !price || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Отправляем событие в Arena WebSocket
    const manager = getArenaManager();
    if (manager) {
      manager.broadcastBotTrade({
        botId: `bot-${bot.name}`,
        botName: bot.name,
        action: action as 'BUY' | 'SELL',
        tokenMint: token_mint,
        tokenSymbol: token_symbol || 'UNKNOWN',
        price: parseFloat(price),
        amount: parseFloat(amount),
        confidence: parseFloat(confidence)
      });
    }

    // Save to database
    saveTradeEvent({
      botName: bot.name,
      action,
      tokenSymbol: token_symbol || 'UNKNOWN',
      tokenMint: token_mint,
      price: parseFloat(price),
      amount: parseFloat(amount),
      confidence: parseFloat(confidence),
    });

    console.log(`[Arena] Bot trade event: ${bot.name} ${action} ${token_symbol} at $${price}`);

    return NextResponse.json({ 
      success: true,
      message: `Trade event broadcasted for ${bot.name}`,
      data: {
        botName: bot.name,
        action,
        tokenSymbol: token_symbol,
        price,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing bot trade event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint для получения недавних торговых событий
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const recentTrades = getRecentTradeEvents(limit).map(t => ({
      id: String(t.id),
      botName: t.bot_name,
      action: t.action,
      tokenSymbol: t.token_symbol,
      tokenMint: t.token_mint,
      price: t.price,
      amount: t.amount,
      confidence: t.confidence,
      timestamp: t.timestamp,
    }));

    return NextResponse.json({
      trades: recentTrades,
      total: recentTrades.length
    });

  } catch (error) {
    console.error('Error fetching recent trades:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}