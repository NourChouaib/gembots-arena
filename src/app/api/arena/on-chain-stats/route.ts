/**
 * ⛓️ On-Chain Battle Stats
 * GET /api/arena/on-chain-stats?nfaId=X
 * 
 * Reads battle statistics from the BattleRecorder contract on BSC.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

const BATTLE_RECORDER = '0x4BaA0bCCD27D68a9A752c0a603b3C0b6E870b3F0';
const BSC_RPC = 'https://bsc-dataseed1.binance.org';

const RECORDER_ABI = [
  'function getStats(uint256 nfaId) view returns (tuple(uint64 wins, uint64 losses, uint64 totalBattles, uint32 currentStreak, uint32 bestStreak, uint32 elo))',
  'function getWinRate(uint256 nfaId) view returns (uint256)',
  'function getBattleCount(uint256 nfaId) view returns (uint256)',
  'function getBattleHistory(uint256 nfaId, uint256 offset, uint256 limit) view returns (tuple(uint256 winnerNfaId, uint256 loserNfaId, string token, uint64 winnerAccuracy, uint64 loserAccuracy, uint64 damage, uint64 timestamp)[])',
  'function totalBattlesRecorded() view returns (uint256)',
];

let contract: ethers.Contract | null = null;

function getContract() {
  if (!contract) {
    const provider = new ethers.JsonRpcProvider(BSC_RPC);
    contract = new ethers.Contract(BATTLE_RECORDER, RECORDER_ABI, provider);
  }
  return contract;
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const { allowed } = rateLimit(`on-chain-stats:${ip}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = request.nextUrl;
  const nfaIdStr = searchParams.get('nfaId');

  try {
    const recorder = getContract();

    // If no nfaId — return global stats
    if (!nfaIdStr) {
      const totalBattles = await recorder.totalBattlesRecorded();
      return NextResponse.json({
        contractAddress: BATTLE_RECORDER,
        totalBattlesRecorded: Number(totalBattles),
      });
    }

    const nfaId = parseInt(nfaIdStr);
    if (isNaN(nfaId) || nfaId < 0) {
      return NextResponse.json({ error: 'Invalid nfaId' }, { status: 400 });
    }

    // Fetch stats
    const [stats, winRate, battleCount] = await Promise.all([
      recorder.getStats(nfaId),
      recorder.getWinRate(nfaId),
      recorder.getBattleCount(nfaId),
    ]);

    // Fetch recent battles (last 10)
    let recentBattles: Array<Record<string, unknown>> = [];
    const count = Number(battleCount);
    if (count > 0) {
      const limit = Math.min(count, 10);
      const records = await recorder.getBattleHistory(nfaId, 0, limit);
      recentBattles = records.map((r: {
        winnerNfaId: bigint;
        loserNfaId: bigint;
        token: string;
        winnerAccuracy: bigint;
        loserAccuracy: bigint;
        damage: bigint;
        timestamp: bigint;
      }) => ({
        winnerNfaId: Number(r.winnerNfaId),
        loserNfaId: Number(r.loserNfaId),
        token: r.token,
        winnerAccuracy: Number(r.winnerAccuracy) / 100, // bps to %
        loserAccuracy: Number(r.loserAccuracy) / 100,
        damage: Number(r.damage),
        timestamp: new Date(Number(r.timestamp) * 1000).toISOString(),
        won: Number(r.winnerNfaId) === nfaId,
      }));
    }

    return NextResponse.json({
      nfaId,
      contractAddress: BATTLE_RECORDER,
      stats: {
        wins: Number(stats.wins),
        losses: Number(stats.losses),
        totalBattles: Number(stats.totalBattles),
        currentStreak: Number(stats.currentStreak),
        bestStreak: Number(stats.bestStreak),
        elo: Number(stats.elo),
        winRate: Number(winRate) / 100, // bps to %
      },
      recentBattles,
    });
  } catch (error: unknown) {
    const e = error as Error;
    console.error('On-chain stats error:', e.message);
    return NextResponse.json(
      { error: 'Failed to fetch on-chain stats' },
      { status: 500 }
    );
  }
}
