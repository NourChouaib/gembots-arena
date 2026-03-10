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

// Cache prices for 10 seconds
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
      // Fall through to Bybit
    }
  }

  // Fallback: Bybit API (fast, no Cloudflare issues)
  const BYBIT_SYMBOLS: Record<string, string> = {
    BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', BNB: 'BNBUSDT',
    WIF: 'WIFUSDT', CAKE: 'CAKEUSDT', LINK: 'LINKUSDT', PEPE: 'PEPEUSDT',
    DOGE: 'DOGEUSDT', XRP: 'XRPUSDT', ADA: 'ADAUSDT', AVAX: 'AVAXUSDT',
    DOT: 'DOTUSDT', SHIB: 'SHIBUSDT', MATIC: 'MATICUSDT',
    UNI: 'UNIUSDT', AAVE: 'AAVEUSDT', NEAR: 'NEARUSDT',
    APT: 'APTUSDT', SUI: 'SUIUSDT', ARB: 'ARBUSDT', OP: 'OPUSDT',
  };

  const bybitSymbol = BYBIT_SYMBOLS[token] || `${token}USDT`;
  try {
    const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${bybitSymbol}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.result?.list?.[0]) {
        const t = data.result.list[0];
        const price = parseFloat(t.lastPrice);
        if (price > 0) {
          const prevPrice = parseFloat(t.prevPrice24h) || price;
          const change24h = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
          const result = {
            price,
            priceChange5m: 0,
            priceChange1h: parseFloat((change24h / 24).toFixed(2)),
            ts: Date.now(),
          };
          priceCache[token] = result;
          return NextResponse.json(result);
        }
      }
    }
  } catch {
    // Bybit also failed
  }

  return NextResponse.json({ error: 'Price fetch failed for ' + token }, { status: 502 });
}
