'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { Keypair } from '@solana/web3.js';
import { useWallet } from '../../hooks/useWallet';
import WalletButton from '../../components/WalletButton';
import GenerateWalletModal from './GenerateWalletModal';
import ImportWalletModal from './ImportWalletModal';

export default function CreateWalletPage() {
  const { connected, publicKey, connect } = useWallet();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleGenerateNew = () => {
    setShowGenerateModal(true);
  };

  const handleConnectExisting = () => {
    if (!connected) {
      connect();
    }
  };

  const handleImportPublicKey = () => {
    setShowImportModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 grid-bg">
      {/* Nav is now in layout.tsx */}

      {/* Main Content */}
      <section className="relative z-10 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 font-orbitron">
              <span className="text-white">🔑 </span>
              <span className="bg-gradient-to-r from-purple-500 via-cyan-400 to-green-400 bg-clip-text text-transparent">
                Create Bot Wallet
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Choose how to set up your bot's wallet:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {/* Generate New Wallet */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={handleGenerateNew}
                className="cursor-pointer bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-8 hover:border-green-400/50 transition-all card-hover group"
              >
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  🆕
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4 font-orbitron">
                  Generate New Wallet
                </h3>
                <p className="text-gray-300 mb-4">
                  Create a fresh Solana keypair
                </p>
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                  <p className="text-green-400 font-semibold text-sm">
                    Most secure - keys generated locally
                  </p>
                </div>
              </motion.div>

              {/* Connect Existing Wallet */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleConnectExisting}
                className="cursor-pointer bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-8 hover:border-purple-400/50 transition-all card-hover group"
              >
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  🔗
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4 font-orbitron">
                  Connect Existing Wallet
                </h3>
                <p className="text-gray-300 mb-4">
                  Use Phantom or Solflare
                </p>
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
                  <p className="text-purple-400 font-semibold text-sm">
                    For experienced crypto users
                  </p>
                </div>
              </motion.div>

              {/* Import Public Key */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={handleImportPublicKey}
                className="cursor-pointer bg-gradient-to-br from-cyan-900/30 to-teal-900/30 border border-cyan-500/30 rounded-xl p-8 hover:border-cyan-400/50 transition-all card-hover group"
              >
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  📥
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4 font-orbitron">
                  Import Public Key
                </h3>
                <p className="text-gray-300 mb-4">
                  Already have a wallet? Paste address
                </p>
                <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-3">
                  <p className="text-cyan-400 font-semibold text-sm">
                    You manage keys separately
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Connected Wallet Status */}
            {connected && publicKey && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500/50 rounded-xl p-6 mb-8"
              >
                <div className="flex items-center justify-center gap-4 mb-4">
                  <span className="text-4xl">✅</span>
                  <div>
                    <h3 className="text-xl font-semibold text-green-400">Wallet Connected!</h3>
                    <p className="text-gray-300">
                      {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/register-bot?wallet=${publicKey.toString()}`}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-400 hover:to-emerald-400 transition-all transform hover:scale-105"
                >
                  Continue to Registration →
                </Link>
              </motion.div>
            )}

            {/* Info Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-left"
            >
              <h3 className="text-xl font-semibold text-white mb-4 font-orbitron flex items-center gap-2">
                <span>ℹ️</span> How it works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <p className="mb-2">
                    <span className="text-green-400 font-semibold">🆕 Generate New:</span> 
                    We create a keypair in your browser. You save the private key securely.
                  </p>
                  <p className="mb-2">
                    <span className="text-purple-400 font-semibold">🔗 Connect Existing:</span> 
                    Use your current wallet (Phantom, Solflare, etc.) for bot trading.
                  </p>
                </div>
                <div>
                  <p className="mb-2">
                    <span className="text-cyan-400 font-semibold">📥 Import Public Key:</span> 
                    Just provide the wallet address. You manage private keys elsewhere.
                  </p>
                  <p className="text-yellow-400 font-semibold">
                    🔐 Your keys, your coins. We never see private keys.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Modals */}
      <GenerateWalletModal 
        isOpen={showGenerateModal} 
        onClose={() => setShowGenerateModal(false)} 
      />
      <ImportWalletModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
      />
    </div>
  );
}