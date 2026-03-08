const { ethers } = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("  GemBots Arena — BSC Deployment Script");
  console.log("=".repeat(60));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log("\n📋 Deployer:", deployerAddress);
  console.log("💰 Balance:", ethers.formatEther(balance), "BNB");

  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(chainId:", network.chainId.toString(), ")");

  // Validate balance
  if (balance === 0n) {
    console.error("\n❌ Deployer has no BNB. Fund the wallet first.");
    process.exit(1);
  }

  // Oracle address — set from env or use deployer as default
  const oracleAddress = process.env.ORACLE_ADDRESS || deployerAddress;
  console.log("🔮 Oracle:", oracleAddress);

  // Deploy GemBotsBetting
  console.log("\n🚀 Deploying GemBotsBetting...");
  const GemBotsBetting = await ethers.getContractFactory("GemBotsBetting");
  const contract = await GemBotsBetting.deploy(oracleAddress);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ GemBotsBetting deployed to:", contractAddress);

  // Verify deployment state
  const currentOracle = await contract.oracle();
  const currentOwner = await contract.owner();
  const platformFee = await contract.platformFeeBps();
  const battleCount = await contract.getBattleCount();

  console.log("\n" + "─".repeat(60));
  console.log("  DEPLOYMENT SUMMARY");
  console.log("─".repeat(60));
  console.log("  Contract Address :", contractAddress);
  console.log("  Owner            :", currentOwner);
  console.log("  Oracle           :", currentOracle);
  console.log("  Platform Fee     :", platformFee.toString(), "bps (" + (Number(platformFee) / 100) + "%)");
  console.log("  Battle Count     :", battleCount.toString());
  console.log("  Network          :", network.name, "(chainId:", network.chainId.toString(), ")");
  console.log("─".repeat(60));

  // Verify on BSCScan (if API key is set)
  if (process.env.BSCSCAN_API_KEY) {
    console.log("\n🔍 Verifying on BSCScan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [oracleAddress],
      });
      console.log("✅ Verified on BSCScan!");
    } catch (err) {
      if (err.message.includes("Already Verified")) {
        console.log("ℹ️  Contract already verified.");
      } else {
        console.error("⚠️  Verification failed:", err.message);
      }
    }
  } else {
    console.log("\nℹ️  Set BSCSCAN_API_KEY to auto-verify on BSCScan.");
  }

  console.log("\n🎉 Deployment complete!");
  console.log("   Save the contract address and update your .env files.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
