import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

// Core tokens for GemBots arena
const CORE_TOKENS = [
  { symbol: 'BTC', name: 'Bitcoin', bybit: 'BTCUSDT' },
  { symbol: 'ETH', name: 'Ethereum', bybit: 'ETHUSDT' },
  { symbol: 'SOL', name: 'Solana', bybit: 'SOLUSDT' },
  { symbol: 'BNB', name: 'BNB', bybit: 'BNBUSDT' },
  { symbol: 'WIF', name: 'dogwifhat', bybit: 'WIFUSDT' },
  { symbol: 'DOGE', name: 'Dogecoin', bybit: 'DOGEUSDT' },
  { symbol: 'PEPE', name: 'Pepe', bybit: 'PEPEUSDT' },
  { symbol: 'XRP', name: 'XRP', bybit: 'XRPUSDT' },
  { symbol: 'ADA', name: 'Cardano', bybit: 'ADAUSDT' },
  { symbol: 'LINK', name: 'Chainlink', bybit: 'LINKUSDT' },
  { symbol: 'AVAX', name: 'Avalanche', bybit: 'AVAXUSDT' },
  { symbol: 'DOT', name: 'Polkadot', bybit: 'DOTUSDT' },
];

interface TrendingToken {
  mint: string;
  symbol: string;
  name: string;
  price: string;
  change24h: string;
  volume: string;
  boost: number;
}

export async function GET() {
  try {
    // Fetch all tickers from Bybit in one call
    const res = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
    if (!res.ok) {
      throw new Error(`Bybit API error: ${res.status}`);
    }
    const data = await res.json();
    const tickers = data?.result?.list || [];

    // Build lookup map
    const tickerMap: Record<string, any> = {};
    for (const t of tickers) {
      tickerMap[t.symbol] = t;
    }

    // Get prices + sort by 24h change to find top movers
    const tokensWithData: TrendingToken[] = [];

    for (const token of CORE_TOKENS) {
      const t = tickerMap[token.bybit];
      if (!t) continue;

      const price = parseFloat(t.lastPrice) || 0;
      const prevPrice = parseFloat(t.prevPrice24h) || price;
      const change24h = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
      const volume24h = parseFloat(t.turnover24h) || 0; // USDT volume

      tokensWithData.push({
        mint: token.symbol, // Using symbol as identifier for major tokens
        symbol: token.symbol,
        name: token.name,
        price: price > 1 ? `$${price.toFixed(2)}` : `$${price.toFixed(6)}`,
        change24h: `${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}%`,
        volume: volume24h > 1_000_000
          ? `$${(volume24h / 1_000_000).toFixed(2)}M`
          : `$${(volume24h / 1_000).toFixed(0)}K`,
        boost: Math.abs(change24h), // Use absolute change as "boost" score
      });
    }

    // Sort by absolute 24h change (most volatile = most interesting)
    tokensWithData.sort((a, b) => b.boost - a.boost);

    // Return top 5
    return NextResponse.json({
      success: true,
      tokens: tokensWithData.slice(0, 5),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Trending API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trending tokens',
      tokens: [],
    }, { status: 500 });
  }
}
