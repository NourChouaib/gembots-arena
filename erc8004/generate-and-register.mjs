import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// === CONFIG ===
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const BSC_RPC = 'https://bsc-dataseed.binance.org/';
const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const GEMBOTS_URL = 'https://gembots.space';

const ABI = [
  'function register(string agentURI) external returns (uint256 agentId)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

const GEMBOTS = [
  { id: 'gpt4o', name: 'GPT-4o', provider: 'OpenAI', emoji: '🧠', desc: 'OpenAI flagship multimodal model. Fast, precise, and versatile battle strategist.' },
  { id: 'claude-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', emoji: '🎭', desc: 'Anthropic balanced model. Strong reasoning with creative flair in arena battles.' },
  { id: 'claude-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', emoji: '✨', desc: 'Anthropic fastest model. Lightning-quick responses with solid combat logic.' },
  { id: 'gemini-flash', name: 'Gemini 2.0 Flash', provider: 'Google', emoji: '⚡', desc: 'Google speed-optimized model. Rapid analysis and decisive battle moves.' },
  { id: 'gemini-pro', name: 'Gemini 1.5 Pro', provider: 'Google', emoji: '💎', desc: 'Google advanced reasoning model. Deep strategic analysis in arena combat.' },
  { id: 'grok', name: 'Grok', provider: 'xAI', emoji: '🦊', desc: 'xAI witty and unfiltered model. Unconventional and unpredictable battle strategies.' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', emoji: '🔬', desc: 'Chinese AI powerhouse. Mathematical precision and advanced reasoning in battles.' },
  { id: 'llama-70b', name: 'Llama 3.3 70B', provider: 'Meta', emoji: '🦙', desc: 'Meta open-source champion. Community-driven and battle-hardened warrior.' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral AI', emoji: '🌬️', desc: 'European AI excellence. Multilingual mastery and sharp tactical reasoning.' },
  { id: 'qwen-72b', name: 'Qwen 2.5 72B', provider: 'Alibaba', emoji: '🐉', desc: 'Alibaba top model. Powerful analytical and strategic combat capabilities.' },
  { id: 'command-r-plus', name: 'Command R+', provider: 'Cohere', emoji: '⚔️', desc: 'Cohere enterprise model. RAG-optimized grounding and structured battle approach.' },
  { id: 'phi-4', name: 'Phi-4', provider: 'Microsoft', emoji: '🔷', desc: 'Microsoft compact powerhouse. Punches above its weight class in every battle.' },
  { id: 'nova-pro', name: 'Nova Pro', provider: 'Amazon', emoji: '🌟', desc: 'Amazon versatile model. Balanced performance across all battle scenarios.' },
  { id: 'nemotron', name: 'Nemotron 70B', provider: 'NVIDIA', emoji: '🟢', desc: 'NVIDIA hardware-optimized model. Raw computational power unleashed in arena.' },
];

function buildRegistrationFile(bot) {
  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: `GemBots Arena — ${bot.name}`,
    description: `${bot.emoji} ${bot.name} by ${bot.provider}. AI battle agent on GemBots Arena. ${bot.desc} Competes in real-time AI vs AI battles with on-chain betting on BSC.`,
    image: `${GEMBOTS_URL}/models/${bot.id}.png`,
    services: [
      { name: 'web', endpoint: `${GEMBOTS_URL}/` },
      { name: 'arena', endpoint: `${GEMBOTS_URL}/api/agents/${bot.id}` }
    ],
    active: true,
    registrations: [],
    supportedTrust: ['reputation']
  };
}

async function main() {
  // Step 1: Generate JSON files
  const publicDir = path.resolve('../public/agents');
  fs.mkdirSync(publicDir, { recursive: true });
  
  console.log('📝 Generating registration files...');
  for (const bot of GEMBOTS) {
    const regFile = buildRegistrationFile(bot);
    const filePath = path.join(publicDir, `${bot.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(regFile, null, 2));
    console.log(`  ${bot.emoji} ${bot.id}.json`);
  }
  console.log(`✅ ${GEMBOTS.length} files written to public/agents/\n`);

  // Step 2: Register on-chain
  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const registry = new ethers.Contract(IDENTITY_REGISTRY, ABI, wallet);

  console.log(`🦍 GemBots ERC-8004 Registration — BSC Mainnet`);
  console.log(`📍 Registry: ${IDENTITY_REGISTRY}`);
  console.log(`👤 Owner: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 BNB Balance: ${ethers.formatEther(balance)}`);

  // Pre-flight: estimate gas for first one
  const testURI = `${GEMBOTS_URL}/agents/${GEMBOTS[0].id}.json`;
  try {
    const gasEst = await registry['register(string)'].estimateGas(testURI);
    console.log(`⛽ Estimated gas per registration: ${gasEst.toString()}`);
    const totalGas = gasEst * BigInt(GEMBOTS.length);
    const totalCost = totalGas * ethers.parseUnits('3', 'gwei');
    console.log(`⛽ Total estimated cost: ${ethers.formatEther(totalCost)} BNB`);
    if (totalCost > balance) {
      console.log('❌ Not enough BNB! Aborting.');
      return;
    }
  } catch(e) {
    console.log(`⚠️ Gas estimate failed: ${e.message?.substring(0,200)}`);
    console.log('Proceeding anyway with manual gas limit...');
  }

  console.log(`\n📦 Registering ${GEMBOTS.length} AI agents...\n`);

  const results = [];
  let nonce = await provider.getTransactionCount(wallet.address);
  
  for (const bot of GEMBOTS) {
    const agentURI = `${GEMBOTS_URL}/agents/${bot.id}.json`;
    console.log(`${bot.emoji} Registering ${bot.name} → ${agentURI}`);
    
    try {
      // Estimate gas individually
      let gasLimit;
      try {
        const est = await registry['register(string)'].estimateGas(agentURI);
        gasLimit = est * 130n / 100n; // +30% buffer
      } catch {
        gasLimit = 250000n;
      }

      const tx = await registry['register(string)'](agentURI, {
        gasPrice: ethers.parseUnits('3', 'gwei'),
        gasLimit,
        nonce: nonce++
      });
      
      console.log(`   TX: ${tx.hash}`);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        console.log(`   ❌ REVERTED on-chain!`);
        results.push({ ...bot, success: false, error: 'reverted', txHash: tx.hash });
        continue;
      }

      // Get agentId from Transfer event (mint = transfer from 0x0)
      let agentId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = registry.interface.parseLog(log);
          if (parsed?.name === 'Registered') {
            agentId = parsed.args.agentId.toString();
            break;
          }
        } catch {}
      }
      if (!agentId) {
        // Fallback: Transfer event
        const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)']);
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === 'Transfer' && parsed.args.from === ethers.ZeroAddress) {
              agentId = parsed.args.tokenId.toString();
              break;
            }
          } catch {}
        }
      }
      
      console.log(`   ✅ Agent #${agentId} | Gas: ${receipt.gasUsed.toString()}`);
      results.push({ ...bot, agentId, txHash: tx.hash, success: true });
      
    } catch (err) {
      console.error(`   ❌ FAILED: ${err.message?.substring(0, 150)}`);
      results.push({ ...bot, success: false, error: err.message?.substring(0, 150) });
      // Reset nonce on failure
      nonce = await provider.getTransactionCount(wallet.address);
    }
  }

  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎉 REGISTRATION COMPLETE`);
  console.log(`✅ Successful: ${successful.length}/${GEMBOTS.length}`);
  if (failed.length) console.log(`❌ Failed: ${failed.length}`);
  console.log();
  
  for (const r of successful) {
    console.log(`${r.emoji} ${r.name}: Agent #${r.agentId}`);
    console.log(`   https://bscscan.com/tx/${r.txHash}`);
  }
  
  // Update registration files with agentIds
  for (const r of successful) {
    const filePath = path.join(publicDir, `${r.id}.json`);
    const regFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    regFile.registrations = [{
      agentId: parseInt(r.agentId),
      agentRegistry: `eip155:56:${IDENTITY_REGISTRY}`
    }];
    fs.writeFileSync(filePath, JSON.stringify(regFile, null, 2));
  }
  
  fs.writeFileSync('registration-results.json', JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to registration-results.json`);
  
  const finalBalance = await provider.getBalance(wallet.address);
  console.log(`💰 Remaining BNB: ${ethers.formatEther(finalBalance)}`);
}

main().catch(console.error);
