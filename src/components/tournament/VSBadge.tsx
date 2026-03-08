'use client';

import { motion } from 'framer-motion';

export function VSBadge() {
  return (
    <div className="relative">
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-[-20px] md:inset-[-30px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)',
        }}
        animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Energy rings */}
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-[-8px] md:inset-[-12px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(255,215,0,0.3)' }}
          animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
          transition={{ duration: 2, delay: i * 1, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="font-orbitron text-3xl md:text-5xl font-black relative z-10"
        animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'linear-gradient(135deg, #FFD700, #FF6B00, #FFD700)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,107,0,0.4), 0 0 90px rgba(255,215,0,0.2)',
          filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.6))',
        }}
      >
        VS
      </motion.div>
    </div>
  );
}
