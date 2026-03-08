import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export async function POST(req: NextRequest) {
  // Rate limit: 10 req/min per IP
  const ip = getClientIP(req);
  const { allowed } = rateLimit(`purchases:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { productId, txHash, amount, buyer } = await req.json();

    if (!productId || !txHash || !buyer) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Log to Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          product_id: productId,
          tx_hash: txHash,
          amount_usd: amount,
          buyer_address: buyer,
          chain: 'bsc',
          currency: 'USDC',
          created_at: new Date().toISOString(),
        }),
      });
    }

    // Also log to console for monitoring
    console.log(`💰 Purchase: ${productId} | $${amount} USDC | ${buyer} | tx: ${txHash}`);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Purchase log error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
