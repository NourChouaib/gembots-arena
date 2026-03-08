const { ethers } = require("hardhat");

/**
 * Batch Genesis Mint 90 NFAs on GemBotsNFAv4
 * Uses batchMintGenesis() — owner-only, free (no mintFee)
 * Mints in batches of 10 to stay within block gas limits
 */

const NFA_V4 = "0x6eFC44519229655039e74bFF4A87f427420018E6";

// Bot templates for 90 genesis NFAs (IDs 11-100)
function generateBots(count, startId = 11) {
  const styles = [
    "Aggressive Scalper", "Defensive Analyst", "Lightning Trader",
    "Trend Surfer", "Mean Reversion Pro", "Momentum Chaser",
    "Volume Tracker", "Risk Gamer", "Precision Sniper",
    "HODLer Supreme", "Breakout Hunter", "Probability Trader",
    "Deep Value Lurker", "Pack Hunter", "Multi-Arm Trader",
    "Cosmic Drifter", "Predatory Trader", "Fire Breather",
    "Volatile Trader", "High-Frequency Scalper"
  ];
  const emojis = [
    "🔥","❄️","⚡","🌊","🌙","☀️","🎯","💎","🚀","🐋",
    "🎮","🕹️","🏆","💰","🔮","💫","🦈","🦅","🐉","🎰",
    "🧊","🌪️","🐺","⭐","🐙","🤖","🦁","🐸","🦊","🌋",
    "🏴‍☠️","⚔️","🛡️","🎪","🔱","🦇","🐍","🦂","🐬","🦜",
    "🌸","🍀","💠","🔷","🎲","🧬","⚗️","🔭","🎵","🌈",
    "🔔","🗡️","🏹","🧿","💣","🎭","🦾","🧠","👾","🤺",
    "🎸","🔩","⛏️","🪝","🎣","🧲","💥","🌠","☄️","🔥",
    "🏅","🎖️","🥇","🏵️","🎗️","🌟","✨","💫","⭐","🌙",
    "🦍","🐧","🦄","🐲","🦎","🐌","🦋","🐝","🦀","🐠"
  ];
  const names = [
    "ThunderStrike","NightOwl","CyberPunk","QuantumLeap","NeonViper",
    "PhantomX","BlazeTrade","CryptoNinja","AlphaDog","BetaWolf",
    "GammaBurst","DeltaForce","SigmaGrind","OmegaPrime","ZetaFlash",
    "ThetaWave","KappaStrike","LambdaCore","MuonPulse","NeutronStar",
    "ProtonBeam","ElectronFlow","PhotonRush","QuarkSpin","NovaBurst",
    "PulsarX","MagnetarPro","RedGiant","WhiteDwarf","BlackHole",
    "EventHorizon","Singularity","WarpDrive","HyperSpace","DarkMatter",
    "CosmicRay","SolarWind","StarForge","NebulaCore","CometTrail",
    "AsteroidMiner","PlanetCrush","GalaxyBrain","UniverseEdge","VoidWalker",
    "TimeBender","SpaceFolder","DimensionX","RealityWarp","MatrixAgent",
    "CodeBreaker","DataStream","ByteForce","PixelPunch","VoxelVault",
    "NeuralNet","DeepLearn","TensorFlow","GradientX","BackpropBot",
    "LayerZero","EpochRunner","BatchNorm","DropoutKing","AttentionHead",
    "TransformerX","EncoderPro","DecoderMax","EmbedMaster","TokenizerBot",
    "HashRateX","BlockSmith","ChainLink","MerkleTree","NonceHunter",
    "GasOptimizer","SlippageBot","YieldFarmer","LiquidPool","StakeVault",
    "FlashLoan","ArbBot","SandwichX","MEVHunter","FrontRunner",
    "BackRunner","OrderFlow","DepthChart","BookKeeper","SpreadEagle"
  ];

  const bots = [];
  for (let i = 0; i < count; i++) {
    bots.push({
      id: startId + i,
      name: names[i % names.length],
      emoji: emojis[i % emojis.length],
      style: styles[i % styles.length],
    });
  }
  return bots;
}

function buildMetadata(bot) {
  const seed = bot.id * 7 + bot.name.length * 13;
  return {
    persona: JSON.stringify({
      name: bot.name,
      emoji: bot.emoji,
      traits: { aggression: 30 + (seed % 60), defense: 20 + ((seed * 3) % 70), speed: 40 + ((seed * 5) % 55) }
    }),
    experience: `${bot.name} — a ${bot.style.toLowerCase()} agent in the GemBots Arena. Genesis collection.`,
    voiceHash: "",
    animationURI: "",
    vaultURI: "",
    vaultHash: ethers.ZeroHash,
  };
}

async function main() {
  const BATCH_SIZE = 10;
  const TOTAL = 90;

  console.log("=".repeat(60));
  console.log("  🦍 GemBots NFA v4 — Batch Genesis Mint (90 NFAs)");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddr);

  console.log("\n📋 Deployer:", deployerAddr);
  console.log("💰 Balance:", ethers.formatEther(balance), "BNB");

  // Load v4 ABI
  const artifact = require("../artifacts/contracts/GemBotsNFAv4.sol/GemBotsNFAv4.json");
  const nfa = new ethers.Contract(NFA_V4, artifact.abi, deployer);

  const genesisCount = await nfa.genesisCount();
  const genesisMax = await nfa.GENESIS_MAX();
  console.log(`📊 Genesis: ${genesisCount}/${genesisMax}`);
  
  const remaining = Number(genesisMax) - Number(genesisCount);
  const toMint = Math.min(TOTAL, remaining);
  console.log(`🎯 Will mint: ${toMint} NFAs in batches of ${BATCH_SIZE}`);

  if (toMint === 0) {
    console.log("❌ No genesis slots remaining!");
    return;
  }

  const bots = generateBots(toMint, Number(genesisCount) + 1);
  const batches = Math.ceil(toMint / BATCH_SIZE);

  // First, estimate gas for 1 batch of 10
  const testBatch = bots.slice(0, Math.min(BATCH_SIZE, toMint));
  const { configURIs, configHashes, modelIds, strategyHashes, strategyURIs, metas } = prepareBatchArgs(testBatch);
  
  try {
    const gasEstimate = await nfa.batchMintGenesis.estimateGas(
      deployerAddr, configURIs, configHashes, modelIds, strategyHashes, strategyURIs, metas
    );
    const gasPerBatch = Number(gasEstimate);
    const gasCostPerBatch = gasPerBatch * 0.05e9; // 0.05 gwei in wei
    const totalGasCost = gasCostPerBatch * batches;
    
    console.log(`\n⛽ Gas estimate per batch of ${testBatch.length}: ${gasPerBatch.toLocaleString()}`);
    console.log(`💸 Cost per batch: ${ethers.formatEther(BigInt(Math.ceil(gasCostPerBatch)))} BNB`);
    console.log(`💸 Total estimated: ${ethers.formatEther(BigInt(Math.ceil(totalGasCost)))} BNB`);
    
    if (BigInt(Math.ceil(totalGasCost)) > balance) {
      console.log("⚠️ May not have enough for all batches. Will mint as many as possible.");
    }
  } catch(e) {
    console.log("⚠️ Gas estimation failed:", e.message.slice(0, 150));
    console.log("Proceeding anyway...");
  }

  // Execute batches
  let totalMinted = 0;
  let totalGasSpent = 0n;

  for (let b = 0; b < batches; b++) {
    const start = b * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, toMint);
    const batch = bots.slice(start, end);
    
    // Check balance
    const bal = await ethers.provider.getBalance(deployerAddr);
    if (bal < ethers.parseEther("0.0003")) {
      console.log(`\n⚠️ Balance too low (${ethers.formatEther(bal)} BNB), stopping.`);
      break;
    }

    console.log(`\n━━━ Batch ${b+1}/${batches} (${batch.length} NFAs) ━━━`);
    
    const args = prepareBatchArgs(batch);
    
    try {
      const tx = await nfa.batchMintGenesis(
        deployerAddr,
        args.configURIs,
        args.configHashes,
        args.modelIds,
        args.strategyHashes,
        args.strategyURIs,
        args.metas,
        { gasPrice: ethers.parseUnits("0.05", "gwei") }
      );
      
      console.log(`   📤 TX: ${tx.hash}`);
      const receipt = await tx.wait();
      
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      totalGasSpent += gasUsed;
      totalMinted += batch.length;
      
      console.log(`   ✅ ${batch.length} NFAs minted! Gas: ${ethers.formatEther(gasUsed)} BNB`);
      
      // Small delay between batches
      if (b < batches - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch(e) {
      console.log(`   ❌ Batch failed: ${e.message.slice(0, 200)}`);
      // Try to continue with smaller batches
      break;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  📊 GENESIS MINT SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Minted: ${totalMinted}/${toMint}`);
  console.log(`⛽ Total gas: ${ethers.formatEther(totalGasSpent)} BNB`);
  
  const finalBal = await ethers.provider.getBalance(deployerAddr);
  console.log(`💰 Remaining: ${ethers.formatEther(finalBal)} BNB`);
  
  const finalGenesis = await nfa.genesisCount();
  console.log(`📊 Genesis count: ${finalGenesis}/${genesisMax}`);
}

function prepareBatchArgs(bots) {
  const configURIs = [];
  const configHashes = [];
  const modelIds = [];
  const strategyHashes = [];
  const strategyURIs = [];
  const metas = [];

  for (const bot of bots) {
    const config = {
      name: `${bot.emoji} ${bot.name}`,
      model: "gembots-arena-ai",
      arena: "gembots.space",
      botId: bot.id,
      tier: "Bronze",
      genesis: true,
      nfaVersion: 4
    };
    const configJSON = JSON.stringify(config);
    
    const strategy = {
      name: `${bot.emoji} ${bot.name}`,
      style: bot.style,
      version: "1.0.0",
      baseStrategy: "smart_ai",
      params: {
        aggression: 30 + (bot.id * 7 % 60),
        defense: 20 + (bot.id * 11 % 70),
        speed: 40 + (bot.id * 13 % 55),
      }
    };
    const strategyJSON = JSON.stringify(strategy);

    configURIs.push("data:application/json;base64," + Buffer.from(configJSON).toString("base64"));
    configHashes.push(ethers.keccak256(ethers.toUtf8Bytes(configJSON)));
    modelIds.push("gembots-arena-ai");
    strategyHashes.push(ethers.keccak256(ethers.toUtf8Bytes(strategyJSON)));
    strategyURIs.push("data:application/json;base64," + Buffer.from(strategyJSON).toString("base64"));
    metas.push([
      JSON.stringify({ name: bot.name, emoji: bot.emoji }),  // persona
      `${bot.name} — ${bot.style}. Genesis collection.`,    // experience
      "",    // voiceHash
      "",    // animationURI
      "",    // vaultURI
      ethers.ZeroHash  // vaultHash
    ]);
  }

  return { configURIs, configHashes, modelIds, strategyHashes, strategyURIs, metas };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });
