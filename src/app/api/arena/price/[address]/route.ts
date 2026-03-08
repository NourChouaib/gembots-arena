// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';

// GET /api/arena/price/[address] - Get current token price
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  
  try {
    const res = await fetch(`https://gmgn.ai/defi/quotation/v1/tokens/sol/${address}`, {
      headers: { 'User-Agent': 'GemBots/1.0' },
      next: { revalidate: 5 }, // Cache for 5 seconds
    });
    
    const data = await res.json();
    
    if (data.code === 0 && data.data?.token) {
      return NextResponse.json({
        success: true,
        price: data.data.token.price,
        symbol: data.data.token.symbol,
        priceChange1m: data.data.token.price_change_percent1m,
        priceChange5m: data.data.token.price_change_percent5m,
      });
    }
    
    return NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 });
    
  } catch (error) {
    console.error('Price fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch price' }, { status: 500 });
  }
}
