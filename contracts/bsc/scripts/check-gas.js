const { ethers } = require("hardhat");
async function main() {
  const [d] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(d.address);
  console.log("Balance:", ethers.formatEther(bal), "BNB");
  
  const receipt = await ethers.provider.getTransactionReceipt("0x159db4f28833c75676b6a787934739f549688b925daaf8012e6a1af94a71561d");
  console.log("Gas used per mint:", receipt.gasUsed.toString());
  console.log("Gas price:", ethers.formatUnits(receipt.gasPrice, "gwei"), "gwei");
  const costBNB = Number(receipt.gasUsed) * Number(receipt.gasPrice) / 1e18;
  console.log("Cost per mint:", costBNB.toFixed(6), "BNB");
  console.log("Cost per mint USD (BNB~$650):", (costBNB * 650).toFixed(2), "USD");
  console.log("20 mints would cost:", (costBNB * 20).toFixed(6), "BNB =", (costBNB * 20 * 650).toFixed(2), "USD");
  console.log("Can mint:", Math.floor(Number(ethers.formatEther(bal)) / costBNB), "more NFAs with current balance");
}
main();
