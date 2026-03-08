'use client';

import { useState } from 'react';

interface Bet {
  id: number;
  token_mint: string;
  token_symbol: string;
  amount_sol: number;
  entry_price: number;
  current_price: number;
  target_multiplier: number;
  status: 'pending' | 'won' | 'lost';
  exit_price: number | null;
  payout_sol: number | null;
  created_at: string;
  resolved_at: string | null;
  potential_payout: number | null;
  current_multiplier: number | null;
}

interface BetsListProps {
  bets: Bet[];
}

export function BetsList({ bets }: BetsListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredBets = bets.filter(bet => {
    if (statusFilter === 'all') return true;
    return bet.status === statusFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      case 'won':
        return 'text-[--secondary] bg-[--secondary]/20 border-[--secondary]/30';
      case 'lost':
        return 'text-red-400 bg-red-400/20 border-red-400/30';
      default:
        return 'text-[--muted] bg-gray-500/20 border-gray-500/30';
    }
  };

  const formatPrice = (price: number) => {
    if (price < 0.001) {
      return price.toExponential(3);
    }
    return price.toFixed(6);
  };

  const formatSOL = (amount: number) => {
    return amount.toFixed(4);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateProgress = (bet: Bet) => {
    if (bet.status !== 'pending' || !bet.current_multiplier) return 0;
    return Math.min((bet.current_multiplier / bet.target_multiplier) * 100, 100);
  };

  return (
    <div className="bg-[--surface] rounded-2xl p-6 neon-box">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h3 className="text-xl font-bold font-orbitron text-[--primary] mb-4 sm:mb-0">
          Bets History
        </h3>
        
        {/* Filter Buttons */}
        <div className="flex space-x-2">
          {['all', 'pending', 'won', 'lost'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all capitalize ${
                statusFilter === status
                  ? 'bg-[--primary] text-white'
                  : 'bg-black/30 text-[--muted] hover:text-white'
              }`}
            >
              {status}
              {status !== 'all' && (
                <span className="ml-1 text-xs opacity-70">
                  ({bets.filter(bet => bet.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filteredBets.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[--primary] to-[--secondary] rounded-full flex items-center justify-center opacity-50">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-[--muted]">
            No {statusFilter !== 'all' ? statusFilter : ''} bets found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBets.map((bet) => (
            <div
              key={bet.id}
              className="bg-black/30 rounded-xl p-4 border border-[--primary]/20 hover:border-[--primary]/40 transition-all card-hover"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Token Info */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">
                      {bet.token_symbol || 'Unknown'}
                    </h4>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(bet.status)}`}>
                      {bet.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[--muted] text-sm font-mono">
                    {bet.token_mint.slice(0, 8)}...{bet.token_mint.slice(-8)}
                  </p>
                  <p className="text-[--muted] text-sm">
                    {formatDate(bet.created_at)}
                  </p>
                </div>

                {/* Price Info */}
                <div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[--muted] text-sm">Entry Price:</span>
                      <span className="text-white font-mono">${formatPrice(bet.entry_price)}</span>
                    </div>
                    
                    {bet.status === 'pending' ? (
                      <div className="flex justify-between">
                        <span className="text-[--muted] text-sm">Current Price:</span>
                        <span className={`font-mono ${
                          bet.current_price > bet.entry_price ? 'text-[--secondary]' : 'text-red-400'
                        }`}>
                          ${formatPrice(bet.current_price)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-[--muted] text-sm">Exit Price:</span>
                        <span className="text-white font-mono">
                          ${bet.exit_price ? formatPrice(bet.exit_price) : 'N/A'}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-[--muted] text-sm">Target:</span>
                      <span className="text-[--accent] font-semibold">
                        {bet.target_multiplier}x
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount & Status */}
                <div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[--muted] text-sm">Bet Amount:</span>
                      <span className="text-white font-semibold">
                        {formatSOL(bet.amount_sol)} SOL
                      </span>
                    </div>
                    
                    {bet.status === 'pending' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[--muted] text-sm">Potential:</span>
                          <span className="text-[--accent] font-semibold">
                            {bet.potential_payout ? formatSOL(bet.potential_payout) : '0.0000'} SOL
                          </span>
                        </div>
                        {bet.current_multiplier && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-[--muted] text-sm">Current:</span>
                              <span className={`font-semibold ${
                                bet.current_multiplier >= bet.target_multiplier ? 'text-[--secondary]' : 'text-yellow-400'
                              }`}>
                                {bet.current_multiplier.toFixed(2)}x
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  calculateProgress(bet) >= 100 ? 'bg-[--secondary]' : 'bg-gradient-to-r from-[--primary] to-[--secondary]'
                                }`}
                                style={{ width: `${calculateProgress(bet)}%` }}
                              ></div>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-[--muted] text-sm">Payout:</span>
                        <span className={`font-semibold ${
                          bet.status === 'won' ? 'text-[--secondary]' : 'text-red-400'
                        }`}>
                          {bet.payout_sol ? formatSOL(bet.payout_sol) : '0.0000'} SOL
                        </span>
                      </div>
                    )}

                    {bet.resolved_at && (
                      <p className="text-[--muted] text-xs">
                        Resolved: {formatDate(bet.resolved_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}