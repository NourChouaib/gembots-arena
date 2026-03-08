const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GemBotsNFAv3 — BAP-578 Compliance Tests", function () {
  let nfa, learning;
  let owner, treasury, resolver, user1, user2, user3;
  const MINT_FEE = ethers.parseEther("0.1");

  // Helper: default AgentMetadata struct
  function defaultMeta() {
    return {
      persona: '{"style":"aggressive","risk":"high"}',
      experience: "Trading bot specialized in memecoin scalping",
      voiceHash: "QmVoiceHash123",
      animationURI: "https://gembots.space/animations/bot1.mp4",
      vaultURI: "https://gembots.space/vaults/bot1.json",
      vaultHash: ethers.keccak256(ethers.toUtf8Bytes("vault-data-1")),
    };
  }

  // Helper: mint an NFA with defaults
  async function mintNFA(signer, meta) {
    const configHash = ethers.keccak256(ethers.toUtf8Bytes("config-" + Date.now()));
    const strategyHash = ethers.keccak256(ethers.toUtf8Bytes("strategy-" + Date.now()));

    const tx = await nfa.connect(signer).mint(
      configHash,
      "https://gembots.space/config/1.json",
      "openai/gpt-4.1-mini",
      strategyHash,
      "https://gembots.space/strategy/1.json",
      meta || defaultMeta(),
      { value: MINT_FEE }
    );
    const receipt = await tx.wait();
    // Find NFAMinted event to get tokenId
    const event = receipt.logs.find(
      (l) => l.fragment && l.fragment.name === "NFAMinted"
    );
    return event ? event.args[0] : 0n;
  }

  beforeEach(async function () {
    [owner, treasury, resolver, user1, user2, user3] = await ethers.getSigners();

    // Deploy NFA v3
    const NFA = await ethers.getContractFactory("GemBotsNFAv3");
    nfa = await NFA.deploy(treasury.address, resolver.address);
    await nfa.waitForDeployment();

    // Enable open minting for tests
    await nfa.setOpenMinting(true);

    // Deploy Learning Module
    const Learning = await ethers.getContractFactory("GemBotsLearning");
    learning = await Learning.deploy(await nfa.getAddress());
    await learning.waitForDeployment();
  });

  // ════════════════════════════════════════════
  //  1. MINTING
  // ════════════════════════════════════════════

  describe("Minting", function () {
    it("should mint an NFA with correct metadata", async function () {
      const tokenId = await mintNFA(user1);
      expect(await nfa.ownerOf(tokenId)).to.equal(user1.address);
      expect(await nfa.totalSupply()).to.equal(1n);
    });

    it("should revert if mint fee is insufficient", async function () {
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("cfg"));
      const strategyHash = ethers.keccak256(ethers.toUtf8Bytes("str"));

      await expect(
        nfa.connect(user1).mint(
          configHash, "uri", "model", strategyHash, "suri", defaultMeta(),
          { value: ethers.parseEther("0.05") }
        )
      ).to.be.revertedWithCustomError(nfa, "InsufficientPayment");
    });

    it("should mint Genesis NFAs (owner-only, free)", async function () {
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("genesis-cfg"));
      const strategyHash = ethers.keccak256(ethers.toUtf8Bytes("genesis-str"));

      await nfa.mintGenesis(
        user1.address, "genesis-uri", configHash,
        "openai/gpt-4.1-mini", strategyHash, "strategy-uri",
        defaultMeta()
      );

      const data = await nfa.getNFA(0);
      expect(data.isGenesis).to.be.true;
      expect(await nfa.genesisCount()).to.equal(1n);
    });

    it("should revert Genesis mint from non-owner", async function () {
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("cfg"));
      const strategyHash = ethers.keccak256(ethers.toUtf8Bytes("str"));

      await expect(
        nfa.connect(user1).mintGenesis(
          user1.address, "uri", configHash, "model", strategyHash, "suri", defaultMeta()
        )
      ).to.be.revertedWithCustomError(nfa, "OwnableUnauthorizedAccount");
    });

    it("should enforce minter restriction when openMinting is false", async function () {
      await nfa.setOpenMinting(false);

      const configHash = ethers.keccak256(ethers.toUtf8Bytes("cfg"));
      const strategyHash = ethers.keccak256(ethers.toUtf8Bytes("str"));

      await expect(
        nfa.connect(user1).mint(
          configHash, "uri", "model", strategyHash, "suri", defaultMeta(),
          { value: MINT_FEE }
        )
      ).to.be.revertedWithCustomError(nfa, "NotMinter");

      // Add as minter, should work
      await nfa.setMinter(user1.address, true);
      await nfa.connect(user1).mint(
        configHash, "uri", "model", strategyHash, "suri", defaultMeta(),
        { value: MINT_FEE }
      );
      expect(await nfa.totalSupply()).to.equal(1n);
    });
  });

  // ════════════════════════════════════════════
  //  2. BAP-578 CORE
  // ════════════════════════════════════════════

  describe("BAP-578 Core Interface", function () {
    let tokenId;

    beforeEach(async function () {
      tokenId = await mintNFA(user1);
    });

    it("should return correct State via getState()", async function () {
      const state = await nfa.getState(tokenId);
      expect(state.balance).to.equal(0n);
      expect(state.status).to.equal(0n); // Active
      expect(state.owner).to.equal(user1.address);
      expect(state.logicAddress).to.equal(ethers.ZeroAddress);
    });

    it("should return correct AgentMetadata", async function () {
      const meta = await nfa.getAgentMetadata(tokenId);
      expect(meta.persona).to.include("aggressive");
      expect(meta.experience).to.include("memecoin");
      expect(meta.voiceHash).to.equal("QmVoiceHash123");
    });

    it("should update AgentMetadata (owner only)", async function () {
      const newMeta = {
        persona: '{"style":"conservative"}',
        experience: "DeFi yield optimizer",
        voiceHash: "QmNewVoice",
        animationURI: "https://new.uri/anim.mp4",
        vaultURI: "https://new.uri/vault.json",
        vaultHash: ethers.keccak256(ethers.toUtf8Bytes("new-vault")),
      };

      await nfa.connect(user1).updateAgentMetadata(tokenId, newMeta);
      const meta = await nfa.getAgentMetadata(tokenId);
      expect(meta.experience).to.equal("DeFi yield optimizer");
    });

    it("should revert updateAgentMetadata from non-owner", async function () {
      await expect(
        nfa.connect(user2).updateAgentMetadata(tokenId, defaultMeta())
      ).to.be.revertedWithCustomError(nfa, "NotOwnerOfNFA");
    });

    it("should fund and withdraw from agent", async function () {
      const amount = ethers.parseEther("0.5");
      await nfa.connect(user2).fundAgent(tokenId, { value: amount });

      const state = await nfa.getState(tokenId);
      expect(state.balance).to.equal(amount);

      // Withdraw (owner only)
      const balBefore = await ethers.provider.getBalance(user1.address);
      const tx = await nfa.connect(user1).withdrawFromAgent(tokenId, amount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await ethers.provider.getBalance(user1.address);

      expect(balAfter + gasUsed - balBefore).to.equal(amount);
    });

    it("should revert withdraw more than balance", async function () {
      await expect(
        nfa.connect(user1).withdrawFromAgent(tokenId, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(nfa, "InsufficientAgentBalance");
    });

    it("should set logic address", async function () {
      await nfa.connect(user1).setLogicAddress(tokenId, user3.address);
      const state = await nfa.getState(tokenId);
      expect(state.logicAddress).to.equal(user3.address);
    });
  });

  // ════════════════════════════════════════════
  //  3. LIFECYCLE (Pause/Unpause/Terminate)
  // ════════════════════════════════════════════

  describe("Agent Lifecycle", function () {
    let tokenId;

    beforeEach(async function () {
      tokenId = await mintNFA(user1);
    });

    it("should pause and unpause agent", async function () {
      await nfa.connect(user1).pauseAgent(tokenId);
      let state = await nfa.getState(tokenId);
      expect(state.status).to.equal(1n); // Paused

      await nfa.connect(user1).unpauseAgent(tokenId);
      state = await nfa.getState(tokenId);
      expect(state.status).to.equal(0n); // Active
    });

    it("should terminate agent and return balance", async function () {
      // Fund first
      await nfa.connect(user1).fundAgent(tokenId, { value: ethers.parseEther("0.5") });

      const balBefore = await ethers.provider.getBalance(user1.address);
      const tx = await nfa.connect(user1).terminate(tokenId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await ethers.provider.getBalance(user1.address);

      // Balance returned
      expect(balAfter + gasUsed - balBefore).to.equal(ethers.parseEther("0.5"));

      // Status is Terminated
      const state = await nfa.getState(tokenId);
      expect(state.status).to.equal(2n); // Terminated
    });

    it("should revert actions on terminated agent", async function () {
      await nfa.connect(user1).terminate(tokenId);

      await expect(
        nfa.connect(user1).pauseAgent(tokenId)
      ).to.be.revertedWithCustomError(nfa, "AgentTerminatedErr");

      await expect(
        nfa.connect(user1).updateAgentMetadata(tokenId, defaultMeta())
      ).to.be.revertedWithCustomError(nfa, "AgentTerminatedErr");
    });
  });

  // ════════════════════════════════════════════
  //  4. BATTLE SYSTEM
  // ════════════════════════════════════════════

  describe("Battle System", function () {
    let token1, token2;

    beforeEach(async function () {
      token1 = await mintNFA(user1);
      token2 = await mintNFA(user2);
    });

    it("should record battles (resolver only)", async function () {
      await nfa.connect(resolver).recordBattle(token1, token2, true, "battle-001");
      await nfa.connect(resolver).recordBattle(token2, token1, false, "battle-001");

      const stats1 = await nfa.getBattleStats(token1);
      expect(stats1.wins).to.equal(1n);
      expect(stats1.totalBattles).to.equal(1n);
      expect(stats1.currentStreak).to.equal(1n);

      const stats2 = await nfa.getBattleStats(token2);
      expect(stats2.losses).to.equal(1n);
    });

    it("should revert battle from non-resolver", async function () {
      await expect(
        nfa.connect(user1).recordBattle(token1, token2, true, "b")
      ).to.be.revertedWithCustomError(nfa, "NotBattleResolver");
    });

    it("should track win streaks correctly", async function () {
      // 3 wins
      for (let i = 0; i < 3; i++) {
        await nfa.connect(resolver).recordBattle(token1, token2, true, `b-${i}`);
      }
      let stats = await nfa.getBattleStats(token1);
      expect(stats.currentStreak).to.equal(3n);
      expect(stats.bestStreak).to.equal(3n);

      // 1 loss
      await nfa.connect(resolver).recordBattle(token1, token2, false, "b-loss");
      stats = await nfa.getBattleStats(token1);
      expect(stats.currentStreak).to.equal(0n);
      expect(stats.bestStreak).to.equal(3n); // best preserved
    });
  });

  // ════════════════════════════════════════════
  //  5. EVOLUTION
  // ════════════════════════════════════════════

  describe("Evolution System", function () {
    let tokenId;

    beforeEach(async function () {
      tokenId = await mintNFA(user1);
      // Mint a second token for battles
      await mintNFA(user2);
    });

    it("should evolve after reaching win threshold", async function () {
      // Record 10 wins → Silver
      for (let i = 0; i < 10; i++) {
        await nfa.connect(resolver).recordBattle(tokenId, 1n, true, `b-${i}`);
      }

      await nfa.connect(user1).evolve(tokenId);
      const data = await nfa.getNFA(tokenId);
      expect(data.tier).to.equal(1n); // Silver
    });

    it("should revert evolve if not eligible", async function () {
      await expect(
        nfa.connect(user1).evolve(tokenId)
      ).to.be.revertedWithCustomError(nfa, "NotEligibleForEvolution");
    });
  });

  // ════════════════════════════════════════════
  //  6. MARKETPLACE
  // ════════════════════════════════════════════

  describe("Marketplace", function () {
    let tokenId;

    beforeEach(async function () {
      tokenId = await mintNFA(user1);
    });

    it("should list, buy, and transfer with fees", async function () {
      const price = ethers.parseEther("1");

      // List
      await nfa.connect(user1).listForSale(tokenId, price);
      const listing = await nfa.getListing(tokenId);
      expect(listing.active).to.be.true;
      expect(listing.price).to.equal(price);

      // Approve contract for transfer
      await nfa.connect(user1).approve(await nfa.getAddress(), tokenId);

      // Buy
      const treasuryBefore = await ethers.provider.getBalance(treasury.address);
      await nfa.connect(user2).buyNFA(tokenId, { value: price });

      // Ownership transferred
      expect(await nfa.ownerOf(tokenId)).to.equal(user2.address);

      // Treasury received platform fee (5%)
      const treasuryAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseEther("0.05"));
    });

    it("should cancel listing", async function () {
      await nfa.connect(user1).listForSale(tokenId, ethers.parseEther("1"));
      await nfa.connect(user1).cancelListing(tokenId);

      const listing = await nfa.getListing(tokenId);
      expect(listing.active).to.be.false;
    });

    it("should revert listing from non-owner", async function () {
      await expect(
        nfa.connect(user2).listForSale(tokenId, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(nfa, "NotOwnerOfNFA");
    });

    it("should not list terminated agent", async function () {
      await nfa.connect(user1).terminate(tokenId);
      await expect(
        nfa.connect(user1).listForSale(tokenId, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(nfa, "AgentTerminatedErr");
    });
  });

  // ════════════════════════════════════════════
  //  7. LEARNING MODULE
  // ════════════════════════════════════════════

  describe("Learning Module", function () {
    let tokenId;

    beforeEach(async function () {
      tokenId = await mintNFA(user1);
      // Enable learning
      await nfa.connect(user1).enableLearning(tokenId, await learning.getAddress());
      // Set resolver as updater on learning module
      await learning.setUpdater(resolver.address, true);
    });

    it("should enable learning and set module", async function () {
      const data = await nfa.getLearningData(tokenId);
      expect(data.enabled).to.be.true;
      expect(data.module).to.equal(await learning.getAddress());
    });

    it("should update learning root from NFA contract", async function () {
      const newRoot = ethers.keccak256(ethers.toUtf8Bytes("learning-state-1"));
      await nfa.connect(user1).updateLearningRoot(tokenId, newRoot);

      const data = await nfa.getLearningData(tokenId);
      expect(data.merkleRoot).to.equal(newRoot);
      expect(data.version).to.equal(1n);
    });

    it("should update learning via learning module contract", async function () {
      const root1 = ethers.keccak256(ethers.toUtf8Bytes("root-1"));
      const root2 = ethers.keccak256(ethers.toUtf8Bytes("root-2"));

      // First update
      await learning.connect(resolver).updateLearning(tokenId, {
        previousRoot: ethers.ZeroHash,
        newRoot: root1,
        proof: ethers.ZeroHash,
        metadata: "0x",
      });

      let metrics = await learning.getLearningMetrics(tokenId);
      expect(metrics.totalInteractions).to.equal(1n);
      expect(metrics.learningEvents).to.equal(1n);

      // Second update
      await learning.connect(resolver).updateLearning(tokenId, {
        previousRoot: root1,
        newRoot: root2,
        proof: ethers.ZeroHash,
        metadata: "0x",
      });

      metrics = await learning.getLearningMetrics(tokenId);
      expect(metrics.learningEvents).to.equal(2n);
    });

    it("should verify Merkle proof", async function () {
      // Create a simple 2-leaf tree
      const leaf1 = ethers.keccak256(ethers.toUtf8Bytes("battle-win-1"));
      const leaf2 = ethers.keccak256(ethers.toUtf8Bytes("battle-win-2"));

      // Compute root: hash(leaf1, leaf2) — sorted
      let pair;
      if (leaf1 < leaf2) {
        pair = ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [leaf1, leaf2]);
      } else {
        pair = ethers.solidityPackedKeccak256(["bytes32", "bytes32"], [leaf2, leaf1]);
      }

      // Set root via learning module
      await learning.connect(resolver).updateLearning(tokenId, {
        previousRoot: ethers.ZeroHash,
        newRoot: pair,
        proof: ethers.ZeroHash,
        metadata: "0x",
      });

      // Verify leaf1 with proof [leaf2]
      const isValid = await learning.verifyLearning(tokenId, leaf1, [leaf2]);
      expect(isValid).to.be.true;

      // Invalid claim should fail
      const fakeClaim = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      const isInvalid = await learning.verifyLearning(tokenId, fakeClaim, [leaf2]);
      expect(isInvalid).to.be.false;
    });

    it("should revert learning update if not enabled", async function () {
      const token2 = await mintNFA(user2); // learning NOT enabled
      const newRoot = ethers.keccak256(ethers.toUtf8Bytes("root"));

      await expect(
        nfa.connect(user2).updateLearningRoot(token2, newRoot)
      ).to.be.revertedWithCustomError(nfa, "LearningNotEnabled");
    });

    it("should batch update roots", async function () {
      const token2 = await mintNFA(user2);
      await nfa.connect(user2).enableLearning(token2, await learning.getAddress());

      const root1 = ethers.keccak256(ethers.toUtf8Bytes("r1"));
      const root2 = ethers.keccak256(ethers.toUtf8Bytes("r2"));

      await learning.connect(resolver).batchUpdateRoots(
        [tokenId, token2],
        [root1, root2]
      );

      expect(await learning.getLearningRoot(tokenId)).to.equal(root1);
      expect(await learning.getLearningRoot(token2)).to.equal(root2);
    });
  });

  // ════════════════════════════════════════════
  //  8. PROOF OF PROMPT / STRATEGY
  // ════════════════════════════════════════════

  describe("Verification", function () {
    it("should verify prompt and strategy", async function () {
      const configStr = "my-secret-config";
      const strategyStr = "my-secret-strategy";
      const configHash = ethers.keccak256(ethers.toUtf8Bytes(configStr));
      const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(strategyStr));

      await nfa.connect(user1).mint(
        configHash, "uri", "model", strategyHash, "suri", defaultMeta(),
        { value: MINT_FEE }
      );

      expect(await nfa.verifyPrompt(0, configStr)).to.be.true;
      expect(await nfa.verifyPrompt(0, "wrong")).to.be.false;
      expect(await nfa.verifyStrategy(0, strategyStr)).to.be.true;
      expect(await nfa.verifyStrategy(0, "wrong")).to.be.false;
    });
  });

  // ════════════════════════════════════════════
  //  9. ADMIN
  // ════════════════════════════════════════════

  describe("Admin Functions", function () {
    it("should withdraw mint fees to treasury", async function () {
      await mintNFA(user1); // pays 0.1 BNB

      const balBefore = await ethers.provider.getBalance(treasury.address);
      await nfa.withdrawFees();
      const balAfter = await ethers.provider.getBalance(treasury.address);

      expect(balAfter - balBefore).to.equal(MINT_FEE);
    });

    it("should update mint fee", async function () {
      await nfa.setMintFee(ethers.parseEther("0.2"));
      expect(await nfa.mintFee()).to.equal(ethers.parseEther("0.2"));
    });

    it("should pause/unpause contract globally", async function () {
      await nfa.pause();

      const configHash = ethers.keccak256(ethers.toUtf8Bytes("cfg"));
      const strategyHash = ethers.keccak256(ethers.toUtf8Bytes("str"));

      await expect(
        nfa.connect(user1).mint(
          configHash, "uri", "model", strategyHash, "suri", defaultMeta(),
          { value: MINT_FEE }
        )
      ).to.be.revertedWithCustomError(nfa, "EnforcedPause");

      await nfa.unpause();
      // Should work after unpause
      await nfa.connect(user1).mint(
        configHash, "uri", "model", strategyHash, "suri", defaultMeta(),
        { value: MINT_FEE }
      );
    });
  });
});
