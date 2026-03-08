const hre = require("hardhat");

async function main() {
  const contractAddress = "0x6BCCB7E2C006f2303Ba53B1f003aEba7a27d8ef9";
  
  console.log("🔍 Checking events for GemBotsNFAv2 at:", contractAddress);
  console.log("");

  const GemBotsNFAv2 = await hre.ethers.getContractAt("GemBotsNFAv2", contractAddress);

  // Get deployment block (approximate)
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const fromBlock = currentBlock - 10000; // Last ~10000 blocks

  console.log("Current block:", currentBlock);
  console.log("Checking from block:", fromBlock);
  console.log("");

  try {
    // Check Minted events
    const mintedFilter = GemBotsNFAv2.filters.Minted();
    const mintedEvents = await GemBotsNFAv2.queryFilter(mintedFilter, fromBlock, currentBlock);
    
    console.log(`✅ Minted events found: ${mintedEvents.length}`);
    
    if (mintedEvents.length > 0) {
      console.log("\nFirst 5 Minted events:");
      mintedEvents.slice(0, 5).forEach((event, idx) => {
        console.log(`  ${idx + 1}. Owner: ${event.args.owner}, TokenId: ${event.args.tokenId}, Genesis: ${event.args.genesis}`);
      });
    }
  } catch (error) {
    console.log("❌ Failed to query Minted events:", error.message);
  }

  try {
    // Check Transfer events
    const transferFilter = GemBotsNFAv2.filters.Transfer();
    const transferEvents = await GemBotsNFAv2.queryFilter(transferFilter, fromBlock, currentBlock);
    
    console.log(`\n✅ Transfer events found: ${transferEvents.length}`);
    
    if (transferEvents.length > 0) {
      console.log("\nFirst 5 Transfer events:");
      transferEvents.slice(0, 5).forEach((event, idx) => {
        console.log(`  ${idx + 1}. From: ${event.args.from}, To: ${event.args.to}, TokenId: ${event.args.tokenId}`);
      });
    }
  } catch (error) {
    console.log("❌ Failed to query Transfer events:", error.message);
  }

  // Check transaction count
  const txCount = await hre.ethers.provider.getTransactionCount(contractAddress);
  console.log(`\n📊 Transaction count from contract address: ${txCount}`);

  // Check deployment transaction
  const code = await hre.ethers.provider.getCode(contractAddress);
  console.log(`📝 Contract bytecode exists: ${code !== "0x"}`);
  console.log(`📝 Bytecode length: ${code.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
