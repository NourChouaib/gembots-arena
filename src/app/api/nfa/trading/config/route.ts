import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ─── POST: Update trading config ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nfaId, ownerAddress, mode, config } = body;

    if (!nfaId || !ownerAddress) {
      return NextResponse.json(
        { error: 'nfaId and ownerAddress are required' },
        { status: 400 }
      );
    }

    // Find bot
    const { data: bot, error: findError } = await supabase
      .from('bots')
      .select('id, nfa_id, wallet_address, trading_wallet_address, trading_mode, trading_config')
      .eq('nfa_id', parseInt(nfaId))
      .single();

    if (findError || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Verify ownership
    if (bot.wallet_address?.toLowerCase() !== ownerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Not the owner of this NFA bot' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};

    // Update mode if provided
    if (mode !== undefined) {
      if (!['off', 'paper', 'live'].includes(mode)) {
        return NextResponse.json(
          { error: 'Invalid mode. Allowed: off, paper, live' },
          { status: 400 }
        );
      }
      if (mode !== 'off' && !bot.trading_wallet_address) {
        return NextResponse.json(
          { error: 'Must generate a wallet before enabling trading' },
          { status: 400 }
        );
      }
      
      // Extra validation for live mode
      if (mode === 'live') {
        // Check master switch
        if (process.env.NFA_LIVE_TRADING_ENABLED !== 'true') {
          return NextResponse.json(
            { error: 'Live trading is not enabled on the server (NFA_LIVE_TRADING_ENABLED)' },
            { status: 400 }
          );
        }

        // Check wallet has BNB balance
        try {
          const { ethers } = await import('ethers');
          const provider = new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_BSC_RPC || 'https://bsc-dataseed.binance.org/',
            56
          );
          const balance = await provider.getBalance(bot.trading_wallet_address);
          const bnb = parseFloat(ethers.formatEther(balance));
          
          if (bnb < 0.01) {
            return NextResponse.json(
              { error: `Insufficient BNB balance: ${bnb.toFixed(6)} BNB. Fund the wallet with at least 0.01 BNB before enabling live trading.`, wallet: bot.trading_wallet_address },
              { status: 400 }
            );
          }
        } catch (err) {
          console.error('Balance check error:', err);
          return NextResponse.json(
            { error: 'Failed to verify wallet balance. Try again later.' },
            { status: 500 }
          );
        }
      }
      
      updates.trading_mode = mode;
    }

    // Update config if provided
    if (config) {
      const currentConfig = bot.trading_config || {};
      const merged = { ...currentConfig, ...config };

      // Validate and clamp values
      if (merged.max_position_pct !== undefined) {
        merged.max_position_pct = Math.max(1, Math.min(50, Number(merged.max_position_pct) || 10));
      }
      if (merged.max_daily_loss_pct !== undefined) {
        merged.max_daily_loss_pct = Math.max(1, Math.min(20, Number(merged.max_daily_loss_pct) || 5));
      }
      if (merged.max_trades_per_day !== undefined) {
        merged.max_trades_per_day = Math.max(1, Math.min(100, Number(merged.max_trades_per_day) || 20));
      }
      if (merged.confidence_threshold !== undefined) {
        merged.confidence_threshold = Math.max(0.1, Math.min(1.0, Number(merged.confidence_threshold) || 0.7));
      }
      if (merged.take_profit_pct !== undefined) {
        merged.take_profit_pct = Math.max(0.5, Math.min(50, Number(merged.take_profit_pct) || 5));
      }
      if (merged.stop_loss_pct !== undefined) {
        merged.stop_loss_pct = Math.max(0.5, Math.min(20, Number(merged.stop_loss_pct) || 3));
      }
      if (merged.allowed_pairs) {
        const validPairs = ['BNB/USDT', 'ETH/USDT', 'CAKE/USDT', 'BTC/USDT', 'SOL/USDT'];
        merged.allowed_pairs = merged.allowed_pairs.filter((p: string) => validPairs.includes(p));
        if (merged.allowed_pairs.length === 0) {
          merged.allowed_pairs = ['BNB/USDT', 'ETH/USDT', 'CAKE/USDT'];
        }
      }

      updates.trading_config = merged;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('bots')
      .update(updates)
      .eq('id', bot.id);

    if (updateError) {
      console.error('Failed to update config:', updateError);
      return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }

    return NextResponse.json({
      nfaId: bot.nfa_id,
      mode: updates.trading_mode || bot.trading_mode,
      config: updates.trading_config || bot.trading_config,
      message: 'Trading config updated',
    });
  } catch (err) {
    console.error('POST /api/nfa/trading/config error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
