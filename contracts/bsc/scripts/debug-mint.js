const hre = require("hardhat");
const { ethers } = hre;

const NFA_ADDRESS = "0xD64D4597E8Cd1738B69A8706C3dE4eDe6db10674";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const nfa = await ethers.getContractAt("GemBotsNFAv3", NFA_ADDRESS);
  
  // Check state
  const owner = await nfa.owner();
  console.log("Contract owner:", owner);
  console.log("Are we owner?", owner.toLowerCase() === deployer.address.toLowerCase());
  
  const paused = await nfa.paused();
  console.log("Paused:", paused);
  
  const supply = await nfa.totalSupply();
  console.log("Total supply:", supply.toString());
  
  const genesis = await nfa.genesisCount();
  console.log("Genesis count:", genesis.toString());

  // Try static call to see error
  const configHash = ethers.keccak256(ethers.toUtf8Bytes("test-genesis"));
  const strategyHash = ethers.keccak256(ethers.toUtf8Bytes("test-strategy"));
  
  const metadata = {
    persona: JSON.stringify({ name: "Test Bot", personality: "Test" }),
    experience: "Test agent",
    voiceHash: ethers.ZeroHash,
    animationURI: "",
    vaultURI: "",
    vaultHash: ethers.ZeroHash,
  };

  console.log("\nTrying staticCall mintGenesis...");
  try {
    const result = await nfa.mintGenesis.staticCall(
      deployer.address,
      "ipfs://test",
      configHash,
      "gpt-4o",
      strategyHash,
      "ipfs://strategy",
      metadata
    );
    console.log("Would return tokenId:", result.toString());
  } catch (e) {
    console.log("ERROR:", e.message);
    if (e.data) console.log("Error data:", e.data);
    if (e.reason) console.log("Error reason:", e.reason);
    // Try to decode
    try {
      const iface = nfa.interface;
      const decoded = iface.parseError(e.data);
      console.log("Decoded error:", decoded);
    } catch (de) {
      console.log("Could not decode error");
    }
  }
}

main().catch(console.error);
