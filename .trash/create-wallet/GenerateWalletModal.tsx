'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keypair } from '@solana/web3.js';
import Link from 'next/link';
import { X, Copy, Eye, EyeOff } from 'lucide-react';
import bs58 from 'bs58';

interface GenerateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GenerateWalletModal({ isOpen, onClose }: GenerateWalletModalProps) {
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copied, setCopied] = useState<'public' | 'private' | null>(null);

  const generateWallet = () => {
    const newKeypair = Keypair.generate();
    setKeypair(newKeypair);
  };

  const copyToClipboard = async (text: string, type: 'public' | 'private') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    setKeypair(null);
    setHasConfirmed(false);
    setShowPrivateKey(false);
    setCopied(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/80"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full mx-4 p-8 overflow-hidden"
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-emerald-900/20 pointer-events-none" />
          
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <div className="relative z-10">
            {!keypair ? (
              /* Initial state - Generate button */
              <div className="text-center">
                <div className="text-6xl mb-6">🎯</div>
                <h2 className="text-3xl font-bold text-white mb-4 font-orbitron">
                  Generate New Wallet
                </h2>
                <p className="text-gray-300 mb-8">
                  This will create a fresh Solana keypair in your browser. 
                  The private key will be shown only once.
                </p>
                <button
                  onClick={generateWallet}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-400 hover:to-emerald-400 transition-all transform hover:scale-105"
                >
                  🔑 Generate Wallet
                </button>
              </div>
            ) : (
              /* Generated wallet display */
              <div>
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-3xl font-bold text-white mb-2 font-orbitron">
                    Your Bot Wallet Created!
                  </h2>
                </div>

                {/* Public Address */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    📍 Public Address (for deposits):
                  </h3>
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 flex items-center gap-3">
                    <code className="flex-1 text-green-400 text-sm break-all font-mono">
                      {keypair.publicKey.toBase58()}
                    </code>
                    <button
                      onClick={() => copyToClipboard(keypair.publicKey.toBase58(), 'public')}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded transition-colors flex items-center gap-1"
                    >
                      <Copy size={16} />
                      {copied === 'public' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Private Key Warning */}
                <div className="mb-8 bg-red-900/30 border border-red-500/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-300 mb-3 flex items-center gap-2">
                    ⚠️ PRIVATE KEY - SAVE THIS SECURELY!
                  </h3>
                  <div className="bg-gray-800 border border-red-500 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        {showPrivateKey ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                      <span className="text-red-300 text-sm">
                        {showPrivateKey ? 'Hide' : 'Show'} Private Key
                      </span>
                    </div>
                    {showPrivateKey && (
                      <div className="flex items-center gap-3">
                        <code className="flex-1 text-red-400 text-xs break-all font-mono">
                          {bs58.encode(keypair.secretKey)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(bs58.encode(keypair.secretKey), 'private')}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded transition-colors flex items-center gap-1"
                        >
                          <Copy size={16} />
                          {copied === 'private' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-red-200 text-sm">
                    ❗ This is shown ONCE. Save it now! We cannot recover this key.
                  </div>
                </div>

                {/* Confirmation */}
                <div className="mb-8">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasConfirmed}
                      onChange={(e) => setHasConfirmed(e.target.checked)}
                      className="w-5 h-5 text-green-500 bg-gray-800 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="text-white font-semibold">
                      I have safely saved my private key
                    </span>
                  </label>
                </div>

                {/* Continue Button */}
                <div className="text-center">
                  <Link
                    href={`/register-bot?wallet=${keypair.publicKey.toBase58()}`}
                    className={`inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold transition-all ${
                      hasConfirmed
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white transform hover:scale-105'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={hasConfirmed ? handleClose : undefined}
                  >
                    Continue to Registration →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}