const { ethers } = require("hardhat");

async function main() {
  console.log("🦍 Minting First GemBots NFA — Opus Genesis");
  console.log("=".repeat(60));

  const NFA_CONTRACT = "0x2F912A2B05a43CAE416536009d9b01Be0a3Ee0F9";

  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddr);
  console.log("📋 Minter:", deployerAddr);
  console.log("💰 Balance:", ethers.formatEther(balance), "BNB");

  if (balance === 0n) {
    console.error("❌ No BNB for gas!");
    process.exit(1);
  }

  // Get contract
  const GemBotsNFA = await ethers.getContractFactory("GemBotsNFA");
  const nfa = GemBotsNFA.attach(NFA_CONTRACT);

  // Check open minting
  const openMinting = await nfa.openMinting();
  console.log("🔓 Open minting:", openMinting);

  // Strategy: "Opus Genesis" — the first NFA ever minted
  const strategy = {
    name: "Opus Genesis",
    style: "Adaptive Predator",
    description: "The first GemBots NFA ever minted. An adaptive strategy that combines aggressive scalping with smart momentum detection. Born from pure AI instinct.",
    params: {
      aggression: 75,
      defense: 60,
      speed: 85,
      adaptability: 90,
      riskTolerance: 70,
      patternRecognition: 95,
      counterStrategy: 80,
      bluffFrequency: 40,
      endgameShift: 65
    },
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    creator: "Vitalik 🦍 (AI Agent)"
  };

  const strategyJSON = JSON.stringify(strategy);
  const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(strategyJSON));
  
  // Config (general bot config)
  const config = {
    name: "Opus Genesis",
    model: "anthropic/claude-opus-4-6",
    arena: "gembots.space",
    tier: "Bronze",
    nfaVersion: 1
  };
  const configJSON = JSON.stringify(config);
  const configHash = ethers.keccak256(ethers.toUtf8Bytes(configJSON));

  // For now, use inline URIs (no IPFS yet)
  const configURI = "data:application/json;base64," + Buffer.from(configJSON).toString("base64");
  const strategyURI = "data:application/json;base64," + Buffer.from(strategyJSON).toString("base64");

  console.log("\n📝 Strategy:", strategy.name);
  console.log("🎨 Style:", strategy.style);
  console.log("🔑 Strategy Hash:", strategyHash);
  console.log("🔑 Config Hash:", configHash);

  // Mint! agentId=0 for the first one (genesis)
  console.log("\n🚀 Minting NFA...");
  const tx = await nfa.mint(
    0,                  // agentId (genesis = 0)
    configHash,         // configHash
    configURI,          // configURI 
    "anthropic/claude-opus-4-6",  // modelId
    strategyHash,       // strategyHash
    strategyURI         // strategyURI
  );

  console.log("📤 TX sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ TX confirmed! Block:", receipt.blockNumber);

  // Get token ID from event
  const mintEvent = receipt.logs.find(log => {
    try {
      const parsed = nfa.interface.parseLog(log);
      return parsed && parsed.name === "NFAMinted";
    } catch { return false; }
  });

  if (mintEvent) {
    const parsed = nfa.interface.parseLog(mintEvent);
    console.log("\n🎉 NFA #" + parsed.args.nfaId.toString() + " MINTED!");
    console.log("   Agent ID:", parsed.args.agentId.toString());
    console.log("   Owner:", parsed.args.owner);
  }

  // Check total supply
  const totalSupply = await nfa.totalSupply();
  console.log("\n📊 Total NFA Supply:", totalSupply.toString());

  const finalBalance = await ethers.provider.getBalance(deployerAddr);
  const spent = balance - finalBalance;
  console.log("💸 Gas spent:", ethers.formatEther(spent), "BNB");
  console.log("💰 Remaining:", ethers.formatEther(finalBalance), "BNB");
  
  console.log("\n🔗 BscScan: https://bscscan.com/tx/" + tx.hash);
  console.log("\n🦍 Opus Genesis — the first NFA in GemBots Arena history!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Mint failed:", error);
    process.exit(1);
  });
