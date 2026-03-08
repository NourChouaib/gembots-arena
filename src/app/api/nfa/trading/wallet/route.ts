import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// ─── Wallet Generation (server-side only) ────────────────────────────────────

function generateEVMWallet() {
  // Generate a random 32-byte private key
  const privateKeyBytes = crypto.randomBytes(32);
  const privateKey = '0x' + privateKeyBytes.toString('hex');
  
  // Derive public address using basic ECC (we use ethers at runtime but for build compatibility...)
  // We'll use a simpler approach: import ethers dynamically
  return { privateKey };
}

function encryptPrivateKey(privateKey: string): string {
  const masterKey = process.env.NFA_WALLET_MASTER_KEY;
  if (!masterKey || masterKey.length !== 64) {
    throw new Error('NFA_WALLET_MASTER_KEY not configured');
  }
  const key = Buffer.from(masterKey, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// ─── GET: Get wallet info for NFA ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const nfaId = request.nextUrl.searchParams.get('nfaId');
  
  if (!nfaId) {
    return NextResponse.json({ error: 'nfaId is required' }, { status: 400 });
  }

  try {
    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, nfa_id, name, trading_wallet_address, trading_mode, trading_config')
      .eq('nfa_id', parseInt(nfaId))
      .single();

    if (error || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Get trading stats
    const { data: stats } = await supabase
      .from('nfa_trading_stats')
      .select('*')
      .eq('nfa_id', parseInt(nfaId))
      .single();

    return NextResponse.json({
      botId: bot.id,
      nfaId: bot.nfa_id,
      name: bot.name,
      wallet: bot.trading_wallet_address || null,
      mode: bot.trading_mode || 'off',
      config: bot.trading_config || {},
      stats: stats || null,
    });
  } catch (err) {
    console.error('GET /api/nfa/trading/wallet error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create wallet for NFA ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nfaId, ownerAddress } = body;

    if (!nfaId || !ownerAddress) {
      return NextResponse.json(
        { error: 'nfaId and ownerAddress are required' },
        { status: 400 }
      );
    }

    // Find bot with this nfa_id
    const { data: bot, error: findError } = await supabase
      .from('bots')
      .select('id, nfa_id, wallet_address, trading_wallet_address')
      .eq('nfa_id', parseInt(nfaId))
      .single();

    if (findError || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Verify ownership (wallet_address should match)
    if (bot.wallet_address?.toLowerCase() !== ownerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Not the owner of this NFA bot' }, { status: 403 });
    }

    // Check if already has wallet
    if (bot.trading_wallet_address) {
      return NextResponse.json({
        wallet: bot.trading_wallet_address,
        message: 'Wallet already exists',
      });
    }

    // Generate wallet using ethers (dynamic import for build compatibility)
    const { ethers } = await import('ethers');
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const privateKey = wallet.privateKey;

    // Encrypt private key
    const encrypted = encryptPrivateKey(privateKey);

    // Save to Supabase
    const { error: updateError } = await supabase
      .from('bots')
      .update({
        trading_wallet_address: address,
        trading_wallet_encrypted: encrypted,
      })
      .eq('id', bot.id);

    if (updateError) {
      console.error('Failed to save wallet:', updateError);
      return NextResponse.json({ error: 'Failed to save wallet' }, { status: 500 });
    }

    // Initialize trading stats
    await supabase
      .from('nfa_trading_stats')
      .upsert({
        nfa_id: parseInt(nfaId),
        bot_id: bot.id,
        paper_balance_usd: 10000,
      }, { onConflict: 'nfa_id' });

    return NextResponse.json({
      wallet: address,
      message: 'Trading wallet created successfully',
    });
  } catch (err) {
    console.error('POST /api/nfa/trading/wallet error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
