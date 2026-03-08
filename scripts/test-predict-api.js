const { default: fetch } = require('node-fetch');

const API_BASE = 'http://localhost:3006';

async function testPredictAPI() {
  console.log('🧪 Testing GemBots Prediction API\n');

  // First, we need to get or create a test bot
  // Let's check if we can get bots from the database
  const Database = require('better-sqlite3');
  const path = require('path');
  const db = new Database(path.join(__dirname, '..', 'data', 'gembots.db'));

  // Get a test bot API key
  let bot = db.prepare('SELECT * FROM api_bots LIMIT 1').get();
  
  if (!bot) {
    console.log('❌ No API bots found in database.');
    console.log('Please register a bot first through the web interface.');
    return;
  }

  console.log(`✅ Using bot: ${bot.name} (ID: ${bot.id})`);
  console.log(`🔑 API Key: ${bot.api_key}\n`);

  // Test 1: Valid prediction
  console.log('Test 1: Creating a valid prediction');
  try {
    const response = await fetch(`${API_BASE}/api/v1/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': bot.api_key
      },
      body: JSON.stringify({
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC (should have stable price)
        confidence: 75
      })
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Prediction created successfully!\n');
    } else {
      console.log('❌ Prediction failed:', result.error, '\n');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message, '\n');
  }

  // Test 2: Get predictions
  console.log('Test 2: Fetching bot predictions');
  try {
    const response = await fetch(`${API_BASE}/api/v1/predict?limit=5`, {
      method: 'GET',
      headers: {
        'X-API-Key': bot.api_key
      }
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ Found ${result.data.predictions.length} predictions\n`);
    } else {
      console.log('❌ Failed to fetch predictions:', result.error, '\n');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message, '\n');
  }

  // Test 3: Invalid API key
  console.log('Test 3: Testing invalid API key');
  try {
    const response = await fetch(`${API_BASE}/api/v1/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'invalid_key'
      },
      body: JSON.stringify({
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        confidence: 50
      })
    });

    const result = await response.json();
    if (!result.success && result.error.includes('Invalid API key')) {
      console.log('✅ Correctly rejected invalid API key\n');
    } else {
      console.log('❌ Should have rejected invalid API key\n');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message, '\n');
  }

  // Test 4: Invalid confidence
  console.log('Test 4: Testing invalid confidence value');
  try {
    const response = await fetch(`${API_BASE}/api/v1/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': bot.api_key
      },
      body: JSON.stringify({
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        confidence: 150 // Invalid: over 100
      })
    });

    const result = await response.json();
    if (!result.success && result.error.includes('confidence must be')) {
      console.log('✅ Correctly rejected invalid confidence\n');
    } else {
      console.log('❌ Should have rejected invalid confidence\n');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message, '\n');
  }

  console.log('🏁 Test complete!');
  
  // Show current predictions in database
  const predictions = db.prepare('SELECT * FROM predictions_v2 ORDER BY predicted_at DESC LIMIT 3').all();
  if (predictions.length > 0) {
    console.log('\n📊 Recent predictions in database:');
    predictions.forEach(p => {
      console.log(`- ${p.id}: ${p.mint} (${p.confidence}% confidence) - ${p.status}`);
    });
  }
  
  db.close();
}

// Run the test
testPredictAPI().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});