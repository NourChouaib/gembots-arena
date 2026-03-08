import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

interface DexScreenerToken {
  tokenAddress: string;
  description?: string;
  icon?: string;
  totalAmount: number;
  chainId: string;
}

interface TrendingToken {
  mint: string;
  symbol: string;
  name: string;
  price: string;
  change24h: string;
  volume: string;
  boost: number;
  icon?: string;
}

export async function GET() {
  try {
    // Fetch top boosted tokens from DexScreener
    const boostRes = await fetch('https://api.dexscreener.com/token-boosts/top/v1', {
      next: { revalidate: 300 }
    });
    
    if (!boostRes.ok) {
      throw new Error('Failed to fetch from DexScreener');
    }
    
    const boostData: DexScreenerToken[] = await boostRes.json();
    
    // Filter Solana tokens only and take top 5
    const solanaTokens = boostData
      .filter(t => t.chainId === 'solana')
      .slice(0, 5);
    
    // Fetch detailed price data for each token
    const trendingTokens: TrendingToken[] = await Promise.all(
      solanaTokens.map(async (token) => {
        try {
          const priceRes = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${token.tokenAddress}`
          );
          const priceData = await priceRes.json();
          
          const pair = priceData.pairs?.[0];
          
          return {
            mint: token.tokenAddress,
            symbol: pair?.baseToken?.symbol || 'UNKNOWN',
            name: pair?.baseToken?.name || token.description || 'Unknown Token',
            price: pair?.priceUsd ? `$${parseFloat(pair.priceUsd).toFixed(6)}` : 'N/A',
            change24h: pair?.priceChange?.h24 
              ? `${pair.priceChange.h24 > 0 ? '+' : ''}${pair.priceChange.h24.toFixed(1)}%` 
              : 'N/A',
            volume: pair?.volume?.h24 
              ? `$${(pair.volume.h24 / 1000000).toFixed(2)}M` 
              : 'N/A',
            boost: token.totalAmount,
            icon: token.icon ? `https://cdn.dexscreener.com/cms/images/${token.icon}?width=64&height=64` : undefined
          };
        } catch (e) {
          return {
            mint: token.tokenAddress,
            symbol: 'UNKNOWN',
            name: token.description || 'Unknown Token',
            price: 'N/A',
            change24h: 'N/A',
            volume: 'N/A',
            boost: token.totalAmount,
            icon: token.icon ? `https://cdn.dexscreener.com/cms/images/${token.icon}?width=64&height=64` : undefined
          };
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      tokens: trendingTokens,
      fetchedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Trending API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trending tokens',
      tokens: []
    }, { status: 500 });
  }
}
