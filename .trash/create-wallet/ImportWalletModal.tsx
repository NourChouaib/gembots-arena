'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { X, AlertTriangle } from 'lucide-react';

interface ImportWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportWalletModal({ isOpen, onClose }: ImportWalletModalProps) {
  const [publicKeyInput, setPublicKeyInput] = useState('');
  const [validatedPublicKey, setValidatedPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validatePublicKey = (input: string) => {
    setError(null);
    setValidatedPublicKey(null);
    
    if (!input.trim()) {
      return;
    }

    try {
      // Try to create a PublicKey object
      const pubkey = new PublicKey(input.trim());
      
      // Additional validation
      const base58 = pubkey.toBase58();
      if (base58.length < 32 || base58.length > 44) {
        throw new Error('Invalid address length');
      }
      
      setValidatedPublicKey(base58);
    } catch (err) {
      setError('Invalid Solana address. Please check the format.');
    }
  };

  const handleInputChange = (value: string) => {
    setPublicKeyInput(value);
    setIsValidating(true);
    
    // Debounce validation
    setTimeout(() => {
      validatePublicKey(value);
      setIsValidating(false);
    }, 300);
  };

  const handleClose = () => {
    setPublicKeyInput('');
    setValidatedPublicKey(null);
    setError(null);
    setIsValidating(false);
    onClose();
  };

  const handleContinue = () => {
    if (validatedPublicKey) {
      handleClose();
    }
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
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-teal-900/20 pointer-events-none" />
          
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📥</div>
              <h2 className="text-3xl font-bold text-white mb-2 font-orbitron">
                Import Existing Wallet
              </h2>
              <p className="text-gray-300">
                Enter your bot's Solana wallet address below
              </p>
            </div>

            {/* Input Section */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-white mb-4">
                Paste your bot's public key (address):
              </label>
              
              <div className="relative">
                <textarea
                  value={publicKeyInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Enter Solana wallet address (e.g., 7xKp3...abc123)"
                  className="w-full h-24 p-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                />
                
                {/* Loading indicator */}
                {isValidating && (
                  <div className="absolute top-4 right-4">
                    <div className="animate-spin w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full" />
                  </div>
                )}
              </div>

              {/* Validation Status */}
              <div className="mt-4 min-h-[2rem]">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 bg-red-900/30 border border-red-500/50 rounded-lg p-3"
                  >
                    <AlertTriangle size={16} />
                    <span className="text-sm">{error}</span>
                  </motion.div>
                )}
                
                {validatedPublicKey && !error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-900/30 border border-green-500/50 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-400">✅</span>
                      <span className="text-green-300 font-semibold">Valid Solana Address</span>
                    </div>
                    <div className="bg-gray-800 rounded p-2">
                      <code className="text-cyan-400 text-sm break-all font-mono">
                        {validatedPublicKey}
                      </code>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="mb-8 bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400">ℹ️</span>
                <span className="text-yellow-300 font-semibold">Important Note</span>
              </div>
              <p className="text-yellow-200 text-sm">
                You will need to manage the private key separately. This platform will only use the public address 
                to prepare transactions for your bot. You maintain full control over signing and funds.
              </p>
            </div>

            {/* Continue Button */}
            <div className="text-center">
              {validatedPublicKey ? (
                <Link
                  href={`/register-bot?wallet=${validatedPublicKey}`}
                  onClick={handleContinue}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
                >
                  Validate & Continue →
                </Link>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gray-600 text-gray-400 font-semibold rounded-lg cursor-not-allowed"
                >
                  Validate & Continue →
                </button>
              )}
            </div>

            {/* Format Examples */}
            <div className="mt-8 bg-gray-800/50 border border-gray-600 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2">Valid address formats:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Base58 encoded (32-44 characters)</li>
                <li>• Example: <code className="text-cyan-400">7xKpFfrt3zH1Ld8RzWrkCgKCHFJF8a9FdkJCRmCCJB5b</code></li>
                <li>• No spaces or special characters</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}