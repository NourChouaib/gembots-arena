'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Arena Background with particles and metallic floor ──

export function ArenaBackground() {
  const particles = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 4 + 3,
    delay: Math.random() * 3,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0014] via-[#0d0025] to-[#050010]" />

      {/* Radial arena glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(153,69,255,0.15)_0%,transparent_60%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-[radial-gradient(ellipse_at_bottom,rgba(20,241,149,0.08)_0%,transparent_70%)]" />

      {/* Metallic floor with reflection */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[45%]"
        style={{
          background: `
            linear-gradient(to top, rgba(153,69,255,0.15) 0%, rgba(20,241,149,0.05) 30%, transparent 100%),
            repeating-linear-gradient(90deg, rgba(153,69,255,0.08) 0px, transparent 1px, transparent 50px),
            repeating-linear-gradient(0deg, rgba(153,69,255,0.08) 0px, transparent 1px, transparent 50px)
          `,
          transform: 'perspective(400px) rotateX(50deg)',
          transformOrigin: 'bottom center',
        }}
      />
      {/* Floor reflection shimmer */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[20%]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(153,69,255,0.06) 30%, rgba(20,241,149,0.06) 70%, transparent 100%)',
          transform: 'perspective(400px) rotateX(50deg)',
          transformOrigin: 'bottom center',
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.id % 3 === 0 ? '#9945FF' : p.id % 3 === 1 ? '#14F195' : '#00F0FF',
            opacity: 0.4,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Neon border frame — left */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{
        background: 'linear-gradient(to bottom, transparent 5%, #9945FF 20%, #9945FF 80%, transparent 95%)',
        boxShadow: '0 0 12px rgba(153,69,255,0.5), 0 0 24px rgba(153,69,255,0.2)',
        opacity: 0.5,
      }} />
      {/* Neon border frame — right */}
      <div className="absolute right-0 top-0 bottom-0 w-[3px]" style={{
        background: 'linear-gradient(to bottom, transparent 5%, #14F195 20%, #14F195 80%, transparent 95%)',
        boxShadow: '0 0 12px rgba(20,241,149,0.5), 0 0 24px rgba(20,241,149,0.2)',
        opacity: 0.5,
      }} />
      {/* Neon border frame — top */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{
        background: 'linear-gradient(to right, #9945FF 0%, rgba(255,215,0,0.4) 50%, #14F195 100%)',
        boxShadow: '0 0 12px rgba(255,215,0,0.3)',
        opacity: 0.4,
      }} />
      {/* Neon border frame — bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{
        background: 'linear-gradient(to right, #9945FF 0%, rgba(255,215,0,0.4) 50%, #14F195 100%)',
        boxShadow: '0 0 12px rgba(255,215,0,0.3)',
        opacity: 0.3,
      }} />

      {/* Corner glow accents */}
      <div className="absolute top-0 left-0 w-16 h-16 bg-[radial-gradient(circle_at_top_left,rgba(153,69,255,0.3)_0%,transparent_70%)]" />
      <div className="absolute top-0 right-0 w-16 h-16 bg-[radial-gradient(circle_at_top_right,rgba(20,241,149,0.3)_0%,transparent_70%)]" />
    </div>
  );
}

// ── Spark Particles (for hurt/critical) ──

export function SparkParticles({ color, intensity }: { color: string; intensity: 'low' | 'high' }) {
  const count = intensity === 'high' ? 8 : 4;
  const sparks = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 30 + Math.random() * 60,
    y: 40 + Math.random() * 80,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 2,
    dur: 0.6 + Math.random() * 0.8,
  })), [count]);

  return (
    <>
      {sparks.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            background: color,
            boxShadow: `0 0 4px ${color}`,
          }}
          animate={{
            y: [0, -(15 + Math.random() * 25)],
            x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 30],
            opacity: [1, 0],
            scale: [1, 0.3],
          }}
          transition={{
            duration: s.dur,
            delay: s.delay,
            repeat: Infinity,
            repeatDelay: Math.random() * 1.5,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
}

// ── Winner Aura (energy waves) ──

export function WinnerAura({ color, glowColor }: { color: string; glowColor: string }) {
  return (
    <>
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-[-20px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        }}
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Energy waves */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-[-10px] rounded-full pointer-events-none"
          style={{
            border: `1px solid ${color}`,
            opacity: 0,
          }}
          animate={{
            scale: [1, 1.8],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 2,
            delay: i * 0.7,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
}

// ── Smoke Effect (critical state) ──

export function SmokeEffect() {
  const puffs = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    id: i,
    x: 25 + Math.random() * 70,
    y: 50 + Math.random() * 60,
    size: 8 + Math.random() * 12,
    delay: Math.random() * 3,
    dur: 2.5 + Math.random() * 1.5,
  })), []);

  return (
    <>
      {puffs.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: 'radial-gradient(circle, rgba(100,100,100,0.4) 0%, transparent 70%)',
            filter: 'blur(3px)',
          }}
          animate={{
            y: [0, -30],
            opacity: [0.4, 0],
            scale: [1, 2],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
}

// ── Fight Flash (screen flash on critical) ──

export function FightFlash({ active, color }: { active: boolean; color: string }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ background: color }}
        />
      )}
    </AnimatePresence>
  );
}

// ── Damage Popup (RPG numbers) ──

export interface DamagePopupData {
  id: number;
  x: number;
  y: number;
  value: number;
  isCritical: boolean;
  bot: 'A' | 'B';
}

export function DamagePopup({ popup }: { popup: DamagePopupData }) {
  const isPositive = popup.value > 0;
  return (
    <motion.div
      className="absolute z-40 pointer-events-none font-orbitron font-black"
      style={{ left: popup.x, top: popup.y }}
      initial={{ opacity: 1, y: 0, scale: popup.isCritical ? 1.5 : 1 }}
      animate={{ opacity: 0, y: -80, scale: popup.isCritical ? 2 : 1.2 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    >
      <span
        className={`${popup.isCritical ? 'text-3xl md:text-5xl' : 'text-xl md:text-3xl'}`}
        style={{
          color: isPositive ? '#14F195' : '#FF4444',
          textShadow: isPositive
            ? '0 0 20px rgba(20,241,149,0.8), 0 0 40px rgba(20,241,149,0.4)'
            : '0 0 20px rgba(255,68,68,0.8), 0 0 40px rgba(255,68,68,0.4)',
        }}
      >
        {isPositive ? '+' : ''}{popup.value}%
        {popup.isCritical && <span className="text-yellow-400 ml-1">💥</span>}
      </span>
    </motion.div>
  );
}
