const hre = require("hardhat");
const { ethers } = hre;

const NFA_ADDRESS = "0xD64D4597E8Cd1738B69A8706C3dE4eDe6db10674";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ;

// Names already minted as genesis on v3 (tokens 1-5)
const ALREADY_MINTED = new Set([
  "WhaleWatch", "NeuralPulse", "MomentumKing", "ChaosAgent", "TrendSurfer"
]);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(bal), "BNB\n");

  const nfa = await ethers.getContractAt("GemBotsNFAv3", NFA_ADDRESS);
  const currentGenesis = Number(await nfa.genesisCount());
  const currentSupply = Number(await nfa.totalSupply());
  console.log(`Current: supply=${currentSupply}, genesis=${currentGenesis}/100\n`);

  // Fetch bots from Supabase
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bots?select=id,name,strategy,ai_model,trading_style,wins,losses,total_battles,elo,league,special&order=elo.desc&limit=50`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const bots = await res.json();
  console.log(`Fetched ${bots.length} bots from arena\n`);

  // Filter: skip already minted names, skip test bots
  const toMint = bots.filter(b => {
    const cleanName = b.name.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim();
    if (ALREADY_MINTED.has(cleanName)) return false;
    return true;
  });

  // We need 44 more to reach 50 genesis (5 already minted)
  const needed = 50 - currentGenesis;
  const mintList = toMint.slice(0, needed);
  console.log(`Will mint ${mintList.length} genesis NFAs\n`);

  let minted = 0;
  let failed = 0;

  for (const bot of mintList) {
    try {
      const cleanName = bot.name.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim();
      const configHash = ethers.keccak256(ethers.toUtf8Bytes(`arena-bot-${bot.id}-${cleanName}`));
      const configURI = `ipfs://gembots/arena/${bot.id}`;
      const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(`strategy-${bot.strategy}-${bot.ai_model}-${bot.id}`));
      const strategyURI = `ipfs://gembots/strategy/${bot.strategy}/${bot.trading_style}`;

      // Build personality from arena data
      const winRate = bot.total_battles > 0 ? ((bot.wins / bot.total_battles) * 100).toFixed(1) : "0";
      
      const persona = JSON.stringify({
        name: bot.name,
        personality: getPersonality(bot),
        backstory: `Forged in the GemBots Arena with ${bot.total_battles} battles, ${bot.wins} wins, and an ELO of ${bot.elo}. ${bot.league} league ${bot.special === 'Genesis' ? '🌟 Genesis edition.' : 'warrior.'}`,
        arenaId: bot.id,
        winRate: winRate,
        elo: bot.elo,
        league: bot.league,
      });

      const metadata = {
        persona: persona,
        experience: `Arena veteran — ${bot.wins}W/${bot.losses}L (${winRate}% WR) — ELO ${bot.elo} — ${bot.league} league`,
        voiceHash: ethers.ZeroHash,
        animationURI: "",
        vaultURI: "",
        vaultHash: ethers.ZeroHash,
      };

      process.stdout.write(`[${minted+1}/${mintList.length}] Minting ${bot.name} (${bot.ai_model})...`);

      const tx = await nfa.mintGenesis(
        deployer.address,
        configURI,
        configHash,
        bot.ai_model || "unknown",
        strategyHash,
        strategyURI,
        metadata,
        { gasLimit: 1000000 }
      );
      const receipt = await tx.wait();
      
      const transferEvent = receipt.logs.find(
        (log) => log.topics[0] === ethers.id("Transfer(address,address,uint256)")
      );
      const tokenId = transferEvent ? parseInt(transferEvent.topics[3], 16) : "?";
      
      console.log(` ✅ Token #${tokenId}`);
      minted++;
    } catch (e) {
      console.log(` ❌ ${e.message.slice(0, 80)}`);
      failed++;
    }
  }

  const finalSupply = Number(await nfa.totalSupply());
  const finalGenesis = Number(await nfa.genesisCount());
  const finalBal = await ethers.provider.getBalance(deployer.address);
  
  console.log(`\n🎉 Done! Minted: ${minted}, Failed: ${failed}`);
  console.log(`Supply: ${finalSupply}, Genesis: ${finalGenesis}/100`);
  console.log(`Balance remaining: ${ethers.formatEther(finalBal)} BNB`);
  console.log(`Gas spent: ${(Number(ethers.formatEther(bal)) - Number(ethers.formatEther(finalBal))).toFixed(6)} BNB`);
}

function getPersonality(bot) {
  const styles = {
    scalper: "Lightning fast reflexes. Gets in, takes profit, gets out. No time for emotions.",
    momentum: "Rides the wave hard. When something pumps, they're already on it. Bold and decisive.",
    swing: "Patient and strategic. Waits for the perfect entry, holds through the noise.",
    mean_reversion: "Contrarian at heart. Buys the dip, sells the rip. The market always comes back.",
    contrarian: "Goes against the crowd. When everyone's buying, they're selling. Ice cold nerves.",
  };
  const leagues = {
    diamond: "Battle-hardened champion",
    gold: "Proven competitor",
    silver: "Rising contender",
    bronze: "Hungry newcomer",
  };
  const style = styles[bot.trading_style] || "Versatile and adaptive.";
  const league = leagues[bot.league] || "Arena warrior";
  return `${league}. ${style}`;
}

main().catch(console.error);
