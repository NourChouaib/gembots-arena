'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import WalletButton from '../../components/WalletButton';

export default function WalletsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 grid-bg">
      {/* Nav is now in layout.tsx */}

      {/* Main Content */}
      <section className="relative z-10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 font-orbitron">
              <span className="text-white">💰 </span>
              <span className="bg-gradient-to-r from-purple-500 via-cyan-400 to-green-400 bg-clip-text text-transparent">
                Bot Wallets
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Manage your bot wallets and monitor trading performance
            </p>

            <Link
              href="/create-wallet"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-400 hover:to-emerald-400 transition-all transform hover:scale-105"
            >
              <span className="text-xl">➕</span>
              Create New Bot Wallet
            </Link>
          </motion.div>

          {/* Coming Soon Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-2xl p-12 text-center"
          >
            <div className="text-6xl mb-6">🚧</div>
            <h2 className="text-3xl font-bold text-white mb-4 font-orbitron">
              Wallet Dashboard Coming Soon!
            </h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto text-lg">
              We're building an amazing dashboard where you'll be able to:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {[
                {
                  emoji: "📊",
                  title: "Portfolio Overview",
                  description: "Track all your bot wallets in one place"
                },
                {
                  emoji: "📈",
                  title: "Performance Analytics",
                  description: "Detailed P&L reports and trading history"
                },
                {
                  emoji: "💰",
                  title: "Balance Management",
                  description: "Deposit, withdraw, and transfer funds easily"
                },
                {
                  emoji: "⚙️",
                  title: "Bot Settings",
                  description: "Configure trading parameters and webhooks"
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-left"
                >
                  <div className="text-3xl mb-3">{feature.emoji}</div>
                  <h3 className="text-lg font-semibold text-white mb-2 font-orbitron">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/create-wallet"
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-purple-400 hover:to-cyan-400 transition-all"
              >
                Create Your First Bot →
              </Link>
              <Link
                href="/api-docs"
                className="px-6 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:border-gray-500 hover:text-white transition-all"
              >
                API Documentation
              </Link>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-16"
          >
            <h3 className="text-2xl font-bold text-white mb-8 text-center font-orbitron">
              Platform Stats
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center bg-gray-800/30 border border-gray-700 rounded-lg p-6 card-hover">
                <h3 className="text-3xl font-bold text-[#14F195] mb-2 animate-neon-text font-orbitron">47</h3>
                <p className="text-gray-400">Active Bot Wallets</p>
              </div>
              <div className="text-center bg-gray-800/30 border border-gray-700 rounded-lg p-6 card-hover">
                <h3 className="text-3xl font-bold text-[#9945FF] mb-2 animate-neon-text font-orbitron">$2.4M</h3>
                <p className="text-gray-400">Total Volume Traded</p>
              </div>
              <div className="text-center bg-gray-800/30 border border-gray-700 rounded-lg p-6 card-hover">
                <h3 className="text-3xl font-bold text-yellow-400 mb-2 animate-neon-text font-orbitron">247.3%</h3>
                <p className="text-gray-400">Top Bot ROI</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}