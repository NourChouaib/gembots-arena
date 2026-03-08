/**
 * GemBots Betting Client — TypeScript SDK for interacting with the on-chain program.
 * 
 * Usage:
 *   const client = new GemBotsBettingClient(provider, programId);
 *   await client.initialize(treasury, 500);
 *   const pool = await client.createPool("match-123", "NeonViper", "CyberFang");
 *   await client.placeBet(pool.matchId, Side.A, 0.5); // 0.5 SOL
 */

import {
  Program,
  AnchorProvider,
  BN,
  web3,
  Idl,
  Wallet,
} from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Connection, Keypair } from "@solana/web3.js";

// ============================================================================
// Types (mirrors on-chain enums/structs)
// ============================================================================

export enum Side {
  A = "A",
  B = "B",
}

export enum PoolStatus {
  Open = "open",
  Locked = "locked",
  Resolved = "resolved",
  Cancelled = "cancelled",
}

export interface PlatformConfigAccount {
  authority: PublicKey;
  treasury: PublicKey;
  defaultFeeBps: number;
  totalVolume: BN;
  totalMatches: BN;
  bump: number;
}

export interface BettingPoolAccount {
  authority: PublicKey;
  matchId: string;
  botAName: string;
  botBName: string;
  poolA: BN;
  poolB: BN;
  totalBets: number;
  status: any; // Anchor enum
  winner: any | null;
  platformFeeBps: number;
  createdAt: BN;
  resolvedAt: BN | null;
  feesCollected: boolean;
  bump: number;
  vaultBump: number;
}

export interface BetAccount {
  pool: PublicKey;
  bettor: PublicKey;
  side: any;
  amount: BN;
  claimed: boolean;
  payout: BN;
  timestamp: BN;
  bump: number;
}

export interface PoolInfo {
  address: PublicKey;
  matchId: string;
  botAName: string;
  botBName: string;
  poolA: number; // in SOL
  poolB: number; // in SOL
  totalBets: number;
  status: PoolStatus;
  winner: Side | null;
  feeBps: number;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface BetInfo {
  address: PublicKey;
  pool: PublicKey;
  bettor: PublicKey;
  side: Side;
  amount: number; // in SOL
  claimed: boolean;
  payout: number; // in SOL
  timestamp: Date;
}

// ============================================================================
// PDA Seeds
// ============================================================================

const PLATFORM_SEED = Buffer.from("platform");
const POOL_SEED = Buffer.from("pool");
const BET_SEED = Buffer.from("bet");
const VAULT_SEED = Buffer.from("vault");

// ============================================================================
// Client Class
// ============================================================================

export class GemBotsBettingClient {
  public program: Program;
  public provider: AnchorProvider;
  public programId: PublicKey;

  constructor(provider: AnchorProvider, idl: Idl, programId: PublicKey) {
    this.provider = provider;
    this.programId = programId;
    this.program = new Program(idl, provider);
  }

  // ==========================================================================
  // PDA Derivation
  // ==========================================================================

  getPlatformConfigPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [PLATFORM_SEED],
      this.programId
    );
  }

  getPoolPDA(matchId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [POOL_SEED, Buffer.from(matchId)],
      this.programId
    );
  }

  getVaultPDA(poolPubkey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [VAULT_SEED, poolPubkey.toBuffer()],
      this.programId
    );
  }

  getBetPDA(poolPubkey: PublicKey, bettor: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [BET_SEED, poolPubkey.toBuffer(), bettor.toBuffer()],
      this.programId
    );
  }

  // ==========================================================================
  // Instructions
  // ==========================================================================

  /**
   * Initialize platform config. Call once after deploy.
   */
  async initialize(
    treasury: PublicKey,
    defaultFeeBps: number = 500,
  ): Promise<string> {
    const [platformConfig] = this.getPlatformConfigPDA();

    const tx = await (this.program.methods as any)
      .initialize(treasury, defaultFeeBps)
      .accounts({
        platformConfig,
        authority: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Update platform config (authority only).
   */
  async updateConfig(params: {
    newTreasury?: PublicKey;
    newFeeBps?: number;
    newAuthority?: PublicKey;
  }): Promise<string> {
    const [platformConfig] = this.getPlatformConfigPDA();

    const tx = await (this.program.methods as any)
      .updateConfig(
        params.newTreasury ?? null,
        params.newFeeBps ?? null,
        params.newAuthority ?? null,
      )
      .accounts({
        platformConfig,
        authority: this.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Create a new betting pool for a match.
   */
  async createPool(
    matchId: string,
    botAName: string,
    botBName: string,
    customFeeBps?: number,
  ): Promise<{ tx: string; poolAddress: PublicKey; vaultAddress: PublicKey }> {
    const [platformConfig] = this.getPlatformConfigPDA();
    const [bettingPool] = this.getPoolPDA(matchId);
    const [vault] = this.getVaultPDA(bettingPool);

    const tx = await (this.program.methods as any)
      .createPool(matchId, botAName, botBName, customFeeBps ?? null)
      .accounts({
        platformConfig,
        bettingPool,
        vault,
        authority: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { tx, poolAddress: bettingPool, vaultAddress: vault };
  }

  /**
   * Place a bet on a match.
   * @param matchId - The match identifier
   * @param side - Side.A or Side.B
   * @param amountSol - Amount in SOL (e.g. 0.5)
   */
  async placeBet(
    matchId: string,
    side: Side,
    amountSol: number,
  ): Promise<{ tx: string; betAddress: PublicKey }> {
    const [platformConfig] = this.getPlatformConfigPDA();
    const [bettingPool] = this.getPoolPDA(matchId);
    const [vault] = this.getVaultPDA(bettingPool);
    const bettor = this.provider.wallet.publicKey;
    const [bet] = this.getBetPDA(bettingPool, bettor);

    const sideArg = side === Side.A ? { a: {} } : { b: {} };
    const amountLamports = new BN(Math.floor(amountSol * LAMPORTS_PER_SOL));

    const tx = await (this.program.methods as any)
      .placeBet(sideArg, amountLamports)
      .accounts({
        platformConfig,
        bettingPool,
        vault,
        bet,
        bettor,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { tx, betAddress: bet };
  }

  /**
   * Lock a pool (no more bets). Authority only.
   */
  async lockPool(matchId: string): Promise<string> {
    const [platformConfig] = this.getPlatformConfigPDA();
    const [bettingPool] = this.getPoolPDA(matchId);

    const tx = await (this.program.methods as any)
      .lockPool()
      .accounts({
        platformConfig,
        bettingPool,
        authority: this.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Resolve a match — declare winner. Authority only.
   */
  async resolve(matchId: string, winner: Side): Promise<string> {
    const [platformConfig] = this.getPlatformConfigPDA();
    const [bettingPool] = this.getPoolPDA(matchId);

    const winnerArg = winner === Side.A ? { a: {} } : { b: {} };

    const tx = await (this.program.methods as any)
      .resolve(winnerArg)
      .accounts({
        platformConfig,
        bettingPool,
        authority: this.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Claim payout for a winning bet.
   */
  async claim(matchId: string): Promise<string> {
    const [bettingPool] = this.getPoolPDA(matchId);
    const [vault] = this.getVaultPDA(bettingPool);
    const bettor = this.provider.wallet.publicKey;
    const [bet] = this.getBetPDA(bettingPool, bettor);

    const tx = await (this.program.methods as any)
      .claim()
      .accounts({
        bettingPool,
        vault,
        bet,
        pool: bettingPool,
        bettor,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Cancel a match. Authority only.
   */
  async cancel(matchId: string): Promise<string> {
    const [platformConfig] = this.getPlatformConfigPDA();
    const [bettingPool] = this.getPoolPDA(matchId);

    const tx = await (this.program.methods as any)
      .cancel()
      .accounts({
        platformConfig,
        bettingPool,
        authority: this.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Claim refund for a cancelled match.
   */
  async claimRefund(matchId: string): Promise<string> {
    const [bettingPool] = this.getPoolPDA(matchId);
    const [vault] = this.getVaultPDA(bettingPool);
    const bettor = this.provider.wallet.publicKey;
    const [bet] = this.getBetPDA(bettingPool, bettor);

    const tx = await (this.program.methods as any)
      .claimRefund()
      .accounts({
        bettingPool,
        vault,
        bet,
        pool: bettingPool,
        bettor,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Collect platform fees from a resolved pool. Authority only.
   */
  async collectFees(matchId: string): Promise<string> {
    const [platformConfig] = this.getPlatformConfigPDA();
    const [bettingPool] = this.getPoolPDA(matchId);
    const [vault] = this.getVaultPDA(bettingPool);

    const config = await this.getPlatformConfig();

    const tx = await (this.program.methods as any)
      .collectFees()
      .accounts({
        platformConfig,
        bettingPool,
        vault,
        treasury: config.treasury,
        authority: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Close a claimed bet account to reclaim rent.
   */
  async closeBet(matchId: string): Promise<string> {
    const [bettingPool] = this.getPoolPDA(matchId);
    const bettor = this.provider.wallet.publicKey;
    const [bet] = this.getBetPDA(bettingPool, bettor);

    const tx = await (this.program.methods as any)
      .closeBet()
      .accounts({
        bettingPool,
        bet,
        bettor,
      })
      .rpc();

    return tx;
  }

  // ==========================================================================
  // Fetch Accounts (Queries)
  // ==========================================================================

  /**
   * Get platform config.
   */
  async getPlatformConfig(): Promise<PlatformConfigAccount> {
    const [pda] = this.getPlatformConfigPDA();
    return await (this.program.account as any).platformConfig.fetch(pda);
  }

  /**
   * Get a betting pool by match ID.
   */
  async getPool(matchId: string): Promise<BettingPoolAccount> {
    const [pda] = this.getPoolPDA(matchId);
    return await (this.program.account as any).bettingPool.fetch(pda);
  }

  /**
   * Get pool info formatted for frontend display.
   */
  async getPoolInfo(matchId: string): Promise<PoolInfo> {
    const [pda] = this.getPoolPDA(matchId);
    const raw = await this.getPool(matchId);
    return this.formatPoolInfo(pda, raw);
  }

  /**
   * Get a bet by match ID and bettor.
   */
  async getBet(matchId: string, bettor?: PublicKey): Promise<BetAccount> {
    const [poolPda] = this.getPoolPDA(matchId);
    const bettorKey = bettor ?? this.provider.wallet.publicKey;
    const [betPda] = this.getBetPDA(poolPda, bettorKey);
    return await (this.program.account as any).bet.fetch(betPda);
  }

  /**
   * Get bet info formatted for frontend display.
   */
  async getBetInfo(matchId: string, bettor?: PublicKey): Promise<BetInfo> {
    const [poolPda] = this.getPoolPDA(matchId);
    const bettorKey = bettor ?? this.provider.wallet.publicKey;
    const [betPda] = this.getBetPDA(poolPda, bettorKey);
    const raw = await this.getBet(matchId, bettorKey);
    return this.formatBetInfo(betPda, raw);
  }

  /**
   * Check if a bet exists for a given match and bettor.
   */
  async betExists(matchId: string, bettor?: PublicKey): Promise<boolean> {
    try {
      await this.getBet(matchId, bettor);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all pools (fetches all BettingPool accounts).
   */
  async getAllPools(): Promise<PoolInfo[]> {
    const accounts = await (this.program.account as any).bettingPool.all();
    return accounts.map((a: any) => this.formatPoolInfo(a.publicKey, a.account));
  }

  /**
   * Get all open pools.
   */
  async getOpenPools(): Promise<PoolInfo[]> {
    const all = await this.getAllPools();
    return all.filter((p) => p.status === PoolStatus.Open);
  }

  /**
   * Get all bets by a specific bettor.
   */
  async getBetsByBettor(bettor?: PublicKey): Promise<BetInfo[]> {
    const bettorKey = bettor ?? this.provider.wallet.publicKey;
    const accounts = await (this.program.account as any).bet.all([
      {
        memcmp: {
          offset: 8 + 32, // after discriminator + pool pubkey
          bytes: bettorKey.toBase58(),
        },
      },
    ]);
    return accounts.map((a: any) => this.formatBetInfo(a.publicKey, a.account));
  }

  /**
   * Get vault balance for a pool.
   */
  async getVaultBalance(matchId: string): Promise<number> {
    const [poolPda] = this.getPoolPDA(matchId);
    const [vaultPda] = this.getVaultPDA(poolPda);
    const balance = await this.provider.connection.getBalance(vaultPda);
    return balance / LAMPORTS_PER_SOL;
  }

  // ==========================================================================
  // Payout Calculation (client-side preview)
  // ==========================================================================

  /**
   * Calculate expected payout for a potential bet.
   */
  calculateExpectedPayout(
    betAmount: number,
    totalPoolA: number,
    totalPoolB: number,
    side: Side,
    feeBps: number = 500,
  ): { payout: number; multiplier: number; odds: string } {
    const totalPool = totalPoolA + totalPoolB + betAmount;
    const winningPool = (side === Side.A ? totalPoolA : totalPoolB) + betAmount;

    const feeMultiplier = (10000 - feeBps) / 10000;
    const payout = (betAmount / winningPool) * totalPool * feeMultiplier;
    const multiplier = payout / betAmount;

    // Format odds
    const probability = winningPool / totalPool;
    const decimalOdds = 1 / probability;

    return {
      payout: Math.floor(payout * 1e9) / 1e9, // round to lamport precision
      multiplier: Math.round(multiplier * 100) / 100,
      odds: decimalOdds.toFixed(2),
    };
  }

  /**
   * Calculate payout for an existing bet on a resolved pool.
   */
  calculateClaimPayout(
    betAmount: number,
    totalPoolA: number,
    totalPoolB: number,
    winner: Side,
    feeBps: number,
  ): number {
    const totalPool = totalPoolA + totalPoolB;
    const winningPool = winner === Side.A ? totalPoolA : totalPoolB;
    if (winningPool === 0) return 0;

    const feeMultiplier = (10000 - feeBps) / 10000;
    return (betAmount / winningPool) * totalPool * feeMultiplier;
  }

  // ==========================================================================
  // Formatting Helpers
  // ==========================================================================

  private formatPoolInfo(address: PublicKey, raw: BettingPoolAccount): PoolInfo {
    let status: PoolStatus;
    if (raw.status.open) status = PoolStatus.Open;
    else if (raw.status.locked) status = PoolStatus.Locked;
    else if (raw.status.resolved) status = PoolStatus.Resolved;
    else status = PoolStatus.Cancelled;

    let winner: Side | null = null;
    if (raw.winner) {
      winner = raw.winner.a ? Side.A : Side.B;
    }

    return {
      address,
      matchId: raw.matchId,
      botAName: raw.botAName,
      botBName: raw.botBName,
      poolA: raw.poolA.toNumber() / LAMPORTS_PER_SOL,
      poolB: raw.poolB.toNumber() / LAMPORTS_PER_SOL,
      totalBets: raw.totalBets,
      status,
      winner,
      feeBps: raw.platformFeeBps,
      createdAt: new Date(raw.createdAt.toNumber() * 1000),
      resolvedAt: raw.resolvedAt ? new Date(raw.resolvedAt.toNumber() * 1000) : null,
    };
  }

  private formatBetInfo(address: PublicKey, raw: BetAccount): BetInfo {
    const side = raw.side.a ? Side.A : Side.B;
    return {
      address,
      pool: raw.pool,
      bettor: raw.bettor,
      side,
      amount: raw.amount.toNumber() / LAMPORTS_PER_SOL,
      claimed: raw.claimed,
      payout: raw.payout.toNumber() / LAMPORTS_PER_SOL,
      timestamp: new Date(raw.timestamp.toNumber() * 1000),
    };
  }
}

// ============================================================================
// Utility: Create client from connection + wallet
// ============================================================================

export function createBettingClient(
  connection: Connection,
  wallet: Wallet,
  idl: Idl,
  programId: PublicKey,
): GemBotsBettingClient {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  return new GemBotsBettingClient(provider, idl, programId);
}

// ============================================================================
// Default Treasury
// ============================================================================

export const GEMBOTS_TREASURY = new PublicKey(
  "DjJK5pTtDPYtaqwSGQLaUjEQmGwqu3JZxXpVV6hixpR1"
);

export const DEFAULT_FEE_BPS = 500; // 5%
