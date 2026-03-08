'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchTotalSupply,
  fetchGenesisCount,
  fetchMintFee,
  fetchAllNFAs,
  fetchNFA,
  fetchAgentState,
  fetchMarketplaceListings,
  type NFAData,
  type MarketplaceListing,
} from '@/lib/nfa';

// ─── Contract Stats ─────────────────────────────────────────────────────────

export interface ContractStats {
  totalSupply: number;
  genesisCount: number;
  mintFee: string;
  loading: boolean;
  error: string | null;
}

export function useContractStats(refreshInterval = 30000): ContractStats {
  const [stats, setStats] = useState<ContractStats>({
    totalSupply: 0,
    genesisCount: 0,
    mintFee: '0.1',
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    try {
      // Use server-side API to avoid CORS/RPC issues on client
      const res = await fetch('/api/nfa/stats');
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalSupply: data.totalSupply || 0,
          genesisCount: data.genesisCount || 0,
          mintFee: data.mintFee || '0.1',
          loading: false,
          error: null,
        });
      } else {
        throw new Error('Failed to fetch stats');
      }
    } catch {
      // Fallback to direct RPC calls
      try {
        const [supply, genesis, fee] = await Promise.all([
          fetchTotalSupply(),
          fetchGenesisCount(),
          fetchMintFee(),
        ]);
        setStats({ totalSupply: supply, genesisCount: genesis, mintFee: fee, loading: false, error: null });
      } catch (e) {
        setStats(prev => ({ ...prev, loading: false, error: (e as Error).message }));
      }
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, refreshInterval);
    return () => clearInterval(interval);
  }, [load, refreshInterval]);

  return stats;
}

// ─── All NFAs from blockchain ───────────────────────────────────────────────

export interface NFACollection {
  nfas: NFAData[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useNFACollection(): NFACollection {
  const [nfas, setNfas] = useState<NFAData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllNFAs();
      setNfas(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { nfas, loading, error, refresh };
}

// ─── Single NFA ─────────────────────────────────────────────────────────────

export interface SingleNFA {
  nfa: NFAData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useNFA(nfaId: number | null): SingleNFA {
  const [nfa, setNfa] = useState<NFAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (nfaId === null) return;
    setLoading(true);
    try {
      const data = await fetchNFA(nfaId);
      setNfa(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [nfaId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { nfa, loading, error, refresh };
}

// ─── Marketplace Listings ───────────────────────────────────────────────────

export interface MarketplaceData {
  listings: MarketplaceListing[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMarketplace(): MarketplaceData {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMarketplaceListings();
      setListings(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { listings, loading, error, refresh };
}
