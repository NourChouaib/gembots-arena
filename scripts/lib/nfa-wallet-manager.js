/**
 * NFA Wallet Manager
 * 
 * Generates and manages EVM wallets for NFA bots in Trading League.
 * Private keys are encrypted with AES-256-GCM using NFA_WALLET_MASTER_KEY.
 * 
 * PAPER TRADING ONLY — no real transactions in Phase 1.
 */

const crypto = require('crypto');
const { ethers } = require('ethers');

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// ─── Supabase Helper ─────────────────────────────────────────────────────────

async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type');
  if (ct && ct.includes('json')) return res.json();
  return null;
}

// ─── Encryption ──────────────────────────────────────────────────────────────

function getMasterKey() {
  const key = process.env.NFA_WALLET_MASTER_KEY;
  if (!key || key.length !== 64) {
    throw new Error('NFA_WALLET_MASTER_KEY must be a 32-byte hex string (64 chars)');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a private key with AES-256-GCM
 * @param {string} privateKey - Raw private key hex string
 * @returns {string} Encrypted string in format: iv:authTag:ciphertext (all hex)
 */
function encryptPrivateKey(privateKey) {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, masterKey, iv);

  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted private key
 * @param {string} encryptedData - Encrypted string in format: iv:authTag:ciphertext
 * @returns {string} Decrypted private key hex string
 */
function decryptPrivateKey(encryptedData) {
  const masterKey = getMasterKey();
  const [ivHex, authTagHex, ciphertext] = encryptedData.split(':');

  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ─── Wallet Generation ───────────────────────────────────────────────────────

/**
 * Generate a new random EVM wallet
 * @returns {{ address: string, privateKey: string }}
 */
function generateWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

// ─── Supabase Operations ─────────────────────────────────────────────────────

/**
 * Get wallet info for an NFA bot from Supabase
 * @param {number} nfaId - NFA ID (on-chain)
 * @returns {Promise<{ address: string, mode: string, config: object } | null>}
 */
async function getWalletForNFA(nfaId) {
  const rows = await supabaseRequest(
    `bots?nfa_id=eq.${nfaId}&select=id,nfa_id,trading_wallet_address,trading_mode,trading_config`
  );

  if (!rows || rows.length === 0) return null;

  const bot = rows[0];
  if (!bot.trading_wallet_address) return null;

  return {
    botId: bot.id,
    nfaId: bot.nfa_id,
    address: bot.trading_wallet_address,
    mode: bot.trading_mode || 'off',
    config: bot.trading_config || {},
  };
}

/**
 * Get wallet info for an NFA by bot ID
 * @param {number} botId
 * @returns {Promise<object | null>}
 */
async function getWalletForBot(botId) {
  const rows = await supabaseRequest(
    `bots?id=eq.${botId}&select=id,nfa_id,trading_wallet_address,trading_wallet_encrypted,trading_mode,trading_config`
  );

  if (!rows || rows.length === 0) return null;
  return rows[0];
}

/**
 * Create and save a wallet for an NFA bot
 * @param {number} nfaId - NFA ID (on-chain)
 * @returns {Promise<{ address: string }>}
 */
async function createWalletForNFA(nfaId) {
  // Check if bot exists and doesn't already have a wallet
  const rows = await supabaseRequest(
    `bots?nfa_id=eq.${nfaId}&select=id,trading_wallet_address`
  );

  if (!rows || rows.length === 0) {
    throw new Error(`No bot found with nfa_id=${nfaId}`);
  }

  const bot = rows[0];
  if (bot.trading_wallet_address) {
    throw new Error(`Bot with nfa_id=${nfaId} already has a wallet: ${bot.trading_wallet_address}`);
  }

  // Generate wallet
  const { address, privateKey } = generateWallet();
  const encrypted = encryptPrivateKey(privateKey);

  // Save to Supabase
  await supabaseRequest(`bots?id=eq.${bot.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      trading_wallet_address: address,
      trading_wallet_encrypted: encrypted,
    }),
    prefer: 'return=minimal',
  });

  // Initialize trading stats
  await supabaseRequest('nfa_trading_stats', {
    method: 'POST',
    body: JSON.stringify({
      nfa_id: nfaId,
      bot_id: bot.id,
      paper_balance_usd: 10000,
    }),
    prefer: 'return=minimal',
  }).catch(() => {
    // Stats might already exist, ignore conflict
  });

  console.log(`✅ Created wallet for NFA #${nfaId}: ${address}`);
  return { address };
}

/**
 * Update trading mode for an NFA bot
 * @param {number} nfaId
 * @param {string} mode - 'off' | 'paper' | 'live'
 */
async function setTradingMode(nfaId, mode) {
  if (!['off', 'paper', 'live'].includes(mode)) {
    throw new Error(`Invalid trading mode: ${mode}`);
  }

  // Live mode requires NFA_LIVE_TRADING_ENABLED env var
  if (mode === 'live' && process.env.NFA_LIVE_TRADING_ENABLED !== 'true') {
    throw new Error('Live trading requires NFA_LIVE_TRADING_ENABLED=true');
  }

  const rows = await supabaseRequest(
    `bots?nfa_id=eq.${nfaId}&select=id,trading_wallet_address`
  );

  if (!rows || rows.length === 0) {
    throw new Error(`No bot found with nfa_id=${nfaId}`);
  }

  const bot = rows[0];
  if (mode !== 'off' && !bot.trading_wallet_address) {
    throw new Error('Bot must have a wallet before enabling trading');
  }

  await supabaseRequest(`bots?id=eq.${bot.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ trading_mode: mode }),
    prefer: 'return=minimal',
  });

  console.log(`✅ Set trading mode for NFA #${nfaId} to ${mode}`);
}

/**
 * Update trading config for an NFA bot
 * @param {number} nfaId
 * @param {object} config - Partial config update
 */
async function updateTradingConfig(nfaId, config) {
  const rows = await supabaseRequest(
    `bots?nfa_id=eq.${nfaId}&select=id,trading_config`
  );

  if (!rows || rows.length === 0) {
    throw new Error(`No bot found with nfa_id=${nfaId}`);
  }

  const bot = rows[0];
  const merged = { ...(bot.trading_config || {}), ...config };

  // Validate config
  if (merged.max_position_pct !== undefined) {
    merged.max_position_pct = Math.max(1, Math.min(50, merged.max_position_pct));
  }
  if (merged.max_daily_loss_pct !== undefined) {
    merged.max_daily_loss_pct = Math.max(1, Math.min(20, merged.max_daily_loss_pct));
  }
  if (merged.max_trades_per_day !== undefined) {
    merged.max_trades_per_day = Math.max(1, Math.min(100, merged.max_trades_per_day));
  }
  if (merged.confidence_threshold !== undefined) {
    merged.confidence_threshold = Math.max(0.1, Math.min(1.0, merged.confidence_threshold));
  }

  await supabaseRequest(`bots?id=eq.${bot.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ trading_config: merged }),
    prefer: 'return=minimal',
  });

  console.log(`✅ Updated trading config for NFA #${nfaId}`);
  return merged;
}

/**
 * Get decrypted private key for a bot (for future live trading)
 * @param {number} botId
 * @returns {Promise<string>} Decrypted private key
 */
async function getPrivateKeyForBot(botId) {
  const rows = await supabaseRequest(
    `bots?id=eq.${botId}&select=trading_wallet_encrypted`
  );

  if (!rows || rows.length === 0 || !rows[0].trading_wallet_encrypted) {
    throw new Error(`No encrypted wallet found for bot ${botId}`);
  }

  return decryptPrivateKey(rows[0].trading_wallet_encrypted);
}

// ─── Export ──────────────────────────────────────────────────────────────────

module.exports = {
  generateWallet,
  encryptPrivateKey,
  decryptPrivateKey,
  getWalletForNFA,
  getWalletForBot,
  createWalletForNFA,
  setTradingMode,
  updateTradingConfig,
  getPrivateKeyForBot,
  supabaseRequest,
};
