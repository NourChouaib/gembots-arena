const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GemBotsNFA", function () {
  let nfa;
  let owner, treasury, battleResolver, minter, buyer, other;
  const AGENT_ID = 6502;
  const CONFIG_STRING = '{"model":"gpt-4o","temperature":0.7,"systemPrompt":"You are a battle bot"}';
  let PROOF_OF_PROMPT;
  const CONFIG_URI = "ipfs://QmTest123456789/config.json";

  beforeEach(async function () {
    [owner, treasury, battleResolver, minter, buyer, other] = await ethers.getSigners();
    PROOF_OF_PROMPT = ethers.keccak256(ethers.toUtf8Bytes(CONFIG_STRING));

    const GemBotsNFA = await ethers.getContractFactory("GemBotsNFA");
    nfa = await GemBotsNFA.deploy(treasury.address, battleResolver.address);
    await nfa.waitForDeployment();

    // Authorize minter
    await nfa.setMinter(minter.address, true);
  });

  // ──────────────────────────────────────────────
  //  Deployment
  // ──────────────────────────────────────────────
  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      expect(await nfa.name()).to.equal("GemBots NFA");
      expect(await nfa.symbol()).to.equal("GBNFA");
    });

    it("should set treasury and battleResolver", async function () {
      expect(await nfa.treasury()).to.equal(treasury.address);
      expect(await nfa.battleResolver()).to.equal(battleResolver.address);
    });

    it("should set default fees", async function () {
      expect(await nfa.platformFeeBps()).to.equal(500);
      expect(await nfa.creatorRoyaltyBps()).to.equal(250);
    });

    it("should revert deploy with zero treasury", async function () {
      const GemBotsNFA = await ethers.getContractFactory("GemBotsNFA");
      await expect(
        GemBotsNFA.deploy(ethers.ZeroAddress, battleResolver.address)
      ).to.be.revertedWithCustomError(nfa, "ZeroAddress");
    });

    it("should revert deploy with zero battleResolver", async function () {
      const GemBotsNFA = await ethers.getContractFactory("GemBotsNFA");
      await expect(
        GemBotsNFA.deploy(treasury.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(nfa, "ZeroAddress");
    });
  });

  // ──────────────────────────────────────────────
  //  1. Minting
  // ──────────────────────────────────────────────
  describe("Minting", function () {
    it("should mint an NFA as authorized minter", async function () {
      const tx = await nfa.connect(minter).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI);
      const receipt = await tx.wait();

      expect(await nfa.ownerOf(0)).to.equal(minter.address);
      expect(await nfa.totalSupply()).to.equal(1);

      await expect(tx)
        .to.emit(nfa, "NFAMinted")
        .withArgs(0, AGENT_ID, minter.address, PROOF_OF_PROMPT);
    });

    it("should store NFA data correctly", async function () {
      await nfa.connect(minter).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI);

      const data = await nfa.getNFA(0);
      expect(data.agentId).to.equal(AGENT_ID);
      expect(data.proofOfPrompt).to.equal(PROOF_OF_PROMPT);
      expect(data.configURI).to.equal(CONFIG_URI);
      expect(data.originalCreator).to.equal(minter.address);
      expect(data.tier).to.equal(0); // Bronze
      expect(data.wins).to.equal(0);
    });

    it("should set tokenURI to configURI", async function () {
      await nfa.connect(minter).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI);
      expect(await nfa.tokenURI(0)).to.equal(CONFIG_URI);
    });

    it("should allow owner to mint", async function () {
      await nfa.connect(owner).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI);
      expect(await nfa.ownerOf(0)).to.equal(owner.address);
    });

    it("should reject unauthorized minter", async function () {
      await expect(
        nfa.connect(other).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI)
      ).to.be.revertedWithCustomError(nfa, "NotMinter");
    });

    it("should allow anyone to mint when openMinting is true", async function () {
      await nfa.setOpenMinting(true);
      await nfa.connect(other).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI);
      expect(await nfa.ownerOf(0)).to.equal(other.address);
    });

    it("should reject minting when paused", async function () {
      await nfa.pause();
      await expect(
        nfa.connect(minter).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI)
      ).to.be.revertedWithCustomError(nfa, "EnforcedPause");
    });

    it("should increment token IDs correctly", async function () {
      await nfa.connect(minter).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI);
      await nfa.connect(minter).mint(6503, PROOF_OF_PROMPT, CONFIG_URI);
      await nfa.connect(minter).mint(6504, PROOF_OF_PROMPT, CONFIG_URI);

      expect(await nfa.totalSupply()).to.equal(3);
      expect(await nfa.ownerOf(0)).to.equal(minter.address);
      expect(await nfa.ownerOf(1)).to.equal(minter.address);
      expect(await nfa.ownerOf(2)).to.equal(minter.address);
    });
  });

  // ──────────────────────────────────────────────
  //  2. Battle Record
  // ──────────────────────────────────────────────
  describe("Battle Record", function () {
    beforeEach(async function () {
      // Mint two NFAs for battles
      await nfa.connect(minter).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI);
      await nfa.connect(minter).mint(6503, PROOF_OF_PROMPT, CONFIG_URI);
    });

    it("should record a win", async function () {
      const tx = await nfa.connect(battleResolver).recordBattle(0, 1, true, "battle-001");

      await expect(tx)
        .to.emit(nfa, "BattleRecorded")
        .withArgs(0, 1, true, "battle-001");

      const stats = await nfa.getBattleStats(0);
      expect(stats.wins).to.equal(1);
      expect(stats.losses).to.equal(0);
      expect(stats.totalBattles).to.equal(1);
      expect(stats.currentStreak).to.equal(1);
    });

    it("should record a loss", async function () {
      await nfa.connect(battleResolver).recordBattle(0, 1, false, "battle-002");

      const stats = await nfa.getBattleStats(0);
      expect(stats.wins).to.equal(0);
      expect(stats.losses).to.equal(1);
      expect(stats.totalBattles).to.equal(1);
      expect(stats.currentStreak).to.equal(0);
    });

    it("should track win streaks correctly", async function () {
      // Win 3 in a row
      await nfa.connect(battleResolver).recordBattle(0, 1, true, "b1");
      await nfa.connect(battleResolver).recordBattle(0, 1, true, "b2");
      await nfa.connect(battleResolver).recordBattle(0, 1, true, "b3");

      let stats = await nfa.getBattleStats(0);
      expect(stats.currentStreak).to.equal(3);
      expect(stats.bestStreak).to.equal(3);

      // Lose one
      await nfa.connect(battleResolver).recordBattle(0, 1, false, "b4");
      stats = await nfa.getBattleStats(0);
      expect(stats.currentStreak).to.equal(0);
      expect(stats.bestStreak).to.equal(3); // Best preserved

      // Win 2 more
      await nfa.connect(battleResolver).recordBattle(0, 1, true, "b5");
      await nfa.connect(battleResolver).recordBattle(0, 1, true, "b6");
      stats = await nfa.getBattleStats(0);
      expect(stats.currentStreak).to.equal(2);
      expect(stats.bestStreak).to.equal(3); // Still 3
    });

    it("should reject non-battleResolver", async function () {
      await expect(
        nfa.connect(other).recordBattle(0, 1, true, "b1")
      ).to.be.revertedWithCustomError(nfa, "NotBattleResolver");
    });

    it("should reject battle for non-existent NFA", async function () {
      await expect(
        nfa.connect(battleResolver).recordBattle(99, 1, true, "b1")
      ).to.be.revertedWithCustomError(nfa, "ERC721NonexistentToken");
    });

    it("should reject battle for non-existent opponent", async function () {
      await expect(
        nfa.connect(battleResolver).recordBattle(0, 99, true, "b1")
      ).to.be.revertedWithCustomError(nfa, "ERC721NonexistentToken");
    });
  });

  // ──────────────────────────────────────────────
  //  3. Evolution System
  // ──────────────────────────────────────────────
  describe("Evolution", function () {
    beforeEach(async function () {
      await nfa.connect(minter).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI);
      await nfa.connect(minter).mint(6503, PROOF_OF_PROMPT, CONFIG_URI);
    });

    async function winBattles(count) {
      for (let i = 0; i < count; i++) {
        await nfa.connect(battleResolver).recordBattle(0, 1, true, `b-${i}`);
      }
    }

    it("should evolve to Silver at 10 wins", async function () {
      await winBattles(10);

      const tx = await nfa.evolve(0);
      await expect(tx).to.emit(nfa, "Evolved").withArgs(0, 1); // Silver = 1

      const data = await nfa.getNFA(0);
      expect(data.tier).to.equal(1);
    });

    it("should evolve to Gold at 50 wins", async function () {
      await winBattles(50);
      await nfa.evolve(0);

      const data = await nfa.getNFA(0);
      expect(data.tier).to.equal(2); // Gold
    });

    it("should evolve to Diamond at 100 wins", async function () {
      await winBattles(100);
      await nfa.evolve(0);

      const data = await nfa.getNFA(0);
      expect(data.tier).to.equal(3); // Diamond
    });

    it("should evolve to Legendary at 250 wins", async function () {
      await winBattles(250);
      await nfa.evolve(0);

      const data = await nfa.getNFA(0);
      expect(data.tier).to.equal(4); // Legendary
    });

    it("should revert if not eligible for evolution", async function () {
      // 0 wins, already Bronze
      await expect(nfa.evolve(0)).to.be.revertedWithCustomError(nfa, "NotEligibleForEvolution");
    });

    it("should revert if already at max tier", async function () {
      await winBattles(250);
      await nfa.evolve(0);

      // Try to evolve again
      await expect(nfa.evolve(0)).to.be.revertedWithCustomError(nfa, "AlreadyAtMaxTier");
    });

    it("should skip tiers (e.g., Bronze → Gold directly)", async function () {
      await winBattles(50);
      const tx = await nfa.evolve(0);

      // Should jump to Gold (tier 2), skipping Silver
      await expect(tx).to.emit(nfa, "Evolved").withArgs(0, 2);
      const data = await nfa.getNFA(0);
      expect(data.tier).to.equal(2);
    });

    it("should update tokenURI when tier base URI is set", async function () {
      await nfa.setTierBaseURI(1, "ipfs://silver-tier/");
      await winBattles(10);
      await nfa.evolve(0);

      expect(await nfa.tokenURI(0)).to.equal("ipfs://silver-tier/0");
    });
  });

  // ──────────────────────────────────────────────
  //  4. Marketplace
  // ──────────────────────────────────────────────
  describe("Marketplace", function () {
    const PRICE = ethers.parseEther("1.0"); // 1 BNB

    beforeEach(async function () {
      await nfa.connect(minter).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI);
      // Approve contract for transfers
      await nfa.connect(minter).approve(await nfa.getAddress(), 0);
    });

    describe("Listing", function () {
      it("should list an NFA for sale", async function () {
        const tx = await nfa.connect(minter).listForSale(0, PRICE);
        await expect(tx).to.emit(nfa, "Listed").withArgs(0, PRICE);

        const listing = await nfa.getListing(0);
        expect(listing.price).to.equal(PRICE);
        expect(listing.seller).to.equal(minter.address);
        expect(listing.active).to.be.true;
      });

      it("should reject listing with zero price", async function () {
        await expect(
          nfa.connect(minter).listForSale(0, 0)
        ).to.be.revertedWithCustomError(nfa, "InvalidPrice");
      });

      it("should reject listing by non-owner", async function () {
        await expect(
          nfa.connect(other).listForSale(0, PRICE)
        ).to.be.revertedWithCustomError(nfa, "NotOwnerOfNFA");
      });

      it("should reject double listing", async function () {
        await nfa.connect(minter).listForSale(0, PRICE);
        await expect(
          nfa.connect(minter).listForSale(0, PRICE)
        ).to.be.revertedWithCustomError(nfa, "NFAAlreadyListed");
      });
    });

    describe("Buying", function () {
      beforeEach(async function () {
        await nfa.connect(minter).listForSale(0, PRICE);
      });

      it("should complete a purchase with correct fee distribution", async function () {
        const treasuryBefore = await ethers.provider.getBalance(treasury.address);
        const sellerBefore = await ethers.provider.getBalance(minter.address);

        // Creator = seller here, so no royalty
        const tx = await nfa.connect(buyer).buyNFA(0, { value: PRICE });
        await expect(tx).to.emit(nfa, "Sold").withArgs(0, minter.address, buyer.address, PRICE);

        expect(await nfa.ownerOf(0)).to.equal(buyer.address);

        // Treasury gets 5%
        const treasuryAfter = await ethers.provider.getBalance(treasury.address);
        const platformFee = PRICE * 500n / 10000n;
        expect(treasuryAfter - treasuryBefore).to.equal(platformFee);

        // Seller gets 95% (creator = seller, no royalty)
        const sellerAfter = await ethers.provider.getBalance(minter.address);
        const expectedSellerProceeds = PRICE - platformFee;
        expect(sellerAfter - sellerBefore).to.equal(expectedSellerProceeds);
      });

      it("should pay royalty to original creator when resold", async function () {
        // First buy
        await nfa.connect(buyer).buyNFA(0, { value: PRICE });

        // Buyer lists for resale
        await nfa.connect(buyer).approve(await nfa.getAddress(), 0);
        await nfa.connect(buyer).listForSale(0, PRICE);

        const creatorBefore = await ethers.provider.getBalance(minter.address);
        const treasuryBefore = await ethers.provider.getBalance(treasury.address);

        // Other buys from buyer
        await nfa.connect(other).buyNFA(0, { value: PRICE });

        expect(await nfa.ownerOf(0)).to.equal(other.address);

        // Creator royalty = 2.5%
        const creatorAfter = await ethers.provider.getBalance(minter.address);
        const royalty = PRICE * 250n / 10000n;
        expect(creatorAfter - creatorBefore).to.equal(royalty);

        // Treasury = 5%
        const treasuryAfter = await ethers.provider.getBalance(treasury.address);
        const platformFee = PRICE * 500n / 10000n;
        expect(treasuryAfter - treasuryBefore).to.equal(platformFee);
      });

      it("should reject purchase with insufficient payment", async function () {
        await expect(
          nfa.connect(buyer).buyNFA(0, { value: ethers.parseEther("0.5") })
        ).to.be.revertedWithCustomError(nfa, "InsufficientPayment");
      });

      it("should reject buying unlisted NFA", async function () {
        await nfa.connect(buyer).buyNFA(0, { value: PRICE }); // Buy it
        await expect(
          nfa.connect(other).buyNFA(0, { value: PRICE })
        ).to.be.revertedWithCustomError(nfa, "NFANotListed");
      });

      it("should clear listing after purchase", async function () {
        await nfa.connect(buyer).buyNFA(0, { value: PRICE });
        const listing = await nfa.getListing(0);
        expect(listing.active).to.be.false;
      });

      it("should refund excess payment", async function () {
        const excess = ethers.parseEther("0.5");
        const buyerBefore = await ethers.provider.getBalance(buyer.address);

        const tx = await nfa.connect(buyer).buyNFA(0, { value: PRICE + excess });
        const receipt = await tx.wait();
        const gasCost = receipt.gasUsed * receipt.gasPrice;

        const buyerAfter = await ethers.provider.getBalance(buyer.address);
        // Buyer should have spent exactly PRICE + gas
        expect(buyerBefore - buyerAfter - gasCost).to.equal(PRICE);
      });
    });

    describe("Cancel Listing", function () {
      it("should cancel a listing", async function () {
        await nfa.connect(minter).listForSale(0, PRICE);

        const tx = await nfa.connect(minter).cancelListing(0);
        await expect(tx).to.emit(nfa, "ListingCancelled").withArgs(0);

        const listing = await nfa.getListing(0);
        expect(listing.active).to.be.false;
      });

      it("should reject cancel by non-owner", async function () {
        await nfa.connect(minter).listForSale(0, PRICE);
        await expect(
          nfa.connect(other).cancelListing(0)
        ).to.be.revertedWithCustomError(nfa, "NotOwnerOfNFA");
      });

      it("should reject cancel of non-listed NFA", async function () {
        await expect(
          nfa.connect(minter).cancelListing(0)
        ).to.be.revertedWithCustomError(nfa, "NFANotListed");
      });
    });
  });

  // ──────────────────────────────────────────────
  //  5. Proof of Prompt
  // ──────────────────────────────────────────────
  describe("Proof of Prompt", function () {
    beforeEach(async function () {
      await nfa.connect(minter).mint(AGENT_ID, PROOF_OF_PROMPT, CONFIG_URI);
    });

    it("should verify correct config", async function () {
      expect(await nfa.verifyPrompt(0, CONFIG_STRING)).to.be.true;
    });

    it("should reject incorrect config", async function () {
      expect(await nfa.verifyPrompt(0, "wrong config")).to.be.false;
    });

    it("should reject for non-existent NFA", async function () {
      await expect(
        nfa.verifyPrompt(99, CONFIG_STRING)
      ).to.be.revertedWithCustomError(nfa, "ERC721NonexistentToken");
    });
  });

  // ──────────────────────────────────────────────
  //  Admin Functions
  // ──────────────────────────────────────────────
  describe("Admin", function () {
    it("should allow owner to set treasury", async function () {
      await nfa.setTreasury(other.address);
      expect(await nfa.treasury()).to.equal(other.address);
    });

    it("should reject zero address for treasury", async function () {
      await expect(
        nfa.setTreasury(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(nfa, "ZeroAddress");
    });

    it("should allow owner to set battleResolver", async function () {
      await nfa.setBattleResolver(other.address);
      expect(await nfa.battleResolver()).to.equal(other.address);
    });

    it("should allow owner to set fees", async function () {
      await nfa.setPlatformFeeBps(300);
      expect(await nfa.platformFeeBps()).to.equal(300);

      await nfa.setCreatorRoyaltyBps(100);
      expect(await nfa.creatorRoyaltyBps()).to.equal(100);
    });

    it("should reject fee > 10%", async function () {
      await expect(nfa.setPlatformFeeBps(1001)).to.be.revertedWith("Fee too high");
      await expect(nfa.setCreatorRoyaltyBps(1001)).to.be.revertedWith("Royalty too high");
    });

    it("should allow owner to pause/unpause", async function () {
      await nfa.pause();
      expect(await nfa.paused()).to.be.true;

      await nfa.unpause();
      expect(await nfa.paused()).to.be.false;
    });

    it("should reject admin calls from non-owner", async function () {
      await expect(
        nfa.connect(other).setTreasury(other.address)
      ).to.be.revertedWithCustomError(nfa, "OwnableUnauthorizedAccount");

      await expect(
        nfa.connect(other).pause()
      ).to.be.revertedWithCustomError(nfa, "OwnableUnauthorizedAccount");
    });

    it("should manage minters", async function () {
      expect(await nfa.minters(other.address)).to.be.false;
      await nfa.setMinter(other.address, true);
      expect(await nfa.minters(other.address)).to.be.true;
      await nfa.setMinter(other.address, false);
      expect(await nfa.minters(other.address)).to.be.false;
    });
  });
});
