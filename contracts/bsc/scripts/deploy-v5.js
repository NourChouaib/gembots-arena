const { ethers } = require("hardhat");

/**
 * Deploy GemBotsNFAv5 + batchMintGenesis 100 + batchSetTokenURI all 100
 * MINIMAL GAS: 0.01 gwei (BSC floor)
 */

const TREASURY = "0x133C89BC9Dc375fBc46493A92f4Fd2486F8F0d76";
const BATTLE_RESOLVER = "0x133C89BC9Dc375fBc46493A92f4Fd2486F8F0d76";
const METADATA_BASE = "https://gembots.space/api/nfa/metadata/";
const COLLECTION_URI = "https://gembots.space/api/nfa/collection";

const GAS_PRICE = ethers.parseUnits("0.05", "gwei"); // BSC minimum

async function main() {
  console.log("=".repeat(60));
  console.log("  🚀 Deploy GemBotsNFAv5 + Genesis 100 + Metadata URIs");
  console.log("  ⛽ Gas price: 0.05 gwei (BSC minimum)");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const addr = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(addr);
  console.log("\n📋 Deployer:", addr);
  console.log("💰 Balance:", ethers.formatEther(balance), "BNB");

  // Check minimum viable balance (~0.005 BNB should be enough)
  if (balance < ethers.parseEther("0.005")) {
    console.log("❌ Need at least 0.005 BNB for deploy + genesis + URIs");
    return;
  }

  // ─── 1. Deploy v5 ───
  console.log("\n── Step 1: Deploy GemBotsNFAv5 ──");
  const Factory = await ethers.getContractFactory("GemBotsNFAv5");
  const nfa = await Factory.deploy(TREASURY, BATTLE_RESOLVER, { gasPrice: GAS_PRICE });
  await nfa.waitForDeployment();
  const nfaAddr = await nfa.getAddress();
  console.log("✅ GemBotsNFAv5 deployed:", nfaAddr);

  // ─── 2. Set contractURI ───
  console.log("\n── Step 2: Set contractURI ──");
  let tx = await nfa.setContractURI(COLLECTION_URI, { gasPrice: GAS_PRICE });
  await tx.wait();
  console.log("✅ contractURI set:", COLLECTION_URI);

  // ─── 3. Batch mint 100 Genesis ───
  console.log("\n── Step 3: Batch mint 100 Genesis NFAs ──");
  const BATCH_SIZE = 10;
  for (let i = 0; i < 100; i += BATCH_SIZE) {
    tx = await nfa.batchMintGenesis(BATCH_SIZE, { gasPrice: GAS_PRICE });
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed;
    console.log(`  ✅ Batch ${i / BATCH_SIZE + 1}/10: minted #${i}-#${i + BATCH_SIZE - 1} (gas: ${gasUsed})`);
  }

  const supply = await nfa.totalSupply();
  const genesis = await nfa.genesisCount();
  console.log(`📊 Total supply: ${supply}, Genesis: ${genesis}`);

  // ─── 4. Batch set tokenURIs ───
  console.log("\n── Step 4: Batch set token URIs → metadata API ──");
  const URI_BATCH = 20; // 20 at a time to save gas per tx
  for (let i = 0; i < 100; i += URI_BATCH) {
    const tokenIds = [];
    const uris = [];
    for (let j = i; j < i + URI_BATCH && j < 100; j++) {
      tokenIds.push(j);
      uris.push(METADATA_BASE + j);
    }
    tx = await nfa.batchSetTokenURI(tokenIds, uris, { gasPrice: GAS_PRICE });
    const receipt = await tx.wait();
    console.log(`  ✅ URIs batch ${i / URI_BATCH + 1}/5: #${i}-#${i + URI_BATCH - 1} (gas: ${receipt.gasUsed})`);
  }

  // ─── 5. Enable open minting ───
  console.log("\n── Step 5: Enable open minting ──");
  tx = await nfa.setOpenMinting(true, { gasPrice: GAS_PRICE });
  await tx.wait();
  console.log("✅ Open minting enabled");

  // ─── Verify ───
  console.log("\n── Verification ──");
  const uri0 = await nfa.tokenURI(0);
  const uri99 = await nfa.tokenURI(99);
  console.log("tokenURI(0):", uri0);
  console.log("tokenURI(99):", uri99);
  console.log("contractURI:", await nfa.contractURI());

  const finalBalance = await ethers.provider.getBalance(addr);
  const spent = balance - finalBalance;
  console.log("\n💰 Total gas spent:", ethers.formatEther(spent), "BNB");
  console.log("💰 Remaining balance:", ethers.formatEther(finalBalance), "BNB");

  console.log("\n" + "=".repeat(60));
  console.log("  ✅ DONE! GemBotsNFAv5:", nfaAddr);
  console.log("  📝 Next: Verify on BSCScan, update .env, rebuild frontend");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error("❌", e); process.exit(1); });
