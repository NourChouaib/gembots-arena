// Multi-source Price API integration

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

export async function getTokenPrice(mint: string): Promise<number | null> {
  try {
    // Try DexScreener first (no auth needed)
    const response = await fetch(`${DEXSCREENER_API}/${mint}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const pair = data.pairs?.[0];
    
    if (pair?.priceUsd) {
      return parseFloat(pair.priceUsd);
    }
    
    return null;
  } catch (error) {
    console.error('Price fetch error:', error);
    return null;
  }
}

export async function getMultipleTokenPrices(mints: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  
  // DexScreener doesn't support batch, so we fetch individually
  for (const mint of mints) {
    try {
      const price = await getTokenPrice(mint);
      if (price) prices[mint] = price;
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    } catch {
      // Skip failed tokens
    }
  }
  
  return prices;
}
