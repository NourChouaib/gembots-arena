/**
 * Server-side NFA data fetching (for Server Components)
 * Optimized with caching and no client-only dependencies
 */
// @ts-nocheck

import { ethers } from 'ethers';
import NFAv5ABI from '@/contracts/GemBotsNFAv5.json';
import {
  NFA_CONTRACT_ADDRESS,
  BSC_RPC_URL,
  type NFAData,
  type AgentMetadata,
  type AgentState,
  type MarketplaceListing,
  AgentStatus,
} from '@/lib/nfa';

// Server-side provider (cached)
let cachedProvider: ethers.JsonRpcProvider | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!cachedProvider) {
    cachedProvider = new ethers.JsonRpcProvider(BSC_RPC_URL);
  }
  return cachedProvider;
}

function getContract() {
  return new ethers.Contract(NFA_CONTRACT_ADDRESS, NFAv5ABI.abi, getProvider());
}

/**
 * Fetch single NFA data from blockchain (server-side with Next.js caching)
 */
export async function fetchNFAServer(nfaId: number): Promise<NFAData | null> {
  try {
    const contract = getContract();

    // Parallel fetch all data
    const [
      ownerData,
      metadataRaw,
      stateRaw,
      strategyRaw,
      winsData,
      lossesData,
      totalBattlesData,
      streakData,
      bestStreakData,
      listingRaw,
    ] = await Promise.all([
      contract.ownerOf(nfaId).catch(() => ethers.ZeroAddress),
      contract.getAgentMetadata(nfaId).catch(() => null),
      contract.agentStates(nfaId).catch(() => null),
      contract.agentStrategies(nfaId).catch(() => null),
      contract.agentWins(nfaId).catch(() => BigInt(0)),
      contract.agentLosses(nfaId).catch(() => BigInt(0)),
      contract.agentTotalBattles(nfaId).catch(() => BigInt(0)),
      contract.agentCurrentStreaks(nfaId).catch(() => BigInt(0)),
      contract.agentBestStreaks(nfaId).catch(() => BigInt(0)),
      contract.getMarketplaceListing(nfaId).catch(() => null),
    ]);

    // Parse metadata
    const metadata: AgentMetadata = metadataRaw
      ? {
          persona: metadataRaw[0] || '',
          experience: metadataRaw[1] || '',
          voiceHash: metadataRaw[2] || '',
          animationURI: metadataRaw[3] || '',
          vaultURI: metadataRaw[4] || '',
          vaultHash: metadataRaw[5] || '',
        }
      : {
          persona: '',
          experience: '',
          voiceHash: '',
          animationURI: '',
          vaultURI: '',
          vaultHash: '',
        };

    // Parse state
    const state: AgentState = stateRaw
      ? {
          balance: stateRaw[0],
          status: Number(stateRaw[1]) as AgentStatus,
          owner: stateRaw[2],
          logicAddress: stateRaw[3] || '',
          lastActionTimestamp: Number(stateRaw[4] || stateRaw[3] || 0),
        }
      : {
          balance: BigInt(0),
          status: AgentStatus.Active,
          owner: ownerData,
          logicAddress: '',
          lastActionTimestamp: 0,
        };

    // Parse strategy
    const strategy: { modelId: string; strategyURI: string; strategyHash: string } = strategyRaw
      ? {
          modelId: strategyRaw[0] || '',
          strategyURI: strategyRaw[1] || '',
          strategyHash: strategyRaw[2] || '',
        }
      : { modelId: '', strategyURI: '', strategyHash: '' };

    // Parse listing
    const listing: MarketplaceListing | undefined =
      listingRaw && listingRaw[3] // active flag
        ? {
            seller: listingRaw[0],
            price: listingRaw[1],
            nfaId: nfaId,
            nfa: {} as any,
            priceFormatted: ethers.formatEther(listingRaw[1] || 0),
          }
        : undefined;

    // Calculate tier (simple logic, can be fetched from contract if available)
    const totalBattles = Number(totalBattlesData);
    let tier = 0;
    if (totalBattles >= 250) tier = 4;
    else if (totalBattles >= 100) tier = 3;
    else if (totalBattles >= 50) tier = 2;
    else if (totalBattles >= 10) tier = 1;

    const nfaData: NFAData = {
      nfaId,
      owner: ownerData,
      originalCreator: ownerData, // Could fetch from creation event if needed
      tier,
      isGenesis: nfaId <= 100, // Assuming first 100 are genesis
      configHash: '', // Would need to fetch if required
      metadata,
      state,
      strategy,
      wins: Number(winsData),
      losses: Number(lossesData),
      totalBattles,
      currentStreak: Number(streakData),
      bestStreak: Number(bestStreakData),
      listing,
    };

    return nfaData;
  } catch (error) {
    console.error(`Failed to fetch NFA #${nfaId}:`, error);
    return null;
  }
}
