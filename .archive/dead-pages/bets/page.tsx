'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import BtcMiniChart from '@/components/bets/BtcMiniChart';
import { useGemBets, UserBet } from '@/hooks/useGemBets';
import {
  AI_TRADERS,
  AITrader,
  Market,
  BetDirection,
  getCurrentEpoch,
  getTimeRemaining,
  formatCountdown,
  generateAllBotBets,
  calculatePoolPercent,
  resolveMarket,
  updateTraderStats,
  getWinRate,
  generateMockHistory,
  PricePoint,
} from '@/lib/bets-engine';

// ─── BTC Price fetcher ──────────────────────────────────────────────────────

async function fetchBtcPrice(): Promise<number> {
  try {
    const res = await fetch('/api/token-price?token=BTC');
    const data = await res.json();
    return data.price || 67000;
  } catch {
    return 67000 + (Math.random() - 0.5) * 200;
  }
}

// ─── Confetti burst ─────────────────────────────────────────────────────────

function fireConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;
  const colors = ['#22c55e', '#14F195', '#fbbf24', '#a855f7'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// ─── Bet Amount Presets ─────────────────────────────────────────────────────

const BET_AMOUNTS = [10, 50, 100] as const;

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function GemBetsPage() {
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [countdown, setCountdown] = useState('5:00');
  const [progress, setProgress] = useState(0);
  const [traders, setTraders] = useState<AITrader[]>(AI_TRADERS.map(t => ({ ...t })));
  const [currentMarket, setCurrentMarket] = useState<Market | null>(null);
  const [marketHistory, setMarketHistory] = useState<Market[]>([]);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<BetDirection | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const marketRef = useRef<Market | null>(null);
  const tradersRef = useRef(traders);
  tradersRef.current = traders;

  // Virtual betting hook
  const gem = useGemBets();

  // Initialize market
  const startNewMarket = useCallback(async () => {
    const price = await fetchBtcPrice();
    setBtcPrice(price);
    setSelectedDirection(null);
    setSelectedAmount(null);

    const { startTime, endTime, marketId } = getCurrentEpoch();
    const bets = generateAllBotBets(tradersRef.current);
    const upPercent = calculatePoolPercent(bets);

    const market: Market = {
      id: marketId,
      startTime,
      endTime,
      startPrice: price,
      endPrice: null,
      result: null,
      status: 'open',
      bets,
      upPercent,
    };

    setCurrentMarket(market);
    marketRef.current = market;
  }, []);

  // Resolve market
  const resolveCurrentMarket = useCallback(async () => {
    const market = marketRef.current;
    if (!market || market.status === 'resolved') return;

    const endPrice = await fetchBtcPrice();
    const result = resolveMarket(market.startPrice, endPrice);

    const resolved: Market = {
      ...market,
      endPrice,
      result,
      status: 'resolved',
    };

    setCurrentMarket(resolved);
    marketRef.current = resolved;
    setFlash(result);
    setTimeout(() => setFlash(null), 2000);

    // Resolve user bet
    gem.resolveBet(result);

    // Update trader stats
    setTraders(prev => updateTraderStats(prev, market.bets, result));

    // Add to market history
    setMarketHistory(prev => [resolved, ...prev].slice(0, 20));

    // Start new market after 3 seconds
    setTimeout(startNewMarket, 3000);
  }, [startNewMarket, gem.resolveBet]);

  // Fire confetti / shake on result
  useEffect(() => {
    if (!gem.lastResult) return;
    if (gem.lastResult.won) {
      fireConfetti();
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  }, [gem.lastResult]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getTimeRemaining();
      setCountdown(formatCountdown(remaining));
      setProgress(1 - remaining / (5 * 60 * 1000));

      if (remaining <= 0 && marketRef.current?.status === 'open') {
        resolveCurrentMarket();
      }
    }, 200);

    return () => clearInterval(timer);
  }, [resolveCurrentMarket]);

  // Init
  useEffect(() => {
    startNewMarket();

    const priceTimer = setInterval(async () => {
      const price = await fetchBtcPrice();
      setBtcPrice(price);
      setPriceHistory(prev => [...prev, { time: Date.now(), price }].slice(-120));
    }, 10_000);

    fetchBtcPrice().then(price => {
      setPriceHistory(generateMockHistory(price));
    });

    return () => clearInterval(priceTimer);
  }, [startNewMarket]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handlePlaceBet = (direction: BetDirection) => {
    if (gem.currentBet) return; // already bet this round
    if (!selectedAmount) {
      // If no amount selected, just select direction
      setSelectedDirection(direction);
      return;
    }
    // Place the bet
    gem.placeBet(
      currentMarket?.id ?? 0,
      direction,
      selectedAmount,
      currentMarket?.upPercent ?? 50
    );
    setSelectedDirection(direction);
  };

  const handleSelectAmount = (amount: number) => {
    if (gem.currentBet) return;
    const actualAmount = amount === -1 ? gem.balance : amount;
    if (actualAmount > gem.balance || actualAmount <= 0) return;
    setSelectedAmount(actualAmount);

    // If direction already selected, auto-place
    if (selectedDirection) {
      gem.placeBet(
        currentMarket?.id ?? 0,
        selectedDirection,
        actualAmount,
        currentMarket?.upPercent ?? 50
      );
    }
  };

  const upPercent = currentMarket?.upPercent ?? 50;
  const downPercent = 100 - upPercent;
  const hasBet = !!gem.currentBet;
  const marketOpen = currentMarket?.status === 'open';

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white ${shake ? 'animate-shake' : ''}`}>
      {/* Shake animation CSS */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>

      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 pointer-events-none ${
              flash === 'up' ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Result Toast */}
      <AnimatePresence>
        {gem.lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[60]"
          >
            <div
              className={`px-6 py-3 rounded-2xl text-lg font-bold shadow-2xl border backdrop-blur-md cursor-pointer ${
                gem.lastResult.won
                  ? 'bg-green-900/80 border-green-500/50 text-green-300'
                  : 'bg-red-900/80 border-red-500/50 text-red-300'
              }`}
              onClick={gem.clearResult}
            >
              {gem.lastResult.won
                ? `+${gem.lastResult.pnl} GEMS! 🎉`
                : `${gem.lastResult.pnl} GEMS 💀`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 pt-6 pb-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">
              ← GemBots
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              🎰 GemBets
            </h1>
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">
              BETA
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">BTC Price</div>
            <div className="text-lg sm:text-xl font-mono font-bold text-white">
              ${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Balance Bar + Stats */}
        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-3 sm:p-4 mb-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Balance */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono">
                  {gem.balance.toLocaleString()} <span className="text-sm text-gray-400">GEMS</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <div className="text-center">
                <div className="text-gray-500">Win Rate</div>
                <div className="font-bold text-white">{gem.winRate}%</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">PnL</div>
                <div className={`font-bold font-mono ${gem.stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {gem.stats.totalPnl >= 0 ? '+' : ''}{gem.stats.totalPnl}
                </div>
              </div>
              <div className="text-center hidden sm:block">
                <div className="text-gray-500">Streak</div>
                <div className="font-bold text-yellow-400">
                  {gem.stats.currentStreak > 0 ? `🔥${gem.stats.currentStreak}` : '—'}
                </div>
              </div>
              <div className="text-center hidden sm:block">
                <div className="text-gray-500">Best</div>
                <div className="font-bold text-purple-400">{gem.stats.bestStreak > 0 ? gem.stats.bestStreak : '—'}</div>
              </div>
            </div>
          </div>

          {/* Broke state */}
          {gem.isBroke && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t border-gray-700/50 text-center"
            >
              <div className="text-lg mb-2">You&apos;re broke! 💸</div>
              <button
                onClick={gem.resetBalance}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-purple-500/20 transition-all"
              >
                Get 1,000 GEMS 🎁
              </button>
            </motion.div>
          )}
        </div>

        {/* Active Market Card */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 sm:p-6 mb-4 backdrop-blur-sm">
          <div className="text-center mb-3">
            <div className="text-sm text-gray-400 mb-1">CURRENT MARKET</div>
            <div className="text-lg sm:text-xl font-bold">
              BTC 5-Min: <span className="text-yellow-400">Up</span> or <span className="text-yellow-400">Down</span>?
            </div>
          </div>

          {/* Countdown */}
          <div className="text-center mb-4">
            <div className={`text-4xl sm:text-5xl font-mono font-bold ${
              getTimeRemaining() < 30000 ? 'text-red-400 animate-pulse' : 'text-white'
            }`}>
              {countdown}
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full mt-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"
                style={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>

          {/* Pool Distribution Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-green-400 font-bold">🟢 UP {upPercent}%</span>
              <span className="text-red-400 font-bold">{downPercent}% DOWN 🔴</span>
            </div>
            <div className="w-full h-8 bg-gray-700 rounded-full overflow-hidden flex">
              <motion.div
                className="h-full bg-gradient-to-r from-green-600 to-green-400 flex items-center justify-center text-xs font-bold"
                animate={{ width: `${upPercent}%` }}
                transition={{ duration: 0.5 }}
              >
                {upPercent > 15 && `${(100 / upPercent).toFixed(2)}x`}
              </motion.div>
              <motion.div
                className="h-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center text-xs font-bold"
                animate={{ width: `${downPercent}%` }}
                transition={{ duration: 0.5 }}
              >
                {downPercent > 15 && `${(100 / downPercent).toFixed(2)}x`}
              </motion.div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{(100 / upPercent).toFixed(2)}x payout</span>
              <span>{(100 / downPercent).toFixed(2)}x payout</span>
            </div>
          </div>

          {/* Bet Amount Selection */}
          {!hasBet && marketOpen && (
            <div className="mb-4">
              <div className="text-xs text-gray-500 text-center mb-2">BET AMOUNT</div>
              <div className="flex gap-2 justify-center flex-wrap">
                {BET_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => handleSelectAmount(amt)}
                    disabled={amt > gem.balance}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedAmount === amt
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : amt > gem.balance
                          ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                          : 'bg-gray-700/50 text-gray-300 border border-gray-600/50 hover:bg-gray-700'
                    }`}
                  >
                    💎 {amt}
                  </button>
                ))}
                <button
                  onClick={() => handleSelectAmount(-1)}
                  disabled={gem.balance <= 0}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedAmount === gem.balance && selectedAmount > 0 && !BET_AMOUNTS.includes(selectedAmount as 10 | 50 | 100)
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                      : gem.balance <= 0
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  }`}
                >
                  🔥 ALL-IN
                </button>
              </div>
            </div>
          )}

          {/* Direction Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <motion.button
              whileHover={!hasBet && marketOpen ? { scale: 1.02 } : {}}
              whileTap={!hasBet && marketOpen ? { scale: 0.98 } : {}}
              onClick={() => handlePlaceBet('up')}
              disabled={hasBet || !marketOpen}
              className={`py-4 rounded-xl font-bold text-lg transition-all ${
                gem.currentBet?.direction === 'up'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 ring-2 ring-green-400'
                  : selectedDirection === 'up' && !hasBet
                    ? 'bg-green-500/40 text-green-300 border-2 border-green-500/60'
                    : hasBet
                      ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                      : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
              }`}
            >
              🟢 UP
              {selectedAmount && !hasBet && selectedDirection !== 'up' && (
                <span className="block text-xs opacity-70">💎 {selectedAmount}</span>
              )}
            </motion.button>
            <motion.button
              whileHover={!hasBet && marketOpen ? { scale: 1.02 } : {}}
              whileTap={!hasBet && marketOpen ? { scale: 0.98 } : {}}
              onClick={() => handlePlaceBet('down')}
              disabled={hasBet || !marketOpen}
              className={`py-4 rounded-xl font-bold text-lg transition-all ${
                gem.currentBet?.direction === 'down'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-400'
                  : selectedDirection === 'down' && !hasBet
                    ? 'bg-red-500/40 text-red-300 border-2 border-red-500/60'
                    : hasBet
                      ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              }`}
            >
              🔴 DOWN
              {selectedAmount && !hasBet && selectedDirection !== 'down' && (
                <span className="block text-xs opacity-70">💎 {selectedAmount}</span>
              )}
            </motion.button>
          </div>

          {/* Bet Status */}
          <AnimatePresence mode="wait">
            {gem.currentBet && (
              <motion.div
                key="active-bet"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`text-center py-2 px-4 rounded-lg text-sm font-semibold ${
                  gem.currentBet.direction === 'up'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                Your bet: 💎 {gem.currentBet.amount} GEMS on {gem.currentBet.direction.toUpperCase()} ✅
                <span className="text-gray-500 ml-2">({gem.currentBet.odds.toFixed(2)}x)</span>
              </motion.div>
            )}
            {!gem.currentBet && !hasBet && marketOpen && (
              <motion.div
                key="no-bet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-sm text-gray-500"
              >
                {selectedAmount && selectedDirection
                  ? 'Confirm direction to place bet!'
                  : selectedAmount
                    ? 'Now pick UP or DOWN!'
                    : selectedDirection
                      ? 'Now pick your bet amount!'
                      : 'Pick amount & direction to bet!'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BTC Mini Chart */}
        {priceHistory.length > 5 && (
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 mb-4">
            <div className="text-sm text-gray-400 mb-2">BTC Price (30 min)</div>
            <BtcMiniChart priceHistory={priceHistory} currentPrice={btcPrice} marketStartPrice={currentMarket?.startPrice ?? null} />
          </div>
        )}

        {/* Market History */}
        {marketHistory.length > 0 && (
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 mb-4">
            <div className="text-sm text-gray-400 mb-3">Recent Markets</div>
            <div className="flex gap-2 flex-wrap">
              {marketHistory.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    m.result === 'up'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                  title={`$${m.startPrice?.toFixed(0)} → $${m.endPrice?.toFixed(0)}`}
                >
                  {m.result === 'up' ? '▲' : '▼'}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* User Bet History */}
        {gem.history.length > 0 && (
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-400">📋 Your Recent Bets</div>
              <button
                onClick={gem.resetBalance}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Reset All
              </button>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {gem.history.map((bet: UserBet) => (
                <div
                  key={bet.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    bet.result === 'win'
                      ? 'bg-green-500/5 border border-green-500/10'
                      : 'bg-red-500/5 border border-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={bet.direction === 'up' ? 'text-green-400' : 'text-red-400'}>
                      {bet.direction === 'up' ? '▲' : '▼'}
                    </span>
                    <span className="text-gray-400 font-mono text-xs">
                      {new Date(bet.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-gray-300">
                      💎 {bet.amount}
                    </span>
                    <span className="text-gray-500 text-xs">
                      @{bet.odds.toFixed(2)}x
                    </span>
                  </div>
                  <div className={`font-bold font-mono ${bet.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                    {bet.pnl >= 0 ? '+' : ''}{bet.pnl}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Stats */}
        {gem.stats.totalBets > 0 && (
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 mb-4">
            <div className="text-sm text-gray-400 mb-3">📊 Your Stats</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-700/30 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Win Rate</div>
                <div className="text-lg font-bold text-white">{gem.winRate}%</div>
                <div className="text-xs text-gray-500">{gem.stats.wins}W / {gem.stats.losses}L</div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Total PnL</div>
                <div className={`text-lg font-bold font-mono ${gem.stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {gem.stats.totalPnl >= 0 ? '+' : ''}{gem.stats.totalPnl}
                </div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Best Win</div>
                <div className="text-lg font-bold text-green-400 font-mono">
                  {gem.stats.biggestWin > 0 ? `+${gem.stats.biggestWin}` : '—'}
                </div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Worst Loss</div>
                <div className="text-lg font-bold text-red-400 font-mono">
                  {gem.stats.worstLoss < 0 ? gem.stats.worstLoss : '—'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Traders Leaderboard */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 mb-4">
          <div className="text-sm text-gray-400 mb-3">🤖 AI Traders</div>
          <div className="space-y-2">
            {[...traders]
              .sort((a, b) => b.wins - a.wins || b.totalBets - a.totalBets)
              .map((trader) => (
                <div
                  key={trader.id}
                  className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{trader.emoji}</span>
                    <div>
                      <div className="font-semibold text-sm">{trader.name}</div>
                      <div className="text-xs text-gray-500">{trader.strategy}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {trader.currentBet && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        trader.currentBet === 'up'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trader.currentBet === 'up' ? '▲ UP' : '▼ DOWN'}
                      </span>
                    )}
                    <div className="text-right">
                      <div className="font-mono font-bold">{getWinRate(trader.wins, trader.totalBets)}</div>
                      <div className="text-xs text-gray-500">{trader.wins}W / {trader.totalBets}T</div>
                    </div>
                    {trader.streak >= 3 && (
                      <span className="text-xs text-yellow-400">🔥{trader.streak}</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 pb-8">
          GemBets is in beta. Virtual GEMS only — no real crypto at risk.
          <br />
          <Link href="/" className="text-gray-500 hover:text-gray-400">
            ← Back to GemBots Arena
          </Link>
        </div>
      </div>
    </div>
  );
}
