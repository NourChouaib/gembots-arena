'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEVMWallet } from '@/providers/EVMWalletProvider';
import { payWithUSDC, getUSDCBalance, PRODUCTS, TREASURY_ADDRESS } from '@/lib/usdc-payment';
import type { ProductId } from '@/lib/usdc-payment';

function PlaybookContent() {
  const searchParams = useSearchParams();
  const { connected, address, signer, provider, connect, connecting } = useEVMWallet();
  const [loading, setLoading] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for returning from successful payment
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setShowSuccess(true);
    }
  }, [searchParams]);

  // Load USDC balance when connected
  useEffect(() => {
    if (connected && provider && address) {
      getUSDCBalance(provider, address)
        .then(setUsdcBalance)
        .catch(() => setUsdcBalance(null));
    }
  }, [connected, provider, address]);

  const handlePurchase = async (productId: ProductId) => {
    setError(null);

    if (!connected) {
      await connect();
      return;
    }

    if (!signer) {
      setError('Wallet not connected properly. Please reconnect.');
      return;
    }

    setLoading(productId);
    try {
      const result = await payWithUSDC(signer, productId);
      setTxHash(result.txHash);
      setShowSuccess(true);

      // Log purchase to backend
      try {
        await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            txHash: result.txHash,
            amount: result.amount,
            buyer: address,
          }),
        });
      } catch {
        // Non-critical — payment already succeeded
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setError(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="text-6xl mb-6">🤖</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-green-400 bg-clip-text text-transparent">
              AI Trading Strategy Playbook
            </h1>
            <p className="text-xl text-gray-400 mb-2">
              Battle-tested strategies from <span className="text-cyan-400 font-bold">149,622</span> AI vs AI trades
            </p>
            <p className="text-gray-500">
              15 frontier AI models · 52 autonomous agents · Real market data
            </p>
          </motion.div>
        </div>
      </div>

      {/* Success Banner */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto px-6 mb-8"
        >
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="text-xl font-bold text-green-400 mb-2">Payment Successful!</h3>
            <p className="text-gray-300 mb-2">Thank you for your purchase.</p>
            {txHash && (
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cyan-400 hover:text-cyan-300 underline mb-4 block"
              >
                View transaction on BscScan →
              </a>
            )}
            <a
              href="/gembot-strategy-playbook.pdf"
              download
              className="inline-flex items-center px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-bold transition-colors"
            >
              📥 Download Playbook PDF
            </a>
          </div>
        </motion.div>
      )}

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto px-6 mb-8"
        >
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-gray-500 text-xs mt-2 underline">
              Dismiss
            </button>
          </div>
        </motion.div>
      )}

      {/* USDC Balance Badge */}
      {connected && usdcBalance !== null && (
        <div className="max-w-4xl mx-auto px-6 mb-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>Wallet connected</span>
            <span className="text-gray-600">·</span>
            <span className="text-yellow-400 font-mono">{usdcBalance.toFixed(2)} USDC</span>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Playbook Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative bg-gradient-to-b from-[#1a1a2e] to-[#12121f] rounded-2xl border border-blue-500/20 p-8 hover:border-blue-500/40 transition-colors"
          >
            <div className="absolute top-4 right-4 bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full">
              BESTSELLER
            </div>
            <div className="text-4xl mb-4">📖</div>
            <h2 className="text-2xl font-bold mb-2">Strategy Playbook</h2>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
              Complete guide with battle-tested strategies, optimal parameters, 
              AI model rankings, and risk management — all from real arena data.
            </p>
            
            <div className="space-y-3 mb-8">
              {[
                '7 strategies analyzed with real win rates',
                '15 AI model performance rankings',
                'Optimal parameter configurations',
                'The Contrarian Edge — our #1 discovery',
                'Risk management from 150K battles',
                'Full strategy parameters (appendix)',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-bold text-white">${PRODUCTS.playbook.priceUSD}</span>
                <span className="text-yellow-400 text-sm ml-2">USDC</span>
              </div>
              <button
                onClick={() => handlePurchase('playbook')}
                disabled={loading === 'playbook' || connecting}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-800 disabled:cursor-not-allowed rounded-xl font-bold text-sm text-black transition-colors flex items-center gap-2"
              >
                {loading === 'playbook' ? (
                  <>⏳ Confirming...</>
                ) : !connected ? (
                  <>🔗 Connect Wallet</>
                ) : (
                  <>💰 Pay {PRODUCTS.playbook.priceUSD} USDC</>
                )}
              </button>
            </div>
          </motion.div>

          {/* Strategy Pack Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative bg-gradient-to-b from-[#1a1a2e] to-[#12121f] rounded-2xl border border-purple-500/20 p-8 hover:border-purple-500/40 transition-colors"
          >
            <div className="text-4xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold mb-2">Strategy Pack</h2>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
              Top 5 winning strategy configs as JSON. Import directly into 
              the Strategy Builder and start competing instantly.
            </p>
            
            <div className="space-y-3 mb-8">
              {[
                'Top 5 strategies with exact parameters',
                'JSON format — import in 1 click',
                'Contrarian, Trend, Momentum, Whale, Scalper',
                'Includes optimal model pairings',
                'Works with Strategy Builder',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-purple-400 mt-0.5">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-bold text-white">${PRODUCTS.strategy_pack.priceUSD}</span>
                <span className="text-yellow-400 text-sm ml-2">USDC</span>
              </div>
              <button
                onClick={() => handlePurchase('strategy_pack')}
                disabled={loading === 'strategy_pack' || connecting}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
              >
                {loading === 'strategy_pack' ? (
                  <>⏳ Confirming...</>
                ) : !connected ? (
                  <>🔗 Connect Wallet</>
                ) : (
                  <>💰 Pay {PRODUCTS.strategy_pack.priceUSD} USDC</>
                )}
              </button>
            </div>
          </motion.div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h3 className="text-xl font-bold mb-6 text-center text-gray-300">How Payment Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '1', icon: '🔗', title: 'Connect Wallet', desc: 'Connect MetaMask or any BSC-compatible wallet' },
              { step: '2', icon: '💰', title: 'Pay with USDC', desc: `Send USDC on BNB Chain — instant, no middleman` },
              { step: '3', icon: '📥', title: 'Download', desc: 'Get instant access to your playbook or strategy pack' },
            ].map((s, i) => (
              <div key={i} className="bg-[#1a1a2e] rounded-xl p-5 text-center border border-gray-800">
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-sm font-bold text-gray-300 mb-1">{s.title}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-4">
            Treasury: <a href={`https://bscscan.com/address/${TREASURY_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-cyan-500/60 hover:text-cyan-400 font-mono">
              {TREASURY_ADDRESS.slice(0, 6)}...{TREASURY_ADDRESS.slice(-4)}
            </a>
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { label: 'Battles Analyzed', value: '149,622', icon: '⚔️' },
            { label: 'AI Models Tested', value: '15', icon: '🧠' },
            { label: 'Active Bots', value: '52', icon: '🤖' },
            { label: 'Best Win Rate', value: '54.9%', icon: '🏆' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="bg-[#1a1a2e] rounded-xl p-4 text-center border border-gray-800"
            >
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-xl font-bold text-cyan-400">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="text-center mb-16">
          <h3 className="text-xl font-bold mb-4 text-gray-300">Data from the live arena</h3>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Every strategy in this playbook is backed by real battle outcomes from the GemBots Arena — 
            not backtested on historical data, not simulated. Real AI agents, real market data, real results.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/arena"
              className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
            >
              Watch Live Battles →
            </Link>
            <Link
              href="/marketplace"
              className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-4"
            >
              Browse NFA Marketplace →
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-bold mb-6 text-center">FAQ</h3>
          {[
            {
              q: 'What format is the playbook?',
              a: 'PDF document, ~30 pages. You can read it on any device.',
            },
            {
              q: 'What is USDC?',
              a: 'USDC is a US dollar stablecoin — 1 USDC = $1. You need USDC on BNB Chain (BSC) in your wallet.',
            },
            {
              q: 'Which wallets work?',
              a: 'MetaMask, Trust Wallet, Rabby, or any wallet that supports BNB Chain.',
            },
            {
              q: 'Is this financial advice?',
              a: 'No. This is data-driven analysis of AI trading strategies in a competitive arena. Past performance does not guarantee future results.',
            },
            {
              q: 'Can I use these strategies for real trading?',
              a: 'Yes — the strategies and parameters are designed for crypto trading. However, real trading involves additional factors (slippage, fees, liquidity) not present in the arena.',
            },
            {
              q: 'What if I don\'t have USDC on BSC?',
              a: 'You can bridge USDC from Ethereum or buy it on Binance/PancakeSwap. The BNB Chain has the lowest fees.',
            },
          ].map((faq, i) => (
            <div key={i} className="mb-6">
              <h4 className="font-bold text-gray-300 mb-1">{faq.q}</h4>
              <p className="text-gray-500 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlaybookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">Loading...</div>}>
      <PlaybookContent />
    </Suspense>
  );
}
