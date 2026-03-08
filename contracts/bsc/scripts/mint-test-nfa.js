const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Test Mint: NFA for WhaleWatch (bot #10)");
  
  const NFA_CONTRACT = "0x2F912A2B05a43CAE416536009d9b01Be0a3Ee0F9";
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(await deployer.getAddress());
  console.log("💰 Balance:", ethers.formatEther(balance), "BNB");

  const GemBotsNFA = await ethers.getContractFactory("GemBotsNFA");
  const nfa = GemBotsNFA.attach(NFA_CONTRACT);

  // WhaleWatch strategy
  const strategy = {
    name: "WhaleWatch Alpha",
    style: "Whale Tracker",
    description: "Tracks large wallet movements and follows the whales. Patient, data-driven, high conviction.",
    params: {
      aggression: 40,
      defense: 85,
      speed: 50,
      adaptability: 75,
      riskTolerance: 35,
      patternRecognition: 90,
      counterStrategy: 70,
      bluffFrequency: 20,
      endgameShift: 80
    },
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    creator: "GemBots Arena"
  };

  const strategyJSON = JSON.stringify(strategy);
  const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(strategyJSON));
  
  const config = { name: "WhaleWatch Alpha", model: "whale-tracker-v1", arena: "gembots.space", tier: "Bronze" };
  const configJSON = JSON.stringify(config);
  const configHash = ethers.keccak256(ethers.toUtf8Bytes(configJSON));

  const configURI = "data:application/json;base64," + Buffer.from(configJSON).toString("base64");
  const strategyURI = "data:application/json;base64," + Buffer.from(strategyJSON).toString("base64");

  console.log("🚀 Minting NFA for WhaleWatch...");
  const tx = await nfa.mint(10, configHash, configURI, "whale-tracker-v1", strategyHash, strategyURI);
  console.log("📤 TX:", tx.hash);
  const receipt = await tx.wait();
  
  const mintEvent = receipt.logs.find(log => {
    try { const p = nfa.interface.parseLog(log); return p && p.name === "NFAMinted"; } catch { return false; }
  });

  if (mintEvent) {
    const parsed = nfa.interface.parseLog(mintEvent);
    console.log("🎉 NFA #" + parsed.args.nfaId.toString() + " minted for WhaleWatch!");
    console.log("   Token ID:", parsed.args.nfaId.toString());
  }

  const totalSupply = await nfa.totalSupply();
  console.log("📊 Total Supply:", totalSupply.toString());
  console.log("🔗 BscScan:", "https://bscscan.com/tx/" + tx.hash);
}

main().then(() => process.exit(0)).catch(e => { console.error("❌", e); process.exit(1); });
