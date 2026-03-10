const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'gembots.db'));

// Ensure we can track max prices (handle column existence gracefully)
try {
  db.exec(`ALTER TABLE predictions_v2 ADD COLUMN max_price_24h REAL;`);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE predictions_v2 ADD COLUMN x_multiplier REAL;`);
} catch (e) {
  // Column already exists
}

// Bybit symbol mappings
const BYBIT_BY_ADDRESS = {
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
const BYBIT_BY_SYMBOL = {
  'BTC': 'BTCUSDT', 'ETH': 'ETHUSDT', 'SOL': 'SOLUSDT',
  'BNB': 'BNBUSDT', 'WIF': 'WIFUSDT', 'CAKE': 'CAKEUSDT',
  'LINK': 'LINKUSDT', 'PEPE': 'PEPEUSDT', 'DOGE': 'DOGEUSDT',
  'XRP': 'XRPUSDT', 'ADA': 'ADAUSDT', 'AVAX': 'AVAXUSDT',
  'DOT': 'DOTUSDT',
};

async function fetchTokenPrice(mint, tokenSymbol) {
  // 1) Try Bybit API first (fast, no Cloudflare issues)
  const bybitSymbol = BYBIT_BY_ADDRESS[mint] || (tokenSymbol && BYBIT_BY_SYMBOL[tokenSymbol.toUpperCase()]);
  if (bybitSymbol) {
    try {
      const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${bybitSymbol}`);
      const data = await res.json();
      if (data?.result?.list?.[0]) {
        const price = parseFloat(data.result.list[0].lastPrice);
        if (!isNaN(price) && price > 0) {
          console.log(`Price for ${mint}: $${price} (Bybit ${bybitSymbol})`);
          return price;
        }
      }
    } catch (e) {
      console.warn(`Bybit failed for ${bybitSymbol}:`, e.message);
    }
  }

  // 2) Fallback: Jupiter Price API
  try {
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${mint}`);
    const data = await res.json();
    if (data.data && data.data[mint]) {
      const price = parseFloat(data.data[mint].price);
      if (!isNaN(price) && price > 0) {
        console.log(`Price for ${mint}: $${price} (Jupiter fallback)`);
        return price;
      }
    }
  } catch (e) {
    console.warn(`Jupiter fallback failed for ${mint}:`, e.message);
  }
  
  console.error(`All price sources failed for ${mint}`);
  return null;
}

async function updateTokenPrice(mint, price) {
  try {
    // Save to token_prices table
    const stmt = db.prepare(`
      INSERT INTO token_prices (token_mint, price) VALUES (?, ?)
    `);
    stmt.run(mint, price);
    console.log(`Saved price for ${mint}: $${price}`);
  } catch (error) {
    console.error(`Error saving price for ${mint}:`, error.message);
  }
}

async function updatePredictionMaxPrice(predictionId, price) {
  try {
    // Get current max price
    const current = db.prepare(`
      SELECT max_price_24h FROM predictions_v2 WHERE id = ?
    `).get(predictionId);
    
    const currentMax = current?.max_price_24h || 0;
    const newMax = Math.max(currentMax, price);
    
    if (newMax > currentMax) {
      const stmt = db.prepare(`
        UPDATE predictions_v2 
        SET max_price_24h = ? 
        WHERE id = ?
      `);
      stmt.run(newMax, predictionId);
      console.log(`Updated max price for prediction ${predictionId}: $${newMax}`);
    }
  } catch (error) {
    console.error(`Error updating max price for ${predictionId}:`, error.message);
  }
}

async function resolvePrediction(prediction) {
  try {
    const { id, price_at_prediction, max_price_24h } = prediction;
    
    if (!max_price_24h || max_price_24h <= 0) {
      console.warn(`Invalid max price for prediction ${id}: ${max_price_24h}`);
      return;
    }
    
    // Calculate X multiplier
    const xMultiplier = max_price_24h / price_at_prediction;
    const isCorrect = xMultiplier >= 2.0;
    
    console.log(`Resolving prediction ${id}:`);
    console.log(`  Entry price: $${price_at_prediction}`);
    console.log(`  Max price: $${max_price_24h}`);
    console.log(`  X multiplier: ${xMultiplier.toFixed(2)}x`);
    console.log(`  Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
    
    // Update prediction
    const stmt = db.prepare(`
      UPDATE predictions_v2 
      SET x_multiplier = ?, status = 'resolved'
      WHERE id = ?
    `);
    stmt.run(xMultiplier, id);
    
    // Update bot reputation (if correct prediction)
    if (isCorrect) {
      const updateBotStmt = db.prepare(`
        UPDATE api_bots 
        SET wins = wins + 1, total_bets = total_bets + 1
        WHERE id = (SELECT bot_id FROM predictions_v2 WHERE id = ?)
      `);
      updateBotStmt.run(id);
      console.log(`Updated bot stats for correct prediction`);
    } else {
      const updateBotStmt = db.prepare(`
        UPDATE api_bots 
        SET losses = losses + 1, total_bets = total_bets + 1
        WHERE id = (SELECT bot_id FROM predictions_v2 WHERE id = ?)
      `);
      updateBotStmt.run(id);
      console.log(`Updated bot stats for incorrect prediction`);
    }
    
  } catch (error) {
    console.error(`Error resolving prediction ${prediction.id}:`, error.message);
  }
}

async function processPendingPredictions() {
  try {
    console.log('\n=== Processing pending predictions ===');
    
    // Get all pending predictions
    const pendingPredictions = db.prepare(`
      SELECT * FROM predictions_v2 
      WHERE status = 'pending'
      ORDER BY predicted_at ASC
    `).all();
    
    console.log(`Found ${pendingPredictions.length} pending predictions`);
    
    const now = new Date();
    const processedTokens = new Set();
    
    for (const prediction of pendingPredictions) {
      const { id, mint, resolves_at } = prediction;
      const resolveTime = new Date(resolves_at);
      
      console.log(`\nProcessing prediction ${id}:`);
      console.log(`  Token: ${mint}`);
      console.log(`  Resolves at: ${resolves_at}`);
      
      // Check if prediction should be resolved (24 hours passed)
      if (now >= resolveTime) {
        console.log(`  → Time to resolve! (${Math.floor((now - resolveTime) / (1000 * 60))} minutes overdue)`);
        await resolvePrediction(prediction);
        continue;
      }
      
      // Update current price and max_price_24h for active predictions
      if (!processedTokens.has(mint)) {
        const currentPrice = await fetchTokenPrice(mint);
        
        if (currentPrice !== null) {
          await updateTokenPrice(mint, currentPrice);
          await updatePredictionMaxPrice(id, currentPrice);
          processedTokens.add(mint);
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        // Token already processed, just update max price from latest saved price
        const latestPrice = db.prepare(`
          SELECT price FROM token_prices 
          WHERE token_mint = ? 
          ORDER BY timestamp DESC 
          LIMIT 1
        `).get(mint);
        
        if (latestPrice) {
          await updatePredictionMaxPrice(id, latestPrice.price);
        }
      }
    }
    
    console.log('\n=== Processing complete ===\n');
    
  } catch (error) {
    console.error('Error in processPendingPredictions:', error.message);
  }
}

async function main() {
  console.log('🚀 GemBots Price Worker Started');
  console.log('Monitoring predictions every 5 minutes...\n');
  
  // Run immediately on start
  await processPendingPredictions();
  
  // Then run every 5 minutes
  setInterval(async () => {
    try {
      await processPendingPredictions();
    } catch (error) {
      console.error('Error in main loop:', error.message);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Price worker shutting down...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Price worker shutting down...');
  db.close();
  process.exit(0);
});

// Start the worker
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});