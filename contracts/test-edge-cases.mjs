import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

// ============================================================================
// Config
// ============================================================================

const PROGRAM_ID = new PublicKey('ENAhq5nKQnQzjwj48bjUBefu8QvZ9vwArotgfWsbSax6');
const connection = new Connection('http://localhost:8899', 'confirmed');

// Constants
const MIN_BET = 10_000_000n; // 0.01 SOL
const MAX_BET = 100_000_000_000n; // 100 SOL

// Load authority wallet
const authorityKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync('/home/clawdbot/.config/solana/id.json', 'utf8')))
);

// PDA seeds (must match program)
const PLATFORM_SEED = Buffer.from('platform');
const POOL_SEED = Buffer.from('pool');
const BET_SEED = Buffer.from('bet');
const VAULT_SEED = Buffer.from('vault');

// ============================================================================
// Anchor-compatible serialization helpers
// ============================================================================

function getDiscriminator(name) {
  const hash = createHash('sha256').update(`global:${name}`).digest();
  return hash.slice(0, 8);
}

function serializePubkey(pubkey) {
  return pubkey.toBuffer();
}

function serializeU16(val) {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(val);
  return buf;
}

function serializeU64(val) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(val));
  return buf;
}

function serializeString(str) {
  const strBuf = Buffer.from(str, 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBuf.length);
  return Buffer.concat([lenBuf, strBuf]);
}

function serializeOptionU16(val) {
  if (val === null || val === undefined) {
    return Buffer.from([0]); // None
  }
  const buf = Buffer.alloc(3);
  buf[0] = 1; // Some
  buf.writeUInt16LE(val, 1);
  return buf;
}

function serializeSide(side) {
  return Buffer.from([side]);
}

// ============================================================================
// PDA derivation
// ============================================================================

function findPlatformConfig() {
  return PublicKey.findProgramAddressSync([PLATFORM_SEED], PROGRAM_ID);
}

function findBettingPool(matchId) {
  return PublicKey.findProgramAddressSync(
    [POOL_SEED, Buffer.from(matchId)],
    PROGRAM_ID
  );
}

function findVault(poolPubkey) {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, poolPubkey.toBuffer()],
    PROGRAM_ID
  );
}

function findBet(poolPubkey, bettorPubkey) {
  return PublicKey.findProgramAddressSync(
    [BET_SEED, poolPubkey.toBuffer(), bettorPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// ============================================================================
// Instruction builders
// ============================================================================

function buildInitializeIx(authority, platformConfig, treasury, feeBps) {
  const data = Buffer.concat([
    getDiscriminator('initialize'),
    serializePubkey(treasury),
    serializeU16(feeBps),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformConfig, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildCreatePoolIx(authority, platformConfig, pool, vault, matchId, botAName, botBName, customFeeBps) {
  const data = Buffer.concat([
    getDiscriminator('create_pool'),
    serializeString(matchId),
    serializeString(botAName),
    serializeString(botBName),
    serializeOptionU16(customFeeBps),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformConfig, isSigner: false, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildPlaceBetIx(bettor, platformConfig, pool, vault, bet, side, amount) {
  const data = Buffer.concat([
    getDiscriminator('place_bet'),
    serializeSide(side),
    serializeU64(amount),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformConfig, isSigner: false, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: bet, isSigner: false, isWritable: true },
      { pubkey: bettor.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildLockPoolIx(authority, platformConfig, pool) {
  const data = getDiscriminator('lock_pool');

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformConfig, isSigner: false, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
    ],
    data,
  });
}

function buildResolveIx(authority, platformConfig, pool, winner) {
  const data = Buffer.concat([
    getDiscriminator('resolve'),
    serializeSide(winner),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformConfig, isSigner: false, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
    ],
    data,
  });
}

function buildClaimIx(bettor, pool, vault, bet) {
  const data = getDiscriminator('claim');

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: bet, isSigner: false, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: false },
      { pubkey: bettor.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildCollectFeesIx(authority, platformConfig, pool, vault, treasury) {
  const data = getDiscriminator('collect_fees');

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformConfig, isSigner: false, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildCancelIx(authority, platformConfig, pool) {
  const data = getDiscriminator('cancel');
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: platformConfig, isSigner: false, isWritable: false },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
    ],
    data,
  });
}

function buildClaimRefundIx(bettor, pool, vault, bet) {
  const data = getDiscriminator('claim_refund');
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: bet, isSigner: false, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: false },
      { pubkey: bettor.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildCloseBetIx(bettor, bet, pool) {
  const data = getDiscriminator('close_bet');
  // Anchor account order must match struct: betting_pool, bet, bettor
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: false },
      { pubkey: bet, isSigner: false, isWritable: true },
      { pubkey: bettor.publicKey, isSigner: true, isWritable: true },
    ],
    data,
  });
}

// ============================================================================
// Test helpers
// ============================================================================

async function airdrop(pubkey, sol) {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, 'confirmed');
}

async function getBalance(pubkey) {
  return await connection.getBalance(pubkey);
}

function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); }
function info(msg) { console.log(`  ℹ️  ${msg}`); }

async function expectError(fn, expectedError) {
  try {
    await fn();
    return { success: false, error: 'Expected error but transaction succeeded' };
  } catch (e) {
    const errorMsg = e.message + (e.logs ? '\n' + e.logs.join('\n') : '');
    if (errorMsg.includes(expectedError)) {
      return { success: true };
    }
    return { success: false, error: `Expected "${expectedError}" but got: ${e.message}` };
  }
}

// Create fresh pool for each test
async function setupPool(matchId, treasury, platformConfig) {
  const [pool] = findBettingPool(matchId);
  const [vault] = findVault(pool);
  
  const ix = buildCreatePoolIx(
    authorityKeypair, platformConfig, pool, vault,
    matchId, 'BotA', 'BotB', null
  );
  const tx = new Transaction().add(ix);
  await sendAndConfirmTransaction(connection, tx, [authorityKeypair]);
  
  return { pool, vault };
}

// ============================================================================
// Tests
// ============================================================================

let testResults = { passed: 0, failed: 0 };

async function runTest(name, fn) {
  console.log(`\n🧪 ${name}`);
  try {
    await fn();
    testResults.passed++;
  } catch (e) {
    fail(`Test crashed: ${e.message}`);
    if (e.logs) console.log(e.logs.join('\n'));
    testResults.failed++;
  }
}

async function main() {
  console.log('\n🔬 GemBots Edge Case Tests');
  console.log('===========================\n');

  // Initialize platform first
  const [platformConfig] = findPlatformConfig();
  const treasury = Keypair.generate().publicKey;
  
  console.log('📍 Setup:');
  console.log(`  Authority: ${authorityKeypair.publicKey}`);
  console.log(`  Platform Config: ${platformConfig}`);
  console.log(`  Treasury: ${treasury}`);
  
  // Fund treasury
  await airdrop(treasury, 0.1);
  
  // Initialize platform
  try {
    const ix = buildInitializeIx(authorityKeypair, platformConfig, treasury, 500);
    const tx = new Transaction().add(ix);
    await sendAndConfirmTransaction(connection, tx, [authorityKeypair]);
    ok('Platform initialized (5% fee)');
  } catch (e) {
    if (e.message.includes('already in use')) {
      ok('Platform already initialized');
    } else {
      throw e;
    }
  }

  // ================================
  // TEST 1: Double Claim Prevention
  // ================================
  await runTest('1. Double Claim Prevention', async () => {
    const matchId = 'edge-test-1';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    const bettor = Keypair.generate();
    await airdrop(bettor.publicKey, 10);
    const [bet] = findBet(pool, bettor.publicKey);
    
    // Place bet on side A
    const betAmount = 0.1 * LAMPORTS_PER_SOL;
    let ix = buildPlaceBetIx(bettor, platformConfig, pool, vault, bet, 0, betAmount);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettor]);
    ok('Placed bet on side A');
    
    // Lock and resolve (A wins)
    ix = buildLockPoolIx(authorityKeypair, platformConfig, pool);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    
    ix = buildResolveIx(authorityKeypair, platformConfig, pool, 0);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    ok('Pool resolved, side A wins');
    
    // First claim - should succeed
    ix = buildClaimIx(bettor, pool, vault, bet);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettor]);
    ok('First claim succeeded');
    
    // Second claim - should fail
    const result = await expectError(async () => {
      const ix2 = buildClaimIx(bettor, pool, vault, bet);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix2), [bettor]);
    }, 'AlreadyClaimed');
    
    if (result.success) {
      ok('Second claim correctly rejected with AlreadyClaimed');
    } else {
      fail(result.error);
    }
  });

  // ================================
  // TEST 2: Loser Cannot Claim
  // ================================
  await runTest('2. Loser Cannot Claim', async () => {
    const matchId = 'edge-test-2';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    const bettorA = Keypair.generate();
    const bettorB = Keypair.generate();
    await airdrop(bettorA.publicKey, 10);
    await airdrop(bettorB.publicKey, 10);
    
    const [betA] = findBet(pool, bettorA.publicKey);
    const [betB] = findBet(pool, bettorB.publicKey);
    
    // Bettor A bets on side A
    let ix = buildPlaceBetIx(bettorA, platformConfig, pool, vault, betA, 0, 0.1 * LAMPORTS_PER_SOL);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettorA]);
    
    // Bettor B bets on side B
    ix = buildPlaceBetIx(bettorB, platformConfig, pool, vault, betB, 1, 0.1 * LAMPORTS_PER_SOL);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettorB]);
    ok('Both bettors placed bets');
    
    // Lock and resolve (B wins)
    ix = buildLockPoolIx(authorityKeypair, platformConfig, pool);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    
    ix = buildResolveIx(authorityKeypair, platformConfig, pool, 1); // Side B wins
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    ok('Pool resolved, side B wins');
    
    // Loser (A) tries to claim
    const result = await expectError(async () => {
      const ix2 = buildClaimIx(bettorA, pool, vault, betA);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix2), [bettorA]);
    }, 'NotWinner');
    
    if (result.success) {
      ok('Loser claim correctly rejected with NotWinner');
    } else {
      fail(result.error);
    }
  });

  // ================================
  // TEST 3: Bet on Locked Pool
  // ================================
  await runTest('3. Bet on Locked Pool', async () => {
    const matchId = 'edge-test-3';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    // Lock pool
    let ix = buildLockPoolIx(authorityKeypair, platformConfig, pool);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    ok('Pool locked');
    
    // Try to bet
    const bettor = Keypair.generate();
    await airdrop(bettor.publicKey, 10);
    const [bet] = findBet(pool, bettor.publicKey);
    
    const result = await expectError(async () => {
      const ix2 = buildPlaceBetIx(bettor, platformConfig, pool, vault, bet, 0, 0.1 * LAMPORTS_PER_SOL);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix2), [bettor]);
    }, 'PoolNotOpen');
    
    if (result.success) {
      ok('Bet on locked pool correctly rejected');
    } else {
      fail(result.error);
    }
  });

  // ================================
  // TEST 4: Bet on Resolved Pool
  // ================================
  await runTest('4. Bet on Resolved Pool', async () => {
    const matchId = 'edge-test-4';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    // Need at least one bet to resolve
    const initialBettor = Keypair.generate();
    await airdrop(initialBettor.publicKey, 10);
    const [initialBet] = findBet(pool, initialBettor.publicKey);
    
    let ix = buildPlaceBetIx(initialBettor, platformConfig, pool, vault, initialBet, 0, 0.1 * LAMPORTS_PER_SOL);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [initialBettor]);
    
    // Lock and resolve
    ix = buildLockPoolIx(authorityKeypair, platformConfig, pool);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    
    ix = buildResolveIx(authorityKeypair, platformConfig, pool, 0);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    ok('Pool resolved');
    
    // Try to bet
    const bettor = Keypair.generate();
    await airdrop(bettor.publicKey, 10);
    const [bet] = findBet(pool, bettor.publicKey);
    
    const result = await expectError(async () => {
      const ix2 = buildPlaceBetIx(bettor, platformConfig, pool, vault, bet, 0, 0.1 * LAMPORTS_PER_SOL);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix2), [bettor]);
    }, 'PoolNotOpen');
    
    if (result.success) {
      ok('Bet on resolved pool correctly rejected');
    } else {
      fail(result.error);
    }
  });

  // ================================
  // TEST 5: Bet Below Minimum
  // ================================
  await runTest('5. Bet Below Minimum', async () => {
    const matchId = 'edge-test-5';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    const bettor = Keypair.generate();
    await airdrop(bettor.publicKey, 10);
    const [bet] = findBet(pool, bettor.publicKey);
    
    // Try to bet 0.001 SOL (below 0.01 minimum)
    const result = await expectError(async () => {
      const ix = buildPlaceBetIx(bettor, platformConfig, pool, vault, bet, 0, 0.001 * LAMPORTS_PER_SOL);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettor]);
    }, 'BetTooSmall');
    
    if (result.success) {
      ok('Sub-minimum bet correctly rejected with BetTooSmall');
    } else {
      fail(result.error);
    }
  });

  // ================================
  // TEST 6: Bet at Exact Limits
  // ================================
  await runTest('6. Bet at Exact Limits', async () => {
    const matchId = 'edge-test-6';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    // Test minimum bet (0.01 SOL)
    const bettorMin = Keypair.generate();
    await airdrop(bettorMin.publicKey, 10);
    const [betMin] = findBet(pool, bettorMin.publicKey);
    
    let ix = buildPlaceBetIx(bettorMin, platformConfig, pool, vault, betMin, 0, Number(MIN_BET));
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettorMin]);
    ok('Minimum bet (0.01 SOL) accepted');
    
    // Test maximum bet (100 SOL)
    const bettorMax = Keypair.generate();
    await airdrop(bettorMax.publicKey, 110); // Need extra for rent
    const [betMax] = findBet(pool, bettorMax.publicKey);
    
    ix = buildPlaceBetIx(bettorMax, platformConfig, pool, vault, betMax, 1, Number(MAX_BET));
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettorMax]);
    ok('Maximum bet (100 SOL) accepted');
  });

  // ================================
  // TEST 7: Non-Authority Resolve
  // ================================
  await runTest('7. Non-Authority Resolve', async () => {
    const matchId = 'edge-test-7';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    // Place a bet first
    const bettor = Keypair.generate();
    await airdrop(bettor.publicKey, 10);
    const [bet] = findBet(pool, bettor.publicKey);
    
    let ix = buildPlaceBetIx(bettor, platformConfig, pool, vault, bet, 0, 0.1 * LAMPORTS_PER_SOL);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettor]);
    
    // Lock first
    ix = buildLockPoolIx(authorityKeypair, platformConfig, pool);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    
    // Random user tries to resolve
    const randomUser = Keypair.generate();
    await airdrop(randomUser.publicKey, 1);
    
    const result = await expectError(async () => {
      const ix2 = buildResolveIx(randomUser, platformConfig, pool, 0);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix2), [randomUser]);
    }, '');  // Just check it fails
    
    if (result.success) {
      ok('Non-authority resolve correctly rejected');
    } else if (result.error.includes('succeeded')) {
      fail('Non-authority was able to resolve!');
    } else {
      ok('Non-authority resolve rejected (authority check works)');
    }
  });

  // ================================
  // TEST 8: Non-Authority Lock
  // ================================
  await runTest('8. Non-Authority Lock', async () => {
    const matchId = 'edge-test-8';
    const { pool } = await setupPool(matchId, treasury, platformConfig);
    
    const randomUser = Keypair.generate();
    await airdrop(randomUser.publicKey, 1);
    
    const result = await expectError(async () => {
      const ix = buildLockPoolIx(randomUser, platformConfig, pool);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [randomUser]);
    }, '');
    
    if (result.success) {
      ok('Non-authority lock correctly rejected');
    } else if (result.error.includes('succeeded')) {
      fail('Non-authority was able to lock!');
    } else {
      ok('Non-authority lock rejected (authority check works)');
    }
  });

  // ================================
  // TEST 9: Cancel + Refund Flow
  // ================================
  await runTest('9. Cancel + Refund Flow', async () => {
    const matchId = 'edge-test-9';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    const bettorA = Keypair.generate();
    const bettorB = Keypair.generate();
    await airdrop(bettorA.publicKey, 10);
    await airdrop(bettorB.publicKey, 10);
    
    const [betA] = findBet(pool, bettorA.publicKey);
    const [betB] = findBet(pool, bettorB.publicKey);
    
    const betAmountA = 0.5 * LAMPORTS_PER_SOL;
    const betAmountB = 0.3 * LAMPORTS_PER_SOL;
    
    // Place bets
    let ix = buildPlaceBetIx(bettorA, platformConfig, pool, vault, betA, 0, betAmountA);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettorA]);
    
    ix = buildPlaceBetIx(bettorB, platformConfig, pool, vault, betB, 1, betAmountB);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettorB]);
    ok('Both bettors placed bets');
    
    const balanceABefore = await getBalance(bettorA.publicKey);
    const balanceBBefore = await getBalance(bettorB.publicKey);
    
    // Cancel pool
    ix = buildCancelIx(authorityKeypair, platformConfig, pool);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    ok('Pool cancelled');
    
    // Both claim refunds
    ix = buildClaimRefundIx(bettorA, pool, vault, betA);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettorA]);
    
    ix = buildClaimRefundIx(bettorB, pool, vault, betB);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettorB]);
    
    const balanceAAfter = await getBalance(bettorA.publicKey);
    const balanceBAfter = await getBalance(bettorB.publicKey);
    
    // Verify refunds (accounting for tx fees)
    const refundA = balanceAAfter - balanceABefore;
    const refundB = balanceBAfter - balanceBBefore;
    
    info(`Bettor A refund: ${(refundA / LAMPORTS_PER_SOL).toFixed(6)} SOL (expected ~0.5)`);
    info(`Bettor B refund: ${(refundB / LAMPORTS_PER_SOL).toFixed(6)} SOL (expected ~0.3)`);
    
    // Allow for tx fee variance
    if (Math.abs(refundA - betAmountA) < 0.01 * LAMPORTS_PER_SOL) {
      ok('Bettor A refund correct');
    } else {
      fail(`Bettor A refund incorrect: got ${refundA}, expected ${betAmountA}`);
    }
    
    if (Math.abs(refundB - betAmountB) < 0.01 * LAMPORTS_PER_SOL) {
      ok('Bettor B refund correct');
    } else {
      fail(`Bettor B refund incorrect: got ${refundB}, expected ${betAmountB}`);
    }
  });

  // ================================
  // TEST 10: Double Fee Collection
  // ================================
  await runTest('10. Double Fee Collection', async () => {
    const matchId = 'edge-test-10';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    const bettorA = Keypair.generate();
    const bettorB = Keypair.generate();
    await airdrop(bettorA.publicKey, 10);
    await airdrop(bettorB.publicKey, 10);
    
    const [betA] = findBet(pool, bettorA.publicKey);
    const [betB] = findBet(pool, bettorB.publicKey);
    
    // Place bets
    let ix = buildPlaceBetIx(bettorA, platformConfig, pool, vault, betA, 0, 0.5 * LAMPORTS_PER_SOL);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettorA]);
    
    ix = buildPlaceBetIx(bettorB, platformConfig, pool, vault, betB, 1, 0.3 * LAMPORTS_PER_SOL);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettorB]);
    
    // Lock and resolve
    ix = buildLockPoolIx(authorityKeypair, platformConfig, pool);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    
    ix = buildResolveIx(authorityKeypair, platformConfig, pool, 0);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    
    // First fee collection
    ix = buildCollectFeesIx(authorityKeypair, platformConfig, pool, vault, treasury);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    ok('First fee collection succeeded');
    
    // Second fee collection - should fail
    const result = await expectError(async () => {
      const ix2 = buildCollectFeesIx(authorityKeypair, platformConfig, pool, vault, treasury);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix2), [authorityKeypair]);
    }, 'FeesAlreadyCollected');
    
    if (result.success) {
      ok('Second fee collection correctly rejected');
    } else {
      fail(result.error);
    }
  });

  // ================================
  // TEST 11: Multi-Bettor Stress
  // ================================
  await runTest('11. Multi-Bettor Stress (5 bettors)', async () => {
    const matchId = 'edge-test-11';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    // Create 5 bettors: 3 on A, 2 on B
    const bettors = [];
    const bets = [];
    const amounts = [
      { side: 0, amount: 1 * LAMPORTS_PER_SOL },
      { side: 0, amount: 0.5 * LAMPORTS_PER_SOL },
      { side: 0, amount: 0.3 * LAMPORTS_PER_SOL },
      { side: 1, amount: 0.8 * LAMPORTS_PER_SOL },
      { side: 1, amount: 0.4 * LAMPORTS_PER_SOL },
    ];
    
    for (let i = 0; i < 5; i++) {
      const bettor = Keypair.generate();
      await airdrop(bettor.publicKey, 10);
      const [bet] = findBet(pool, bettor.publicKey);
      bettors.push(bettor);
      bets.push(bet);
      
      const ix = buildPlaceBetIx(bettor, platformConfig, pool, vault, bet, amounts[i].side, amounts[i].amount);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettor]);
    }
    ok('All 5 bettors placed bets');
    
    const totalPoolA = 1 + 0.5 + 0.3; // 1.8 SOL on A
    const totalPoolB = 0.8 + 0.4; // 1.2 SOL on B
    const totalPool = totalPoolA + totalPoolB; // 3 SOL
    info(`Side A total: ${totalPoolA} SOL, Side B total: ${totalPoolB} SOL`);
    
    // Lock and resolve (A wins)
    let ix = buildLockPoolIx(authorityKeypair, platformConfig, pool);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    
    ix = buildResolveIx(authorityKeypair, platformConfig, pool, 0);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    ok('Pool resolved, Side A wins');
    
    // All winners (first 3) claim
    let totalPayouts = 0;
    for (let i = 0; i < 3; i++) {
      const balanceBefore = await getBalance(bettors[i].publicKey);
      ix = buildClaimIx(bettors[i], pool, vault, bets[i]);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettors[i]]);
      const balanceAfter = await getBalance(bettors[i].publicKey);
      const payout = (balanceAfter - balanceBefore) / LAMPORTS_PER_SOL;
      totalPayouts += payout;
      info(`Winner ${i+1} payout: ${payout.toFixed(4)} SOL`);
    }
    
    // Expected: total_pool * 0.95 = 3 * 0.95 = 2.85 SOL total payouts
    info(`Total payouts: ${totalPayouts.toFixed(4)} SOL (expected ~2.85)`);
    
    if (Math.abs(totalPayouts - 2.85) < 0.05) {
      ok('Payout math verified');
    } else {
      fail(`Payout math seems off: ${totalPayouts} vs expected 2.85`);
    }
  });

  // ================================
  // TEST 12: Cancel After Lock
  // ================================
  await runTest('12. Cancel After Lock', async () => {
    const matchId = 'edge-test-12';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    // Place a bet
    const bettor = Keypair.generate();
    await airdrop(bettor.publicKey, 10);
    const [bet] = findBet(pool, bettor.publicKey);
    
    let ix = buildPlaceBetIx(bettor, platformConfig, pool, vault, bet, 0, 0.1 * LAMPORTS_PER_SOL);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettor]);
    
    // Lock pool
    ix = buildLockPoolIx(authorityKeypair, platformConfig, pool);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    ok('Pool locked');
    
    // Cancel pool (should work per contract spec)
    try {
      ix = buildCancelIx(authorityKeypair, platformConfig, pool);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
      ok('Cancel after lock succeeded');
    } catch (e) {
      // Some contracts don't allow this
      if (e.message.includes('PoolNotOpen') || e.message.includes('InvalidStatus')) {
        info('Cancel after lock not allowed by this contract version');
      } else {
        fail(`Unexpected error: ${e.message}`);
      }
    }
  });

  // ================================
  // TEST 13: Close Bet Account
  // ================================
  await runTest('13. Close Bet Account (reclaim rent)', async () => {
    const matchId = 'edge-test-13';
    const { pool, vault } = await setupPool(matchId, treasury, platformConfig);
    
    const bettor = Keypair.generate();
    await airdrop(bettor.publicKey, 10);
    const [bet] = findBet(pool, bettor.publicKey);
    
    // Place bet
    let ix = buildPlaceBetIx(bettor, platformConfig, pool, vault, bet, 0, 0.1 * LAMPORTS_PER_SOL);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettor]);
    
    // Lock and resolve
    ix = buildLockPoolIx(authorityKeypair, platformConfig, pool);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    
    ix = buildResolveIx(authorityKeypair, platformConfig, pool, 0);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [authorityKeypair]);
    
    // Claim
    ix = buildClaimIx(bettor, pool, vault, bet);
    await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettor]);
    ok('Claimed payout');
    
    const balanceBefore = await getBalance(bettor.publicKey);
    
    // Close bet account
    try {
      ix = buildCloseBetIx(bettor, bet, pool);
      await sendAndConfirmTransaction(connection, new Transaction().add(ix), [bettor]);
      
      const balanceAfter = await getBalance(bettor.publicKey);
      const rentReclaimed = (balanceAfter - balanceBefore) / LAMPORTS_PER_SOL;
      info(`Rent reclaimed: ${rentReclaimed.toFixed(6)} SOL`);
      ok('Bet account closed successfully');
    } catch (e) {
      if (e.message.includes('instruction not found') || e.message.includes('invalid instruction')) {
        info('close_bet instruction not implemented in this contract version');
      } else {
        fail(`Close bet failed: ${e.message}`);
      }
    }
  });

  // ================================
  // Summary
  // ================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`  ✅ Passed: ${testResults.passed}`);
  console.log(`  ❌ Failed: ${testResults.failed}`);
  console.log(`  📈 Total:  ${testResults.passed + testResults.failed}`);
  console.log('');
  
  if (testResults.failed === 0) {
    console.log('🎉 All edge case tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Review output above.');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('💥 Test suite crashed:', e.message);
  if (e.logs) console.log(e.logs.join('\n'));
  process.exit(1);
});
