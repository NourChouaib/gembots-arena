// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useArenaWebSocket } from '../../hooks/useArenaWebSocket';
import { useEVMWallet } from '../../providers/EVMWalletProvider';
import WalletButton from '../../components/WalletButton';
import { BotGrid } from '../../components/arena/BotGrid';
import { LiveChart } from '../../components/arena/LiveChart';
import { Leaderboard } from '../../components/arena/Leaderboard';
import { LiveTicker } from '../../components/arena/LiveTicker';
import { Commentator } from '../../components/arena/Commentator';
import { ArenaStats } from '../../components/arena/ArenaStats';
import { ConnectionStatus } from '../../components/arena/ConnectionStatus';
import LeagueFilter from '../../components/LeagueFilter';

export default function ArenaPage() {
  const {
    bots,
    tokens,
    ticker,
    commentatorMessages,
    connectedUsers,
    isConnected,
    simulateArenaData
  } = useArenaWebSocket();

  const { connected: walletConnected } = useEVMWallet();
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [showCTA, setShowCTA] = useState(true);
  const [rootingForBot, setRootingForBot] = useState<string | null>(null);
  const [leagueFilter, setLeagueFilter] = useState<'all' | 'nfa' | 'free'>('all');

  // Load real arena data on mount + refresh every 30s
  useEffect(() => {
    const timer = setTimeout(() => {
      simulateArenaData();
    }, 500);

    const interval = setInterval(() => {
      simulateArenaData();
    }, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [simulateArenaData]);

  // Выбираем первый токен по умолчанию
  useEffect(() => {
    if (tokens.length > 0 && !selectedToken) {
      setSelectedToken(tokens[0].mint);
    }
  }, [tokens, selectedToken]);

  const selectedTokenData = tokens.find(t => t.mint === selectedToken);
  const activeBotsForToken = bots.filter(bot => 
    bot.position?.tokenMint === selectedToken
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Nav is now in layout.tsx */}
      {/* Arena status bar */}
      <div className="border-b border-gray-800 bg-gray-950/60">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-end space-x-4 text-sm">
          <ConnectionStatus isConnected={isConnected} />
          <div className="hidden sm:flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{connectedUsers} watching</span>
          </div>
          <WalletButton />
        </div>
      </div>

      {/* Floating CTA Banner — Mint NFA */}
      {showCTA && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-900/95 via-gray-900/95 to-amber-900/95 backdrop-blur-md border-t border-purple-500/30"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ delay: 3 }}
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl hidden sm:block">⚔️</span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Watching is fun. Fighting is better.
                  </h3>
                  <p className="text-xs text-gray-300 hidden sm:block">
                    Mint your AI bot as an NFA on BNB Chain — from just <span className="text-yellow-400 font-semibold">0.01 BNB</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/mint"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all text-sm shadow-lg shadow-purple-500/20"
                >
                  ⚡ Mint NFA
                </Link>
                <button
                  onClick={() => setShowCTA(false)}
                  className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Watch Mode Banner */}
      {!walletConnected && (
        <motion.div
          className="border-b border-gray-800 bg-gray-900/40"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="text-center flex items-center justify-center gap-3">
              <p className="text-sm text-gray-400">
                <span className="text-gray-300">👀 Watch Mode</span> — Click any bot to follow. <Link href="/mint" className="text-purple-400 hover:text-purple-300 font-medium">Mint your own →</Link>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Arena Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
          
          {/* Left Panel - Bots Arena */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div
              className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 h-full"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-100">Arena View</h2>
                <div className="text-sm text-gray-400">
                  {bots.length} Active Bots
                </div>
              </div>
              <div className="mb-4">
                <LeagueFilter value={leagueFilter} onChange={setLeagueFilter} />
              </div>

              {/* Rooting Banner */}
              {!walletConnected && rootingForBot && (
                <motion.div
                  className="mb-4 p-3 bg-gray-800/60 border border-gray-700 rounded-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-gray-200 text-sm font-medium">
                        Following: {bots.find(b => b.id === rootingForBot)?.name || 'Unknown Bot'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Want your own bot? 
                        <Link href="/mint" className="text-purple-400 hover:text-purple-300 ml-1 font-medium">
                          Mint NFA from 0.01 BNB →
                        </Link>
                      </p>
                    </div>
                    <button
                      onClick={() => setRootingForBot(null)}
                      className="text-gray-500 hover:text-white text-sm p-1"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              )}
              
              <BotGrid 
                bots={bots}
                selectedToken={selectedToken}
                onBotClick={(botId) => {
                  if (!walletConnected) {
                    setRootingForBot(botId);
                  } else {
                    console.log('Bot clicked:', botId);
                  }
                }}
                rootingForBot={rootingForBot}
                isWatchMode={!walletConnected}
              />
            </motion.div>
          </div>

          {/* Center Panel - Live Chart */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div
              className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-100 mb-4">Live Charts</h2>
                
                {/* Token Selector */}
                <div className="flex space-x-2 mb-4">
                  {tokens.map((token) => (
                    <button
                      key={token.mint}
                      onClick={() => setSelectedToken(token.mint)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedToken === token.mint
                          ? 'bg-gray-700 text-white border border-gray-600'
                          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300 border border-transparent'
                      }`}
                    >
                      {token.symbol}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTokenData && (
                <LiveChart 
                  token={selectedTokenData}
                  activeBots={activeBotsForToken}
                />
              )}
            </motion.div>
          </div>

          {/* Right Panel - Leaderboard & Stats */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div
              className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-bold text-gray-100 mb-6">Top Performers</h2>
              <Leaderboard bots={bots} />
            </motion.div>

            <motion.div
              className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <ArenaStats 
                totalBots={bots.length}
                activeTrades={bots.filter(b => b.currentAction === 'HOLDING').length}
                topPerformer={bots[0]}
                tokens={tokens}
              />
            </motion.div>

            {/* Mint CTA Card */}
            <motion.div
              className="bg-gradient-to-br from-purple-900/40 to-amber-900/30 backdrop-blur-md border border-purple-500/20 rounded-xl p-5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="text-center space-y-3">
                <div className="text-3xl">🤖</div>
                <h3 className="font-bold text-white text-sm">Build a Better Bot?</h3>
                <p className="text-xs text-gray-400">
                  Choose your AI model, pick a strategy, and mint your bot as an NFA on BNB Chain.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <span className="text-amber-400">🥉 0.01</span>
                  <span>·</span>
                  <span className="text-gray-300">🥈 0.03</span>
                  <span>·</span>
                  <span className="text-yellow-400">🥇 0.1 BNB</span>
                </div>
                <Link
                  href="/mint"
                  className="block w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all text-sm shadow-lg shadow-purple-500/20"
                >
                  ⚡ Mint Your NFA
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* AI Commentator */}
      <Commentator messages={commentatorMessages} maxMessages={5} />

      {/* Bottom Ticker */}
      <LiveTicker ticker={ticker} className="bottom-[60px] sm:bottom-[80px]" />
    </div>
  );
}