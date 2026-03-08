/**
 * Price Feed for NFA Trading League
 * 
 * Fetches real-time crypto prices from CoinGecko (free API).
 * Caches results for 30 seconds to avoid rate limits.
 * 
 * Supported pairs: BNB/USDT, ETH/USDT, CAKE/USDT, BTC/USDT, SOL/USDT
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000; // 30 seconds
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Map pair → CoinGecko ID
const PAIR_TO_COINGECKO = {
  'BNB/USDT':  'binancecoin',
  'ETH/USDT':  'ethereum',
  'CAKE/USDT': 'pancakeswap-token',
  'BTC/USDT':  'bitcoin',
  'SOL/USDT':  'solana',
};

// Reverse mapping
const COINGECKO_TO_PAIR = {};
for (const [pair, id] of Object.entries(PAIR_TO_COINGECKO)) {
  COINGECKO_TO_PAIR[id] = pair;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

// { [pair]: { price, timestamp, change_1h, change_24h } }
const _priceCache = new Map();
let _lastBatchFetch = 0;

// ─── Price Fetching ──────────────────────────────────────────────────────────

/**
 * Fetch all supported prices in a single CoinGecko call
 * @returns {Promise<Map<string, { price: number, change_1h: number, change_24h: number }>>}
 */
async function fetchAllPrices() {
  const now = Date.now();
  
  // Return cached if fresh
  if (now - _lastBatchFetch < CACHE_TTL_MS && _priceCache.size > 0) {
    return _priceCache;
  }

  const ids = Object.values(PAIR_TO_COINGECKO).join(',');
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_1hr_change=true`;

  let fetched = false;

  // Source 1: CoinGecko
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const data = await res.json();
    
    for (const [pair, geckoId] of Object.entries(PAIR_TO_COINGECKO)) {
      const info = data[geckoId];
      if (info && info.usd) {
        _priceCache.set(pair, {
          price: info.usd,
          change_1h: info.usd_1h_change || 0,
          change_24h: info.usd_24h_change || 0,
          timestamp: now,
        });
      }
    }
    fetched = true;
    _lastBatchFetch = now;
  } catch (err) {
    console.warn(`⚠️ CoinGecko error: ${err.message}, trying fallback...`);
  }

  // Source 2: CryptoCompare fallback
  if (!fetched) {
    try {
      const ccUrl = 'https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL,BNB,CAKE&tsyms=USD';
      const res = await fetch(ccUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
      const data = await res.json();
      
      const symToPair = { BTC: 'BTC/USDT', ETH: 'ETH/USDT', SOL: 'SOL/USDT', BNB: 'BNB/USDT', CAKE: 'CAKE/USDT' };
      for (const [sym, pair] of Object.entries(symToPair)) {
        if (data[sym]?.USD) {
          _priceCache.set(pair, {
            price: data[sym].USD,
            change_1h: 0,
            change_24h: 0,
            timestamp: now,
          });
        }
      }
      fetched = true;
      _lastBatchFetch = now;
      console.log(`  ✅ Prices from CryptoCompare fallback`);
    } catch (err2) {
      console.warn(`⚠️ CryptoCompare fallback error: ${err2.message}`);
    }
  }

  // Source 3: CoinCap fallback
  if (!fetched) {
    try {
      const ccUrl = 'https://api.coincap.io/v2/assets?ids=bitcoin,ethereum,solana,binance-coin';
      const res = await fetch(ccUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`CoinCap ${res.status}`);
      const data = await res.json();
      
      const capMap = { BTC: 'BTC/USDT', ETH: 'ETH/USDT', SOL: 'SOL/USDT', BNB: 'BNB/USDT' };
      for (const asset of (data.data || [])) {
        const pair = capMap[asset.symbol];
        if (pair) {
          _priceCache.set(pair, {
            price: parseFloat(asset.priceUsd),
            change_1h: 0,
            change_24h: parseFloat(asset.changePercent24Hr) || 0,
            timestamp: now,
          });
        }
      }
      fetched = true;
      _lastBatchFetch = now;
      console.log(`  ✅ Prices from CoinCap fallback`);
    } catch (err3) {
      console.warn(`⚠️ CoinCap fallback error: ${err3.message}`);
    }
  }

  if (!fetched && _priceCache.size > 0) {
    console.warn(`⚠️ All price sources failed, using stale cache`);
  }

  return _priceCache;
}

/**
 * Get current price for a trading pair
 * @param {string} pair - e.g. "BNB/USDT"
 * @returns {Promise<{ price: number, change_1h: number, change_24h: number } | null>}
 */
async function getPrice(pair) {
  const normalized = pair.toUpperCase().replace('-', '/');
  
  if (!PAIR_TO_COINGECKO[normalized]) {
    console.warn(`⚠️ Unsupported pair: ${pair}`);
    return null;
  }

  // Check cache first
  const cached = _priceCache.get(normalized);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached;
  }

  // Fetch all prices (batched)
  await fetchAllPrices();
  return _priceCache.get(normalized) || null;
}

/**
 * Get price history for a pair using CoinGecko market_chart
 * @param {string} pair - e.g. "BNB/USDT"
 * @param {number} hours - How many hours of history (max 720 = 30 days for free API)
 * @returns {Promise<Array<{ timestamp: number, price: number }>>}
 */
async function getPriceHistory(pair, hours = 24) {
  const normalized = pair.toUpperCase().replace('-', '/');
  const geckoId = PAIR_TO_COINGECKO[normalized];
  
  if (!geckoId) {
    console.warn(`⚠️ Unsupported pair for history: ${pair}`);
    return [];
  }

  const days = Math.ceil(hours / 24);
  const url = `${COINGECKO_BASE}/coins/${geckoId}/market_chart?vs_currency=usd&days=${days}`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`⚠️ CoinGecko history error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    return (data.prices || [])
      .filter(([ts]) => ts >= cutoff)
      .map(([timestamp, price]) => ({ timestamp, price }));
  } catch (err) {
    console.warn(`⚠️ Price history error: ${err.message}`);
    return [];
  }
}

/**
 * Get all supported pairs
 * @returns {string[]}
 */
function getSupportedPairs() {
  return Object.keys(PAIR_TO_COINGECKO);
}

/**
 * Get all current prices (cached)
 * @returns {Promise<Object<string, number>>}
 */
async function getAllPrices() {
  await fetchAllPrices();
  const result = {};
  for (const [pair, data] of _priceCache) {
    result[pair] = data.price;
  }
  return result;
}

// ─── Export ──────────────────────────────────────────────────────────────────

module.exports = {
  getPrice,
  getPriceHistory,
  getAllPrices,
  fetchAllPrices,
  getSupportedPairs,
  PAIR_TO_COINGECKO,
};
