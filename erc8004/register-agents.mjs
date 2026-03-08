import { ethers } from 'ethers';
import fs from 'fs';

// === CONFIG ===
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const BSC_RPC = 'https://bsc-dataseed.binance.org/';
const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

// Minimal ABI for register(string agentURI) 
const ABI = [
  'function register(string agentURI) external returns (uint256 agentId)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

// === GemBots AI Models ===
const GEMBOTS = [
  { id: 'gpt4o', name: 'GPT-4o', provider: 'OpenAI', emoji: '🧠', desc: 'OpenAI\'s flagship multimodal model. Fast, precise, and versatile.' },
  { id: 'claude-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', emoji: '🎭', desc: 'Anthropic\'s balanced model. Strong reasoning with creative flair.' },
  { id: 'claude-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', emoji: '✨', desc: 'Anthropic\'s fastest model. Lightning-quick responses with solid logic.' },
  { id: 'gemini-flash', name: 'Gemini 2.0 Flash', provider: 'Google', emoji: '⚡', desc: 'Google\'s speed-optimized model. Rapid analysis and decision-making.' },
  { id: 'gemini-pro', name: 'Gemini 1.5 Pro', provider: 'Google', emoji: '💎', desc: 'Google\'s advanced reasoning model. Deep analysis capabilities.' },
  { id: 'grok', name: 'Grok', provider: 'xAI', emoji: '🦊', desc: 'xAI\'s witty and unfiltered model. Unconventional strategies.' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', emoji: '🔬', desc: 'Chinese AI powerhouse. Advanced reasoning and mathematical precision.' },
  { id: 'llama-70b', name: 'Llama 3.3 70B', provider: 'Meta', emoji: '🦙', desc: 'Meta\'s open-source champion. Community-driven and battle-tested.' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral AI', emoji: '🌬️', desc: 'European AI excellence. Multilingual mastery and sharp reasoning.' },
  { id: 'qwen-72b', name: 'Qwen 2.5 72B', provider: 'Alibaba', emoji: '🐉', desc: 'Alibaba\'s top model. Strong analytical and coding capabilities.' },
  { id: 'command-r-plus', name: 'Command R+', provider: 'Cohere', emoji: '⚔️', desc: 'Cohere\'s enterprise model. RAG-optimized with strong grounding.' },
  { id: 'phi-4', name: 'Phi-4', provider: 'Microsoft', emoji: '🔷', desc: 'Microsoft\'s compact powerhouse. Punches above its weight class.' },
  { id: 'nova-pro', name: 'Nova Pro', provider: 'Amazon', emoji: '🌟', desc: 'Amazon\'s versatile model. Balanced performance across all tasks.' },
  { id: 'nemotron', name: 'Nemotron 70B', provider: 'NVIDIA', emoji: '🟢', desc: 'NVIDIA\'s hardware-optimized model. Raw computational power.' },
];

function buildRegistrationFile(bot) {
  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: `GemBots Arena — ${bot.name}`,
    description: `${bot.emoji} ${bot.name} by ${bot.provider} — AI battle agent on GemBots Arena (gembots.space). ${bot.desc} Competes in real-time AI vs AI battles with on-chain betting on BSC.`,
    image: `https://gembots.space/models/${bot.id}.png`,
    services: [
      {
        name: 'web',
        endpoint: 'https://gembots.space/'
      },
      {
        name: 'GemBots Arena',
        endpoint: `https://gembots.space/api/agents/${bot.id}`
      }
    ],
    active: true,
    registrations: [],  // Will be filled after registration
    supportedTrust: ['reputation']
  };
}

async function main() {
  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const registry = new ethers.Contract(IDENTITY_REGISTRY, ABI, wallet);

  console.log(`\n🦍 GemBots ERC-8004 Registration on BSC Mainnet`);
  console.log(`📍 Registry: ${IDENTITY_REGISTRY}`);
  console.log(`👤 Owner: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 BNB Balance: ${ethers.formatEther(balance)}`);
  console.log(`📦 Registering ${GEMBOTS.length} AI agents...\n`);

  const results = [];
  
  for (const bot of GEMBOTS) {
    const regFile = buildRegistrationFile(bot);
    // Use base64 data URI for fully on-chain metadata
    const jsonStr = JSON.stringify(regFile);
    const base64 = Buffer.from(jsonStr).toString('base64');
    const agentURI = `data:application/json;base64,${base64}`;
    
    console.log(`${bot.emoji} Registering ${bot.name}...`);
    
    try {
      const tx = await registry['register(string)'](agentURI, {
        gasPrice: ethers.parseUnits('3', 'gwei'),
        gasLimit: 500000
      });
      
      console.log(`   TX: ${tx.hash}`);
      const receipt = await tx.wait();
      
      // Get agentId from Registered event
      const registeredEvent = receipt.logs.find(log => {
        try {
          const parsed = registry.interface.parseLog(log);
          return parsed?.name === 'Registered';
        } catch { return false; }
      });
      
      let agentId = null;
      if (registeredEvent) {
        const parsed = registry.interface.parseLog(registeredEvent);
        agentId = parsed.args.agentId.toString();
      } else {
        // Fallback: get from Transfer event (tokenId)
        const transferEvent = receipt.logs.find(log => {
          try {
            const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)']);
            const parsed = iface.parseLog(log);
            return parsed?.name === 'Transfer';
          } catch { return false; }
        });
        if (transferEvent) {
          const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)']);
          const parsed = iface.parseLog(transferEvent);
          agentId = parsed.args.tokenId.toString();
        }
      }
      
      console.log(`   ✅ Agent ID: ${agentId} | Gas: ${receipt.gasUsed.toString()}`);
      results.push({ ...bot, agentId, txHash: tx.hash, success: true });
      
      // Small delay between txs
      await new Promise(r => setTimeout(r, 1500));
      
    } catch (err) {
      console.error(`   ❌ FAILED: ${err.message?.substring(0, 100)}`);
      results.push({ ...bot, success: false, error: err.message?.substring(0, 100) });
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
    console.log(`${r.emoji} ${r.name}: Agent #${r.agentId} | https://bscscan.com/tx/${r.txHash}`);
  }
  
  // Save results
  fs.writeFileSync('registration-results.json', JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to registration-results.json`);
  
  const finalBalance = await provider.getBalance(wallet.address);
  console.log(`💰 Remaining BNB: ${ethers.formatEther(finalBalance)}`);
}

main().catch(console.error);
