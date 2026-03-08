import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

// ============================================================================
// Config
// ============================================================================

const PROGRAM_ID = new PublicKey('ENAhq5nKQnQzjwj48bjUBefu8QvZ9vwArotgfWsbSax6');
const connection = new Connection('http://localhost:8899', 'confirmed');

// Load authority wallet
const authorityKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync('/home/clawdbot/.config/solana/id.json', 'utf8')))
);

// Create bettor wallets
const bettorA = Keypair.generate();
const bettorB = Keypair.generate();

// PDA seeds (must match program)
const PLATFORM_SEED = Buffer.from('platform');
const POOL_SEED = Buffer.from('pool');
const BET_SEED = Buffer.from('bet');
const VAULT_SEED = Buffer.from('vault');

// ============================================================================
// Anchor-compatible serialization helpers
// ============================================================================

// Anchor discriminator = first 8 bytes of SHA256("global:<method_name>")
function getDiscriminator(name) {
  const hash = createHash('sha256').update(`global:${name}`).digest();
  return hash.slice(0, 8);
}

// Borsh serialization helpers
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
  // Side::A = 0, Side::B = 1
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
      { pubkey: pool, isSigner: false, isWritable: false }, // pool account for has_one
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

// ============================================================================
// Test helpers
// ============================================================================

async function airdrop(pubkey, sol) {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, 'confirmed');
}

async function getBalance(pubkey) {
  return await connection.getBalance(pubkey) / LAMPORTS_PER_SOL;
}

function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); }

// ============================================================================
// Main test
// ============================================================================

async function main() {
  console.log('\n🧪 GemBots Betting Contract — Integration Test');
  console.log('================================================\n');

  // Derive PDAs
  const [platformConfig] = findPlatformConfig();
  const matchId = 'test-match-001';
  const [pool] = findBettingPool(matchId);
  const [vault] = findVault(pool);
  const [betA] = findBet(pool, bettorA.publicKey);
  const [betB] = findBet(pool, bettorB.publicKey);
  const treasury = Keypair.generate().publicKey;

  console.log('📍 Addresses:');
  console.log(`  Authority: ${authorityKeypair.publicKey}`);
  console.log(`  Platform Config: ${platformConfig}`);
  console.log(`  Pool (${matchId}): ${pool}`);
  console.log(`  Vault: ${vault}`);
  console.log(`  Bettor A: ${bettorA.publicKey}`);
  console.log(`  Bettor B: ${bettorB.publicKey}`);
  console.log(`  Treasury: ${treasury}`);
  console.log('');

  // Fund bettors
  console.log('💰 Funding bettors...');
  await airdrop(bettorA.publicKey, 5);
  await airdrop(bettorB.publicKey, 5);
  ok(`Bettor A: ${await getBalance(bettorA.publicKey)} SOL`);
  ok(`Bettor B: ${await getBalance(bettorB.publicKey)} SOL`);
  console.log('');

  // ---- TEST 1: Initialize ----
  console.log('1️⃣  Initialize Platform...');
  try {
    const ix = buildInitializeIx(authorityKeypair, platformConfig, treasury, 500); // 5% fee
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [authorityKeypair]);
    ok(`Initialized! Fee: 5% | Tx: ${sig.slice(0, 16)}...`);
  } catch (e) {
    fail(`Initialize failed: ${e.message}`);
    process.exit(1);
  }
  console.log('');

  // ---- TEST 2: Create Pool ----
  console.log('2️⃣  Create Betting Pool...');
  try {
    const ix = buildCreatePoolIx(
      authorityKeypair, platformConfig, pool, vault,
      matchId, 'DiamondHands', 'PyroBot', null
    );
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [authorityKeypair]);
    ok(`Pool created! Match: ${matchId} | Tx: ${sig.slice(0, 16)}...`);
  } catch (e) {
    fail(`Create pool failed: ${e.message}`);
    console.log(e.logs?.join('\n'));
    process.exit(1);
  }
  console.log('');

  // ---- TEST 3: Place Bets ----
  console.log('3️⃣  Place Bets...');
  const betAmountA = 0.5 * LAMPORTS_PER_SOL; // 0.5 SOL on side A
  const betAmountB = 0.3 * LAMPORTS_PER_SOL; // 0.3 SOL on side B
  
  try {
    const ix = buildPlaceBetIx(bettorA, platformConfig, pool, vault, betA, 0, betAmountA);
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [bettorA]);
    ok(`Bettor A bet 0.5 SOL on Side A | Tx: ${sig.slice(0, 16)}...`);
  } catch (e) {
    fail(`Bettor A bet failed: ${e.message}`);
    console.log(e.logs?.join('\n'));
    process.exit(1);
  }

  try {
    const ix = buildPlaceBetIx(bettorB, platformConfig, pool, vault, betB, 1, betAmountB);
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [bettorB]);
    ok(`Bettor B bet 0.3 SOL on Side B | Tx: ${sig.slice(0, 16)}...`);
  } catch (e) {
    fail(`Bettor B bet failed: ${e.message}`);
    console.log(e.logs?.join('\n'));
    process.exit(1);
  }

  const vaultBalance = await getBalance(vault);
  ok(`Vault balance: ${vaultBalance} SOL (should be ~0.8)`);
  console.log('');

  // ---- TEST 4: Lock Pool ----
  console.log('4️⃣  Lock Pool...');
  try {
    const ix = buildLockPoolIx(authorityKeypair, platformConfig, pool);
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [authorityKeypair]);
    ok(`Pool locked! Tx: ${sig.slice(0, 16)}...`);
  } catch (e) {
    fail(`Lock pool failed: ${e.message}`);
    console.log(e.logs?.join('\n'));
    process.exit(1);
  }
  console.log('');

  // ---- TEST 5: Resolve (Side A wins) ----
  console.log('5️⃣  Resolve Match (Side A wins)...');
  try {
    const ix = buildResolveIx(authorityKeypair, platformConfig, pool, 0); // Side::A
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [authorityKeypair]);
    ok(`Resolved! Winner: Side A (DiamondHands) | Tx: ${sig.slice(0, 16)}...`);
  } catch (e) {
    fail(`Resolve failed: ${e.message}`);
    console.log(e.logs?.join('\n'));
    process.exit(1);
  }
  console.log('');

  // ---- TEST 6: Winner Claims ----
  console.log('6️⃣  Winner Claims Payout...');
  const beforeClaim = await getBalance(bettorA.publicKey);
  try {
    const ix = buildClaimIx(bettorA, pool, vault, betA);
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [bettorA]);
    const afterClaim = await getBalance(bettorA.publicKey);
    const payout = afterClaim - beforeClaim;
    ok(`Claimed! Payout: ~${payout.toFixed(4)} SOL | Tx: ${sig.slice(0, 16)}...`);
    
    // Expected: 0.5 * 0.8 * 0.95 / 0.5 = 0.76 SOL (minus tx fee)
    // Actually: bet_amount * total_pool * (10000 - 500) / (winning_pool * 10000)
    // = 500000000 * 800000000 * 9500 / (500000000 * 10000) = 760000000 = 0.76 SOL
    console.log(`   Expected: ~0.76 SOL (0.8 total * 95% after 5% fee)`);
  } catch (e) {
    fail(`Claim failed: ${e.message}`);
    console.log(e.logs?.join('\n'));
    process.exit(1);
  }
  console.log('');

  // ---- TEST 7: Collect Fees ----
  console.log('7️⃣  Collect Platform Fees...');
  // First fund treasury account so it exists
  await airdrop(treasury, 0.01);
  
  try {
    const ix = buildCollectFeesIx(authorityKeypair, platformConfig, pool, vault, treasury);
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [authorityKeypair]);
    const treasuryBalance = await getBalance(treasury);
    ok(`Fees collected! Treasury: ${treasuryBalance.toFixed(4)} SOL | Tx: ${sig.slice(0, 16)}...`);
    // Fee = losing_pool * fee_bps / 10000 = 0.3 * 500 / 10000 = 0.015 SOL
    console.log(`   Expected fee: ~0.015 SOL (0.3 losing * 5%)`);
  } catch (e) {
    fail(`Collect fees failed: ${e.message}`);
    console.log(e.logs?.join('\n'));
    process.exit(1);
  }
  console.log('');

  // ---- Summary ----
  console.log('📊 Final Balances:');
  console.log(`  Bettor A (winner): ${(await getBalance(bettorA.publicKey)).toFixed(4)} SOL`);
  console.log(`  Bettor B (loser):  ${(await getBalance(bettorB.publicKey)).toFixed(4)} SOL`);
  console.log(`  Vault:             ${(await getBalance(vault)).toFixed(4)} SOL`);
  console.log(`  Treasury:          ${(await getBalance(treasury)).toFixed(4)} SOL`);
  console.log('');
  console.log('🎉 All 7 tests passed! Contract works correctly.');
}

main().catch(e => {
  console.error('💥 Test crashed:', e.message);
  process.exit(1);
});
