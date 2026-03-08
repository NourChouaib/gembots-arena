const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying GemBotsNFAv2 with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB");

  const GemBotsNFAv2 = await ethers.getContractFactory("GemBotsNFAv2");
  console.log("Deploying...");
  
  const contract = await GemBotsNFAv2.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✅ GemBotsNFAv2 deployed to:", address);
  console.log("Owner:", deployer.address);
  console.log("Mint fee:", ethers.formatEther(await contract.mintFee()), "BNB");
  console.log("Genesis max:", (await contract.GENESIS_MAX()).toString());
  
  // Save deployment info
  const fs = require("fs");
  const deployment = {
    address,
    deployer: deployer.address,
    network: "bsc",
    chainId: 56,
    timestamp: new Date().toISOString(),
    mintFee: "0.1 BNB",
    genesisMax: 100,
  };
  fs.writeFileSync("deployment.json", JSON.stringify(deployment, null, 2));
  console.log("\nDeployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
