/**
 * 💰 Escrow Service — Real SOL staking with Phantom wallet
 * 
 * Flow:
 * 1. User connects Phantom → sends SOL to treasury wallet
 * 2. Backend verifies the transaction on-chain
 * 3. Battle resolves → winner gets (2x stake - platform fee)
 * 4. Platform fee: 5% (configurable via PLATFORM_FEE_BPS)
 * 
 * Min stake: 0.001 SOL (configurable via MIN_STAKE_SOL)
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

// Config
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';
const TREASURY_PUBLIC_KEY = process.env.TREASURY_PUBLIC_KEY!;
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY!;
const PLATFORM_FEE_BPS = parseInt(process.env.PLATFORM_FEE_BPS || '500'); // 5% = 500 bps
const MIN_STAKE_SOL = parseFloat(process.env.MIN_STAKE_SOL || '0.001');
const MAX_STAKE_SOL = parseFloat(process.env.MAX_STAKE_SOL || '1.0');

// Lazy-init connection
let _connection: Connection | null = null;
function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(RPC_URL, 'confirmed');
  }
  return _connection;
}

// Get treasury keypair (for payouts)
function getTreasuryKeypair(): Keypair {
  const secretKey = new Uint8Array(JSON.parse(TREASURY_PRIVATE_KEY));
  return Keypair.fromSecretKey(secretKey);
}

export function getTreasuryPublicKey(): string {
  return TREASURY_PUBLIC_KEY;
}

export function getStakeLimits() {
  return {
    min: MIN_STAKE_SOL,
    max: MAX_STAKE_SOL,
    feeBps: PLATFORM_FEE_BPS,
    feePercent: PLATFORM_FEE_BPS / 100,
    treasury: TREASURY_PUBLIC_KEY,
  };
}

/**
 * Verify that a transaction actually transferred SOL to our treasury
 */
export async function verifyStakeTransaction(
  txSignature: string,
  expectedSender: string,
  expectedAmountSol: number,
): Promise<{
  verified: boolean;
  error?: string;
  actualAmount?: number;
}> {
  try {
    const connection = getConnection();
    const tx = await connection.getTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { verified: false, error: 'Transaction not found. It may still be confirming.' };
    }

    if (tx.meta?.err) {
      return { verified: false, error: 'Transaction failed on-chain' };
    }

    // Check that the transaction includes a transfer to our treasury
    const treasuryPubkey = new PublicKey(TREASURY_PUBLIC_KEY);
    const senderPubkey = new PublicKey(expectedSender);

    const preBalances = tx.meta?.preBalances || [];
    const postBalances = tx.meta?.postBalances || [];
    const accountKeys = tx.transaction.message.getAccountKeys().staticAccountKeys;

    let treasuryIdx = -1;
    let senderIdx = -1;

    for (let i = 0; i < accountKeys.length; i++) {
      const key = accountKeys[i].toBase58();
      if (key === TREASURY_PUBLIC_KEY) treasuryIdx = i;
      if (key === expectedSender) senderIdx = i;
    }

    if (treasuryIdx === -1) {
      return { verified: false, error: 'Treasury wallet not found in transaction' };
    }
    if (senderIdx === -1) {
      return { verified: false, error: 'Sender wallet not found in transaction' };
    }

    // Calculate actual transfer amount to treasury
    const treasuryReceived = (postBalances[treasuryIdx] - preBalances[treasuryIdx]) / LAMPORTS_PER_SOL;
    
    // Allow 1% tolerance for fees
    const tolerance = expectedAmountSol * 0.01;
    if (treasuryReceived < expectedAmountSol - tolerance) {
      return {
        verified: false,
        error: `Expected ${expectedAmountSol} SOL but treasury received ${treasuryReceived.toFixed(6)} SOL`,
        actualAmount: treasuryReceived,
      };
    }

    return { verified: true, actualAmount: treasuryReceived };
  } catch (error: any) {
    console.error('Verify stake error:', error);
    return { verified: false, error: error.message };
  }
}

/**
 * Build a stake transaction for the user to sign via Phantom
 * Returns a serialized transaction that the frontend sends to Phantom for signing
 */
export async function buildStakeTransaction(
  senderPublicKey: string,
  amountSol: number,
): Promise<{
  success: boolean;
  transaction?: string; // base64 serialized
  error?: string;
}> {
  try {
    if (amountSol < MIN_STAKE_SOL) {
      return { success: false, error: `Minimum stake is ${MIN_STAKE_SOL} SOL` };
    }
    if (amountSol > MAX_STAKE_SOL) {
      return { success: false, error: `Maximum stake is ${MAX_STAKE_SOL} SOL` };
    }

    const connection = getConnection();
    const sender = new PublicKey(senderPublicKey);
    const treasury = new PublicKey(TREASURY_PUBLIC_KEY);

    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: treasury,
        lamports,
      })
    );

    // Add memo for tracking (optional)
    // Can add battle_id etc. as memo instruction later

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = sender;

    // Serialize for frontend signing
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return {
      success: true,
      transaction: serialized.toString('base64'),
    };
  } catch (error: any) {
    console.error('Build stake tx error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Pay out winnings from treasury to winner
 * Called by the resolver when battle ends
 */
export async function payoutWinner(
  winnerPublicKey: string,
  totalPotSol: number,
): Promise<{
  success: boolean;
  txSignature?: string;
  winnerPayout?: number;
  platformFee?: number;
  error?: string;
}> {
  try {
    const connection = getConnection();
    const treasury = getTreasuryKeypair();
    const winner = new PublicKey(winnerPublicKey);

    // Calculate payout
    const platformFeeSol = totalPotSol * (PLATFORM_FEE_BPS / 10000);
    const winnerPayoutSol = totalPotSol - platformFeeSol;
    const lamports = Math.round(winnerPayoutSol * LAMPORTS_PER_SOL);

    if (lamports <= 0) {
      return { success: false, error: 'Payout amount too small' };
    }

    // Check treasury balance
    const treasuryBalance = await connection.getBalance(treasury.publicKey);
    if (treasuryBalance < lamports + 5000) { // 5000 lamports for tx fee
      return { success: false, error: 'Insufficient treasury balance' };
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: winner,
        lamports,
      })
    );

    const txSignature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [treasury],
      { commitment: 'confirmed' }
    );

    console.log(`💰 Payout: ${winnerPayoutSol.toFixed(6)} SOL to ${winnerPublicKey} (tx: ${txSignature})`);
    console.log(`💎 Platform fee: ${platformFeeSol.toFixed(6)} SOL retained`);

    return {
      success: true,
      txSignature,
      winnerPayout: winnerPayoutSol,
      platformFee: platformFeeSol,
    };
  } catch (error: any) {
    console.error('Payout error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get treasury balance
 */
export async function getTreasuryBalance(): Promise<number> {
  try {
    const connection = getConnection();
    const treasury = new PublicKey(TREASURY_PUBLIC_KEY);
    const balance = await connection.getBalance(treasury);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Treasury balance error:', error);
    return 0;
  }
}
