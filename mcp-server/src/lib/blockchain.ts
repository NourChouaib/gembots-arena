import { ethers, Contract, JsonRpcProvider } from "ethers";

// ─── NFA Contract ABI (view functions only) ──────────────────

const NFA_ABI = [
  // getNFA
  "function getNFA(uint256 nfaId) view returns (uint256 agentId, bytes32 proofOfPrompt, string configURI, address originalCreator, uint8 tier, uint256 wins, uint256 losses, uint256 totalBattles, uint256 currentStreak, uint256 bestStreak)",
  // getListing
  "function getListing(uint256 nfaId) view returns (tuple(uint256 price, address seller, bool active))",
  // getBattleStats
  "function getBattleStats(uint256 nfaId) view returns (tuple(uint256 wins, uint256 losses, uint256 totalBattles, uint256 currentStreak, uint256 bestStreak))",
  // ownerOf
  "function ownerOf(uint256 tokenId) view returns (address)",
  // totalSupply
  "function totalSupply() view returns (uint256)",
  // tokenURI
  "function tokenURI(uint256 tokenId) view returns (string)",
  // tierThresholds
  "function tierThresholds(uint256) view returns (uint256)",
];

// Tier enum mapping
const TIER_NAMES = ["Bronze", "Silver", "Gold", "Diamond", "Mythic"] as const;

let _provider: JsonRpcProvider | null = null;
let _nfaContract: Contract | null = null;

function getProvider(): JsonRpcProvider {
  if (_provider) return _provider;
  const rpcUrl = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org/";
  _provider = new JsonRpcProvider(rpcUrl);
  return _provider;
}

function getNFAContract(): Contract {
  if (_nfaContract) return _nfaContract;
  const addr =
    process.env.NFA_CONTRACT ||
    "0x4C39C28354931fB3b170d396f58de4eA938E7d77";
  _nfaContract = new Contract(addr, NFA_ABI, getProvider());
  return _nfaContract;
}

export function tierName(tierIndex: number): string {
  return TIER_NAMES[tierIndex] ?? `Unknown(${tierIndex})`;
}

// ─── Public API ──────────────────────────────────────────────

export interface NFADetails {
  nfaId: number;
  agentId: number;
  proofOfPrompt: string;
  configURI: string;
  originalCreator: string;
  tier: string;
  tierIndex: number;
  wins: number;
  losses: number;
  totalBattles: number;
  currentStreak: number;
  bestStreak: number;
  owner: string;
}

export async function getNFADetails(nfaId: number): Promise<NFADetails> {
  const c = getNFAContract();
  const [agentId, proofOfPrompt, configURI, originalCreator, tier, wins, losses, totalBattles, currentStreak, bestStreak] =
    await c.getNFA(nfaId);
  const owner = await c.ownerOf(nfaId);

  return {
    nfaId,
    agentId: Number(agentId),
    proofOfPrompt,
    configURI,
    originalCreator,
    tier: tierName(Number(tier)),
    tierIndex: Number(tier),
    wins: Number(wins),
    losses: Number(losses),
    totalBattles: Number(totalBattles),
    currentStreak: Number(currentStreak),
    bestStreak: Number(bestStreak),
    owner,
  };
}

export interface NFAListing {
  nfaId: number;
  price: string; // in BNB
  priceWei: string;
  seller: string;
  active: boolean;
}

export async function getNFAListing(nfaId: number): Promise<NFAListing> {
  const c = getNFAContract();
  const listing = await c.getListing(nfaId);

  return {
    nfaId,
    price: ethers.formatEther(listing.price),
    priceWei: listing.price.toString(),
    seller: listing.seller,
    active: listing.active,
  };
}

export async function getTotalSupply(): Promise<number> {
  const c = getNFAContract();
  const supply = await c.totalSupply();
  return Number(supply);
}

/**
 * Scan all minted NFAs and return details + listing info.
 * Note: NFA IDs start at 1 and go up to totalSupply.
 */
export async function getAllNFAs(): Promise<
  Array<NFADetails & { listed: boolean; listingPrice: string | null }>
> {
  const totalSupply = await getTotalSupply();
  const results: Array<
    NFADetails & { listed: boolean; listingPrice: string | null }
  > = [];

  // Fetch in parallel batches of 5
  const BATCH = 5;
  for (let i = 1; i <= totalSupply; i += BATCH) {
    const batch = [];
    for (let j = i; j < i + BATCH && j <= totalSupply; j++) {
      batch.push(
        (async (id: number) => {
          try {
            const [details, listing] = await Promise.all([
              getNFADetails(id),
              getNFAListing(id),
            ]);
            return {
              ...details,
              listed: listing.active,
              listingPrice: listing.active ? listing.price : null,
            };
          } catch {
            return null;
          }
        })(j)
      );
    }
    const batchResults = await Promise.all(batch);
    for (const r of batchResults) {
      if (r) results.push(r);
    }
  }

  return results;
}

/**
 * Get only listed (for-sale) NFAs
 */
export async function getListedNFAs(): Promise<
  Array<NFADetails & { listed: true; listingPrice: string }>
> {
  const all = await getAllNFAs();
  return all.filter(
    (n): n is NFADetails & { listed: true; listingPrice: string } => n.listed
  );
}
