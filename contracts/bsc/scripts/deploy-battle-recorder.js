const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const NFA_CONTRACT = "0x6BCCB7E2C006f2303Ba53B1f003aEba7a27d8ef9";
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying BattleRecorder with:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "BNB");

  const BattleRecorder = await hre.ethers.getContractFactory("GemBotsBattleRecorder");
  
  // Deploy: nfaContract = v2 NFA, resolver = deployer (we'll be the resolver)
  const recorder = await BattleRecorder.deploy(NFA_CONTRACT, deployer.address);
  await recorder.waitForDeployment();
  
  const address = await recorder.getAddress();
  console.log("✅ BattleRecorder deployed to:", address);

  // Verify it works
  const stats = await recorder.getStats(0);
  console.log("Test getStats(0):", stats);
  console.log("Total battles:", (await recorder.totalBattlesRecorded()).toString());

  // Update deployment.json
  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  deployment.battleRecorder = {
    address: address,
    deployedAt: new Date().toISOString(),
    nfaContract: NFA_CONTRACT,
    resolver: deployer.address,
    features: ["recordBattle", "batchRecordBattles", "ELO", "getBattleHistory"]
  };
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("✅ deployment.json updated");

  // Print gas used
  const deployTx = recorder.deploymentTransaction();
  if (deployTx) {
    const receipt = await deployTx.wait();
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Gas cost:", hre.ethers.formatEther(receipt.gasUsed * receipt.gasPrice), "BNB");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
