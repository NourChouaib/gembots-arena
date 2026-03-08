'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useEVMWallet } from '@/providers/EVMWalletProvider';
import NFACard from '@/components/NFACard';
import TierBadge from '@/components/TierBadge';
import { NFAData, fetchAllNFAs, TIER_NAMES, TIER_COLORS, MINT_FEE_BNB } from '@/lib/nfa';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'winrate' | 'tier';
type FilterTier = 'all' | '0' | '1' | '2' | '3' | '4';
type ListingFilter = 'all' | 'listed' | 'unlisted';

export default function MarketplacePage() {
  const { connected, connect, connecting } = useEVMWallet();
  const [nfas, setNfas] = useState<NFAData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradingBotNfaIds, setTradingBotNfaIds] = useState<Set<number>>(new Set());

  // Filters
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterTier, setFilterTier] = useState<FilterTier>('all');
  const [listingFilter, setListingFilter] = useState<ListingFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadNFAs();
    // Load trading bot NFA IDs for badges
    fetch('/api/nfa/trading/leaderboard')
      .then(r => r.json())
      .then(data => {
        if (data.bots) {
          const ids = new Set<number>(
            data.bots
              .filter((b: { trading_mode: string }) => b.trading_mode !== 'off')
              .map((b: { nfa_id: number }) => b.nfa_id)
              .filter(Boolean)
          );
          setTradingBotNfaIds(ids);
        }
      })
      .catch(() => {});
  }, []);

  const loadNFAs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use server API (cached, reliable) instead of 255 browser RPC calls
      const res = await fetch('/api/nfas');
      const apiData = await res.json();
      if (apiData.nfas && apiData.nfas.length > 0) {
        // Map server format to NFAData format
        const mapped: NFAData[] = apiData.nfas.map((n: any) => ({
          nfaId: n.nfaId,
          tier: n.tier,
          isGenesis: n.isGenesis,
          owner: n.state?.owner || n.owner || '',
          // Flatten stats to top level (NFACard expects nfa.wins, nfa.totalBattles etc.)
          wins: n.stats?.wins ?? 0,
          losses: n.stats?.losses ?? 0,
          totalBattles: n.stats?.totalBattles ?? 0,
          currentStreak: n.stats?.currentStreak ?? 0,
          bestStreak: n.stats?.bestStreak ?? 0,
          stats: n.stats || { wins: 0, losses: 0, totalBattles: 0, currentStreak: 0, bestStreak: 0 },
          strategy: n.strategy || { modelId: '', strategyHash: '', strategyURI: '' },
          state: n.state || { balance: '0', status: 0, owner: '' },
          metadata: n.metadata || null,
          listing: n.listing || null,
          learning: null,
          agentId: n.nfaId,
        }));
        setNfas(mapped);
      } else {
        // Fallback to direct blockchain fetch
        const data = await fetchAllNFAs();
        setNfas(data);
      }
    } catch (err) {
      console.error('Failed to fetch NFAs:', err);
      setError('Failed to load NFAs');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters & sorting
  const filteredNFAs = useMemo(() => {
    let result = [...nfas];

    // Tier filter
    if (filterTier !== 'all') {
      result = result.filter(n => n.tier === parseInt(filterTier));
    }

    // Listing filter
    if (listingFilter === 'listed') {
      result = result.filter(n => n.listing?.active);
    } else if (listingFilter === 'unlisted') {
      result = result.filter(n => !n.listing?.active);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n =>
        `#${n.nfaId}`.includes(q) ||
        `agent #${n.agentId}`.includes(q) ||
        n.owner.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => b.nfaId - a.nfaId);
        break;
      case 'price-asc':
        result.sort((a, b) => {
          const pa = a.listing?.active ? Number(a.listing.price) : Number.MAX_SAFE_INTEGER;
          const pb = b.listing?.active ? Number(b.listing.price) : Number.MAX_SAFE_INTEGER;
          return pa - pb;
        });
        break;
      case 'price-desc':
        result.sort((a, b) => {
          const pa = a.listing?.active ? Number(a.listing.price) : 0;
          const pb = b.listing?.active ? Number(b.listing.price) : 0;
          return pb - pa;
        });
        break;
      case 'winrate':
        result.sort((a, b) => {
          const wrA = a.totalBattles > 0 ? a.wins / a.totalBattles : 0;
          const wrB = b.totalBattles > 0 ? b.wins / b.totalBattles : 0;
          return wrB - wrA;
        });
        break;
      case 'tier':
        result.sort((a, b) => b.tier - a.tier);
        break;
    }

    return result;
  }, [nfas, filterTier, listingFilter, searchQuery, sortBy]);

  const listedCount = nfas.filter(n => n.listing?.active).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-yellow-900/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                NFA Marketplace
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
              Trade Non-Fungible Agents on BNB Chain. Each NFA carries its battle history,
              evolution tier, and Proof of Prompt — forever on-chain.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700">
                <span className="text-2xl">🤖</span>
                <div className="text-left">
                  <div className="text-xl font-bold text-white">{nfas.length}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total NFAs</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700">
                <span className="text-2xl">🏪</span>
                <div className="text-left">
                  <div className="text-xl font-bold text-yellow-400">{listedCount}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">For Sale</div>
                </div>
              </div>
              {!connected && (
                <button
                  onClick={connect}
                  disabled={connecting}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all disabled:opacity-50"
                >
                  {connecting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    <>🦊 Connect Wallet</>
                  )}
                </button>
              )}
              <Link
                href="/mint"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all"
              >
                ⚡ Mint NFA
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by ID, agent, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-gray-800/50 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="newest">🆕 Newest</option>
            <option value="price-asc">💰 Price: Low → High</option>
            <option value="price-desc">💰 Price: High → Low</option>
            <option value="winrate">🏆 Win Rate</option>
            <option value="tier">⭐ Tier</option>
          </select>

          {/* Listing Filter */}
          <select
            value={listingFilter}
            onChange={(e) => setListingFilter(e.target.value as ListingFilter)}
            className="bg-gray-800/50 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="all">All NFAs</option>
            <option value="listed">🏪 For Sale</option>
            <option value="unlisted">🔒 Not Listed</option>
          </select>

          {/* Toggle Advanced Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 rounded-xl border text-sm transition-colors ${
              showFilters 
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            🎛 Filters
          </button>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-3 font-medium">Filter by Tier</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterTier('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filterTier === 'all'
                        ? 'bg-white/10 text-white border border-white/30'
                        : 'bg-gray-800/50 text-gray-500 border border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    All Tiers
                  </button>
                  {Object.entries(TIER_NAMES).map(([id, name]) => (
                    <button
                      key={id}
                      onClick={() => setFilterTier(id as FilterTier)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        filterTier === id
                          ? 'border-opacity-60 bg-opacity-20'
                          : 'border-gray-700 bg-gray-800/50 hover:brightness-125'
                      }`}
                      style={{
                        borderColor: filterTier === id ? TIER_COLORS[parseInt(id)] : undefined,
                        backgroundColor: filterTier === id ? `${TIER_COLORS[parseInt(id)]}33` : undefined,
                        color: TIER_COLORS[parseInt(id)],
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {filteredNFAs.length} {filteredNFAs.length === 1 ? 'result' : 'results'}
            {filterTier !== 'all' && (
              <span className="ml-2">
                <TierBadge tier={parseInt(filterTier)} size="sm" />
              </span>
            )}
          </p>
          <button
            onClick={loadNFAs}
            disabled={loading}
            className="text-xs text-gray-500 hover:text-white transition-colors disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
              <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 animate-spin" />
            </div>
            <p className="text-gray-400 animate-pulse">Loading NFAs from BSC...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadNFAs}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredNFAs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {nfas.length === 0 ? 'No NFAs Minted Yet' : 'No Results Found'}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {nfas.length === 0 
                ? 'Be the first to mint a Non-Fungible Agent! Your bot\'s battle record and system prompt become permanently on-chain.'
                : 'Try adjusting your filters or search query.'
              }
            </p>
            {nfas.length === 0 && (
              <Link
                href="/mint"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all"
              >
                ⚡ Mint First NFA
              </Link>
            )}
            {nfas.length > 0 && (
              <button
                onClick={() => {
                  setFilterTier('all');
                  setListingFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredNFAs.map((nfa, i) => (
              <div key={nfa.nfaId} className="relative">
                <NFACard nfa={nfa} index={i} />
                {tradingBotNfaIds.has(nfa.nfaId) && (
                  <div className="absolute top-3 right-12 z-10 px-2 py-0.5 rounded-full bg-green-900/80 border border-green-500/40 text-[10px] font-bold text-green-400">
                    📈 Trader
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
