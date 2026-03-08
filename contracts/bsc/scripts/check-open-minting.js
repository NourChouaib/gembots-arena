const { ethers } = require("hardhat");
async function main() {
  const c = await ethers.getContractAt("GemBotsNFAv3", "0xD64D4597E8Cd1738B69A8706C3dE4eDe6db10674");
  console.log("openMinting:", await c.openMinting());
  console.log("paused:", await c.paused());
  const [deployer] = await ethers.getSigners();
  console.log("deployer minter:", await c.minters(deployer.address));
}
main();
