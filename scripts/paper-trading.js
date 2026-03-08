#!/usr/bin/env node
/**
 * GemBots NFA Paper Trading Engine
 * 
 * Simulates real trading for each NFA bot using real market prices.
 * Each bot gets a virtual 0.1 BNB balance and trades based on its strategy type.
 * 
 * Run: node scripts/paper-trading.js
 * PM2: pm2 start scripts/paper-trading.js --name paper-trading
 */

const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && !key.startsWith('#')) process.env[key.trim()] = vals.join('=').trim();
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_KEY; // Using service key for backend operations

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase URL or Service Key. Check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TRADE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const INITIAL_PAPER_BALANCE_USD = 10000; // Starting balance in USD for paper trading
const MAX_POSITION_SIZE_PCT = 0.3; // 30% of balance per trade
const PRICE_HISTORY_LENGTH = 50; // keep last 50 price points for indicators

// ══════════════════════════════════════════════
// Price fetching
// ══════════════════════════════════════════════

const TOKENS = ['bitcoin', 'ethereum', 'solana', 'binancecoin'];
const TOKEN_SYMBOLS = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', binancecoin: 'BNB' };

// In-memory price history for indicators
const priceHistory = {};
TOKENS.forEach(t => { priceHistory[t] = []; });

let lastPriceSource = 'none';

async function fetchFromCoinGecko() {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${TOKENS.join(',')}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  
  const prices = {};
  for (const [id, info] of Object.entries(data)) {
    prices[TOKEN_SYMBOLS[id]] = {
      price: info.usd,
      change24h: info.usd_24h_change || 0
    };
  }
  lastPriceSource = 'coingecko';
  return prices;
}

async function fetchFromCryptoCompare() {
  const res = await fetch('https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL,BNB&tsyms=USD');
  if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
  const data = await res.json();
  
  const prices = {};
  for (const sym of ['BTC', 'ETH', 'SOL', 'BNB']) {
    if (data[sym]?.USD) {
      prices[sym] = { price: data[sym].USD, change24h: 0 };
    }
  }
  lastPriceSource = 'cryptocompare';
  return prices;
}

async function fetchFromCoinCap() {
  const ids = 'bitcoin,ethereum,solana,binance-coin';
  const res = await fetch(`https://api.coincap.io/v2/assets?ids=${ids}`);
  if (!res.ok) throw new Error(`CoinCap ${res.status}`);
  const data = await res.json();
  
  const capSymbols = { BTC: 'BTC', ETH: 'ETH', SOL: 'SOL', BNB: 'BNB' };
  const prices = {};
  for (const asset of (data.data || [])) {
    const sym = asset.symbol;
    if (capSymbols[sym]) {
      prices[sym] = {
        price: parseFloat(asset.priceUsd),
        change24h: parseFloat(asset.changePercent24Hr) || 0
      };
    }
  }
  lastPriceSource = 'coincap';
  return prices;
}

async function fetchPrices() {
  const sources = [fetchFromCoinGecko, fetchFromCryptoCompare, fetchFromCoinCap];
  
  for (const sourceFn of sources) {
    try {
      const prices = await sourceFn();
      if (prices && Object.keys(prices).length >= 3) {
        // Store history
        for (const [sym, info] of Object.entries(prices)) {
          const tokenId = Object.entries(TOKEN_SYMBOLS).find(([k, v]) => v === sym)?.[0];
          if (tokenId && priceHistory[tokenId]) {
            priceHistory[tokenId].push({ price: info.price, time: Date.now() });
            if (priceHistory[tokenId].length > PRICE_HISTORY_LENGTH) {
              priceHistory[tokenId].shift();
            }
          }
        }
        return prices;
      }
    } catch (err) {
      console.error(`⚠️ ${sourceFn.name} error: ${err.message}`);
    }
  }
  
  console.error('[price] All price sources failed');
  return null;
}

// ══════════════════════════════════════════════
// Technical indicators (simple rule-based)
// ══════════════════════════════════════════════

function calcRSI(tokenId, period = 14) {
  const hist = priceHistory[tokenId];
  if (hist.length < period + 1) return 50; // neutral if not enough data
  
  let gains = 0, losses = 0;
  for (let i = hist.length - period; i < hist.length; i++) {
    const diff = hist[i].price - hist[i - 1].price;
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calcMomentum(tokenId, period = 10) {
  const hist = priceHistory[tokenId];
  if (hist.length < period) return 0;
  const current = hist[hist.length - 1].price;
  const past = hist[hist.length - period].price;
  return ((current - past) / past) * 100;
}

function calcSMA(tokenId, period = 20) {
  const hist = priceHistory[tokenId];
  if (hist.length < period) return hist.length > 0 ? hist[hist.length - 1].price : 0;
  const slice = hist.slice(-period);
  return slice.reduce((s, p) => s + p.price, 0) / period;
}

// ══════════════════════════════════════════════
// Strategy decisions
// ══════════════════════════════════════════════

function decideScalper(tokenId, currentPrice, change24h) {
  const hist = priceHistory[tokenId];
  // Early cycles: use 24h change as signal
  if (hist.length < 5) {
    if (change24h < -2) return { action: 'buy', confidence: 0.65 };
    if (change24h > 2) return { action: 'sell', confidence: 0.65 };
    // Random entry to build positions early
    return Math.random() > 0.5 ? { action: 'buy', confidence: 0.62 } : { action: 'hold', confidence: 0.5 };
  }
  const rsi = calcRSI(tokenId, 7);
  const momentum = calcMomentum(tokenId, 5);
  
  if (rsi < 30 && momentum > -2) return { action: 'buy', confidence: 0.7 + (30 - rsi) / 100 };
  if (rsi > 70 && momentum < 2) return { action: 'sell', confidence: 0.7 + (rsi - 70) / 100 };
  if (Math.abs(momentum) > 3) return { action: momentum > 0 ? 'buy' : 'sell', confidence: 0.6 };
  return { action: 'hold', confidence: 0.5 };
}

function decideMomentum(tokenId, currentPrice, change24h) {
  const hist = priceHistory[tokenId];
  if (hist.length < 5) {
    if (change24h > 1) return { action: 'buy', confidence: 0.63 };
    if (change24h < -3) return { action: 'buy', confidence: 0.61 }; // momentum buys dips too
    return Math.random() > 0.6 ? { action: 'buy', confidence: 0.61 } : { action: 'hold', confidence: 0.5 };
  }
  const momentum = calcMomentum(tokenId, 10);
  const sma = calcSMA(tokenId, 20);
  
  if (currentPrice > sma && momentum > 2) return { action: 'buy', confidence: 0.65 + momentum / 50 };
  if (currentPrice < sma && momentum < -2) return { action: 'sell', confidence: 0.65 + Math.abs(momentum) / 50 };
  if (change24h > 5) return { action: 'buy', confidence: 0.6 };
  if (change24h < -5) return { action: 'sell', confidence: 0.6 };
  return { action: 'hold', confidence: 0.5 };
}

function decideSwing(tokenId, currentPrice, change24h) {
  const hist = priceHistory[tokenId];
  if (hist.length < 5) {
    if (change24h < -2) return { action: 'buy', confidence: 0.7 }; // swing buys dips
    return Math.random() > 0.7 ? { action: 'buy', confidence: 0.62 } : { action: 'hold', confidence: 0.5 };
  }
  const rsi = calcRSI(tokenId, 14);
  const sma = calcSMA(tokenId, 20);
  
  // Buy dips
  if (rsi < 35 && currentPrice < sma * 0.98) return { action: 'buy', confidence: 0.75 };
  // Sell rallies
  if (rsi > 65 && currentPrice > sma * 1.02) return { action: 'sell', confidence: 0.75 };
  if (change24h < -8) return { action: 'buy', confidence: 0.7 }; // deep dip buy
  if (change24h > 8) return { action: 'sell', confidence: 0.7 }; // big rally sell
  return { action: 'hold', confidence: 0.5 };
}

function decideContrarian(tokenId, currentPrice, change24h) {
  const hist = priceHistory[tokenId];
  if (hist.length < 5) {
    // Contrarian goes against the trend
    if (change24h > 3) return { action: 'sell', confidence: 0.65 };
    if (change24h < -3) return { action: 'buy', confidence: 0.68 };
    return Math.random() > 0.6 ? { action: 'buy', confidence: 0.61 } : { action: 'hold', confidence: 0.5 };
  }
  const rsi = calcRSI(tokenId, 14);
  const momentum = calcMomentum(tokenId, 10);
  
  // Go against the crowd
  if (rsi > 75 || momentum > 5) return { action: 'sell', confidence: 0.7 };
  if (rsi < 25 || momentum < -5) return { action: 'buy', confidence: 0.7 };
  if (change24h > 6) return { action: 'sell', confidence: 0.65 };
  if (change24h < -6) return { action: 'buy', confidence: 0.65 };
  return { action: 'hold', confidence: 0.5 };
}

const STRATEGIES = {
  scalper: decideScalper,
  momentum: decideMomentum,
  swing: decideSwing,
  contrarian: decideContrarian
};

// ══════════════════════════════════════════════
// Supabase operations
// ══════════════════════════════════════════════

async function getPaperBots() {
  const { data, error } = await supabase
    .from('bots')
    .select('id, nfa_id, name, trading_config')
    .eq('trading_mode', 'paper');

  if (error) {
    console.error('Error fetching paper bots:', error);
    return [];
  }

  return data.map(bot => {
    let strategy = 'momentum'; // Default strategy
    if (bot.trading_config && bot.trading_config.strategy) {
      strategy = bot.trading_config.strategy;
    } else {
      // Fallback based on nfa_id
      const nfaId = bot.nfa_id;
      switch (nfaId % 4) {
        case 0: strategy = 'scalper'; break;
        case 1: strategy = 'momentum'; break;
        case 2: strategy = 'swing'; break;
        case 3: strategy = 'contrarian'; break;
      }
    }
    return { ...bot, strategy };
  });
}

async function getOrCreateTradingStats(bot_id, nfa_id) {
  const { data, error } = await supabase
    .from('nfa_trading_stats')
    .select('*')
    .eq('bot_id', bot_id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means 'no rows found'
    console.error(`Error fetching trading stats for bot ${bot_id}:`, error);
    return null;
  }

  if (data) {
    return data;
  } else {
    // Create new stats entry
    const { data: newStats, error: createError } = await supabase
      .from('nfa_trading_stats')
      .insert({
        bot_id,
        nfa_id,
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0,
        total_pnl_usd: 0,
        avg_pnl_pct: 0,
        best_trade_pnl: 0,
        worst_trade_pnl: 0,
        paper_balance_usd: INITIAL_PAPER_BALANCE_USD,
        current_streak: 0,
        best_streak: 0
      })
      .select()
      .single();

    if (createError) {
      console.error(`Error creating trading stats for bot ${bot_id}:`, createError);
      return null;
    }
    return newStats;
  }
}

async function getOpenPositions(bot_id) {
  const { data, error } = await supabase
    .from('nfa_trades')
    .select('*')
    .eq('bot_id', bot_id)
    .eq('status', 'open')
    .eq('mode', 'paper');

  if (error) {
    console.error(`Error fetching open positions for bot ${bot_id}:`, error);
    return [];
  }
  return data;
}

// ══════════════════════════════════════════════
// Trading logic
// ══════════════════════════════════════════════

async function executeTrade(bot, prices) {
  const { id: bot_id, nfa_id, name: bot_name, strategy } = bot;
  const decideFn = STRATEGIES[strategy] || STRATEGIES.momentum;
  
  let tradingStats = await getOrCreateTradingStats(bot_id, nfa_id);
  if (!tradingStats) return;

  const openPositions = await getOpenPositions(bot_id);
  
  const tradeableTokens = ['BTC', 'ETH', 'SOL'];
  const tokenSymbol = tradeableTokens[Math.floor(Math.random() * tradeableTokens.length)];
  const tokenId = Object.entries(TOKEN_SYMBOLS).find(([k, v]) => v === tokenSymbol)?.[0];
  
  if (!prices[tokenSymbol] || !tokenId) return;
  
  const currentPrice = prices[tokenSymbol].price;
  const change24h = prices[tokenSymbol].change24h;
  const bnbPrice = prices['BNB']?.price || 600; // Fallback BNB price
  
  const decision = decideFn(tokenId, currentPrice, change24h);
  
  const existingPosition = openPositions.find(p => p.pair.split('/')[0] === tokenSymbol); // Assuming pair is like 'BTC/USD'
  
  if (decision.action === 'buy' && !existingPosition && decision.confidence > 0.6) {
    const tradeSizeUsd = tradingStats.paper_balance_usd * MAX_POSITION_SIZE_PCT * decision.confidence;
    
    if (tradeSizeUsd > tradingStats.paper_balance_usd * 0.05) { // min 5% of balance
      const quantity = tradeSizeUsd / currentPrice;
      
      const { data, error } = await supabase
        .from('nfa_trades')
        .insert({
          nfa_id,
          bot_id,
          pair: `${tokenSymbol}/USD`,
          side: 'buy',
          entry_price: currentPrice,
          size_usd: tradeSizeUsd,
          pnl_usd: 0,
          pnl_pct: 0,
          mode: 'paper',
          status: 'open',
          confidence: decision.confidence,
          strategy_name: strategy,
          open_at: new Date().toISOString()
        });

      if (error) {
        console.error(`Error inserting buy trade for bot ${bot_name}:`, error);
        return;
      }
      
      // Update paper balance
      await supabase
        .from('nfa_trading_stats')
        .update({ paper_balance_usd: tradingStats.paper_balance_usd - tradeSizeUsd })
        .eq('bot_id', bot_id);
      
      console.log(`[trade] ${bot_name} BUY ${quantity.toFixed(6)} ${tokenSymbol} @ $${currentPrice.toFixed(2)} (conf: ${(decision.confidence * 100).toFixed(0)}%, strategy: ${strategy})`);
    }
  }
  else if (decision.action === 'sell' && existingPosition) {
    const pnlUsd = (currentPrice - existingPosition.entry_price) * (existingPosition.size_usd / existingPosition.entry_price);
    const pnlPct = (pnlUsd / existingPosition.size_usd) * 100;
    const isWin = pnlUsd > 0;
    
    // Update trade
    const { error: updateTradeError } = await supabase
      .from('nfa_trades')
      .update({
        status: 'closed',
        exit_price: currentPrice,
        pnl_usd: pnlUsd,
        pnl_pct: pnlPct,
        close_at: new Date().toISOString()
      })
      .eq('id', existingPosition.id);

    if (updateTradeError) {
      console.error(`Error updating sell trade for bot ${bot_name}:`, updateTradeError);
      return;
    }

    // Update trading stats
    const updatedBalance = tradingStats.paper_balance_usd + existingPosition.size_usd + pnlUsd;
    const totalTrades = tradingStats.total_trades + 1;
    const winningTrades = tradingStats.winning_trades + (isWin ? 1 : 0);
    const losingTrades = tradingStats.losing_trades + (isWin ? 0 : 1);
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalPnlUsd = tradingStats.total_pnl_usd + pnlUsd;
    const avgPnlPct = totalTrades > 0 ? (totalPnlUsd / (totalTrades * INITIAL_PAPER_BALANCE_USD)) * 100 : 0; // simplified avg pnl pct
    
    // streaks calculation
    let currentStreak = tradingStats.current_streak;
    let bestStreak = tradingStats.best_streak;
    if (isWin) {
      currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
    } else {
      currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
    }
    if (currentStreak > bestStreak) bestStreak = currentStreak;
    if (currentStreak < 0 && Math.abs(currentStreak) > bestStreak) bestStreak = Math.abs(currentStreak); // track losing streak as well for bestStreak

    await supabase
      .from('nfa_trading_stats')
      .update({
        paper_balance_usd: updatedBalance,
        total_trades: totalTrades,
        winning_trades: winningTrades,
        losing_trades: losingTrades,
        win_rate: winRate,
        total_pnl_usd: totalPnlUsd,
        avg_pnl_pct: avgPnlPct,
        // TODO: best_trade_pnl, worst_trade_pnl (requires fetching all trades)
        current_streak: currentStreak,
        best_streak: bestStreak,
      })
      .eq('bot_id', bot_id);
    
    console.log(`[trade] ${bot_name} SELL ${existingPosition.size_usd / existingPosition.entry_price.toFixed(6)} ${tokenSymbol} @ $${currentPrice.toFixed(2)} → PnL: ${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(2)}%`);
  }
  
  // Update current prices for open positions
  for (const pos of openPositions) {
    if (prices[pos.pair.split('/')[0]]) {
      await supabase
        .from('nfa_trades')
        .update({ current_price: prices[pos.pair.split('/')[0]].price })
        .eq('id', pos.id);
    }
  }
  
  // Auto-close positions with stop-loss/take-profit
  const stopLossPct = strategy === 'scalper' ? -3 : -5;
  const takeProfitPct = strategy === 'scalper' ? 5 : 10;
  
  for (const pos of openPositions) {
    if (!prices[pos.pair.split('/')[0]]) continue;
    const curPrice = prices[pos.pair.split('/')[0]].price;
    const pnlPct = ((curPrice - pos.entry_price) / pos.entry_price) * 100;
    
    if (pnlPct <= stopLossPct || pnlPct >= takeProfitPct) {
      const pnlUsd = (curPrice - pos.entry_price) * (pos.size_usd / pos.entry_price);
      const isWin = pnlUsd > 0;
      const closeReason = pnlUsd > 0 ? 'TP' : 'SL';

      // Update trade
      const { error: autoCloseTradeError } = await supabase
        .from('nfa_trades')
        .update({
          status: 'closed',
          exit_price: curPrice,
          pnl_usd: pnlUsd,
          pnl_pct: pnlPct,
          close_reason: closeReason,
          close_at: new Date().toISOString()
        })
        .eq('id', pos.id);

      if (autoCloseTradeError) {
        console.error(`Error auto-closing trade for bot ${bot_name}:`, autoCloseTradeError);
        continue;
      }
      
      // Update trading stats
      const updatedBalance = tradingStats.paper_balance_usd + pos.size_usd + pnlUsd;
      const totalTrades = tradingStats.total_trades + 1;
      const winningTrades = tradingStats.winning_trades + (isWin ? 1 : 0);
      const losingTrades = tradingStats.losing_trades + (isWin ? 0 : 1);
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      const totalPnlUsd = tradingStats.total_pnl_usd + pnlUsd;
      const avgPnlPct = totalTrades > 0 ? (totalPnlUsd / (totalTrades * INITIAL_PAPER_BALANCE_USD)) * 100 : 0; // simplified avg pnl pct

      // streaks calculation
      let currentStreak = tradingStats.current_streak;
      let bestStreak = tradingStats.best_streak;
      if (isWin) {
        currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
      } else {
        currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
      }
      if (currentStreak > bestStreak) bestStreak = currentStreak;
      if (currentStreak < 0 && Math.abs(currentStreak) > bestStreak) bestStreak = Math.abs(currentStreak); // track losing streak as well for bestStreak

      await supabase
        .from('nfa_trading_stats')
        .update({
          paper_balance_usd: updatedBalance,
          total_trades: totalTrades,
          winning_trades: winningTrades,
          losing_trades: losingTrades,
          win_rate: winRate,
          total_pnl_usd: totalPnlUsd,
          avg_pnl_pct: avgPnlPct,
          // TODO: best_trade_pnl, worst_trade_pnl
          current_streak: currentStreak,
          best_streak: bestStreak,
        })
        .eq('bot_id', bot_id);
      
      console.log(`[auto] ${bot_name} AUTO-CLOSE ${pos.pair.split('/')[0]} @ $${curPrice.toFixed(2)} → PnL: ${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(2)}% (${closeReason})`);
    }
  }
  await updateTournamentEntries(bot_id, tradingStats);
}

async function updateTournamentEntries(bot_id, tradingStats) {
  // Find active tournament
  const { data: activeTournaments, error: tournamentError } = await supabase
    .from('trading_tournaments')
    .select('id')
    .eq('status', 'active');

  if (tournamentError) {
    console.error('Error fetching active tournaments:', tournamentError);
    return;
  }
  if (!activeTournaments || activeTournaments.length === 0) {
    // console.log('No active tournaments to update.');
    return;
  }

  const tournament_id = activeTournaments[0].id; // Assuming only one active tournament

  const { total_pnl_usd, total_trades, win_rate, paper_balance_usd } = tradingStats;

  // Upsert the entry for the bot
  const { error: upsertError } = await supabase
    .from('trading_tournament_entries')
    .upsert({
      tournament_id,
      bot_id,
      tournament_pnl_usd: total_pnl_usd,
      current_pnl_usd: total_pnl_usd, // Assuming current PnL is total PnL for paper trading
      trades_count: total_trades,
      win_rate: win_rate,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'tournament_id,bot_id'
    });

  if (upsertError) {
    console.error(`Error upserting tournament entry for bot ${bot_id}:`, upsertError);
    return;
  }

  // Recalculate ranks (simplified, could be done with a DB function or view)
  // This is a basic approach and might not be efficient for many entries.
  const { data: allEntries, error: fetchEntriesError } = await supabase
    .from('trading_tournament_entries')
    .select('id, tournament_pnl_usd')
    .eq('tournament_id', tournament_id)
    .order('tournament_pnl_usd', { ascending: false });

  if (fetchEntriesError) {
    console.error('Error fetching tournament entries for rank update:', fetchEntriesError);
    return;
  }

  const updates = allEntries.map((entry, index) => ({
    id: entry.id,
    rank: index + 1
  }));

  // Batch update ranks (Supabase supports this)
  const { error: rankUpdateError } = await supabase
    .from('trading_tournament_entries')
    .upsert(updates, { onConflict: 'id' });

  if (rankUpdateError) {
    console.error('Error updating tournament ranks:', rankUpdateError);
  }
}

// ══════════════════════════════════════════════
// Main loop
// ══════════════════════════════════════════════

async function runCycle(bots) {
  const prices = await fetchPrices();
  if (!prices) {
    console.log('[cycle] Skipping — no prices');
    return;
  }
  
  console.log(`\n[cycle] ${new Date().toISOString()} | Last Price Source: ${lastPriceSource} | BTC: $${prices.BTC?.price} | ETH: $${prices.ETH?.price} | SOL: $${prices.SOL?.price} | BNB: $${prices.BNB?.price}`);
  
  for (const bot of bots) {
    if (Math.random() > 0.6) continue; // ~60% chance to act each cycle
    
    try {
      await executeTrade(bot, prices);
    } catch (err) {
      console.error(`[error] ${bot.name}: ${err.message}`);
    }
  }
  
  // Print portfolio summary every 6th cycle (30 min)
  if (Date.now() % (6 * TRADE_INTERVAL_MS) < TRADE_INTERVAL_MS) {
    await printSummary();
  }
}

async function printSummary() {
  const { data: portfolios, error } = await supabase
    .from('nfa_trading_stats')
    .select('*, bots(name, trading_config, nfa_id)')
    .order('total_pnl_usd', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching portfolio summary:', error);
    return;
  }
  
  if (portfolios.length === 0) return;
  
  console.log('\n═══ PAPER TRADING LEADERBOARD ═══');
  for (const p of portfolios) {
    const bot_name = p.bots?.name || 'Unknown Bot';
    let strategy = 'momentum'; // Default
    if (p.bots?.trading_config?.strategy) {
      strategy = p.bots.trading_config.strategy;
    } else {
      const nfaId = p.bots?.nfa_id;
      switch (nfaId % 4) {
        case 0: strategy = 'scalper'; break;
        case 1: strategy = 'momentum'; break;
        case 2: strategy = 'swing'; break;
        case 3: strategy = 'contrarian'; break;
      }
    }
    const wr = p.total_trades > 0 ? ((p.winning_trades / p.total_trades) * 100).toFixed(0) : '0';
    const pnl = p.total_pnl_usd >= 0 ? `+$${p.total_pnl_usd.toFixed(2)}` : `-$${Math.abs(p.total_pnl_usd).toFixed(2)}`;
    
    const { count: open_positions_count, error: countError } = await supabase
        .from('nfa_trades')
        .select('*', { count: 'exact', head: true })
        .eq('bot_id', p.bot_id)
        .eq('status', 'open')
        .eq('mode', 'paper');

    if (countError) {
        console.error(`Error counting open positions for bot ${bot_name}:`, countError);
        continue;
    }

    console.log(`  ${bot_name} (${strategy}) | Balance: $${p.paper_balance_usd.toFixed(2)} | PnL: ${pnl} | Trades: ${p.total_trades} (${wr}% WR) | Open: ${open_positions_count}`);
  }
  console.log('═════════════════════════════════\n');
}

async function main() {
  console.log('🤖 GemBots Paper Trading Engine starting...');
  
  const bots = await getPaperBots();
  if (bots.length === 0) {
    console.error('No paper trading bots found. Exiting.');
    process.exit(1);
  }

  console.log(`[init] ${bots.length} paper bots loaded`);
  console.log(`[init] Trading interval: ${TRADE_INTERVAL_MS / 1000}s`);
  console.log(`[init] Tokens: ${TOKENS.map(t => TOKEN_SYMBOLS[t]).join(', ')}`);
  
  // Run first cycle immediately
  await runCycle(bots);
  
  // Then every 5 minutes
  setInterval(() => runCycle(bots), TRADE_INTERVAL_MS);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
