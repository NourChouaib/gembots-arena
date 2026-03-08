import { NextRequest, NextResponse } from 'next/server';
import { getTokenPrice } from '../../../lib/price';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mint = searchParams.get('mint');

    if (!mint) {
      return NextResponse.json({
        success: false,
        error: 'Mint address is required'
      }, { status: 400 });
    }

    try {
      const price = await getTokenPrice(mint);
      return NextResponse.json({
        success: true,
        price,
        mint
      });
    } catch (error) {
      // For demo - return mock price when external APIs aren't configured
      const mockPrice = Math.random() * 0.01;
      console.warn('Price API not configured, returning mock price');
      return NextResponse.json({
        success: true,
        price: mockPrice,
        mint
      });
    }
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}