import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import crypto from 'crypto';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function GET() {
  try {
    const { data: bots, error } = await supabase
      .from('bots')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: bots || []
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
  const { allowed } = rateLimit(`bots:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const body = await request.json();
    const { name, walletAddress } = body;

    // Validation
    if (!name || !walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, walletAddress'
      }, { status: 400 });
    }

    if (name.length < 3 || name.length > 50) {
      return NextResponse.json({
        success: false,
        error: 'Bot name must be between 3 and 50 characters'
      }, { status: 400 });
    }

    // Validate wallet address format (basic Solana address validation)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Solana wallet address'
      }, { status: 400 });
    }

    // Check if bot name is already taken
    const { data: existingByName, error: nameError } = await supabase
      .from('bots')
      .select('id')
      .eq('name', name)
      .single();

    if (existingByName && !nameError) {
      return NextResponse.json({
        success: false,
        error: 'Bot name already taken'
      }, { status: 409 });
    }

    // Check if wallet is already registered
    const { data: existingByWallet, error: walletError } = await supabase
      .from('bots')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (existingByWallet && !walletError) {
      return NextResponse.json({
        success: false,
        error: 'Wallet already registered'
      }, { status: 409 });
    }

    // Generate API key
    const apiKey = `bot_${crypto.randomBytes(32).toString('hex')}`;
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Create bot
    const { data: bot, error: createError } = await supabase
      .from('bots')
      .insert({
        name,
        wallet_address: walletAddress,
        api_key_hash: apiKeyHash,
        reputation: 0,
        total_predictions: 0,
        correct_predictions: 0,
        total_x_found: 0,
        streak_days: 0,
        staked_amount: 0
      })
      .select()
      .single();

    if (createError) throw createError;

    return NextResponse.json({
      success: true,
      data: {
        bot: {
          id: bot.id,
          name: bot.name,
          walletAddress: bot.wallet_address,
          reputation: bot.reputation,
          createdAt: bot.created_at
        },
        apiKey // Only return API key once during registration
      }
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}