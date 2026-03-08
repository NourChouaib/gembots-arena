const { ethers } = require("hardhat");

// ============================================================================
// Genesis Collection: 100 unique AI bots
// ============================================================================

const BOT_NAMES = [
  'AlphaStrike', 'NeonViper', 'CryptoWolf', 'QuantumPulse', 'ShadowTrader',
  'IronBull', 'VoltEdge', 'StarForge', 'ThunderHawk', 'BlazeFury',
  'DeepMind', 'OracleX', 'PhantomByte', 'NovaSpark', 'TitanCore',
  'ZeroGravity', 'StormBreaker', 'FrostByte', 'SolarWind', 'DarkMatter',
  'CyberPunk', 'MegaFlux', 'PrismShift', 'HyperLoop', 'NeuralNet',
  'PixelDrift', 'AtomSplit', 'WaveRider', 'CosmicDust', 'LaserFocus',
  'BinaryBeast', 'DataForge', 'EchoStrike', 'FluxCaptor', 'GlitchHunter',
  'HashKnight', 'InfinityBot', 'JoltRunner', 'KineticForce', 'LunarEclipse',
  'MatrixBreaker', 'NanoSwarm', 'OmegaPrime', 'PulseEngine', 'QuantaByte',
  'RazorEdge', 'SilverFang', 'TurboCharge', 'UltraViolet', 'VortexMind',
  'WraithKing', 'XenonFlash', 'YottaByte', 'ZenithPeak', 'ArcticFox',
  'BlitzKrieg', 'ChromeHeart', 'DeltaForce', 'ElectraVolt', 'FireStorm',
  'GhostShell', 'HexaCore', 'IonCannon', 'JadePhoenix', 'KryptoNite',
  'LightSpeed', 'MachineGod', 'NightOwl', 'ObsidianEdge', 'PhotonBeam',
  'QuakeForce', 'RocketFuel', 'SteelNerve', 'TechnoViking', 'UnderDog',
  'VenomStrike', 'WarHammer', 'XtremeBot', 'YieldHunter', 'ZetaWave',
  'AceTrader', 'BraveHeart', 'ClockWork', 'DiamondHand', 'EagleEye',
  'FalconPunch', 'GoldRush', 'HotShot', 'IceBreaker', 'JetStream',
  'KillerInstinct', 'LionHeart', 'MoneyMaker', 'NinjaTrader', 'OverDrive',
  'PowerSurge', 'QuickSilver', 'RedShift', 'SparkPlug', 'TrustFund',
];

const EMOJIS = ['🤖','🦾','⚡','🔥','🧠','💎','🚀','🎯','🦈','🐉','👾','🛸','⚔️','🌊','🌀','💀','🐺','🦅','🐍','🦁'];

const STRATEGIES = [
  'DragonScale', 'SolarFlare', 'PyroBot', 'WhaleWatch',
  'VoltageKing', 'TargetLock', 'EqniMb', 'FrostMaster',
  'MoonShot', 'TsunamiX', 'SharkBite', 'LunarPredator',
];

const MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-exp:free',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-sonnet-4-5',
  'openai/gpt-4o',
  'google/gemini-2.5-pro',
];

const PERSONALITIES = [
  'Aggressive momentum trader. Buys breakouts, cuts losses fast.',
  'Contrarian value hunter. Buys fear, sells greed.',
  'Swing trader. Rides trends, pyramids winners.',
  'Scalper. Quick in, quick out. Volume is king.',
  'Diamond hands. Deep conviction plays only.',
  'Technical analyst. Chart patterns and indicators.',
  'Sentiment follower. Social signals drive decisions.',
  'Fundamental researcher. On-chain data obsessed.',
  'Risk-averse. Small positions, tight stops.',
  'Whale watcher. Follows smart money movements.',
];

function generateBot(index) {
  const name = BOT_NAMES[index];
  const emoji = EMOJIS[index % EMOJIS.length];
  const strategy = STRATEGIES[index % STRATEGIES.length];
  const model = MODELS[index % MODELS.length];
  const personality = PERSONALITIES[index % PERSONALITIES.length];

  const configURI = JSON.stringify({
    name: `${emoji} ${name}`,
    description: `Genesis #${index} — ${personality}`,
    tier: 'bronze',
    model,
    strategy,
    emoji,
    genesis: true,
    genesisId: index,
    createdAt: new Date().toISOString(),
  });

  const configHash = ethers.keccak256(ethers.toUtf8Bytes(configURI));
  const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(strategy));

  const meta = {
    persona: JSON.stringify({ name, emoji, style: strategy, personality }),
    experience: personality,
    voiceHash: '',
    animationURI: '',
    vaultURI: configURI,
    vaultHash: configHash,
  };

  return { configURI, configHash, model, strategyHash, strategy, meta };
}

async function main() {
  console.log("=".repeat(60));
  console.log("  GemBots Genesis Collection — Batch Mint");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log("\n📋 Deployer:", deployerAddress);
  console.log("💰 Balance:", ethers.formatEther(balance), "BNB");

  const contractAddress = process.env.NEXT_PUBLIC_BSC_NFA_CONTRACT_ADDRESS || '0x6eFC44519229655039e74bFF4A87f427420018E6';
  console.log("📄 Contract:", contractAddress);

  const GemBotsNFA = await ethers.getContractFactory("GemBotsNFAv4");
  const nfa = GemBotsNFA.attach(contractAddress);

  const currentSupply = await nfa.totalSupply();
  const genesisCount = await nfa.genesisCount();
  console.log("📊 Current supply:", currentSupply.toString());
  console.log("🏛  Genesis minted:", genesisCount.toString(), "/ 100");

  const remaining = 100 - Number(genesisCount);
  if (remaining <= 0) {
    console.log("\n✅ All 100 Genesis already minted!");
    return;
  }

  console.log(`\n🚀 Minting ${remaining} Genesis NFAs in batches of 10...`);

  const BATCH_SIZE = 10;
  let totalGas = 0n;
  let minted = 0;

  for (let batch = 0; batch < Math.ceil(remaining / BATCH_SIZE); batch++) {
    const start = Number(genesisCount) + batch * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, 100);
    const count = end - start;

    console.log(`\n📦 Batch ${batch + 1}: Genesis #${start} to #${end - 1} (${count} bots)`);

    const configURIs = [];
    const configHashes = [];
    const modelIds = [];
    const strategyHashes = [];
    const strategyURIs = [];
    const metas = [];

    for (let i = start; i < end; i++) {
      const bot = generateBot(i);
      configURIs.push(bot.configURI);
      configHashes.push(bot.configHash);
      modelIds.push(bot.model);
      strategyHashes.push(bot.strategyHash);
      strategyURIs.push(bot.strategy);
      metas.push(bot.meta);
    }

    try {
      const tx = await nfa.batchMintGenesis(
        deployerAddress,
        configURIs,
        configHashes,
        modelIds,
        strategyHashes,
        strategyURIs,
        metas,
        { gasPrice: ethers.parseUnits('1', 'gwei') }
      );
      console.log("   TX:", tx.hash);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;
      totalGas += gasUsed;
      minted += count;
      console.log(`   ✅ Minted! Gas: ${gasUsed.toString()} (${ethers.formatEther(gasUsed * ethers.parseUnits('1', 'gwei'))} BNB)`);
    } catch (err) {
      console.error(`   ❌ Batch failed:`, err.message?.slice(0, 200));
      break;
    }
  }

  const finalBalance = await ethers.provider.getBalance(deployerAddress);
  const spent = balance - finalBalance;

  console.log("\n" + "─".repeat(60));
  console.log("  GENESIS MINT SUMMARY");
  console.log("─".repeat(60));
  console.log(`  Minted: ${minted} Genesis NFAs`);
  console.log(`  Total supply: ${Number(currentSupply) + minted}`);
  console.log(`  Gas spent: ${ethers.formatEther(spent)} BNB`);
  console.log(`  Remaining balance: ${ethers.formatEther(finalBalance)} BNB`);
  console.log("─".repeat(60));
  console.log("\n🎉 Genesis Collection minted!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Mint failed:", error);
    process.exit(1);
  });
