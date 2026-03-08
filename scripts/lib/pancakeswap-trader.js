/**
 * PancakeSwap Trading Module
 * 
 * Executes real swaps on BSC via PancakeSwap V2 Router.
 * Used by the trading engine for live mode execution.
 * 
 * Safety limits:
 *   - Max 0.1 BNB per trade (hardcoded)
 *   - Max 2% slippage
 *   - Gas reserve: 0.005 BNB minimum for gas
 *   - Requires NFA_LIVE_TRADING_ENABLED=true env var
 */

const { ethers } = require('ethers');

// ─── Constants ───────────────────────────────────────────────────────────────

const BSC_RPC = process.env.NEXT_PUBLIC_BSC_RPC || 'https://bsc-dataseed.binance.org/';
const BSC_CHAIN_ID = 56;

// PancakeSwap V2 Router
const PANCAKE_ROUTER_V2 = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

// Token addresses (BSC mainnet)
const TOKENS = {
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
  ETH:  '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  BETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // alias
};

// Safety limits
const MAX_TRADE_BNB = 0.1;           // Max 0.1 BNB per trade
const MIN_GAS_RESERVE_BNB = 0.005;   // Always keep 0.005 BNB for gas
const DEFAULT_SLIPPAGE_PCT = 1;       // 1% default slippage
const MAX_SLIPPAGE_PCT = 2;           // 2% max slippage
const DEFAULT_GAS_PRICE_GWEI = 3;     // BSC standard gas
const SWAP_DEADLINE_SECONDS = 300;    // 5 minutes

// ─── ABIs ────────────────────────────────────────────────────────────────────

const ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)',
  'function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external payable returns (uint256[] memory amounts)',
  'function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
  'function WETH() external pure returns (address)',
];

const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

// ─── Provider ────────────────────────────────────────────────────────────────

let _provider = null;

function getProvider() {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(BSC_RPC, BSC_CHAIN_ID);
  }
  return _provider;
}

function getRouter(signerOrProvider) {
  return new ethers.Contract(PANCAKE_ROUTER_V2, ROUTER_ABI, signerOrProvider);
}

function getERC20(tokenAddress, signerOrProvider) {
  return new ethers.Contract(tokenAddress, ERC20_ABI, signerOrProvider);
}

// ─── Safety Checks ───────────────────────────────────────────────────────────

function checkLiveTradingEnabled() {
  if (process.env.NFA_LIVE_TRADING_ENABLED !== 'true') {
    throw new Error('Live trading is disabled. Set NFA_LIVE_TRADING_ENABLED=true to enable.');
  }
}

function checkTradeAmount(amountBNB) {
  const amount = parseFloat(amountBNB);
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid trade amount: ${amountBNB}`);
  }
  if (amount > MAX_TRADE_BNB) {
    throw new Error(`Trade amount ${amount} BNB exceeds safety limit of ${MAX_TRADE_BNB} BNB`);
  }
  return amount;
}

function checkSlippage(slippagePct) {
  const s = parseFloat(slippagePct) || DEFAULT_SLIPPAGE_PCT;
  if (s > MAX_SLIPPAGE_PCT) {
    throw new Error(`Slippage ${s}% exceeds maximum ${MAX_SLIPPAGE_PCT}%`);
  }
  return s;
}

// ─── Token Resolution ────────────────────────────────────────────────────────

/**
 * Resolve a pair string (e.g. "BNB/USDT") to token addresses
 * Returns { tokenIn, tokenOut } addresses
 */
function resolvePair(pair) {
  const [baseSymbol, quoteSymbol] = pair.toUpperCase().replace('-', '/').split('/');
  
  const baseAddr = TOKENS[baseSymbol];
  const quoteAddr = TOKENS[quoteSymbol];
  
  if (!baseAddr) throw new Error(`Unknown token: ${baseSymbol}`);
  if (!quoteAddr) throw new Error(`Unknown token: ${quoteSymbol}`);
  
  return { baseSymbol, quoteSymbol, baseAddr, quoteAddr };
}

/**
 * Build swap path. For BNB pairs, path is [WBNB, TOKEN].
 * For non-BNB pairs, route through WBNB: [TOKEN_A, WBNB, TOKEN_B]
 */
function buildPath(tokenInAddr, tokenOutAddr) {
  // If either is WBNB, direct pair
  if (tokenInAddr === TOKENS.WBNB || tokenOutAddr === TOKENS.WBNB) {
    return [tokenInAddr, tokenOutAddr];
  }
  // Route through WBNB
  return [tokenInAddr, TOKENS.WBNB, tokenOutAddr];
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Get a swap quote — how much tokenOut you get for amountIn of tokenIn
 * @param {string} tokenIn - Token address or symbol
 * @param {string} tokenOut - Token address or symbol
 * @param {string|number} amountIn - Amount of tokenIn (human-readable)
 * @returns {Promise<{ amountOut: string, path: string[], priceImpact: number }>}
 */
async function getQuote(tokenIn, tokenOut, amountIn) {
  const provider = getProvider();
  const router = getRouter(provider);

  // Resolve addresses
  const addrIn = TOKENS[tokenIn.toUpperCase()] || tokenIn;
  const addrOut = TOKENS[tokenOut.toUpperCase()] || tokenOut;

  // Get decimals
  let decimalsIn = 18;
  if (addrIn !== TOKENS.WBNB) {
    const token = getERC20(addrIn, provider);
    decimalsIn = await token.decimals();
  }

  let decimalsOut = 18;
  if (addrOut !== TOKENS.WBNB) {
    const token = getERC20(addrOut, provider);
    decimalsOut = await token.decimals();
  }

  const amountInWei = ethers.parseUnits(String(amountIn), decimalsIn);
  const path = buildPath(addrIn, addrOut);

  try {
    const amounts = await router.getAmountsOut(amountInWei, path);
    const amountOutWei = amounts[amounts.length - 1];
    const amountOut = ethers.formatUnits(amountOutWei, decimalsOut);

    return {
      amountIn: String(amountIn),
      amountOut,
      path: path,
      amountOutWei: amountOutWei.toString(),
    };
  } catch (err) {
    throw new Error(`Quote failed: ${err.message}`);
  }
}

/**
 * Execute a BUY — swap BNB for a token
 * @param {ethers.Wallet} wallet - Connected wallet with signer
 * @param {string} pair - e.g. "BNB/USDT" (buys the quote token with BNB)
 * @param {number} amountBNB - Amount of BNB to spend
 * @param {number} [slippagePct=1] - Slippage tolerance in %
 * @returns {Promise<{ txHash: string, amountIn: string, amountOut: string, gasUsed: string }>}
 */
async function executeBuy(wallet, pair, amountBNB, slippagePct = DEFAULT_SLIPPAGE_PCT) {
  checkLiveTradingEnabled();
  const amount = checkTradeAmount(amountBNB);
  const slippage = checkSlippage(slippagePct);

  const { baseSymbol, quoteSymbol, baseAddr, quoteAddr } = resolvePair(pair);
  
  // For BNB/X pair, we spend BNB (base) to buy X (quote)
  // The token we're buying depends on the pair structure
  let targetTokenAddr, path;
  
  if (baseSymbol === 'BNB') {
    // BNB/USDT: spend BNB, buy USDT
    targetTokenAddr = quoteAddr;
    path = [TOKENS.WBNB, quoteAddr];
  } else {
    // For non-BNB base pairs, we still spend BNB and route through WBNB
    targetTokenAddr = baseAddr;
    path = [TOKENS.WBNB, baseAddr];
  }

  const provider = getProvider();
  const signer = wallet.connect(provider);
  const router = getRouter(signer);

  // Check BNB balance
  const balance = await provider.getBalance(wallet.address);
  const amountWei = ethers.parseEther(String(amount));
  const gasReserveWei = ethers.parseEther(String(MIN_GAS_RESERVE_BNB));
  
  if (balance < amountWei + gasReserveWei) {
    const balanceBNB = ethers.formatEther(balance);
    throw new Error(`Insufficient BNB balance: ${balanceBNB} BNB (need ${amount} + ${MIN_GAS_RESERVE_BNB} gas reserve)`);
  }

  // Get quote for slippage calculation
  const amounts = await router.getAmountsOut(amountWei, path);
  const expectedOut = amounts[amounts.length - 1];
  const minAmountOut = expectedOut * BigInt(Math.floor((100 - slippage) * 100)) / BigInt(10000);

  const deadline = Math.floor(Date.now() / 1000) + SWAP_DEADLINE_SECONDS;
  const gasPrice = ethers.parseUnits(String(DEFAULT_GAS_PRICE_GWEI), 'gwei');

  console.log(`  🔄 Executing BUY: ${amount} BNB → ${pair} (slippage: ${slippage}%)`);

  const tx = await router.swapExactETHForTokens(
    minAmountOut,
    path,
    wallet.address,
    deadline,
    {
      value: amountWei,
      gasPrice,
      gasLimit: 300000,
    }
  );

  console.log(`  📝 TX submitted: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`  ✅ TX confirmed: block ${receipt.blockNumber}, gas used: ${receipt.gasUsed.toString()}`);

  // Get actual output from events
  const targetToken = getERC20(targetTokenAddr, provider);
  const decimals = await targetToken.decimals();
  const amountOutFormatted = ethers.formatUnits(expectedOut, decimals);

  return {
    txHash: receipt.hash,
    amountIn: `${amount} BNB`,
    amountOut: amountOutFormatted,
    gasUsed: receipt.gasUsed.toString(),
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Execute a SELL — swap a token back to BNB
 * @param {ethers.Wallet} wallet - Connected wallet with signer
 * @param {string} pair - e.g. "BNB/USDT" (sells the quote token for BNB)
 * @param {number|string} tokenAmount - Amount of token to sell (human-readable)
 * @param {number} [slippagePct=1] - Slippage tolerance in %
 * @returns {Promise<{ txHash: string, amountIn: string, amountOut: string, gasUsed: string }>}
 */
async function executeSell(wallet, pair, tokenAmount, slippagePct = DEFAULT_SLIPPAGE_PCT) {
  checkLiveTradingEnabled();
  const slippage = checkSlippage(slippagePct);

  const { baseSymbol, quoteSymbol, baseAddr, quoteAddr } = resolvePair(pair);
  
  let tokenAddr, path;
  if (baseSymbol === 'BNB') {
    // Selling the quote token (e.g. USDT) back to BNB
    tokenAddr = quoteAddr;
    path = [quoteAddr, TOKENS.WBNB];
  } else {
    tokenAddr = baseAddr;
    path = [baseAddr, TOKENS.WBNB];
  }

  const provider = getProvider();
  const signer = wallet.connect(provider);
  const router = getRouter(signer);
  const token = getERC20(tokenAddr, signer);

  // Get token decimals and balance
  const decimals = await token.decimals();
  const amountWei = ethers.parseUnits(String(tokenAmount), decimals);
  const balance = await token.balanceOf(wallet.address);
  
  if (balance < amountWei) {
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    throw new Error(`Insufficient token balance: ${balanceFormatted} (need ${tokenAmount})`);
  }

  // Check BNB for gas
  const bnbBalance = await provider.getBalance(wallet.address);
  const gasReserveWei = ethers.parseEther(String(MIN_GAS_RESERVE_BNB));
  if (bnbBalance < gasReserveWei) {
    throw new Error(`Insufficient BNB for gas: ${ethers.formatEther(bnbBalance)} BNB (need ${MIN_GAS_RESERVE_BNB})`);
  }

  // Approve router to spend tokens (if needed)
  const allowance = await token.allowance(wallet.address, PANCAKE_ROUTER_V2);
  if (allowance < amountWei) {
    console.log(`  🔓 Approving router to spend tokens...`);
    const approveTx = await token.approve(PANCAKE_ROUTER_V2, ethers.MaxUint256, {
      gasPrice: ethers.parseUnits(String(DEFAULT_GAS_PRICE_GWEI), 'gwei'),
    });
    await approveTx.wait();
    console.log(`  ✅ Approval confirmed`);
  }

  // Get quote for slippage calculation
  const amounts = await router.getAmountsOut(amountWei, path);
  const expectedOut = amounts[amounts.length - 1];
  const minAmountOut = expectedOut * BigInt(Math.floor((100 - slippage) * 100)) / BigInt(10000);

  // Safety check: the BNB output shouldn't exceed our max trade limit
  const expectedBNB = parseFloat(ethers.formatEther(expectedOut));
  if (expectedBNB > MAX_TRADE_BNB * 2) {
    throw new Error(`Sell output ${expectedBNB} BNB seems too high. Safety limit triggered.`);
  }

  const deadline = Math.floor(Date.now() / 1000) + SWAP_DEADLINE_SECONDS;
  const gasPrice = ethers.parseUnits(String(DEFAULT_GAS_PRICE_GWEI), 'gwei');

  console.log(`  🔄 Executing SELL: ${tokenAmount} tokens → BNB (slippage: ${slippage}%)`);

  const tx = await router.swapExactTokensForETH(
    amountWei,
    minAmountOut,
    path,
    wallet.address,
    deadline,
    {
      gasPrice,
      gasLimit: 350000,
    }
  );

  console.log(`  📝 TX submitted: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`  ✅ TX confirmed: block ${receipt.blockNumber}, gas used: ${receipt.gasUsed.toString()}`);

  return {
    txHash: receipt.hash,
    amountIn: `${tokenAmount} tokens`,
    amountOut: `${ethers.formatEther(expectedOut)} BNB`,
    gasUsed: receipt.gasUsed.toString(),
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Get BNB balance for a wallet address
 * @param {string} walletAddress
 * @returns {Promise<string>} Balance in BNB (human-readable)
 */
async function getBNBBalance(walletAddress) {
  const provider = getProvider();
  const balance = await provider.getBalance(walletAddress);
  return ethers.formatEther(balance);
}

/**
 * Get ERC20 token balance for a wallet
 * @param {string} walletAddress
 * @param {string} tokenAddress - Token contract address or symbol (USDT, CAKE, etc.)
 * @returns {Promise<{ balance: string, symbol: string, decimals: number }>}
 */
async function getTokenBalance(walletAddress, tokenAddress) {
  const provider = getProvider();
  
  // Resolve symbol to address
  const addr = TOKENS[tokenAddress.toUpperCase()] || tokenAddress;
  
  const token = getERC20(addr, provider);
  const [balance, decimals, symbol] = await Promise.all([
    token.balanceOf(walletAddress),
    token.decimals(),
    token.symbol().catch(() => 'UNKNOWN'),
  ]);

  return {
    balance: ethers.formatUnits(balance, decimals),
    rawBalance: balance.toString(),
    symbol,
    decimals: Number(decimals),
  };
}

/**
 * Get all relevant token balances for a wallet
 * @param {string} walletAddress
 * @returns {Promise<{ bnb: string, tokens: Array<{ symbol: string, balance: string, address: string }> }>}
 */
async function getAllBalances(walletAddress) {
  const provider = getProvider();
  
  const [bnbBalance, ...tokenResults] = await Promise.allSettled([
    provider.getBalance(walletAddress),
    getTokenBalance(walletAddress, TOKENS.USDT),
    getTokenBalance(walletAddress, TOKENS.CAKE),
    getTokenBalance(walletAddress, TOKENS.ETH),
  ]);

  const bnb = bnbBalance.status === 'fulfilled' 
    ? ethers.formatEther(bnbBalance.value) 
    : '0';

  const tokenEntries = [
    { key: 'USDT', addr: TOKENS.USDT },
    { key: 'CAKE', addr: TOKENS.CAKE },
    { key: 'ETH', addr: TOKENS.ETH },
  ];

  const tokens = tokenEntries.map((entry, i) => {
    const result = tokenResults[i];
    if (result.status === 'fulfilled') {
      return {
        symbol: result.value.symbol || entry.key,
        balance: result.value.balance,
        address: entry.addr,
      };
    }
    return {
      symbol: entry.key,
      balance: '0',
      address: entry.addr,
    };
  }).filter(t => parseFloat(t.balance) > 0);

  return { bnb, tokens };
}

// ─── Export ──────────────────────────────────────────────────────────────────

module.exports = {
  getQuote,
  executeBuy,
  executeSell,
  getBNBBalance,
  getTokenBalance,
  getAllBalances,
  getProvider,
  TOKENS,
  PANCAKE_ROUTER_V2,
  MAX_TRADE_BNB,
  MIN_GAS_RESERVE_BNB,
  DEFAULT_SLIPPAGE_PCT,
  MAX_SLIPPAGE_PCT,
};
