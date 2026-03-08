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

async function fetchTokenPrice(mint) {
  // Try DexScreener with retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'GemBots/1.0' }
      });
      const text = await response.text();
      if (text.startsWith('<')) throw new Error('Got HTML (Cloudflare block)');
      if (!response.ok) throw new Error(`DexScreener API error: ${response.status}`);
      
      const data = JSON.parse(text);
      if (!data.pairs || data.pairs.length === 0) {
        console.warn(`No pairs found for token: ${mint}`);
        break; // no pairs = token issue, don't retry
      }
      
      const sortedPairs = data.pairs.sort((a, b) => 
        parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0)
      );
      const bestPair = sortedPairs[0];
      const price = parseFloat(bestPair.priceUsd);
      
      if (isNaN(price) || price <= 0) {
        console.warn(`Invalid price for token ${mint}: ${price}`);
        return null;
      }
      
      console.log(`Price for ${mint}: $${price} (DexScreener)`);
      return price;
    } catch (error) {
      console.warn(`DexScreener attempt ${attempt + 1} for ${mint}:`, error.message);
      if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  // Fallback: Jupiter Price API
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