const { Connection, Keypair, clusterApiUrl } = require('@solana/web3.js');
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

async function createGemBToken() {
  console.log('🪙 Creating $GEMB Token...\n');

  // Load wallet from env or file
  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ SOLANA_PRIVATE_KEY not set');
    process.exit(1);
  }

  // Parse private key (base58 or array)
  let secretKey;
  try {
    if (privateKey.startsWith('[')) {
      secretKey = Uint8Array.from(JSON.parse(privateKey));
    } else {
      const bs58 = require('bs58');
      secretKey = bs58.decode(privateKey);
    }
  } catch (e) {
    console.error('❌ Invalid private key format');
    process.exit(1);
  }

  const payer = Keypair.fromSecretKey(secretKey);
  console.log('📍 Payer:', payer.publicKey.toBase58());

  // Connect to mainnet
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log('💰 Balance:', balance / 1e9, 'SOL');

  if (balance < 0.05 * 1e9) {
    console.error('❌ Need at least 0.05 SOL for token creation');
    process.exit(1);
  }

  // Token params
  const DECIMALS = 9;
  const TOTAL_SUPPLY = 1_000_000_000; // 1 billion

  console.log('\n📋 Token Parameters:');
  console.log('   Name: GemB');
  console.log('   Symbol: $GEMB');
  console.log('   Decimals:', DECIMALS);
  console.log('   Total Supply:', TOTAL_SUPPLY.toLocaleString());

  // Create mint
  console.log('\n⏳ Creating mint account...');
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,  // mint authority
    payer.publicKey,  // freeze authority (can be null)
    DECIMALS
  );

  console.log('✅ Mint created:', mint.toBase58());

  // Create token account for payer
  console.log('\n⏳ Creating token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log('✅ Token account:', tokenAccount.address.toBase58());

  // Mint total supply
  console.log('\n⏳ Minting', TOTAL_SUPPLY.toLocaleString(), 'tokens...');
  const mintAmount = BigInt(TOTAL_SUPPLY) * BigInt(10 ** DECIMALS);
  
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer,
    mintAmount
  );

  console.log('✅ Minted successfully!');

  // Save token info
  const tokenInfo = {
    name: 'GemB',
    symbol: 'GEMB',
    mint: mint.toBase58(),
    decimals: DECIMALS,
    totalSupply: TOTAL_SUPPLY,
    mintAuthority: payer.publicKey.toBase58(),
    tokenAccount: tokenAccount.address.toBase58(),
    createdAt: new Date().toISOString(),
    allocations: {
      rewards: { percent: 60, amount: 600_000_000 },
      team: { percent: 15, amount: 150_000_000 },
      marketing: { percent: 10, amount: 100_000_000 },
      liquidity: { percent: 10, amount: 100_000_000 },
      reserve: { percent: 5, amount: 50_000_000 }
    }
  };

  const infoPath = path.join(__dirname, '../data/gemb-token.json');
  fs.mkdirSync(path.dirname(infoPath), { recursive: true });
  fs.writeFileSync(infoPath, JSON.stringify(tokenInfo, null, 2));

  console.log('\n📁 Token info saved to:', infoPath);
  console.log('\n🎉 $GEMB Token Created Successfully!');
  console.log('\n📋 Summary:');
  console.log('   Mint Address:', mint.toBase58());
  console.log('   Your Token Account:', tokenAccount.address.toBase58());
  console.log('   Total Supply:', TOTAL_SUPPLY.toLocaleString(), 'GEMB');
  
  return tokenInfo;
}

createGemBToken().catch(console.error);
