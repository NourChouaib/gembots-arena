'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEVMWallet } from '../../providers/EVMWalletProvider';
import { Copy, Check, AlertTriangle } from 'lucide-react';

/**
 * Validate EVM address (0x followed by 40 hex chars)
 */
function isValidEVMAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function RegisterBotContent() {
  const searchParams = useSearchParams();
  const walletParam = searchParams.get('wallet');
  const { connected, address, connect } = useEVMWallet();
  
  // Use connected wallet address if no param, or param if provided
  const walletAddress = walletParam || address;
  
  const [botName, setBotName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedApiKey, setCopiedApiKey] = useState(false);

  const isValidWallet = walletAddress ? isValidEVMAddress(walletAddress) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/bots/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: walletAddress,
          name: botName,
          webhookUrl: webhookUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setApiKey(data.api_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyApiKey = async () => {
    if (apiKey) {
      try {
        await navigator.clipboard.writeText(apiKey);
        setCopiedApiKey(true);
        setTimeout(() => setCopiedApiKey(false), 2000);
      } catch (err) {
        console.error('Failed to copy API key:', err);
      }
    }
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 grid-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-8">Connect MetaMask to register your bot on BNB Chain.</p>
          <button
            onClick={() => connect()}
            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all"
          >
            Connect MetaMask →
          </button>
        </div>
      </div>
    );
  }

  if (!isValidWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 grid-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold text-white mb-4">Invalid Wallet</h1>
          <p className="text-gray-400 mb-8">The provided wallet address is not a valid EVM address (0x...).</p>
          <button
            onClick={() => connect()}
            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all"
          >
            Connect MetaMask →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 grid-bg">
      {/* Main Content */}
      <section className="relative z-10 py-20">
        <div className="max-w-2xl mx-auto px-4">
          {!apiKey ? (
            /* Registration Form */
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🤖</div>
                <h1 className="text-4xl font-bold text-white mb-4 font-orbitron">
                  <span className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 bg-clip-text text-transparent">
                    Register Your Bot
                  </span>
                </h1>
                <p className="text-gray-300">
                  Complete your bot setup and get your API key
                </p>
              </div>

              {/* Wallet Info */}
              <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/30 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-yellow-300 mb-2">✅ Wallet Connected (BNB Chain)</h3>
                <code className="text-yellow-400 text-sm break-all font-mono">
                  {walletAddress}
                </code>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Bot Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="e.g., AlphaTrader, GemHunter"
                    required
                    className="w-full p-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">
                    Webhook URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    className="w-full p-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                  />
                  <p className="text-gray-400 text-sm mt-2">
                    Receive real-time notifications about trades and events
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 bg-red-900/30 border border-red-500/50 rounded-lg p-4"
                  >
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={!botName.trim() || isSubmitting}
                  className={`w-full py-4 rounded-lg font-semibold transition-all ${
                    botName.trim() && !isSubmitting
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black transform hover:scale-[1.02]'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Registering Bot...
                    </span>
                  ) : (
                    'Register Bot & Get API Key'
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            /* Success - Show API Key */
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-4xl font-bold text-white mb-4 font-orbitron">
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  Bot Registered Successfully!
                </span>
              </h1>

              <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-8 mb-8">
                <h3 className="text-xl font-semibold text-green-300 mb-4">
                  🔑 Your API Key
                </h3>
                <div className="bg-gray-800 border border-green-500 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <code className="flex-1 text-green-400 text-sm break-all font-mono">
                      {apiKey}
                    </code>
                    <button
                      onClick={copyApiKey}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded transition-colors flex items-center gap-1"
                    >
                      {copiedApiKey ? <Check size={16} /> : <Copy size={16} />}
                      {copiedApiKey ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="text-green-200 text-sm">
                  ⚠️ Save this API key securely. You cannot retrieve it again.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">📚 Next Steps</h3>
                  <ul className="text-gray-300 text-sm space-y-2 text-left">
                    <li>• Use your API key to authenticate</li>
                    <li>• Fund your wallet with BNB</li>
                    <li>• Start making trading calls</li>
                    <li>• Monitor your bot&apos;s performance</li>
                  </ul>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">🔗 Useful Links</h3>
                  <div className="space-y-2">
                    <Link href="/docs" className="block text-yellow-400 hover:text-yellow-300 text-sm">
                      → API Documentation
                    </Link>
                    <Link href="/leaderboard" className="block text-yellow-400 hover:text-yellow-300 text-sm">
                      → Bot Leaderboard
                    </Link>
                    <Link href="/watch" className="block text-yellow-400 hover:text-yellow-300 text-sm">
                      → Watch Arena
                    </Link>
                  </div>
                </div>
              </div>

              <Link
                href="/watch"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all transform hover:scale-105"
              >
                Watch Arena →
              </Link>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function RegisterBotPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 grid-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white">Loading...</p>
      </div>
    </div>}>
      <RegisterBotContent />
    </Suspense>
  );
}
