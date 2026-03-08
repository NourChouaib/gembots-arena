const hre = require("hardhat");

async function main() {
  const contractAddress = "0x6BCCB7E2C006f2303Ba53B1f003aEba7a27d8ef9";
  
  console.log("🔍 Checking GemBotsNFAv2 contract at:", contractAddress);
  console.log("Network:", hre.network.name);
  console.log("");

  // Get contract instance
  const GemBotsNFAv2 = await hre.ethers.getContractAt("GemBotsNFAv2", contractAddress);

  try {
    // Check totalSupply
    const totalSupply = await GemBotsNFAv2.totalSupply();
    console.log("✅ totalSupply():", totalSupply.toString());
  } catch (error) {
    console.log("❌ totalSupply() failed:", error.message);
  }

  try {
    // Check genesisCount
    const genesisCount = await GemBotsNFAv2.genesisCount();
    console.log("✅ genesisCount():", genesisCount.toString());
  } catch (error) {
    console.log("❌ genesisCount() failed:", error.message);
  }

  try {
    // Try to get owner of token 0
    const owner0 = await GemBotsNFAv2.ownerOf(0);
    console.log("✅ ownerOf(0):", owner0);
  } catch (error) {
    console.log("❌ ownerOf(0) failed:", error.message);
  }

  try {
    // Try to get owner of token 1
    const owner1 = await GemBotsNFAv2.ownerOf(1);
    console.log("✅ ownerOf(1):", owner1);
  } catch (error) {
    console.log("❌ ownerOf(1) failed:", error.message);
  }

  try {
    // Check mintFee
    const mintFee = await GemBotsNFAv2.mintFee();
    console.log("✅ mintFee():", hre.ethers.formatEther(mintFee), "BNB");
  } catch (error) {
    console.log("❌ mintFee() failed:", error.message);
  }

  try {
    // Check contract balance
    const balance = await hre.ethers.provider.getBalance(contractAddress);
    console.log("✅ Contract balance:", hre.ethers.formatEther(balance), "BNB");
  } catch (error) {
    console.log("❌ Balance check failed:", error.message);
  }

  // Check bytecode
  const code = await hre.ethers.provider.getCode(contractAddress);
  console.log("\n📝 Contract bytecode length:", code.length);
  console.log("Contract exists:", code !== "0x");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
