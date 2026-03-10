// Multi-source Price API integration (Bybit primary)

const BYBIT_API = 'https://api.bybit.com/v5/market/tickers';

const BYBIT_BY_ADDRESS: Record<string, string> = {
  '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c': 'BNBUSDT',
  '0x2170Ed0880ac9A755fd29B2688956BD959F933F8': 'ETHUSDT',
  '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c': 'BTCUSDT',
  '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82': 'CAKEUSDT',
  '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD': 'LINKUSDT',
  '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE': 'XRPUSDT',
  '0x570A5D26f7765Ecb712C0924E4De545B89fD43dF': 'SOLUSDT',
  '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47': 'ADAUSDT',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIFUSDT',
  'So11111111111111111111111111111111111111112': 'SOLUSDT',
};

export async function getTokenPrice(mint: string, tokenSymbol?: string): Promise<number | null> {
  // 1) Try Bybit first
  const bybitSymbol = BYBIT_BY_ADDRESS[mint] || (tokenSymbol ? `${tokenSymbol.toUpperCase()}USDT` : null);
  if (bybitSymbol) {
    try {
      const res = await fetch(`${BYBIT_API}?category=spot&symbol=${bybitSymbol}`);
      if (res.ok) {
        const data = await res.json();
        const price = data?.result?.list?.[0]?.lastPrice;
        if (price) {
          const parsed = parseFloat(price);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      }
    } catch {
      // Bybit failed, fall through
    }
  }

  // Bybit was our only source
  return null;
}

export async function getMultipleTokenPrices(mints: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  
  for (const mint of mints) {
    try {
      const price = await getTokenPrice(mint);
      if (price) prices[mint] = price;
      await new Promise(r => setTimeout(r, 100));
    } catch {
      // Skip failed tokens
    }
  }
  
  return prices;
}
