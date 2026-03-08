import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export const dynamic = 'force-dynamic';

const NFA_ADDRESS = '0x6eFC44519229655039e74bFF4A87f427420018E6';
const RPC_URLS = [
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed3.binance.org',
];

// Raw RPC call via fetch — more reliable than ethers provider
async function rpcCall(method: string, params: any[]): Promise<any> {
  for (const rpc of RPC_URLS) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (data.result !== undefined) return data.result;
    } catch { continue; }
  }
  throw new Error('All RPCs failed');
}

async function ethCall(data: string): Promise<string> {
  return rpcCall('eth_call', [{ to: NFA_ADDRESS, data }, 'latest']);
}

// ABI encoding helpers
const iface = new ethers.Interface([
  'function totalSupply() view returns (uint256)',
  'function genesisCount() view returns (uint256)',
  'function mintFee() view returns (uint256)',
  'function getNFA(uint256) view returns (bytes32, string, address, uint8, bool, tuple(uint128,uint128,uint128,uint128,uint128), tuple(string, bytes32, string))',
  'function getState(uint256) view returns (tuple(uint256, uint8, address, address, uint256))',
  'function getAgentMetadata(uint256) view returns (tuple(string, string, string, string, string, bytes32))',
]);

// Server-side cache
let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 120_000; // 2 min cache for 100 NFAs

async function callContract(fn: string, args: any[] = []): Promise<any> {
  const calldata = iface.encodeFunctionData(fn, args);
  const result = await ethCall(calldata);
  return iface.decodeFunctionResult(fn, result);
}

async function loadSingleNFA(id: number, retries = 2): Promise<any> {
  try {
    const [nfaResult, stateResult] = await Promise.all([
      callContract('getNFA', [id]),
      callContract('getState', [id]),
    ]);

    let metadata = null;
    try {
      metadata = await callContract('getAgentMetadata', [id]);
    } catch {}

    const [configHash, configURI, originalCreator, tier, isGenesis, stats, strategy] = nfaResult;
    const state = stateResult[0];

    return {
      nfaId: id,
      configURI,
      originalCreator,
      tier: Number(tier),
      isGenesis,
      stats: {
        wins: Number(stats[0]),
        losses: Number(stats[1]),
        totalBattles: Number(stats[2]),
        currentStreak: Number(stats[3]),
        bestStreak: Number(stats[4]),
      },
      strategy: {
        modelId: strategy[0],
        strategyHash: strategy[1],
        strategyURI: strategy[2],
      },
      state: {
        balance: state[0].toString(),
        status: Number(state[1]),
        owner: state[2],
      },
      metadata: metadata ? {
        persona: metadata[0][0],
        experience: metadata[0][1],
      } : null,
      owner: state[2],
    };
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 500));
      return loadSingleNFA(id, retries - 1);
    }
    console.error(`NFA #${id}:`, (e as Error).message?.slice(0, 60));
    return null;
  }
}

async function loadAllNFAs() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;

  const [supplyHex, genesisHex, feeHex] = await Promise.all([
    callContract('totalSupply'),
    callContract('genesisCount'),
    callContract('mintFee'),
  ]);

  const supply = Number(supplyHex[0]);
  const nfas: any[] = [];

  // Batch of 10 concurrent (100 NFAs need faster loading)
  const BATCH = 10;
  for (let start = 0; start < supply; start += BATCH) {
    const end = Math.min(start + BATCH, supply);
    const batch = [];
    for (let i = start; i < end; i++) batch.push(loadSingleNFA(i));
    const results = await Promise.allSettled(batch);
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) nfas.push(r.value);
    }
  }

  const result = {
    totalSupply: supply,
    genesisCount: Number(genesisHex[0]),
    mintFee: ethers.formatEther(feeHex[0]),
    nfas,
  };

  cache = { data: result, ts: Date.now() };
  return result;
}

export async function GET() {
  try {
    const data = await loadAllNFAs();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message, nfas: [], totalSupply: 0, genesisCount: 0, mintFee: '0.1' },
      { status: 500 }
    );
  }
}
