'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import WalletButton from '../../components/WalletButton';
import WinAnimation from '../../components/WinAnimation';
import { useWallet } from '../../hooks/useWallet';
import { getUserLevel, getBetsToNextLevel, getLevelProgress } from '../../lib/levels';
import { calculateUserBadges } from '../../lib/badges';
// Price fetched via API route to avoid CORS
import { Stake } from '../../types';

export default function StakePage() {
  const { connected, publicKey } = useWallet();
  const [tokenMint, setTokenMint] = useState('');
  const [amountSol, setAmountSol] = useState('0.1');
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [message, setMessage] = useState('');
  const [testWallet, setTestWallet] = useState('');
  
  // Generate test wallet only on client side
  useEffect(() => {
    if (!testWallet) {
      setTestWallet('TestUser_' + Math.random().toString(36).substring(7));
    }
  }, []);
  
  const activeWallet = publicKey || testWallet || 'anonymous';
  const isTestMode = !connected;

  // Fetch token price when mint changes (via API to avoid CORS)
  useEffect(() => {
    if (tokenMint.length >= 32) {
      setLoading(true);
      fetch(`/api/price?mint=${tokenMint}`)
        .then(res => res.json())
        .then(data => setTokenPrice(data.success ? data.price : null))
        .catch(() => setTokenPrice(null))
        .finally(() => setLoading(false));
    } else {
      setTokenPrice(null);
    }
  }, [tokenMint]);

  // Fetch user stakes (works in test mode too)
  useEffect(() => {
    // In test mode, fetch all recent stakes
    const wallet = publicKey || '';
    const url = wallet ? `/api/stakes?wallet=${wallet}` : '/api/stakes/active';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) setStakes(data.data || []);
      })
      .catch(() => {});
  }, [publicKey]);

  // Calculate user level based on stakes
  const totalBets = stakes.length;
  const userLevel = getUserLevel(totalBets);
  const betsToNext = getBetsToNextLevel(totalBets);
  const progress = getLevelProgress(totalBets);
  const mockUser = {
    totalPredictions: totalBets,
    streakDays: 0,
    correctPredictions: stakes.filter(s => s.result === 'win').length,
    totalXFound: stakes.reduce((sum, stake) => sum + (stake.payoutSol || 0), 0),
    stakedAmount: stakes.reduce((sum, stake) => sum + stake.amountSol, 0),
    reputation: stakes.length * 10,
    createdAt: '2024-01-15T10:00:00Z',
    id: '1',
    name: String(activeWallet),
    walletAddress: String(activeWallet)
  };
  const userBadges = calculateUserBadges(mockUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenPrice) return;

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/stakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenMint,
          amountSol: parseFloat(amountSol),
          walletAddress: activeWallet
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage('✅ Bet placed successfully!');
        setTokenMint('');
        setAmountSol('0.1');
        // Refresh stakes
        const stakesRes = await fetch('/api/stakes/active');
        const stakesData = await stakesRes.json();
        if (stakesData.success) setStakes(stakesData.data || []);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Failed to place stake');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 grid-bg">
      {/* Nav is now in layout.tsx */}

      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-center mb-8 animate-neon-text font-orbitron">
            <span className="bg-gradient-to-r from-[#9945FF] to-[#14F195] bg-clip-text text-transparent">
              🎯 Place Your Bet
            </span>
          </h1>

          {/* User Level Display */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{userLevel.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: userLevel.color }}>
                    {userLevel.name}
                  </h3>
                  <p className="text-sm text-gray-400">{userLevel.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#14F195] animate-neon-text">{totalBets}</p>
                <p className="text-xs text-gray-400">Total Bets</p>
              </div>
            </div>

            {/* Level Progress */}
            {betsToNext > 0 && (
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Progress to next level</span>
                  <span>{betsToNext} bets to go</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${userLevel.color} 0%, #FFD700 100%)`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Badges */}
            {userBadges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {userBadges.slice(0, 5).map((badge) => (
                  <div 
                    key={badge.id}
                    className="px-2 py-1 text-xs rounded-full flex items-center gap-1"
                    style={{ 
                      backgroundColor: badge.color + '20',
                      color: badge.color,
                      border: `1px solid ${badge.color}40`
                    }}
                    title={badge.description}
                  >
                    <span>{badge.icon}</span>
                    <span className="font-medium">{badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isTestMode && (
            <div className="text-center py-3 mb-6 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <p className="text-yellow-400">🧪 Test Mode — no real SOL required</p>
            </div>
          )}
          
          <>
              {/* Stake Form */}
              <form onSubmit={handleSubmit} className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8">
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Token Mint Address</label>
                  <input
                    type="text"
                    value={tokenMint}
                    onChange={(e) => setTokenMint(e.target.value)}
                    placeholder="Enter token mint address..."
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#9945FF] focus:outline-none focus:shadow-lg focus:shadow-[#9945FF]/25"
                  />
                  {tokenPrice !== null && (
                    <p className="text-green-400 mt-2">
                      💰 Current price: ${tokenPrice.toFixed(8)}
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Amount (SOL)</label>
                  <input
                    type="number"
                    value={amountSol}
                    onChange={(e) => setAmountSol(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#9945FF] focus:outline-none focus:shadow-lg focus:shadow-[#9945FF]/25"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !tokenPrice}
                  className="w-full py-3 bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white font-semibold rounded-lg hover:from-[#7B2CBF] hover:to-[#00D4AA] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-[#9945FF]/50 animate-glow"
                >
                  {loading ? 'Processing...' : '🎯 Place Bet'}
                </button>

                {message && (
                  <p className={`mt-4 text-center ${message.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                    {message}
                  </p>
                )}
              </form>

              {/* Active Stakes */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Your Active Bets</h2>
                {stakes.length === 0 ? (
                  <p className="text-gray-400">No active bets yet</p>
                ) : (
                  <div className="space-y-3">
                    {stakes.map((stake: any, index: number) => {
                      const multiplier = stake.payoutSol ? (stake.payoutSol / stake.amountSol) : 1;
                      const isWin = stake.result === 'win';
                      
                      return (
                        <motion.div 
                          key={stake.id} 
                          className={`flex justify-between items-center p-3 rounded-lg transition-all duration-300 ${
                            isWin 
                              ? 'bg-green-500/20 border-2 border-green-400 shadow-lg shadow-green-400/25 animate-pulse' 
                              : stake.result === 'lose' 
                                ? 'bg-red-500/10 border border-red-500/30' 
                                : 'bg-gray-800/50 border border-gray-700'
                          }`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div>
                            <p className="text-white font-mono text-sm">
                              {(stake.token_mint || stake.tokenMint || '').slice(0, 8)}...{(stake.token_mint || stake.tokenMint || '').slice(-4)}
                            </p>
                            <p className="text-gray-400 text-sm">{stake.amount_sol || stake.amountSol} SOL</p>
                            {isWin && stake.payoutSol && (
                              <p className="text-green-400 text-sm font-semibold">
                                +{stake.payoutSol} SOL ({multiplier.toFixed(1)}x)
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              stake.result === 'win' ? 'bg-green-500/30 text-green-300' :
                              stake.result === 'lose' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {isWin ? '🎉 WIN' : stake.result === 'lose' ? '💸 LOSE' : '⏳ PENDING'}
                            </span>
                            {isWin && (
                              <p className="text-xs text-green-400 mt-1">
                                {multiplier >= 100 ? '🚀 EPIC!' : multiplier >= 50 ? '🔥 HUGE!' : multiplier >= 10 ? '✨ BIG!' : '✅ WIN!'}
                              </p>
                            )}
                          </div>
                          
                          {/* Win Animation */}
                          {isWin && <WinAnimation isWin={true} multiplier={multiplier} />}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          </motion.div>
        </div>
        </div>
      </div>
    </div>
  );
}
