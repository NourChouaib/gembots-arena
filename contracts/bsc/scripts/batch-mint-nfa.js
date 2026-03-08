const { ethers } = require("hardhat");

/**
 * Batch mint NFAs for all arena bots (excluding test bots)
 * Each bot gets a unique strategy based on its name and style
 */

const NFA_CONTRACT = "0x2F912A2B05a43CAE416536009d9b01Be0a3Ee0F9";

// All real arena bots to mint (excluding test bots, duplicates, guest bots)
const BOTS = [
  { id: 1,  name: "PyroBot",       emoji: "🔥", style: "Aggressive Scalper",    strategy: "smart_ai" },
  { id: 2,  name: "FrostMaster",   emoji: "❄️", style: "Defensive Analyst",     strategy: "smart_ai" },
  { id: 3,  name: "VoltageKing",   emoji: "⚡", style: "Lightning Trader",      strategy: "smart_ai" },
  { id: 4,  name: "TsunamiX",      emoji: "🌊", style: "Trend Surfer",          strategy: "trend_follower" },
  { id: 5,  name: "LunarPredator", emoji: "🌙", style: "Night Stalker",         strategy: "smart_ai" },
  { id: 6,  name: "SolarFlare",    emoji: "☀️", style: "Mean Reversion Pro",    strategy: "mean_reversion" },
  { id: 7,  name: "TargetLock",    emoji: "🎯", style: "Precision Sniper",      strategy: "smart_ai" },
  { id: 8,  name: "DiamondHands",  emoji: "💎", style: "HODLer Supreme",        strategy: "smart_ai" },
  { id: 9,  name: "MoonShot",      emoji: "🚀", style: "Momentum Chaser",       strategy: "momentum" },
  { id: 10, name: "WhaleWatch",    emoji: "🐋", style: "Volume Tracker",        strategy: "smart_ai" },
  { id: 11, name: "PlayerOne",     emoji: "🎮", style: "Gamified Trader",       strategy: "smart_ai" },
  { id: 12, name: "GamerX",        emoji: "🕹️", style: "Risk Gamer",           strategy: "smart_ai" },
  { id: 13, name: "ChampBot",      emoji: "🏆", style: "Tournament Champion",   strategy: "smart_ai" },
  { id: 14, name: "RichieRich",    emoji: "💰", style: "Value Accumulator",     strategy: "smart_ai" },
  { id: 15, name: "OracleAI",      emoji: "🔮", style: "Prediction Master",     strategy: "smart_ai" },
  { id: 16, name: "RocketMan",     emoji: "🚀", style: "Breakout Hunter",       strategy: "smart_ai" },
  { id: 17, name: "HotShot",       emoji: "🔥", style: "High-Frequency Scalper",strategy: "smart_ai" },
  { id: 18, name: "CosmicBet",     emoji: "💫", style: "Cosmic Gambler",        strategy: "smart_ai" },
  { id: 32, name: "SharkBite",     emoji: "🦈", style: "Predatory Trader",      strategy: "smart_ai" },
  { id: 33, name: "EagleEye",      emoji: "🦅", style: "Aerial Scout",          strategy: "smart_ai" },
  { id: 34, name: "DragonScale",   emoji: "🐉", style: "Fire Breather",         strategy: "smart_ai" },
  { id: 35, name: "LuckyDice",     emoji: "🎰", style: "Probability Trader",    strategy: "smart_ai" },
  { id: 36, name: "IceBerg",       emoji: "🧊", style: "Deep Value Lurker",     strategy: "smart_ai" },
  { id: 37, name: "Tornado",       emoji: "🌪️", style: "Volatile Trader",      strategy: "smart_ai" },
  { id: 38, name: "WolfPack",      emoji: "🐺", style: "Pack Hunter",           strategy: "smart_ai" },
  { id: 39, name: "StarDust",      emoji: "⭐", style: "Cosmic Drifter",        strategy: "smart_ai" },
  { id: 41, name: "Octopus",       emoji: "🐙", style: "Multi-Arm Trader",      strategy: "smart_ai" },
  { id: 46, name: "SparringBot",   emoji: "🤖", style: "Training Partner",      strategy: "smart_ai" },
];

function buildStrategy(bot) {
  // Generate unique strategy params from bot characteristics
  const seed = bot.id * 7 + bot.name.length * 13;
  return {
    name: `${bot.emoji} ${bot.name}`,
    style: bot.style,
    description: `${bot.name} — a ${bot.style.toLowerCase()} agent in the GemBots Arena. Evolved through AI-driven battles.`,
    params: {
      aggression: 30 + (seed % 60),
      defense: 20 + ((seed * 3) % 70),
      speed: 40 + ((seed * 5) % 55),
      adaptability: 35 + ((seed * 7) % 60),
      riskTolerance: 25 + ((seed * 11) % 65),
      patternRecognition: 50 + ((seed * 13) % 45),
      counterStrategy: 30 + ((seed * 17) % 60),
      bluffFrequency: 10 + ((seed * 19) % 50),
      endgameShift: 20 + ((seed * 23) % 70),
    },
    version: "1.0.0",
    baseStrategy: bot.strategy,
    createdAt: new Date().toISOString(),
    creator: "GemBots Arena"
  };
}

async function main() {
  console.log("=".repeat(60));
  console.log("  🦍 GemBots NFA — Batch Mint All Arena Bots");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddr);
  
  console.log("\n📋 Minter:", deployerAddr);
  console.log("💰 Balance:", ethers.formatEther(balance), "BNB");
  console.log("🤖 Bots to mint:", BOTS.length);

  const estimatedGas = 0.0008 * BOTS.length; // ~0.0008 BNB per mint at 1 gwei
  console.log("⛽ Estimated gas:", estimatedGas.toFixed(4), "BNB");
  console.log("💡 Will mint as many as balance allows, stopping when low on gas");

  const GemBotsNFA = await ethers.getContractFactory("GemBotsNFA");
  const nfa = GemBotsNFA.attach(NFA_CONTRACT);

  const currentSupply = await nfa.totalSupply();
  console.log("📊 Current NFA supply:", currentSupply.toString());

  const results = [];
  let totalGasSpent = 0n;

  for (let i = 0; i < BOTS.length; i++) {
    const bot = BOTS[i];
    const strategy = buildStrategy(bot);
    const strategyJSON = JSON.stringify(strategy);
    const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(strategyJSON));

    const config = {
      name: `${bot.emoji} ${bot.name}`,
      model: "gembots-arena-ai",
      arena: "gembots.space",
      botId: bot.id,
      tier: "Bronze",
      nfaVersion: 1
    };
    const configJSON = JSON.stringify(config);
    const configHash = ethers.keccak256(ethers.toUtf8Bytes(configJSON));

    const configURI = "data:application/json;base64," + Buffer.from(configJSON).toString("base64");
    const strategyURI = "data:application/json;base64," + Buffer.from(strategyJSON).toString("base64");

    // Check remaining balance before each mint
    const currentBal = await ethers.provider.getBalance(deployerAddr);
    if (currentBal < ethers.parseEther("0.0005")) {
      console.log(`\n⚠️ Balance too low (${ethers.formatEther(currentBal)} BNB), stopping.`);
      break;
    }

    console.log(`\n[${i+1}/${BOTS.length}] 🚀 Minting ${bot.emoji} ${bot.name} (bot #${bot.id})...`);
    
    try {
      const tx = await nfa.mint(
        bot.id,           // agentId = supabase bot id
        configHash,
        configURI,
        "gembots-arena-ai",
        strategyHash,
        strategyURI,
        { gasPrice: ethers.parseUnits("1", "gwei") } // cheap gas
      );

      const receipt = await tx.wait();
      
      // Get NFA ID from event
      let nfaId = "?";
      const mintEvent = receipt.logs.find(log => {
        try {
          const parsed = nfa.interface.parseLog(log);
          return parsed && parsed.name === "NFAMinted";
        } catch { return false; }
      });
      if (mintEvent) {
        const parsed = nfa.interface.parseLog(mintEvent);
        nfaId = parsed.args.nfaId.toString();
      }

      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      totalGasSpent += gasUsed;

      console.log(`   ✅ NFA #${nfaId} minted! TX: ${tx.hash.slice(0,18)}... Gas: ${ethers.formatEther(gasUsed)} BNB`);
      
      results.push({ bot: bot.name, botId: bot.id, nfaId, tx: tx.hash, success: true });

      // Small delay between mints to avoid nonce issues
      if (i < BOTS.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.log(`   ❌ FAILED: ${err.message.slice(0, 100)}`);
      results.push({ bot: bot.name, botId: bot.id, nfaId: null, tx: null, success: false, error: err.message.slice(0, 100) });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  📊 BATCH MINT SUMMARY");
  console.log("=".repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Minted: ${successful.length}/${BOTS.length}`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}`);
    failed.forEach(f => console.log(`   - ${f.bot}: ${f.error}`));
  }
  
  console.log(`\n⛽ Total gas: ${ethers.formatEther(totalGasSpent)} BNB`);
  
  const finalBalance = await ethers.provider.getBalance(deployerAddr);
  console.log(`💰 Remaining balance: ${ethers.formatEther(finalBalance)} BNB`);

  const finalSupply = await nfa.totalSupply();
  console.log(`📊 Total NFA supply: ${finalSupply.toString()}`);

  // Output results as JSON for further processing
  console.log("\n📝 Results JSON:");
  console.log(JSON.stringify(results, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Batch mint failed:", error);
    process.exit(1);
  });
