const { ethers } = require("hardhat");

/**
 * Update all 100 NFA tokenURIs to point to metadata API
 * Each tokenURI → https://gembots.space/api/nfa/metadata/{id}
 */

const NFA_V4 = "0x6eFC44519229655039e74bFF4A87f427420018E6";
const BASE_URI = "https://gembots.space/api/nfa/metadata/";

async function main() {
  console.log("=".repeat(60));
  console.log("  🔗 Update Token URIs → Metadata API");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const addr = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(addr);
  console.log("\n📋 Deployer:", addr);
  console.log("💰 Balance:", ethers.formatEther(balance), "BNB");

  // Load contract with full ABI
  const artifact = require("../artifacts/contracts/GemBotsNFAv4.sol/GemBotsNFAv4.json");
  const nfa = new ethers.Contract(NFA_V4, artifact.abi, deployer);

  const totalSupply = await nfa.totalSupply();
  console.log("📊 Total NFAs:", totalSupply.toString());

  // Check current tokenURI for #0
  const currentURI = await nfa.tokenURI(0);
  console.log("Current URI #0:", currentURI.slice(0, 80));
  console.log("Target URI #0:", BASE_URI + "0");

  if (currentURI === BASE_URI + "0") {
    console.log("\n✅ Already updated!");
    return;
  }

  // Use setTierBaseURI for Bronze (all are Bronze) — this changes on evolve()
  // But we need individual _setTokenURI for each token
  // The contract doesn't expose _setTokenURI publicly
  // Let's check if there's another way...

  // Check if we can use evolve mechanism or direct call
  // Actually, looking at the contract, setTierBaseURI sets the base,
  // and evolve() uses it. But tokenURI() returns ERC721URIStorage.tokenURI()
  // which returns the individually-set URI, NOT baseURI + tokenId.
  
  // We need to find a way to update individual URIs.
  // Check if there's an admin function:
  const adminFns = artifact.abi
    .filter(a => a.type === 'function' && a.name.includes('set'))
    .map(a => a.name);
  console.log("\nAdmin set functions:", adminFns);

  // If no setTokenURI, we need to add it or use a workaround
  // Option: Use setTierBaseURI and trigger evolve (won't work - needs wins)
  // Option: Deploy a tiny proxy that resolves URIs
  // Best option: Just set the Bronze tier base URI and have the contract
  //   return baseURI + tokenId when no individual URI is set
  
  // Actually let me check — ERC721URIStorage returns individual URI if set,
  // otherwise falls back to baseURI + tokenId.
  // So if we DON'T clear individual URIs, they'll keep returning old data.
  
  // Simplest solution: We'll need a function to batch-update URIs.
  // But since we can't modify the contract, let's redirect:
  // Use the metadata API endpoint but make OpenSea read our API directly
  // by setting the right collection/contract metadata.
  
  // For now, let's just verify OpenSea can read our metadata API
  // and we'll submit it manually through their platform.
  
  console.log("\n⚠️ Contract doesn't expose setTokenURI publicly.");
  console.log("Options:");
  console.log("1. Submit collection to OpenSea with our metadata API URL");
  console.log("2. OpenSea/marketplaces can be configured to use external metadata");
  console.log("3. Deploy v5 with updateTokenURI or use setTierBaseURI trick");
  
  // Actually, let's try setTierBaseURI for Bronze!
  // When evolve() is called, it does: _setTokenURI(nfaId, baseURI + id)
  // We can SET the base URI, then trigger "refresh" on marketplaces
  // But the current individual URIs override the base.
  
  // The real fix: expose a batch setTokenURI admin function.
  // For now, let's at least set the tier base URIs.
  console.log("\n🔧 Setting tier base URIs...");
  
  const tiers = [0, 1, 2, 3, 4]; // Bronze, Silver, Gold, Diamond, Legendary
  for (const tier of tiers) {
    try {
      const tx = await nfa.setTierBaseURI(tier, BASE_URI, {
        gasPrice: ethers.parseUnits("0.05", "gwei")
      });
      await tx.wait();
      console.log(`  ✅ Tier ${tier}: ${BASE_URI}`);
    } catch (e) {
      console.log(`  ❌ Tier ${tier}: ${e.message.slice(0, 80)}`);
    }
  }
  
  console.log("\n📝 Tier base URIs set. When NFAs evolve, they'll get API URLs.");
  console.log("For existing NFAs, individual tokenURIs override base URIs.");
  console.log("Marketplaces should be submitted with our metadata API URL.");
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error("❌", e); process.exit(1); });
