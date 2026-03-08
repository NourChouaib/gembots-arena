const { ethers } = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("  GemBots v3 — BSC Mainnet Deployment");
  console.log("  GemBotsNFAv3 + GemBotsLearning");
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

  const treasuryAddress = process.env.TREASURY_ADDRESS || deployerAddress;
  const battleResolverAddress = process.env.BATTLE_RESOLVER_ADDRESS || deployerAddress;

  console.log("\n🏦 Treasury:", treasuryAddress);
  console.log("⚔️  Battle Resolver:", battleResolverAddress);

  // ─── Step 1: Deploy GemBotsNFAv3 ───
  console.log("\n🚀 Step 1: Deploying GemBotsNFAv3...");
  const GemBotsNFAv3 = await ethers.getContractFactory("GemBotsNFAv3");
  
  // Estimate gas first
  const deployTx = await GemBotsNFAv3.getDeployTransaction(treasuryAddress, battleResolverAddress);
  const estimatedGas = await ethers.provider.estimateGas(deployTx);
  const feeData = await ethers.provider.getFeeData();
  const estimatedCost = estimatedGas * feeData.gasPrice;
  console.log("⛽ Estimated gas:", estimatedGas.toString());
  console.log("💸 Estimated cost:", ethers.formatEther(estimatedCost), "BNB");
  
  const nfa = await GemBotsNFAv3.deploy(treasuryAddress, battleResolverAddress);
  await nfa.waitForDeployment();
  const nfaAddress = await nfa.getAddress();
  console.log("✅ GemBotsNFAv3 deployed to:", nfaAddress);

  // ─── Step 2: Deploy GemBotsLearning ───
  console.log("\n🚀 Step 2: Deploying GemBotsLearning...");
  const GemBotsLearning = await ethers.getContractFactory("GemBotsLearning");
  const learning = await GemBotsLearning.deploy(nfaAddress);
  await learning.waitForDeployment();
  const learningAddress = await learning.getAddress();
  console.log("✅ GemBotsLearning deployed to:", learningAddress);

  // ─── Step 3: Enable open minting ───
  console.log("\n🔓 Step 3: Enabling open minting...");
  const tx1 = await nfa.setOpenMinting(true);
  await tx1.wait();
  console.log("✅ Open minting enabled!");

  // ─── Step 4: Set learning module as updater ───
  console.log("\n🔗 Step 4: Authorizing deployer as learning updater...");
  const tx2 = await learning.setUpdater(deployerAddress, true);
  await tx2.wait();
  console.log("✅ Deployer authorized as learning updater!");

  // ─── Summary ───
  const finalBalance = await ethers.provider.getBalance(deployerAddress);
  const spent = balance - finalBalance;

  console.log("\n" + "═".repeat(60));
  console.log("  DEPLOYMENT SUMMARY");
  console.log("═".repeat(60));
  console.log("  GemBotsNFAv3      :", nfaAddress);
  console.log("  GemBotsLearning   :", learningAddress);
  console.log("  Owner             :", deployerAddress);
  console.log("  Treasury          :", treasuryAddress);
  console.log("  Battle Resolver   :", battleResolverAddress);
  console.log("  Network           :", network.name, "(chainId:", network.chainId.toString(), ")");
  console.log("═".repeat(60));
  console.log("  💸 Gas spent      :", ethers.formatEther(spent), "BNB");
  console.log("  💰 Remaining      :", ethers.formatEther(finalBalance), "BNB");
  console.log("═".repeat(60));

  console.log("\n📝 Next steps:");
  console.log("  1. Update .env with new contract addresses");
  console.log("  2. Verify on BSCScan: npx hardhat verify --network bsc", nfaAddress, treasuryAddress, battleResolverAddress);
  console.log("  3. Verify learning: npx hardhat verify --network bsc", learningAddress, nfaAddress);

  // BSCScan verification
  if (process.env.BSCSCAN_API_KEY) {
    console.log("\n🔍 Verifying GemBotsNFAv3 on BSCScan...");
    try {
      await hre.run("verify:verify", {
        address: nfaAddress,
        constructorArguments: [treasuryAddress, battleResolverAddress],
      });
      console.log("✅ GemBotsNFAv3 verified!");
    } catch (e) {
      console.log("⚠️  Verification failed (can retry later):", e.message);
    }

    console.log("🔍 Verifying GemBotsLearning on BSCScan...");
    try {
      await hre.run("verify:verify", {
        address: learningAddress,
        constructorArguments: [nfaAddress],
      });
      console.log("✅ GemBotsLearning verified!");
    } catch (e) {
      console.log("⚠️  Verification failed (can retry later):", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
