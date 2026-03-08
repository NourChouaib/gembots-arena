'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { soundManager } from '../lib/sounds';

interface BattleResultProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    won: boolean;
    myPrediction: number;
    opponentPrediction: number;
    opponentName: string;
    actualX: number;
    tokenSymbol: string;
    stakeWon: number;
  } | null;
}

function celebrateVictory() {
  // Stage 1: Center burst
  confetti({
    particleCount: 120,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#9945FF'],
    gravity: 0.8,
  });

  // Stage 2: Side cannons
  setTimeout(() => {
    confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors: ['#FFD700', '#FFC107'] });
    confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors: ['#FFD700', '#FFC107'] });
  }, 200);

  // Stage 3: Gold rain
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 160,
      origin: { y: 0 },
      gravity: 1.5,
      ticks: 300,
      colors: ['#FFD700', '#FFC107', '#FF9800'],
    });
  }, 500);
}

export default function BattleResult({ isOpen, onClose, result }: BattleResultProps) {
  useEffect(() => {
    if (!isOpen || !result) return;
    soundManager.init();
    if (result.won) {
      soundManager.victory();
      // Trigger confetti
      const timer = setTimeout(celebrateVictory, 300);
      return () => clearTimeout(timer);
    } else {
      soundManager.defeat();
    }
  }, [isOpen, result]);

  if (!isOpen || !result) return null;

  const { won, myPrediction, opponentPrediction, opponentName, actualX, tokenSymbol, stakeWon } = result;
  const accuracy = actualX > 0 ? Math.max(0, 100 - Math.abs(actualX - myPrediction) / actualX * 100) : 0;
  const isPerfect = accuracy >= 95;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Red flash for defeat */}
        {!won && (
          <motion.div
            className="fixed inset-0 bg-red-900/40 pointer-events-none z-40"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        )}

        {/* Gold flash for victory */}
        {won && (
          <motion.div
            className="fixed inset-0 bg-yellow-500/20 pointer-events-none z-40"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}

        <motion.div
          className="max-w-md w-full text-center relative z-50"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.6 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Big result icon */}
          <motion.div
            className="text-8xl mb-2"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2, duration: 0.8, bounce: 0.5 }}
          >
            {won ? '🏆' : '💀'}
          </motion.div>

          {/* VICTORY text with golden glow */}
          {won ? (
            <motion.h1
              className="text-6xl font-black mb-2 font-orbitron"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FF8C00, #FFD700)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              initial={{ scale: 0, rotate: -10, opacity: 0 }}
              animate={{
                scale: [0, 1.3, 1],
                rotate: [10, -5, 0],
                opacity: 1,
              }}
              transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
            >
              VICTORY
            </motion.h1>
          ) : (
            <motion.div className="relative mb-2">
              <motion.h1
                className="text-6xl font-black text-red-500 font-orbitron"
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{
                  scale: [1.5, 0.9, 1],
                  opacity: 1,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  textShadow: '0 0 30px rgba(239, 68, 68, 0.6), 0 0 60px rgba(239, 68, 68, 0.3)',
                }}
              >
                DEFEAT
              </motion.h1>
            </motion.div>
          )}

          {/* Golden glow aura for victory */}
          {won && (
            <motion.div
              className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 pointer-events-none rounded-full"
              animate={{
                boxShadow: [
                  '0 0 40px rgba(255, 215, 0, 0.2)',
                  '0 0 80px rgba(255, 215, 0, 0.4)',
                  '0 0 40px rgba(255, 215, 0, 0.2)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}

          {/* Perfect prediction badge */}
          {won && isPerfect && (
            <motion.div
              className="text-lg font-bold text-yellow-300 mb-2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, type: 'spring', bounce: 0.6 }}
            >
              ✨ PERFECT PREDICTION ✨
            </motion.div>
          )}

          {/* Stake result */}
          {stakeWon > 0 && (
            <motion.div
              className={`text-2xl font-bold mb-4 ${won ? 'text-green-400' : 'text-red-400'}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {won ? `+${stakeWon} SOL 💰` : `-${stakeWon} SOL`}
            </motion.div>
          )}

          {/* Battle details card */}
          <motion.div
            className={`rounded-2xl p-6 mb-6 border-2 ${
              won
                ? 'bg-yellow-900/20 border-yellow-500/30'
                : 'bg-red-900/20 border-red-500/30'
            }`}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="text-sm text-gray-400 mb-3">${tokenSymbol}</div>

            {/* Actual price */}
            <div className="text-3xl font-bold text-white mb-4">
              Actual: <span className="text-cyan-400">{actualX.toFixed(2)}x</span>
            </div>

            {/* Predictions comparison */}
            <div className="flex items-center justify-between gap-4">
              <div className={`flex-1 p-3 rounded-xl ${won ? 'bg-green-900/30 border border-green-500/30' : 'bg-gray-800'}`}>
                <div className="text-xs text-gray-400 mb-1">You</div>
                <div className={`text-xl font-bold ${won ? 'text-green-400' : 'text-gray-300'}`}>
                  {myPrediction.toFixed(2)}x
                </div>
                <div className="text-xs text-gray-500">
                  diff: {Math.abs(actualX - myPrediction).toFixed(2)}
                </div>
              </div>

              <div className="text-gray-600 font-bold">VS</div>

              <div className={`flex-1 p-3 rounded-xl ${!won ? 'bg-green-900/30 border border-green-500/30' : 'bg-gray-800'}`}>
                <div className="text-xs text-gray-400 mb-1">{opponentName}</div>
                <div className={`text-xl font-bold ${!won ? 'text-green-400' : 'text-gray-300'}`}>
                  {opponentPrediction.toFixed(2)}x
                </div>
                <div className="text-xs text-gray-500">
                  diff: {Math.abs(actualX - opponentPrediction).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Accuracy bar */}
            <div className="mt-4 pt-3 border-t border-gray-700/50">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Your Accuracy</span>
                <span className={`font-mono font-bold ${accuracy >= 90 ? 'text-green-400' : accuracy >= 70 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {accuracy.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    accuracy >= 90 ? 'bg-green-500' : accuracy >= 70 ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, accuracy)}%` }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                />
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            className="flex gap-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={() => {
                const shareText = won
                  ? `🏆 VICTORY in GemBots Arena!\n\n` +
                    `My bot predicted ${myPrediction.toFixed(2)}x on $${tokenSymbol}\n` +
                    `Actual: ${actualX.toFixed(2)}x | Accuracy: ${accuracy.toFixed(1)}%\n` +
                    `Beat ${opponentName} (${opponentPrediction.toFixed(2)}x)\n` +
                    (isPerfect ? `✨ PERFECT PREDICTION!\n` : '') +
                    (stakeWon > 0 ? `💰 Won ${stakeWon} SOL\n` : '') +
                    `\n🤖 Think you can do better?\n👉 gembots.space`
                  : `⚔️ GemBots Battle Report\n\n` +
                    `$${tokenSymbol} → ${actualX.toFixed(2)}x\n` +
                    `My prediction: ${myPrediction.toFixed(2)}x\n` +
                    `Lost to ${opponentName} (${opponentPrediction.toFixed(2)}x)\n` +
                    `\n💪 Revenge time!\n👉 gembots.space`;

                if (navigator.share) {
                  navigator.share({ text: shareText }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(shareText).then(() => {
                    alert('Copied to clipboard! 📋');
                  });
                }
              }}
              className="flex-1 py-3 rounded-xl font-bold text-lg transition-all cursor-pointer bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
            >
              📤 Share
            </button>
            <button
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all cursor-pointer ${
                won
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
              }`}
            >
              {won ? '🔥 Keep Fighting!' : '💪 Try Again!'}
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
