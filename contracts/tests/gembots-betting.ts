import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import { expect } from "chai";

// Import the generated types (from `anchor build`)
// In tests, Anchor auto-loads the IDL
const GemBotsBetting = anchor.workspace.GemBotsBetting;

// ============================================================================
// Seeds
// ============================================================================
const PLATFORM_SEED = Buffer.from("platform");
const POOL_SEED = Buffer.from("pool");
const BET_SEED = Buffer.from("bet");
const VAULT_SEED = Buffer.from("vault");

// ============================================================================
// Helpers
// ============================================================================

function getPlatformConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([PLATFORM_SEED], programId);
}

function getPoolPDA(matchId: string, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POOL_SEED, Buffer.from(matchId)],
    programId
  );
}

function getVaultPDA(poolPubkey: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, poolPubkey.toBuffer()],
    programId
  );
}

function getBetPDA(
  poolPubkey: PublicKey,
  bettor: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BET_SEED, poolPubkey.toBuffer(), bettor.toBuffer()],
    programId
  );
}

async function airdrop(
  connection: anchor.web3.Connection,
  to: PublicKey,
  amount: number
) {
  const sig = await connection.requestAirdrop(to, amount * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}

// ============================================================================
// Tests
// ============================================================================

describe("gembots-betting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GemBotsBetting as Program;
  const programId = program.programId;

  // Wallets
  const authority = provider.wallet; // deployer = authority
  const treasury = Keypair.generate();
  const bettor1 = Keypair.generate();
  const bettor2 = Keypair.generate();
  const bettor3 = Keypair.generate();
  const randomUser = Keypair.generate();

  const matchId = "match-test-001";
  const matchId2 = "match-cancel-002";

  // PDAs
  const [platformConfigPDA] = getPlatformConfigPDA(programId);
  const [poolPDA] = getPoolPDA(matchId, programId);
  const [vaultPDA] = getVaultPDA(poolPDA, programId);
  const [pool2PDA] = getPoolPDA(matchId2, programId);
  const [vault2PDA] = getVaultPDA(pool2PDA, programId);

  before(async () => {
    // Airdrop SOL to test wallets
    await airdrop(provider.connection, bettor1.publicKey, 10);
    await airdrop(provider.connection, bettor2.publicKey, 10);
    await airdrop(provider.connection, bettor3.publicKey, 10);
    await airdrop(provider.connection, randomUser.publicKey, 2);
    await airdrop(provider.connection, treasury.publicKey, 0.1);
  });

  // ==========================================================================
  // Initialize
  // ==========================================================================

  describe("initialize", () => {
    it("initializes platform config", async () => {
      const tx = await program.methods
        .initialize(treasury.publicKey, 500)
        .accounts({
          platformConfig: platformConfigPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await (program.account as any).platformConfig.fetch(
        platformConfigPDA
      );
      expect(config.authority.toString()).to.equal(
        authority.publicKey.toString()
      );
      expect(config.treasury.toString()).to.equal(
        treasury.publicKey.toString()
      );
      expect(config.defaultFeeBps).to.equal(500);
      expect(config.totalVolume.toNumber()).to.equal(0);
      expect(config.totalMatches.toNumber()).to.equal(0);
    });

    it("fails to initialize twice", async () => {
      try {
        await program.methods
          .initialize(treasury.publicKey, 500)
          .accounts({
            platformConfig: platformConfigPDA,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        // Account already exists error
        expect(err.toString()).to.include("already in use");
      }
    });

    it("rejects fee > 20%", async () => {
      // Can't test directly because initialize already succeeded.
      // Test via updateConfig instead.
      try {
        await program.methods
          .updateConfig(null, 2500, null) // 25% > 20% max
          .accounts({
            platformConfig: platformConfigPDA,
            authority: authority.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("FeeTooHigh");
      }
    });
  });

  // ==========================================================================
  // Create Pool
  // ==========================================================================

  describe("create_pool", () => {
    it("creates a betting pool", async () => {
      const tx = await program.methods
        .createPool(matchId, "NeonViper", "CyberFang", null)
        .accounts({
          platformConfig: platformConfigPDA,
          bettingPool: poolPDA,
          vault: vaultPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const pool = await (program.account as any).bettingPool.fetch(poolPDA);
      expect(pool.matchId).to.equal(matchId);
      expect(pool.botAName).to.equal("NeonViper");
      expect(pool.botBName).to.equal("CyberFang");
      expect(pool.poolA.toNumber()).to.equal(0);
      expect(pool.poolB.toNumber()).to.equal(0);
      expect(pool.totalBets).to.equal(0);
      expect(pool.status.open).to.not.be.undefined;
      expect(pool.winner).to.be.null;
      expect(pool.platformFeeBps).to.equal(500);
      expect(pool.feesCollected).to.be.false;

      // Check platform stats updated
      const config = await (program.account as any).platformConfig.fetch(
        platformConfigPDA
      );
      expect(config.totalMatches.toNumber()).to.equal(1);
    });

    it("creates a second pool (for cancel tests)", async () => {
      await program.methods
        .createPool(matchId2, "DragonMech", "LaserHawk", 300) // custom 3% fee
        .accounts({
          platformConfig: platformConfigPDA,
          bettingPool: pool2PDA,
          vault: vault2PDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const pool = await (program.account as any).bettingPool.fetch(pool2PDA);
      expect(pool.platformFeeBps).to.equal(300);
    });

    it("rejects non-authority creating pool", async () => {
      try {
        const fakeMatchId = "fake-match";
        const [fakePool] = getPoolPDA(fakeMatchId, programId);
        const [fakeVault] = getVaultPDA(fakePool, programId);

        await program.methods
          .createPool(fakeMatchId, "A", "B", null)
          .accounts({
            platformConfig: platformConfigPDA,
            bettingPool: fakePool,
            vault: fakeVault,
            authority: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        // has_one = authority constraint
        expect(err.toString()).to.include("ConstraintHasOne");
      }
    });
  });

  // ==========================================================================
  // Place Bet
  // ==========================================================================

  describe("place_bet", () => {
    it("bettor1 bets 1 SOL on side A", async () => {
      const [betPDA] = getBetPDA(poolPDA, bettor1.publicKey, programId);

      await program.methods
        .placeBet({ a: {} }, new BN(1 * LAMPORTS_PER_SOL))
        .accounts({
          platformConfig: platformConfigPDA,
          bettingPool: poolPDA,
          vault: vaultPDA,
          bet: betPDA,
          bettor: bettor1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc();

      const bet = await (program.account as any).bet.fetch(betPDA);
      expect(bet.side.a).to.not.be.undefined;
      expect(bet.amount.toNumber()).to.equal(1 * LAMPORTS_PER_SOL);
      expect(bet.claimed).to.be.false;

      const pool = await (program.account as any).bettingPool.fetch(poolPDA);
      expect(pool.poolA.toNumber()).to.equal(1 * LAMPORTS_PER_SOL);
      expect(pool.poolB.toNumber()).to.equal(0);
      expect(pool.totalBets).to.equal(1);

      // Vault should have the SOL
      const vaultBalance = await provider.connection.getBalance(vaultPDA);
      expect(vaultBalance).to.be.greaterThanOrEqual(1 * LAMPORTS_PER_SOL);
    });

    it("bettor2 bets 2 SOL on side B", async () => {
      const [betPDA] = getBetPDA(poolPDA, bettor2.publicKey, programId);

      await program.methods
        .placeBet({ b: {} }, new BN(2 * LAMPORTS_PER_SOL))
        .accounts({
          platformConfig: platformConfigPDA,
          bettingPool: poolPDA,
          vault: vaultPDA,
          bet: betPDA,
          bettor: bettor2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor2])
        .rpc();

      const pool = await (program.account as any).bettingPool.fetch(poolPDA);
      expect(pool.poolA.toNumber()).to.equal(1 * LAMPORTS_PER_SOL);
      expect(pool.poolB.toNumber()).to.equal(2 * LAMPORTS_PER_SOL);
      expect(pool.totalBets).to.equal(2);
    });

    it("bettor3 bets 1 SOL on side A", async () => {
      const [betPDA] = getBetPDA(poolPDA, bettor3.publicKey, programId);

      await program.methods
        .placeBet({ a: {} }, new BN(1 * LAMPORTS_PER_SOL))
        .accounts({
          platformConfig: platformConfigPDA,
          bettingPool: poolPDA,
          vault: vaultPDA,
          bet: betPDA,
          bettor: bettor3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor3])
        .rpc();

      const pool = await (program.account as any).bettingPool.fetch(poolPDA);
      expect(pool.poolA.toNumber()).to.equal(2 * LAMPORTS_PER_SOL);
      expect(pool.poolB.toNumber()).to.equal(2 * LAMPORTS_PER_SOL);
      expect(pool.totalBets).to.equal(3);
    });

    it("rejects duplicate bet from same user", async () => {
      try {
        const [betPDA] = getBetPDA(poolPDA, bettor1.publicKey, programId);

        await program.methods
          .placeBet({ a: {} }, new BN(0.5 * LAMPORTS_PER_SOL))
          .accounts({
            platformConfig: platformConfigPDA,
            bettingPool: poolPDA,
            vault: vaultPDA,
            bet: betPDA,
            bettor: bettor1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([bettor1])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        // PDA already initialized
        expect(err.toString()).to.include("already in use");
      }
    });

    it("rejects bet below minimum (0.01 SOL)", async () => {
      try {
        const [betPDA] = getBetPDA(poolPDA, randomUser.publicKey, programId);

        await program.methods
          .placeBet({ a: {} }, new BN(1000)) // 0.000001 SOL
          .accounts({
            platformConfig: platformConfigPDA,
            bettingPool: poolPDA,
            vault: vaultPDA,
            bet: betPDA,
            bettor: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("BetTooSmall");
      }
    });

    it("places bets on pool 2 (for cancel test)", async () => {
      const [bet1PDA] = getBetPDA(pool2PDA, bettor1.publicKey, programId);
      const [bet2PDA] = getBetPDA(pool2PDA, bettor2.publicKey, programId);

      await program.methods
        .placeBet({ a: {} }, new BN(0.5 * LAMPORTS_PER_SOL))
        .accounts({
          platformConfig: platformConfigPDA,
          bettingPool: pool2PDA,
          vault: vault2PDA,
          bet: bet1PDA,
          bettor: bettor1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc();

      await program.methods
        .placeBet({ b: {} }, new BN(0.5 * LAMPORTS_PER_SOL))
        .accounts({
          platformConfig: platformConfigPDA,
          bettingPool: pool2PDA,
          vault: vault2PDA,
          bet: bet2PDA,
          bettor: bettor2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor2])
        .rpc();
    });
  });

  // ==========================================================================
  // Lock Pool
  // ==========================================================================

  describe("lock_pool", () => {
    it("locks the pool", async () => {
      await program.methods
        .lockPool()
        .accounts({
          platformConfig: platformConfigPDA,
          bettingPool: poolPDA,
          authority: authority.publicKey,
        })
        .rpc();

      const pool = await (program.account as any).bettingPool.fetch(poolPDA);
      expect(pool.status.locked).to.not.be.undefined;
    });

    it("rejects bet on locked pool", async () => {
      try {
        const [betPDA] = getBetPDA(poolPDA, randomUser.publicKey, programId);

        await program.methods
          .placeBet({ a: {} }, new BN(0.1 * LAMPORTS_PER_SOL))
          .accounts({
            platformConfig: platformConfigPDA,
            bettingPool: poolPDA,
            vault: vaultPDA,
            bet: betPDA,
            bettor: randomUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("PoolNotOpen");
      }
    });

    it("rejects double lock", async () => {
      try {
        await program.methods
          .lockPool()
          .accounts({
            platformConfig: platformConfigPDA,
            bettingPool: poolPDA,
            authority: authority.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("PoolNotOpen");
      }
    });
  });

  // ==========================================================================
  // Resolve
  // ==========================================================================

  describe("resolve", () => {
    it("resolves match with side A as winner", async () => {
      await program.methods
        .resolve({ a: {} })
        .accounts({
          platformConfig: platformConfigPDA,
          bettingPool: poolPDA,
          authority: authority.publicKey,
        })
        .rpc();

      const pool = await (program.account as any).bettingPool.fetch(poolPDA);
      expect(pool.status.resolved).to.not.be.undefined;
      expect(pool.winner.a).to.not.be.undefined;
      expect(pool.resolvedAt).to.not.be.null;
    });

    it("rejects resolve on already resolved pool", async () => {
      try {
        await program.methods
          .resolve({ b: {} })
          .accounts({
            platformConfig: platformConfigPDA,
            bettingPool: poolPDA,
            authority: authority.publicKey,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("PoolNotResolvable");
      }
    });

    it("rejects non-authority resolve", async () => {
      // Already resolved, but test auth check on pool2 which is still open
      try {
        await program.methods
          .resolve({ a: {} })
          .accounts({
            platformConfig: platformConfigPDA,
            bettingPool: pool2PDA,
            authority: randomUser.publicKey,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("ConstraintHasOne");
      }
    });
  });

  // ==========================================================================
  // Claim
  // ==========================================================================

  describe("claim", () => {
    // Pool state: pool_a = 2 SOL, pool_b = 2 SOL, winner = A, fee = 5%
    // Total = 4 SOL. Winning pool = 2 SOL.
    // bettor1 (1 SOL on A): payout = (1/2) * 4 * 0.95 = 1.9 SOL
    // bettor3 (1 SOL on A): payout = (1/2) * 4 * 0.95 = 1.9 SOL
    // bettor2 (2 SOL on B): loser, no payout

    it("bettor1 claims winning payout", async () => {
      const [betPDA] = getBetPDA(poolPDA, bettor1.publicKey, programId);

      const balanceBefore = await provider.connection.getBalance(
        bettor1.publicKey
      );

      await program.methods
        .claim()
        .accounts({
          bettingPool: poolPDA,
          vault: vaultPDA,
          bet: betPDA,
          pool: poolPDA,
          bettor: bettor1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc();

      const balanceAfter = await provider.connection.getBalance(
        bettor1.publicKey
      );
      const bet = await (program.account as any).bet.fetch(betPDA);

      expect(bet.claimed).to.be.true;
      // Expected payout: 1.9 SOL (minus tx fee)
      expect(bet.payout.toNumber()).to.equal(1.9 * LAMPORTS_PER_SOL);

      // Balance should have increased by ~1.9 SOL (minus tx fee)
      const gain = balanceAfter - balanceBefore;
      expect(gain).to.be.greaterThan(1.89 * LAMPORTS_PER_SOL);
      expect(gain).to.be.lessThan(1.91 * LAMPORTS_PER_SOL);
    });

    it("bettor3 claims winning payout", async () => {
      const [betPDA] = getBetPDA(poolPDA, bettor3.publicKey, programId);

      await program.methods
        .claim()
        .accounts({
          bettingPool: poolPDA,
          vault: vaultPDA,
          bet: betPDA,
          pool: poolPDA,
          bettor: bettor3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor3])
        .rpc();

      const bet = await (program.account as any).bet.fetch(betPDA);
      expect(bet.claimed).to.be.true;
      expect(bet.payout.toNumber()).to.equal(1.9 * LAMPORTS_PER_SOL);
    });

    it("rejects double claim", async () => {
      try {
        const [betPDA] = getBetPDA(poolPDA, bettor1.publicKey, programId);

        await program.methods
          .claim()
          .accounts({
            bettingPool: poolPDA,
            vault: vaultPDA,
            bet: betPDA,
            pool: poolPDA,
            bettor: bettor1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([bettor1])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("AlreadyClaimed");
      }
    });

    it("rejects loser claim", async () => {
      try {
        const [betPDA] = getBetPDA(poolPDA, bettor2.publicKey, programId);

        await program.methods
          .claim()
          .accounts({
            bettingPool: poolPDA,
            vault: vaultPDA,
            bet: betPDA,
            pool: poolPDA,
            bettor: bettor2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([bettor2])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("NotWinner");
      }
    });
  });

  // ==========================================================================
  // Collect Fees
  // ==========================================================================

  describe("collect_fees", () => {
    // Losing pool = 2 SOL. Fee = 5% of 2 SOL = 0.1 SOL

    it("collects fees to treasury", async () => {
      const treasuryBefore = await provider.connection.getBalance(
        treasury.publicKey
      );

      await program.methods
        .collectFees()
        .accounts({
          platformConfig: platformConfigPDA,
          bettingPool: poolPDA,
          vault: vaultPDA,
          treasury: treasury.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const treasuryAfter = await provider.connection.getBalance(
        treasury.publicKey
      );
      const pool = await (program.account as any).bettingPool.fetch(poolPDA);

      expect(pool.feesCollected).to.be.true;

      const feeReceived = treasuryAfter - treasuryBefore;
      // Fee = 2 SOL (losing pool) * 500 / 10000 = 0.1 SOL
      expect(feeReceived).to.equal(0.1 * LAMPORTS_PER_SOL);
    });

    it("rejects double fee collection", async () => {
      try {
        await program.methods
          .collectFees()
          .accounts({
            platformConfig: platformConfigPDA,
            bettingPool: poolPDA,
            vault: vaultPDA,
            treasury: treasury.publicKey,
            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("FeesAlreadyCollected");
      }
    });
  });

  // ==========================================================================
  // Cancel + Refund
  // ==========================================================================

  describe("cancel & claim_refund", () => {
    it("cancels pool 2", async () => {
      await program.methods
        .cancel()
        .accounts({
          platformConfig: platformConfigPDA,
          bettingPool: pool2PDA,
          authority: authority.publicKey,
        })
        .rpc();

      const pool = await (program.account as any).bettingPool.fetch(pool2PDA);
      expect(pool.status.cancelled).to.not.be.undefined;
    });

    it("bettor1 claims refund from cancelled pool", async () => {
      const [betPDA] = getBetPDA(pool2PDA, bettor1.publicKey, programId);

      const balanceBefore = await provider.connection.getBalance(
        bettor1.publicKey
      );

      await program.methods
        .claimRefund()
        .accounts({
          bettingPool: pool2PDA,
          vault: vault2PDA,
          bet: betPDA,
          pool: pool2PDA,
          bettor: bettor1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor1])
        .rpc();

      const balanceAfter = await provider.connection.getBalance(
        bettor1.publicKey
      );
      const bet = await (program.account as any).bet.fetch(betPDA);

      expect(bet.claimed).to.be.true;
      expect(bet.payout.toNumber()).to.equal(0.5 * LAMPORTS_PER_SOL);

      // Got back 0.5 SOL minus tx fee
      const gain = balanceAfter - balanceBefore;
      expect(gain).to.be.greaterThan(0.49 * LAMPORTS_PER_SOL);
    });

    it("bettor2 claims refund from cancelled pool", async () => {
      const [betPDA] = getBetPDA(pool2PDA, bettor2.publicKey, programId);

      await program.methods
        .claimRefund()
        .accounts({
          bettingPool: pool2PDA,
          vault: vault2PDA,
          bet: betPDA,
          pool: pool2PDA,
          bettor: bettor2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([bettor2])
        .rpc();

      const bet = await (program.account as any).bet.fetch(betPDA);
      expect(bet.claimed).to.be.true;
      expect(bet.payout.toNumber()).to.equal(0.5 * LAMPORTS_PER_SOL);
    });

    it("rejects refund on non-cancelled pool", async () => {
      try {
        const [betPDA] = getBetPDA(poolPDA, bettor2.publicKey, programId);

        await program.methods
          .claimRefund()
          .accounts({
            bettingPool: poolPDA,
            vault: vaultPDA,
            bet: betPDA,
            pool: poolPDA,
            bettor: bettor2.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([bettor2])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("PoolNotCancelled");
      }
    });

    it("rejects double refund", async () => {
      try {
        const [betPDA] = getBetPDA(pool2PDA, bettor1.publicKey, programId);

        await program.methods
          .claimRefund()
          .accounts({
            bettingPool: pool2PDA,
            vault: vault2PDA,
            bet: betPDA,
            pool: pool2PDA,
            bettor: bettor1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([bettor1])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("AlreadyClaimed");
      }
    });
  });

  // ==========================================================================
  // Close Bet
  // ==========================================================================

  describe("close_bet", () => {
    it("closes a claimed bet account (reclaim rent)", async () => {
      const [betPDA] = getBetPDA(poolPDA, bettor1.publicKey, programId);

      const balanceBefore = await provider.connection.getBalance(
        bettor1.publicKey
      );

      await program.methods
        .closeBet()
        .accounts({
          bettingPool: poolPDA,
          bet: betPDA,
          bettor: bettor1.publicKey,
        })
        .signers([bettor1])
        .rpc();

      const balanceAfter = await provider.connection.getBalance(
        bettor1.publicKey
      );

      // Got rent back
      expect(balanceAfter).to.be.greaterThan(balanceBefore);

      // Account should no longer exist
      const info = await provider.connection.getAccountInfo(betPDA);
      expect(info).to.be.null;
    });
  });

  // ==========================================================================
  // Update Config
  // ==========================================================================

  describe("update_config", () => {
    it("updates treasury", async () => {
      const newTreasury = Keypair.generate();

      await program.methods
        .updateConfig(newTreasury.publicKey, null, null)
        .accounts({
          platformConfig: platformConfigPDA,
          authority: authority.publicKey,
        })
        .rpc();

      const config = await (program.account as any).platformConfig.fetch(
        platformConfigPDA
      );
      expect(config.treasury.toString()).to.equal(
        newTreasury.publicKey.toString()
      );

      // Restore original treasury
      await program.methods
        .updateConfig(treasury.publicKey, null, null)
        .accounts({
          platformConfig: platformConfigPDA,
          authority: authority.publicKey,
        })
        .rpc();
    });

    it("updates fee", async () => {
      await program.methods
        .updateConfig(null, 300, null)
        .accounts({
          platformConfig: platformConfigPDA,
          authority: authority.publicKey,
        })
        .rpc();

      const config = await (program.account as any).platformConfig.fetch(
        platformConfigPDA
      );
      expect(config.defaultFeeBps).to.equal(300);

      // Restore
      await program.methods
        .updateConfig(null, 500, null)
        .accounts({
          platformConfig: platformConfigPDA,
          authority: authority.publicKey,
        })
        .rpc();
    });

    it("rejects non-authority update", async () => {
      try {
        await program.methods
          .updateConfig(null, 100, null)
          .accounts({
            platformConfig: platformConfigPDA,
            authority: randomUser.publicKey,
          })
          .signers([randomUser])
          .rpc();
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.toString()).to.include("ConstraintHasOne");
      }
    });
  });

  // ==========================================================================
  // Edge Cases & Payout Math
  // ==========================================================================

  describe("payout math verification", () => {
    it("verifies payout formula with known values", () => {
      // Pool: 2 SOL on A, 2 SOL on B. Winner = A. Fee = 5%.
      // bettor1: 1 SOL on A
      // Expected: (1 / 2) * 4 * 0.95 = 1.9 SOL
      const betAmount = 1 * LAMPORTS_PER_SOL;
      const totalPool = 4 * LAMPORTS_PER_SOL;
      const winningPool = 2 * LAMPORTS_PER_SOL;
      const feeBps = 500;

      const numerator =
        BigInt(betAmount) * BigInt(totalPool) * BigInt(10000 - feeBps);
      const denominator = BigInt(winningPool) * BigInt(10000);
      const payout = Number(numerator / denominator);

      expect(payout).to.equal(1.9 * LAMPORTS_PER_SOL);
    });

    it("handles uneven pools correctly", () => {
      // 1 SOL on A, 3 SOL on B. Winner = A. Fee = 5%.
      // Bettor bet 1 SOL on A.
      // Payout = (1/1) * 4 * 0.95 = 3.8 SOL
      const betAmount = 1 * LAMPORTS_PER_SOL;
      const totalPool = 4 * LAMPORTS_PER_SOL;
      const winningPool = 1 * LAMPORTS_PER_SOL;
      const feeBps = 500;

      const numerator =
        BigInt(betAmount) * BigInt(totalPool) * BigInt(10000 - feeBps);
      const denominator = BigInt(winningPool) * BigInt(10000);
      const payout = Number(numerator / denominator);

      expect(payout).to.equal(3.8 * LAMPORTS_PER_SOL);
    });

    it("handles no losing side (everyone on same side)", () => {
      // 4 SOL on A, 0 SOL on B. Winner = A. Fee = 5%.
      // Bettor bet 2 SOL on A.
      // Payout = (2/4) * 4 * 0.95 = 1.9 SOL
      // (they get back less than they bet because of fee — edge case!)
      const betAmount = 2 * LAMPORTS_PER_SOL;
      const totalPool = 4 * LAMPORTS_PER_SOL;
      const winningPool = 4 * LAMPORTS_PER_SOL;
      const feeBps = 500;

      const numerator =
        BigInt(betAmount) * BigInt(totalPool) * BigInt(10000 - feeBps);
      const denominator = BigInt(winningPool) * BigInt(10000);
      const payout = Number(numerator / denominator);

      // 1.9 SOL — less than 2 SOL bet! Fee eats into capital.
      // NOTE: In the contract, fees are only collected from losing pool,
      // so this scenario won't actually deduct a fee.
      // The contract's collectFees checks losing_pool == 0 and skips.
      expect(payout).to.equal(1.9 * LAMPORTS_PER_SOL);
    });
  });

  // ==========================================================================
  // Platform Stats
  // ==========================================================================

  describe("platform stats", () => {
    it("tracks total volume", async () => {
      const config = await (program.account as any).platformConfig.fetch(
        platformConfigPDA
      );
      // bettor1: 1 SOL + bettor2: 2 SOL + bettor3: 1 SOL + pool2: 0.5 + 0.5 = 5 SOL
      expect(config.totalVolume.toNumber()).to.equal(5 * LAMPORTS_PER_SOL);
    });

    it("tracks total matches", async () => {
      const config = await (program.account as any).platformConfig.fetch(
        platformConfigPDA
      );
      expect(config.totalMatches.toNumber()).to.equal(2);
    });
  });
});
