import { ethers } from 'ethers';

// USDC on BSC (Binance-Peg USD Coin)
export const USDC_BSC_ADDRESS = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
export const USDC_DECIMALS = 18; // BSC USDC uses 18 decimals (not 6 like on Ethereum!)

// Our treasury wallet
export const TREASURY_ADDRESS = '0x133C89BC9Dc375fBc46493A92f4Fd2486F8F0d76';

// ERC20 minimal ABI for transfer + balanceOf
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

// Product prices in USD
export const PRODUCTS = {
  playbook: {
    id: 'playbook',
    name: 'AI Trading Strategy Playbook',
    description: 'Battle-tested strategies from 149K+ AI vs AI trades',
    priceUSD: 29,
  },
  strategy_pack: {
    id: 'strategy_pack',
    name: 'Strategy Pack — Top 5',
    description: 'JSON export of top 5 winning strategies with all parameters',
    priceUSD: 19,
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;

/**
 * Get USDC balance for an address
 */
export async function getUSDCBalance(provider: ethers.BrowserProvider, address: string): Promise<number> {
  const contract = new ethers.Contract(USDC_BSC_ADDRESS, ERC20_ABI, provider);
  const balance = await contract.balanceOf(address);
  return parseFloat(ethers.formatUnits(balance, USDC_DECIMALS));
}

/**
 * Pay for a product with USDC
 * Returns transaction hash on success
 */
export async function payWithUSDC(
  signer: ethers.Signer,
  productId: ProductId
): Promise<{ txHash: string; amount: number }> {
  const product = PRODUCTS[productId];
  if (!product) throw new Error(`Unknown product: ${productId}`);

  const amount = ethers.parseUnits(product.priceUSD.toString(), USDC_DECIMALS);
  const contract = new ethers.Contract(USDC_BSC_ADDRESS, ERC20_ABI, signer);

  // Check balance first
  const signerAddress = await signer.getAddress();
  const balance = await contract.balanceOf(signerAddress);
  if (balance < amount) {
    const balanceFormatted = parseFloat(ethers.formatUnits(balance, USDC_DECIMALS)).toFixed(2);
    throw new Error(`Insufficient USDC balance. Need $${product.priceUSD}, have $${balanceFormatted}`);
  }

  // Send USDC to treasury
  const tx = await contract.transfer(TREASURY_ADDRESS, amount);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    amount: product.priceUSD,
  };
}

/**
 * Verify a USDC payment transaction
 */
export async function verifyPayment(
  provider: ethers.BrowserProvider,
  txHash: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) return false;

    // Check it's a transfer to our treasury
    const iface = new ethers.Interface(ERC20_ABI);
    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() !== USDC_BSC_ADDRESS.toLowerCase()) continue;
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (
          parsed &&
          parsed.name === 'Transfer' &&
          parsed.args[1].toLowerCase() === TREASURY_ADDRESS.toLowerCase()
        ) {
          const transferAmount = parseFloat(ethers.formatUnits(parsed.args[2], USDC_DECIMALS));
          if (transferAmount >= expectedAmount) return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  } catch {
    return false;
  }
}
