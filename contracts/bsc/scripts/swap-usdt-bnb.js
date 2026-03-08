const { ethers } = require("hardhat");

const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const USDT = "0x55d398326f99059fF775485246999027B3197955";
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

const ROUTER_ABI = [
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const addr = await deployer.getAddress();
  
  const router = new ethers.Contract(PANCAKE_ROUTER, ROUTER_ABI, deployer);
  const usdt = new ethers.Contract(USDT, ERC20_ABI, deployer);

  // Check USDT balance
  const usdtBal = await usdt.balanceOf(addr);
  console.log("USDT balance:", ethers.formatEther(usdtBal));
  
  if (usdtBal === 0n) {
    console.log("No USDT to swap!");
    return;
  }

  // Get quote
  const amountIn = usdtBal; // swap all
  const amounts = await router.getAmountsOut(amountIn, [USDT, WBNB]);
  const expectedBNB = amounts[1];
  console.log("Expected BNB out:", ethers.formatEther(expectedBNB));
  
  // 1% slippage
  const minOut = expectedBNB * 99n / 100n;
  console.log("Min BNB (1% slippage):", ethers.formatEther(minOut));

  // Check allowance
  const allowance = await usdt.allowance(addr, PANCAKE_ROUTER);
  if (allowance < amountIn) {
    console.log("Approving USDT...");
    const approveTx = await usdt.approve(PANCAKE_ROUTER, ethers.MaxUint256, { gasPrice: ethers.parseUnits("0.05", "gwei") });
    await approveTx.wait();
    console.log("✅ Approved");
  }

  // Swap
  console.log("\n🔄 Swapping", ethers.formatEther(amountIn), "USDT →", ethers.formatEther(minOut), "+ BNB");
  const deadline = Math.floor(Date.now() / 1000) + 300;
  
  const tx = await router.swapExactTokensForETH(
    amountIn,
    minOut,
    [USDT, WBNB],
    addr,
    deadline,
    { gasPrice: ethers.parseUnits("0.05", "gwei") }
  );
  
  console.log("TX:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Swap confirmed! Gas:", ethers.formatEther(receipt.gasUsed * receipt.gasPrice), "BNB");
  
  // Final balance
  const bnbBal = await ethers.provider.getBalance(addr);
  console.log("\n💰 New BNB balance:", ethers.formatEther(bnbBal), "BNB");
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error("❌", e.message); process.exit(1); });
