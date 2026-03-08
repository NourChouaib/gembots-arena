'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { NeonViperSVG, CyberFangSVG, RobotSprite, BotState, getHpTier, getHpFilters, isWinning, HpTier } from '@/components/tournament/BotSprites';
import { ArenaBackground, SparkParticles, WinnerAura, SmokeEffect, FightFlash, DamagePopup, DamagePopupData } from '@/components/tournament/ArenaEffects';
import { VSBadge } from '@/components/tournament/VSBadge';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface TradeEvent {
  id: number;
  bot: 'A' | 'B';
  token: string;
  action: 'buy' | 'sell';
  pnl: number;
  isCombo: boolean;
  timestamp: number;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TOKENS = ['BONK', 'WIF', 'PEPE', 'DOGE', 'JUP', 'PYTH', 'ORCA', 'RAY'];
const ROUND_DURATION = 5 * 60; // 5 minutes in seconds

const INITIAL_BOT_A: BotState = {
  name: 'NeonViper',
  hp: 1000,
  maxHp: 1000,
  color: '#9945FF',
  glowColor: 'rgba(153, 69, 255, 0.6)',
  comboCount: 0,
  state: 'idle',
  totalPnl: 0,
};

const INITIAL_BOT_B: BotState = {
  name: 'CyberFang',
  hp: 1000,
  maxHp: 1000,
  color: '#14F195',
  glowColor: 'rgba(20, 241, 149, 0.6)',
  comboCount: 0,
  state: 'idle',
  totalPnl: 0,
};

// ─── HELPER ───────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let globalEventId = 0;

function generateTradeEvent(botACombo: number, botBCombo: number): TradeEvent {
  const bot: 'A' | 'B' = Math.random() > 0.5 ? 'A' : 'B';
  const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
  const action: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
  const pnl = Math.random() > 0.35
    ? randomBetween(1, 50)
    : randomBetween(-15, -1);
  const currentCombo = bot === 'A' ? botACombo : botBCombo;
  const isCombo = pnl > 0 && currentCombo >= 2;
  return { id: ++globalEventId, bot, token, action, pnl, isCombo, timestamp: Date.now() };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

// ── HP Bar (Street Fighter style) ──
function HPBarFight({ bot, side }: { bot: BotState; side: 'left' | 'right' }) {
  const percentage = Math.max(0, (bot.hp / bot.maxHp) * 100);
  const barColor =
    percentage > 60 ? 'from-green-400 to-green-500'
    : percentage > 30 ? 'from-yellow-400 to-orange-500'
    : 'from-red-500 to-red-600';

  return (
    <div className={`flex-1 ${side === 'right' ? 'flex flex-col items-end' : ''}`}>
      {/* Bot name + PnL */}
      <div className={`flex items-center gap-2 mb-1 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
        <span
          className="font-orbitron text-sm md:text-base font-bold tracking-wider"
          style={{ color: bot.color, textShadow: `0 0 10px ${bot.glowColor}` }}
        >
          {bot.name}
        </span>
        <span className={`font-mono text-xs ${bot.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {bot.totalPnl >= 0 ? '+' : ''}{bot.totalPnl.toFixed(1)}%
        </span>
      </div>

      {/* HP bar container */}
      <div className="relative w-full h-5 md:h-7 rounded-sm overflow-hidden border border-white/10 bg-gray-900/80">
        {/* Background tick marks */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="flex-1 border-r border-white/5" />
          ))}
        </div>

        {/* HP fill */}
        <motion.div
          className={`absolute top-0 ${side === 'left' ? 'left-0' : 'right-0'} h-full bg-gradient-to-r ${barColor}`}
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            boxShadow: `0 0 15px ${bot.glowColor}, inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}
        />

        {/* HP text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-xs md:text-sm font-bold text-white drop-shadow-lg">
            {Math.max(0, Math.round(bot.hp))} / {bot.maxHp}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Combo Counter ──
function ComboCounter({ count, bot }: { count: number; bot: BotState }) {
  if (count < 3) return null;
  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: [0, 1.3, 1], rotate: [-10, 5, 0] }}
      exit={{ scale: 0, opacity: 0 }}
      className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
    >
      <div
        className="px-4 py-2 rounded-lg font-orbitron text-center"
        style={{
          background: `linear-gradient(135deg, ${bot.color}33, ${bot.color}11)`,
          border: `2px solid ${bot.color}`,
          boxShadow: `0 0 30px ${bot.glowColor}, 0 0 60px ${bot.glowColor}`,
        }}
      >
        <div className="text-2xl md:text-4xl font-black text-white">
          {count}x COMBO!
        </div>
        <div className="text-xs md:text-sm" style={{ color: bot.color }}>
          {bot.name}
        </div>
      </div>
    </motion.div>
  );
}

// ── Round Timer ──
function RoundTimer({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isLow = seconds < 30;

  return (
    <motion.div
      className="text-center"
      animate={isLow ? { scale: [1, 1.1, 1] } : {}}
      transition={isLow ? { duration: 0.5, repeat: Infinity } : {}}
    >
      <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mb-0.5">Round</div>
      <div
        className={`font-orbitron font-bold text-lg md:text-2xl ${isLow ? 'text-red-400' : 'text-white'}`}
        style={{
          textShadow: isLow
            ? '0 0 20px rgba(255,60,60,0.6)'
            : '0 0 10px rgba(153,69,255,0.4)',
        }}
      >
        {mins}:{secs.toString().padStart(2, '0')}
      </div>
    </motion.div>
  );
}

// ── Trade Ticker ──
function TradeTicker({ trades }: { trades: TradeEvent[] }) {
  return (
    <div className="w-full overflow-hidden bg-black/60 backdrop-blur-sm border-t border-white/5">
      <motion.div
        className="flex gap-6 py-2 px-4 whitespace-nowrap"
        animate={{ x: [0, -1500] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {[...trades, ...trades].map((trade, i) => (
          <span key={`${trade.id}-${i}`} className="text-xs md:text-sm font-mono flex items-center gap-1.5">
            <span>{trade.pnl >= 0 ? '🟢' : '🔴'}</span>
            <span className="text-gray-400">
              {trade.bot === 'A' ? 'NeonViper' : 'CyberFang'}
            </span>
            <span className="text-white">
              {trade.action === 'buy' ? 'bought' : 'sold'} ${trade.token}
            </span>
            <span className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
              {trade.pnl >= 0 ? '+' : ''}{trade.pnl}%
            </span>
            {trade.isCombo && <span className="text-yellow-400">🔥</span>}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Sound Toggle ──
function SoundToggle() {
  const [muted, setMuted] = useState(true);
  return (
    <button
      onClick={() => setMuted(!muted)}
      className="absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-lg hover:border-white/30 transition-all"
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

// ── Bot Fighter container ──
function BotFighter({ bot, side, isShaking, opponentHp }: { bot: BotState; side: 'left' | 'right'; isShaking: boolean; opponentHp: number }) {
  return (
    <motion.div
      className={`flex flex-col items-center ${side === 'left' ? 'self-end' : 'self-end'}`}
      animate={
        isShaking
          ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
          : {}
      }
      transition={{ duration: 0.4 }}
    >
      <RobotSprite bot={bot} side={side} isShaking={isShaking} opponentHp={opponentHp} />
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function FightDemoPage() {
  const [botA, setBotA] = useState<BotState>(INITIAL_BOT_A);
  const [botB, setBotB] = useState<BotState>(INITIAL_BOT_B);
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [damagePopups, setDamagePopups] = useState<DamagePopupData[]>([]);
  const [timer, setTimer] = useState(ROUND_DURATION);
  const [screenShake, setScreenShake] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [showCombo, setShowCombo] = useState<{ bot: BotState; count: number } | null>(null);
  const [fightStarted, setFightStarted] = useState(false);
  const [fightEnded, setFightEnded] = useState(false);
  const [winner, setWinner] = useState<BotState | null>(null);

  const comboRefA = useRef(0);
  const comboRefB = useRef(0);
  const popupIdRef = useRef(0);

  // Countdown timer
  useEffect(() => {
    if (!fightStarted || fightEnded) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fightStarted, fightEnded]);

  // Check fight end
  useEffect(() => {
    if (!fightStarted) return;
    if (botA.hp <= 0) {
      setFightEnded(true);
      setWinner(botB);
    } else if (botB.hp <= 0) {
      setFightEnded(true);
      setWinner(botA);
    } else if (timer === 0) {
      setFightEnded(true);
      setWinner(botA.hp >= botB.hp ? botA : botB);
    }
  }, [botA.hp, botB.hp, timer, fightStarted]);

  // Process trade events
  const processTrade = useCallback((event: TradeEvent) => {
    const isProfit = event.pnl > 0;
    const isCritical = event.pnl >= 20;
    const damage = Math.abs(event.pnl) * 5;

    if (event.bot === 'A') {
      if (isProfit) {
        comboRefA.current += 1;
        comboRefB.current = 0;
        setBotA((prev) => ({ ...prev, state: 'attack', totalPnl: prev.totalPnl + event.pnl, comboCount: comboRefA.current }));
        setBotB((prev) => ({
          ...prev,
          state: isCritical ? 'critical' : 'hurt',
          hp: Math.max(0, prev.hp - damage),
        }));
        setDamagePopups((prev) => [
          ...prev,
          { id: ++popupIdRef.current, x: randomBetween(55, 75), y: randomBetween(30, 50), value: -event.pnl, isCritical, bot: 'B' },
        ]);
        if (comboRefA.current >= 3) {
          setShowCombo({ bot: { ...INITIAL_BOT_A, comboCount: comboRefA.current }, count: comboRefA.current });
        }
      } else {
        comboRefA.current = 0;
        setBotA((prev) => ({ ...prev, state: 'hurt', totalPnl: prev.totalPnl + event.pnl, hp: Math.max(0, prev.hp - damage / 2), comboCount: 0 }));
        setDamagePopups((prev) => [
          ...prev,
          { id: ++popupIdRef.current, x: randomBetween(15, 35), y: randomBetween(30, 50), value: event.pnl, isCritical: false, bot: 'A' },
        ]);
      }
    } else {
      if (isProfit) {
        comboRefB.current += 1;
        comboRefA.current = 0;
        setBotB((prev) => ({ ...prev, state: 'attack', totalPnl: prev.totalPnl + event.pnl, comboCount: comboRefB.current }));
        setBotA((prev) => ({
          ...prev,
          state: isCritical ? 'critical' : 'hurt',
          hp: Math.max(0, prev.hp - damage),
        }));
        setDamagePopups((prev) => [
          ...prev,
          { id: ++popupIdRef.current, x: randomBetween(15, 35), y: randomBetween(30, 50), value: -event.pnl, isCritical, bot: 'A' },
        ]);
        if (comboRefB.current >= 3) {
          setShowCombo({ bot: { ...INITIAL_BOT_B, comboCount: comboRefB.current }, count: comboRefB.current });
        }
      } else {
        comboRefB.current = 0;
        setBotB((prev) => ({ ...prev, state: 'hurt', totalPnl: prev.totalPnl + event.pnl, hp: Math.max(0, prev.hp - damage / 2), comboCount: 0 }));
        setDamagePopups((prev) => [
          ...prev,
          { id: ++popupIdRef.current, x: randomBetween(55, 75), y: randomBetween(30, 50), value: event.pnl, isCritical: false, bot: 'B' },
        ]);
      }
    }

    if (isCritical) {
      setScreenShake(true);
      setFlashColor(isProfit ? 'rgba(20,241,149,0.15)' : 'rgba(255,60,60,0.15)');
      setTimeout(() => {
        setScreenShake(false);
        setFlashColor(null);
      }, 400);
    }

    setTimeout(() => {
      setBotA((prev) => ({ ...prev, state: 'idle' }));
      setBotB((prev) => ({ ...prev, state: 'idle' }));
    }, 500);

    setTimeout(() => setShowCombo(null), 1500);

    setTimeout(() => {
      setDamagePopups((prev) => prev.filter((p) => p.id !== popupIdRef.current));
    }, 1200);
  }, []);

  // Auto-generate trades
  useEffect(() => {
    if (!fightStarted || fightEnded) return;
    const scheduleNext = () => {
      const delay = randomBetween(2500, 4500);
      return setTimeout(() => {
        const event = generateTradeEvent(comboRefA.current, comboRefB.current);
        setTrades((prev) => [event, ...prev].slice(0, 50));
        processTrade(event);
        timerRef.current = scheduleNext();
      }, delay);
    };
    const timerRef: { current: ReturnType<typeof setTimeout> | null } = { current: scheduleNext() };
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fightStarted, fightEnded, processTrade]);

  // Start fight
  const startFight = () => {
    setBotA(INITIAL_BOT_A);
    setBotB(INITIAL_BOT_B);
    setTrades([]);
    setDamagePopups([]);
    setTimer(ROUND_DURATION);
    setFightEnded(false);
    setWinner(null);
    comboRefA.current = 0;
    comboRefB.current = 0;
    setFightStarted(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0014] overflow-hidden">
      <motion.div
        className="relative w-full h-screen flex flex-col"
        animate={screenShake ? { x: [0, -5, 5, -3, 3, 0] } : {}}
        transition={{ duration: 0.3 }}
      >
        {/* Background */}
        <ArenaBackground />

        {/* Sound toggle */}
        <SoundToggle />

        {/* Screen flash */}
        <FightFlash active={!!flashColor} color={flashColor || 'transparent'} />

        {/* ── TOP: HP Bars + Timer ── */}
        <div className="relative z-10 flex items-start gap-2 md:gap-4 px-3 md:px-6 pt-14 md:pt-16">
          <HPBarFight bot={botA} side="left" />
          <RoundTimer seconds={timer} />
          <HPBarFight bot={botB} side="right" />
        </div>

        {/* ── MIDDLE: Arena with bots ── */}
        <div className="relative z-10 flex-1 flex items-end md:items-center">
          <div className="w-full flex items-end justify-center gap-0 px-2 md:px-8 pb-4 md:pb-0">
            {/* Arena section */}
            <div className="flex-1 flex items-end justify-center relative">
              {/* Bot A */}
              <div className="flex-1 flex justify-end pr-4 md:pr-12">
                <BotFighter bot={botA} side="left" isShaking={screenShake && botA.state === 'hurt'} opponentHp={botB.hp} />
              </div>

              {/* Center VS */}
              <div className="flex flex-col items-center justify-end pb-4 md:pb-8 px-2">
                <VSBadge />
              </div>

              {/* Bot B */}
              <div className="flex-1 flex justify-start pl-4 md:pl-12">
                <BotFighter bot={botB} side="right" isShaking={screenShake && botB.state === 'hurt'} opponentHp={botA.hp} />
              </div>

              {/* Damage popups */}
              <AnimatePresence>
                {damagePopups.map((popup) => (
                  <DamagePopup key={popup.id} popup={{
                    ...popup,
                    x: (popup.x / 100) * (typeof window !== 'undefined' ? window.innerWidth : 800),
                    y: (popup.y / 100) * (typeof window !== 'undefined' ? window.innerHeight : 600),
                  }} />
                ))}
              </AnimatePresence>

              {/* Combo counter */}
              <AnimatePresence>
                {showCombo && <ComboCounter count={showCombo.count} bot={showCombo.bot} />}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── BOTTOM: Trade Ticker ── */}
        <div className="relative z-10">
          <TradeTicker trades={trades} />
        </div>

        {/* ── START OVERLAY ── */}
        <AnimatePresence>
          {!fightStarted && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="text-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h1
                  className="font-orbitron text-4xl md:text-6xl font-black mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #9945FF, #14F195)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  GEMBOTS ARENA
                </h1>
                <p className="text-gray-400 mb-6 text-sm md:text-base">AI vs AI Trading Battle</p>
                <div className="flex items-center justify-center gap-8 mb-8">
                  <div className="text-center">
                    <div className="font-orbitron text-lg font-bold" style={{ color: '#9945FF' }}>
                      {INITIAL_BOT_A.name}
                    </div>
                    <div className="text-gray-500 text-xs">1000 HP</div>
                  </div>
                  <div className="font-orbitron text-2xl text-yellow-400 font-black">VS</div>
                  <div className="text-center">
                    <div className="font-orbitron text-lg font-bold" style={{ color: '#14F195' }}>
                      {INITIAL_BOT_B.name}
                    </div>
                    <div className="text-gray-500 text-xs">1000 HP</div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startFight}
                  className="px-8 py-3 rounded-xl font-orbitron font-bold text-white text-lg tracking-wider bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:shadow-[0_0_30px_rgba(153,69,255,0.5)] transition-shadow"
                >
                  ⚔️ START FIGHT
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── END OVERLAY ── */}
        <AnimatePresence>
          {fightEnded && winner && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className="text-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
              >
                <motion.div
                  className="font-orbitron text-5xl md:text-7xl font-black mb-4"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    color: winner.color,
                    textShadow: `0 0 30px ${winner.glowColor}, 0 0 60px ${winner.glowColor}`,
                  }}
                >
                  K.O.!
                </motion.div>
                <div className="text-2xl md:text-3xl font-orbitron font-bold text-white mb-2">
                  {winner.name} WINS!
                </div>
                <div className="text-gray-400 mb-6">
                  Final Score: {Math.round(botA.hp)} vs {Math.round(botB.hp)} HP
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setFightStarted(false);
                    setFightEnded(false);
                    setWinner(null);
                  }}
                  className="px-8 py-3 rounded-xl font-orbitron font-bold text-white text-lg tracking-wider bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:shadow-[0_0_30px_rgba(153,69,255,0.5)] transition-shadow"
                >
                  🔄 REMATCH
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
