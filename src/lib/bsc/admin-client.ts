// @ts-nocheck
/**
 * GemBots BSC Admin Client
 * 
 * Server-side client for admin operations (createPool, resolve, cancel, collectFees).
 * Uses the deployer private key from environment.
 */

import { ethers } from 'ethers';
import ABI from './GemBotsBetting.abi.json';

const BSC_RPC_URL = process.env.BSC_RPC_URL || process.env.NEXT_PUBLIC_BSC_RPC || 'https://bsc-dataseed.binance.org/';
const BSC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BSC_BETTING_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_BSC_CONTRACT_ADDRESS || '';
const DEPLOYER_KEY = process.env.BSC_DEPLOYER_PRIVATE_KEY || '';

function getAdminContract(): { contract: ethers.Contract; signer: ethers.Wallet } {
  if (!DEPLOYER_KEY) throw new Error('BSC_DEPLOYER_PRIVATE_KEY not set');
  if (!BSC_CONTRACT_ADDRESS) throw new Error('NEXT_PUBLIC_BSC_CONTRACT_ADDRESS not set');
  
  const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
  const signer = new ethers.Wallet(DEPLOYER_KEY, provider);
  const contract = new ethers.Contract(BSC_CONTRACT_ADDRESS, ABI, signer);
  
  return { contract, signer };
}

export function getPoolId(matchId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(matchId));
}

export async function bscCreatePool(
  matchId: string,
  botAName: string,
  botBName: string,
  customFeeBps: number = 0,
): Promise<string> {
  const { contract } = getAdminContract();
  const tx = await contract.createPool(matchId, botAName, botBName, customFeeBps);
  const receipt = await tx.wait();
  console.log(`[BSC] Pool created: ${matchId} tx: ${receipt.hash}`);
  return receipt.hash;
}

export async function bscLockPool(matchId: string): Promise<string> {
  const { contract } = getAdminContract();
  const poolId = getPoolId(matchId);
  const tx = await contract.lockPool(poolId);
  const receipt = await tx.wait();
  console.log(`[BSC] Pool locked: ${matchId} tx: ${receipt.hash}`);
  return receipt.hash;
}

export async function bscResolve(matchId: string, winner: 0 | 1): Promise<string> {
  const { contract } = getAdminContract();
  const poolId = getPoolId(matchId);
  const tx = await contract.resolve(poolId, winner);
  const receipt = await tx.wait();
  console.log(`[BSC] Pool resolved: ${matchId} winner: ${winner === 0 ? 'A' : 'B'} tx: ${receipt.hash}`);
  return receipt.hash;
}

export async function bscCancel(matchId: string): Promise<string> {
  const { contract } = getAdminContract();
  const poolId = getPoolId(matchId);
  const tx = await contract.cancel(poolId);
  const receipt = await tx.wait();
  console.log(`[BSC] Pool cancelled: ${matchId} tx: ${receipt.hash}`);
  return receipt.hash;
}

export async function bscCollectFees(matchId: string): Promise<string> {
  const { contract } = getAdminContract();
  const poolId = getPoolId(matchId);
  const tx = await contract.collectFees(poolId);
  const receipt = await tx.wait();
  console.log(`[BSC] Fees collected: ${matchId} tx: ${receipt.hash}`);
  return receipt.hash;
}

export async function bscGetPool(matchId: string): Promise<any> {
  const { contract } = getAdminContract();
  const poolId = getPoolId(matchId);
  try {
    return await contract.getPool(poolId);
  } catch {
    return null;
  }
}

export async function bscGetBet(matchId: string, bettor: string): Promise<any> {
  const { contract } = getAdminContract();
  const poolId = getPoolId(matchId);
  try {
    return await contract.getBet(poolId, bettor);
  } catch {
    return null;
  }
}
