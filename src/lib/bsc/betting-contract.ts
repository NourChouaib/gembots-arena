// @ts-nocheck
/**
 * GemBots BSC Betting Contract Client
 * 
 * EVM-compatible client for the GemBotsBetting.sol contract on BSC.
 * Works with ethers.js v6 + wagmi/viem for wallet connection.
 */

import { ethers } from 'ethers';
import ABI from './GemBotsBetting.abi.json';

// ============================================================================
// Contract address — UPDATE AFTER DEPLOYMENT
// ============================================================================

export const BSC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BSC_BETTING_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_BSC_CONTRACT_ADDRESS || '';
export const BSC_CHAIN_ID = 56; // BSC Mainnet
export const BSC_RPC_URL = process.env.NEXT_PUBLIC_BSC_RPC || 'https://bsc-dataseed.binance.org/';

// ============================================================================
// Enums (matching Solidity)
// ============================================================================

export enum PoolStatus {
  Open = 0,
  Locked = 1,
  Resolved = 2,
  Cancelled = 3,
}

export enum Side {
  A = 0,
  B = 1,
}

// ============================================================================
// Types
// ============================================================================

export interface BSCPool {
  authority: string;
  matchId: string;
  botAName: string;
  botBName: string;
  poolA: bigint;
  poolB: bigint;
  totalBets: number;
  status: PoolStatus;
  winner: Side;
  hasWinner: boolean;
  feeBps: number;
  createdAt: bigint;
  resolvedAt: bigint;
  feesCollected: boolean;
  exists: boolean;
}

export interface BSCBet {
  side: Side;
  amount: bigint;
  claimed: boolean;
  payout: bigint;
  timestamp: bigint;
  exists: boolean;
}

// ============================================================================
// Helper functions
// ============================================================================

export function getPoolId(matchId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(matchId));
}

export function getReadContract(): ethers.Contract {
  const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
  return new ethers.Contract(BSC_CONTRACT_ADDRESS, ABI, provider);
}

export function getWriteContract(signer: ethers.Signer): ethers.Contract {
  return new ethers.Contract(BSC_CONTRACT_ADDRESS, ABI, signer);
}

// ============================================================================
// Read functions
// ============================================================================

export async function getPool(matchId: string): Promise<BSCPool | null> {
  try {
    const contract = getReadContract();
    const poolId = getPoolId(matchId);
    const pool = await contract.getPool(poolId);
    return pool;
  } catch {
    return null;
  }
}

export async function getBet(matchId: string, bettor: string): Promise<BSCBet | null> {
  try {
    const contract = getReadContract();
    const poolId = getPoolId(matchId);
    const bet = await contract.getBet(poolId, bettor);
    return bet;
  } catch {
    return null;
  }
}

export async function getPoolCount(): Promise<number> {
  const contract = getReadContract();
  const count = await contract.getPoolCount();
  return Number(count);
}

// ============================================================================
// Write functions (require signer from wallet)
// ============================================================================

/**
 * Place a bet on BSC
 * @param signer - ethers.js signer from connected wallet
 * @param matchId - match identifier string
 * @param side - Side.A or Side.B
 * @param amountBNB - amount in BNB (string, e.g. "0.01")
 */
export async function placeBet(
  signer: ethers.Signer,
  matchId: string,
  side: Side,
  amountBNB: string,
): Promise<ethers.TransactionReceipt> {
  const contract = getWriteContract(signer);
  const poolId = getPoolId(matchId);
  const value = ethers.parseEther(amountBNB);
  
  const tx = await contract.placeBet(poolId, side, { value });
  return tx.wait();
}

/**
 * Claim winnings on BSC
 */
export async function claim(
  signer: ethers.Signer,
  matchId: string,
): Promise<ethers.TransactionReceipt> {
  const contract = getWriteContract(signer);
  const poolId = getPoolId(matchId);
  
  const tx = await contract.claim(poolId);
  return tx.wait();
}

/**
 * Claim refund on BSC (cancelled match)
 */
export async function claimRefund(
  signer: ethers.Signer,
  matchId: string,
): Promise<ethers.TransactionReceipt> {
  const contract = getWriteContract(signer);
  const poolId = getPoolId(matchId);
  
  const tx = await contract.claimRefund(poolId);
  return tx.wait();
}

// ============================================================================
// Admin functions (only contract owner)
// ============================================================================

export async function createPool(
  signer: ethers.Signer,
  matchId: string,
  botAName: string,
  botBName: string,
  customFeeBps: number = 0,
): Promise<ethers.TransactionReceipt> {
  const contract = getWriteContract(signer);
  const tx = await contract.createPool(matchId, botAName, botBName, customFeeBps);
  return tx.wait();
}

export async function lockPool(
  signer: ethers.Signer,
  matchId: string,
): Promise<ethers.TransactionReceipt> {
  const contract = getWriteContract(signer);
  const poolId = getPoolId(matchId);
  const tx = await contract.lockPool(poolId);
  return tx.wait();
}

export async function resolvePool(
  signer: ethers.Signer,
  matchId: string,
  winner: Side,
): Promise<ethers.TransactionReceipt> {
  const contract = getWriteContract(signer);
  const poolId = getPoolId(matchId);
  const tx = await contract.resolve(poolId, winner);
  return tx.wait();
}

export async function cancelPool(
  signer: ethers.Signer,
  matchId: string,
): Promise<ethers.TransactionReceipt> {
  const contract = getWriteContract(signer);
  const poolId = getPoolId(matchId);
  const tx = await contract.cancel(poolId);
  return tx.wait();
}

export async function collectFees(
  signer: ethers.Signer,
  matchId: string,
): Promise<ethers.TransactionReceipt> {
  const contract = getWriteContract(signer);
  const poolId = getPoolId(matchId);
  const tx = await contract.collectFees(poolId);
  return tx.wait();
}

// ============================================================================
// BSC Chain config for wagmi/wallet
// ============================================================================

export const bscChainConfig = {
  id: BSC_CHAIN_ID,
  name: 'BNB Smart Chain',
  network: 'bsc',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'BNB',
  },
  rpcUrls: {
    default: { http: ['https://bsc-dataseed.binance.org/'] },
    public: { http: ['https://bsc-dataseed.binance.org/'] },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://bscscan.com' },
  },
};
