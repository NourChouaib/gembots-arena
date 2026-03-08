#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');

// Path to database
const dbPath = path.join(process.cwd(), 'data', 'gembots.db');
const db = new Database(dbPath);

console.log('🔄 Starting wallet address migration...');

try {
  // Check if wallet_address column exists
  const columns = db.prepare("PRAGMA table_info(api_bots)").all();
  const hasWalletAddress = columns.some(col => col.name === 'wallet_address');

  if (hasWalletAddress) {
    console.log('✅ wallet_address column already exists, skipping migration');
    process.exit(0);
  }

  // Add wallet_address column if it doesn't exist
  console.log('📝 Adding wallet_address column to api_bots table...');
  db.exec('ALTER TABLE api_bots ADD COLUMN wallet_address TEXT');
  
  // Create unique index on wallet_address 
  console.log('📝 Creating unique index on wallet_address...');
  db.exec('CREATE UNIQUE INDEX idx_api_bots_wallet_address ON api_bots(wallet_address)');

  console.log('✅ Migration completed successfully!');
  
  // Show current table structure
  console.log('\n📊 Updated table structure:');
  const newColumns = db.prepare("PRAGMA table_info(api_bots)").all();
  newColumns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}`);
  });

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}