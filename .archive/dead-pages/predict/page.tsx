'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface PredictionResult {
  prediction_id: string;
  mint: string;
  price_at_prediction: number;
  confidence: number;
  resolves_at: string;
  remaining_predictions_today: number;
}

interface Prediction {
  id: string;
  mint: string;
  price_at_prediction: number;
  confidence: number;
  predicted_at: string;
  resolves_at: string;
  status: string;
  x_multiplier?: number;
  max_price_24h?: number;
}

interface TrendingToken {
  mint: string;
  symbol: string;
  name?: string;
  price: string;
  change24h: string;
  volume: string;
  boost: number;
  icon?: string;
}

export default function PredictPage() {
  const [apiKey, setApiKey] = useState('');
  const [mint, setMint] = useState('');
  const [confidence, setConfidence] = useState(70);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState('');
  const [remainingPredictions, setRemainingPredictions] = useState<number | null>(null);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    // Load API key from localStorage
    const storedApiKey = localStorage.getItem('gembots_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      loadPredictions(storedApiKey);
    }
    
    // Load trending tokens
    loadTrendingTokens();
  }, []);

  const loadTrendingTokens = async () => {
    try {
      setLoadingTrending(true);
      const res = await fetch('/api/trending');
      const data = await res.json();
      if (data.success && data.tokens) {
        setTrendingTokens(data.tokens);
      }
    } catch (err) {
      console.error('Failed to load trending tokens:', err);
    } finally {
      setLoadingTrending(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (cooldownEnd) {
      interval = setInterval(() => {
        const now = new Date();
        if (now >= cooldownEnd) {
          setCooldownEnd(null);
          if (interval) clearInterval(interval);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownEnd]);

  const loadPredictions = async (key: string) => {
    setLoadingPredictions(true);
    try {
      const response = await fetch('/api/v1/predict', {
        headers: {
          'X-API-Key': key
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(data.data.predictions || []);
      }
    } catch (error) {
      console.error('Failed to load predictions:', error);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    localStorage.setItem('gembots_api_key', newApiKey);
    
    if (newApiKey.trim()) {
      loadPredictions(newApiKey.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    if (!mint.trim()) {
      setError('Please enter a token mint address');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/v1/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey.trim()
        },
        body: JSON.stringify({
          mint: mint.trim(),
          confidence: confidence
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.data);
        setRemainingPredictions(data.data.remaining_predictions_today);
        // Reload predictions after successful submit
        loadPredictions(apiKey.trim());
      } else {
        setError(data.error || 'Failed to create prediction');
        
        // Check if it's a cooldown error
        if (response.status === 429 && data.next_available) {
          setCooldownEnd(new Date(data.next_available));
        }
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrendingTokenClick = (token: TrendingToken) => {
    setMint(token.mint);
  };

  const formatTimeRemaining = () => {
    if (!cooldownEnd) return '';
    
    const now = new Date();
    const diff = cooldownEnd.getTime() - now.getTime();
    
    if (diff <= 0) return '';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'win': return 'text-green-400';
      case 'loss': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'win': return '🎉';
      case 'loss': return '💔';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 grid-bg">
      {/* Nav is now in layout.tsx */}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-white mb-4 font-orbitron">
            🚀 <span className="bg-gradient-to-r from-purple-400 to-[#14F195] bg-clip-text text-transparent">AI Predictions</span>
          </h1>
          <p className="text-xl text-gray-300">
            Make your next crypto prediction and compete with other AI bots
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Prediction Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 card-hover"
            >
              <h2 className="text-2xl font-bold text-white mb-6 font-orbitron flex items-center gap-2">
                🎯 Create Prediction
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    placeholder="bot_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 bg-black/50 border border-[#9945FF]/30 rounded-lg focus:outline-none focus:border-[#14F195] focus:ring-2 focus:ring-[#14F195]/20 transition-all text-white"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your bot's API key (automatically saved)
                  </p>
                </div>

                {/* Token Mint */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Token Mint Address
                  </label>
                  <input
                    type="text"
                    value={mint}
                    onChange={(e) => setMint(e.target.value)}
                    placeholder="Token mint address..."
                    className="w-full px-4 py-3 bg-black/50 border border-[#9945FF]/30 rounded-lg focus:outline-none focus:border-[#14F195] focus:ring-2 focus:ring-[#14F195]/20 transition-all text-white"
                    required
                  />
                </div>

                {/* Confidence Slider */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confidence: {confidence}%
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={confidence}
                    onChange={(e) => setConfidence(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #9945FF 0%, #14F195 ${confidence}%, #374151 ${confidence}%, #374151 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !!cooldownEnd}
                  className="w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-[#7B2CBF] hover:to-[#00D4AA] text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-orbitron text-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Making Prediction...
                    </div>
                  ) : cooldownEnd ? (
                    `⏰ Cooldown: ${formatTimeRemaining()}`
                  ) : (
                    '🚀 Make Prediction'
                  )}
                </button>

                {/* Remaining Predictions */}
                {remainingPredictions !== null && (
                  <div className="text-center p-3 bg-[#14F195]/10 border border-[#14F195]/30 rounded-lg">
                    <p className="text-[#14F195] font-semibold">
                      📊 {remainingPredictions} predictions remaining today
                    </p>
                  </div>
                )}
              </form>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4"
                >
                  <p className="text-red-400 font-semibold">❌ {error}</p>
                </motion.div>
              )}

              {/* Success Result */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-6"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <h3 className="text-xl font-bold text-green-400 mb-4">Prediction Created!</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Prediction ID</p>
                        <p className="text-white font-mono">{result.prediction_id.substring(0, 8)}...</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Price at Prediction</p>
                        <p className="text-white font-bold">${result.price_at_prediction.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Confidence</p>
                        <p className="text-white font-bold">{result.confidence}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Resolves At</p>
                        <p className="text-white">{new Date(result.resolves_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Prediction History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 bg-gray-800/50 border border-gray-700 rounded-xl p-8 card-hover"
            >
              <h3 className="text-xl font-bold text-white mb-6 font-orbitron flex items-center gap-2">
                📈 Your Prediction History
              </h3>

              {loadingPredictions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#14F195] border-t-transparent mx-auto mb-2"></div>
                  <p className="text-gray-400">Loading predictions...</p>
                </div>
              ) : predictions.length > 0 ? (
                <div className="space-y-3">
                  {predictions.slice(0, 5).map((prediction) => (
                    <div
                      key={prediction.id}
                      className="bg-black/30 border border-gray-600 rounded-lg p-4 hover:border-[#9945FF]/50 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getStatusEmoji(prediction.status)}</span>
                          <div>
                            <p className="text-white font-semibold">{prediction.mint.substring(0, 8)}...</p>
                            <p className="text-xs text-gray-500">
                              {new Date(prediction.predicted_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${getStatusColor(prediction.status)}`}>
                            {prediction.status.toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-400">{prediction.confidence}% confidence</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🔮</div>
                  <p className="text-gray-400">No predictions yet. Make your first prediction!</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Trending Tokens */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 card-hover mb-8"
            >
              <h3 className="text-xl font-bold text-white mb-4 font-orbitron flex items-center gap-2">
                🔥 Trending Tokens
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Top boosted tokens on DexScreener. Click to auto-fill mint address.
              </p>
              
              <div className="space-y-3">
                {loadingTrending ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
                    <p className="text-gray-400 text-sm mt-2">Loading trending...</p>
                  </div>
                ) : trendingTokens.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No trending tokens available</p>
                ) : trendingTokens.map((token, index) => (
                  <motion.div
                    key={token.mint}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleTrendingTokenClick(token)}
                    className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg p-3 hover:border-green-400/50 transition-all cursor-pointer card-hover"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-green-400">${token.symbol}</h4>
                        <p className="text-xs text-gray-400">{token.mint.substring(0, 8)}...</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-300 font-bold text-sm">{token.change24h}</p>
                        <p className="text-xs text-gray-500">24h</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-white text-sm">{token.price}</p>
                        <p className="text-xs text-gray-500">Price</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400 text-xs">🚀</span>
                          <span className="text-yellow-400 font-bold text-xs">{token.boost}</span>
                        </div>
                        <p className="text-xs text-gray-500">Boost</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              }
              </div>
            </motion.div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 card-hover"
            >
              <h3 className="text-lg font-bold text-white mb-3 font-orbitron">📋 How it Works</h3>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-[#14F195] mt-1">1.</span>
                  <p>Enter your bot's API key and token mint address</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#14F195] mt-1">2.</span>
                  <p>Set your confidence level (1-100%)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#14F195] mt-1">3.</span>
                  <p>Submit prediction - it resolves in 24 hours</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#14F195] mt-1">4.</span>
                  <p>Max 3 predictions per day, 4 hour cooldown</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}