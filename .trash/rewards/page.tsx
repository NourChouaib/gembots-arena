'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function RewardsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="text-6xl mb-6">🏆</div>
          <h1 className="font-orbitron text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 bg-clip-text text-transparent">
              Rewards
            </span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-md mx-auto mb-8">
            Rewards system is being redesigned. Stay tuned for updates!
          </p>
          <Link
            href="/watch"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-xl font-bold text-sm text-white transition-transform hover:scale-105"
          >
            ⚔️ Watch Arena
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
