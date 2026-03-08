import { NextResponse } from 'next/server';

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  DOGE: 'dogecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  NEAR: 'near',
  APT: 'aptos',
  SUI: 'sui',
  ARB: 'arbitrum',
  OP: 'optimism',
  CAKE: 'pancakeswap-token',
};

// BSC token contract addresses for reliable DexScreener lookup (avoid text search ambiguity)
const BSC_ADDRESSES: Record<string, string> = {
  BNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  BTC: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  SOL: '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF',
  CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
  XRP: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
  LINK: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
  ADA: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
};

// Cache prices for 10 seconds to avoid CoinGecko rate limits
let priceCache: Record<string, { price: number; priceChange5m: number; priceChange1h: number; ts: number }> = {};
const CACHE_TTL = 10_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = (searchParams.get('token') || '').replace(/^\$/, '').toUpperCase();

  if (!token) {
    return NextResponse.json({ error: 'Missing token param' }, { status: 400 });
  }

  // Check cache
  const cached = priceCache[token];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached);
  }

  // Try CoinGecko for major tokens
  const geckoId = COINGECKO_IDS[token];
  if (geckoId) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: 0 } }
      );
      if (res.ok) {
        const data = await res.json();
        const coin = data[geckoId];
        if (coin?.usd) {
          const result = {
            price: coin.usd,
            priceChange5m: 0,
            priceChange1h: parseFloat(((coin.usd_24h_change || 0) / 24).toFixed(2)),
            ts: Date.now(),
          };
          priceCache[token] = result;
          return NextResponse.json(result);
        }
      }
    } catch {
      // Fall through to DexScreener
    }
  }

  // Fallback: DexScreener — prefer contract address lookup (more reliable than text search)
  try {
    const bscAddress = BSC_ADDRESSES[token];
    const dexUrl = bscAddress
      ? `https://api.dexscreener.com/latest/dex/tokens/${bscAddress}`
      : `https://api.dexscreener.com/latest/dex/search?q=${token}`;
    
    const res = await fetch(dexUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Price fetch failed' }, { status: 502 });
    }
    const data = await res.json();
    const pairs = data.pairs || [];
    if (pairs.length === 0) {
      return NextResponse.json({ error: 'No pairs found' }, { status: 404 });
    }

    // Sort by liquidity to get the real pair
    const sorted = pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    const best = sorted[0];

    const result = {
      price: parseFloat(best.priceUsd) || 0,
      priceChange5m: best.priceChange?.m5 ?? 0,
      priceChange1h: best.priceChange?.h1 ?? 0,
      ts: Date.now(),
    };
    priceCache[token] = result;
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Price fetch failed' }, { status: 502 });
  }
}
