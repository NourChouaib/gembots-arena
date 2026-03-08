const { ethers } = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("  GemBots NFA — BSC Mainnet Deployment");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log("\n📋 Deployer:", deployerAddress);
  console.log("💰 Balance:", ethers.formatEther(balance), "BNB");

  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(chainId:", network.chainId.toString(), ")");

  if (balance === 0n) {
    console.error("\n❌ Deployer has no BNB. Fund the wallet first.");
    process.exit(1);
  }

  // Treasury = deployer (can change later via setTreasury)
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployerAddress;
  // Battle resolver = deployer (backend oracle, can change later)
  const battleResolverAddress = process.env.BATTLE_RESOLVER_ADDRESS || deployerAddress;

  console.log("\n🏦 Treasury:", treasuryAddress);
  console.log("⚔️  Battle Resolver:", battleResolverAddress);

  // Deploy GemBotsNFAv4
  console.log("\n🚀 Deploying GemBotsNFAv4 (tier-based pricing)...");
  const GemBotsNFA = await ethers.getContractFactory("GemBotsNFAv4");
  const nfa = await GemBotsNFA.deploy(treasuryAddress, battleResolverAddress);
  await nfa.waitForDeployment();

  const nfaAddress = await nfa.getAddress();
  console.log("✅ GemBotsNFAv4 deployed to:", nfaAddress);

  // Enable open minting so anyone can mint
  console.log("\n🔓 Enabling open minting...");
  const tx = await nfa.setOpenMinting(true);
  await tx.wait();
  console.log("✅ Open minting enabled!");

  // Verify state
  const owner = await nfa.owner();
  const treasury = await nfa.treasury();
  const resolver = await nfa.battleResolver();
  const platformFee = await nfa.platformFeeBps();
  const creatorRoyalty = await nfa.creatorRoyaltyBps();
  const openMinting = await nfa.openMinting();
  const totalSupply = await nfa.totalSupply();

  // Show tier mint fees
  const bronzeFee = await nfa.getMintFee(0); // Bronze
  const silverFee = await nfa.getMintFee(1); // Silver
  const goldFee = await nfa.getMintFee(2);   // Gold
  console.log("\n💰 Tier Mint Fees:");
  console.log("   Bronze:", ethers.formatEther(bronzeFee), "BNB");
  console.log("   Silver:", ethers.formatEther(silverFee), "BNB");
  console.log("   Gold:  ", ethers.formatEther(goldFee), "BNB");

  console.log("\n" + "─".repeat(60));
  console.log("  DEPLOYMENT SUMMARY");
  console.log("─".repeat(60));
  console.log("  Contract Address  :", nfaAddress);
  console.log("  Owner             :", owner);
  console.log("  Treasury          :", treasury);
  console.log("  Battle Resolver   :", resolver);
  console.log("  Platform Fee      :", platformFee.toString(), "bps (" + (Number(platformFee) / 100) + "%)");
  console.log("  Creator Royalty   :", creatorRoyalty.toString(), "bps (" + (Number(creatorRoyalty) / 100) + "%)");
  console.log("  Open Minting      :", openMinting);
  console.log("  Total Supply      :", totalSupply.toString());
  console.log("  Network           :", network.name, "(chainId:", network.chainId.toString(), ")");
  console.log("─".repeat(60));

  // Final balance
  const finalBalance = await ethers.provider.getBalance(deployerAddress);
  const spent = balance - finalBalance;
  console.log("\n💸 Gas spent:", ethers.formatEther(spent), "BNB");
  console.log("💰 Remaining:", ethers.formatEther(finalBalance), "BNB");

  // Verify on BSCScan
  if (process.env.BSCSCAN_API_KEY) {
    console.log("\n🔍 Verifying on BSCScan...");
    try {
      await hre.run("verify:verify", {
        address: nfaAddress,
        constructorArguments: [treasuryAddress, battleResolverAddress],
      });
      console.log("✅ Verified on BSCScan!");
    } catch (err) {
      if (err.message.includes("Already Verified")) {
        console.log("ℹ️  Contract already verified.");
      } else {
        console.error("⚠️  Verification failed:", err.message);
        console.log("   Run manually: npx hardhat verify --network bsc", nfaAddress, treasuryAddress, battleResolverAddress);
      }
    }
  } else {
    console.log("\nℹ️  Set BSCSCAN_API_KEY to auto-verify on BSCScan.");
    console.log("   Manual: npx hardhat verify --network bsc", nfaAddress, treasuryAddress, battleResolverAddress);
  }

  console.log("\n🎉 GemBotsNFA deployment complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Save contract address to .env / frontend config");
  console.log("   2. Verify on BSCScan (if not auto-verified)");
  console.log("   3. Connect Strategy Builder UI to mint function");
  console.log("   4. Set up backend as battle resolver");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
