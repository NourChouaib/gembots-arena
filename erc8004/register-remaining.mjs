import { ethers } from 'ethers';
import fs from 'fs';

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const BSC_RPC = 'https://bsc-dataseed1.binance.org/';
const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const GEMBOTS_URL = 'https://gembots.space';

const ABI = [
  'function register(string agentURI) external returns (uint256 agentId)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

// Already registered: gpt4o (#6502), claude-sonnet (#6503)
const REMAINING = [
  { id: 'claude-haiku', name: 'Claude 3.5 Haiku', emoji: '✨' },
  { id: 'gemini-flash', name: 'Gemini 2.0 Flash', emoji: '⚡' },
  { id: 'gemini-pro', name: 'Gemini 1.5 Pro', emoji: '💎' },
  { id: 'grok', name: 'Grok', emoji: '🦊' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', emoji: '🔬' },
  { id: 'llama-70b', name: 'Llama 3.3 70B', emoji: '🦙' },
  { id: 'mistral-large', name: 'Mistral Large', emoji: '🌬️' },
  { id: 'qwen-72b', name: 'Qwen 2.5 72B', emoji: '🐉' },
  { id: 'command-r-plus', name: 'Command R+', emoji: '⚔️' },
  { id: 'phi-4', name: 'Phi-4', emoji: '🔷' },
  { id: 'nova-pro', name: 'Nova Pro', emoji: '🌟' },
  { id: 'nemotron', name: 'Nemotron 70B', emoji: '🟢' },
];

async function main() {
  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const registry = new ethers.Contract(IDENTITY_REGISTRY, ABI, wallet);

  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 BNB: ${ethers.formatEther(balance)}`);
  console.log(`📦 Registering ${REMAINING.length} remaining agents...\n`);

  const results = [];
  
  for (const bot of REMAINING) {
    const agentURI = `${GEMBOTS_URL}/agents/${bot.id}.json`;
    console.log(`${bot.emoji} ${bot.name} → ${agentURI}`);
    
    try {
      const tx = await registry['register(string)'](agentURI, {
        gasLimit: 250000n
        // Let provider auto-determine gas price
      });
      
      console.log(`   TX: ${tx.hash}`);
      const receipt = await tx.wait(1, 60000); // 1 confirmation, 60s timeout
      
      if (receipt.status === 0) {
        console.log(`   ❌ REVERTED`);
        results.push({ ...bot, success: false });
        continue;
      }

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
      
      console.log(`   ✅ Agent #${agentId} | Gas: ${receipt.gasUsed.toString()}`);
      results.push({ ...bot, agentId, txHash: tx.hash, success: true });
      
    } catch (err) {
      console.error(`   ❌ ${err.message?.substring(0, 120)}`);
      results.push({ ...bot, success: false, error: err.message?.substring(0, 120) });
    }
  }

  // Combine with previously registered
  const allResults = [
    { id: 'gpt4o', name: 'GPT-4o', emoji: '🧠', agentId: '6502', txHash: '0xcd3c66e8e3c6603bfd6017cd29ee3c685b92860dd05ab0bb171b032c2165bc15', success: true },
    { id: 'claude-sonnet', name: 'Claude 3.5 Sonnet', emoji: '🎭', agentId: '6503', txHash: '0x0611337a0177a72e523259415d7367619e48843d72b2284c3b51d81823581dfc', success: true },
    ...results
  ];
  
  const ok = allResults.filter(r => r.success);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ ${ok.length}/14 registered\n`);
  for (const r of ok) {
    console.log(`${r.emoji} ${r.name}: Agent #${r.agentId}`);
  }
  
  fs.writeFileSync('registration-results.json', JSON.stringify(allResults, null, 2));
  
  const finalBal = await provider.getBalance(wallet.address);
  console.log(`\n💰 Remaining: ${ethers.formatEther(finalBal)} BNB`);
}

main().catch(console.error);
