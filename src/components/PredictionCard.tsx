'use client';

import { motion } from 'framer-motion';
import { Prediction } from '../types';
import { formatNumber, formatXMultiplier, timeAgo } from '../lib/utils';
import { COLORS } from '../lib/constants';
import WinAnimation from './WinAnimation';

interface PredictionCardProps {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: PredictionCardProps) {
  const isResolved = prediction.status === 'resolved';
  const isPending = prediction.status === 'pending';
  const isExpired = prediction.status === 'expired';
  const isWin = isResolved && prediction.xMultiplier && prediction.xMultiplier >= 2;
  
  const getStatusColor = () => {
    if (isWin) return 'text-green-400';
    if (isResolved) return 'text-red-400';
    if (isPending) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getStatusText = () => {
    if (isWin) return '🎉 HIT!';
    if (isResolved) return '💸 Miss';
    if (isPending) return '⏳ Tracking...';
    return '❌ Expired';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-lg p-4 hover:border-cyan-400/30 transition-all backdrop-blur-sm ${
        isWin 
          ? 'bg-green-500/20 border-2 border-green-400 shadow-lg shadow-green-400/25 animate-pulse' 
          : 'bg-gray-900/50 border border-gray-800'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-white">
            {prediction.tokenSymbol || prediction.tokenMint.slice(0, 8)}...
          </h4>
          <p className="text-sm text-gray-400">
            by {prediction.bot?.name || 'Unknown Bot'}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </p>
          <p className="text-xs text-gray-500">
            {timeAgo(prediction.predictedAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-400">Price</p>
          <p className="text-sm font-semibold text-white">
            ${formatNumber(prediction.priceAtPrediction, 6)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Confidence</p>
          <p className="text-sm font-semibold text-cyan-400">
            {prediction.confidence}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">
            {isResolved ? 'Result' : 'Max 24h'}
          </p>
          {prediction.xMultiplier ? (
            <p className={`text-sm font-bold ${
              prediction.xMultiplier >= 2 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatXMultiplier(prediction.xMultiplier)}
            </p>
          ) : (
            <p className="text-sm text-gray-400">-</p>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2">
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: `${prediction.confidence}%`,
            background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`
          }}
        />
      </div>

      {isPending && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-pulse text-yellow-400 text-xs">
            ⏱️ Tracking for {Math.round((24 * 60 * 60 * 1000 - (Date.now() - new Date(prediction.predictedAt).getTime())) / (60 * 60 * 1000))} hours remaining
          </div>
        </div>
      )}

      {/* Win indicator */}
      {isWin && (
        <div className="mt-2 text-center">
          <p className="text-green-300 font-bold text-sm">
            {prediction.xMultiplier! >= 100 ? '🚀 LEGENDARY WIN!' : 
             prediction.xMultiplier! >= 50 ? '🔥 EPIC WIN!' : 
             prediction.xMultiplier! >= 10 ? '✨ BIG WIN!' : '✅ WIN!'}
          </p>
        </div>
      )}

      {/* Win Animation */}
      {isWin && <WinAnimation isWin={true} multiplier={prediction.xMultiplier} />}
    </motion.div>
  );
}