'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import StakeButton from '../../../components/StakeButton';

interface Bot {
  id: number;
  name: string;
  hp: number;
  wins: number;
  losses: number;
  win_streak: number;
  league: string;
}

interface BattleState {
  phase: 'loading' | 'predict' | 'waiting' | 'reveal' | 'result';
  room: any;
  hostBot: Bot | null;
  guestBot: Bot | null;
  token: { symbol: string; address: string; price: number } | null;
  myPrediction: number | null;
  opponentPrediction: number | null;
  actualResult: number | null;
  winner: 'me' | 'opponent' | null;
  damage: number;
  countdown: number;
  currentPrice: number | null;
  currentX: number | null;
  entryPrice: number | null;
}

// Random guest bot names
const GUEST_NAMES = [
  '🎲 LuckyGuest', '🌟 StarPlayer', '🔥 HotShot', '⚡ QuickDraw',
  '🎯 SharpEye', '💫 CosmicBet', '🚀 RocketMan', '🎪 WildCard',
  '🦊 CleverFox', '🐺 LoneWolf', '🦁 BraveLion', '🐉 DragonBet',
];

// HP Bar component
function HPBar({ hp, maxHp = 100, side }: { hp: number; maxHp?: number; side: 'left' | 'right' }) {
  const percentage = (hp / maxHp) * 100;
  const color = hp > 50 ? 'bg-green-500' : hp > 20 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">HP</span>
        <span className={hp <= 20 ? 'text-red-400' : 'text-white'}>{hp}/{maxHp}</span>
      </div>
      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Prediction slider
function PredictionSlider({ value, onChange, disabled }: { 
  value: number; 
  onChange: (v: number) => void; 
  disabled: boolean;
}) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-4">
        <span className="text-5xl font-bold text-white">{value.toFixed(1)}x</span>
        <div className="text-gray-400 mt-1">Your Prediction</div>
      </div>
      
      <input
        type="range"
        min="0.5"
        max="10"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-6
          [&::-webkit-slider-thumb]:h-6
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-purple-500
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg
          disabled:opacity-50"
      />
      
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>0.5x (dump)</span>
        <span>5x</span>
        <span>10x (moon)</span>
      </div>
    </div>
  );
}

// Token display
function TokenCard({ token }: { token: { symbol: string; price: number } }) {
  return (
    <motion.div 
      className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/50 rounded-xl p-6 text-center"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <div className="text-gray-400 text-sm mb-1">Today's Battle Token</div>
      <div className="text-4xl font-bold text-white mb-2">${token.symbol}</div>
      <div className="text-gray-400">
        Entry: <span className="text-green-400">${token.price.toFixed(8)}</span>
      </div>
      <div className="mt-3 text-sm text-gray-500">
        Predict the price movement in the next 60 seconds
      </div>
    </motion.div>
  );
}

// Main Fight Page
export default function FightPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  
  const [state, setState] = useState<BattleState>({
    phase: 'loading',
    room: null,
    hostBot: null,
    guestBot: null,
    token: null,
    myPrediction: null,
    opponentPrediction: null,
    actualResult: null,
    winner: null,
    damage: 0,
    countdown: 60,
    currentPrice: null,
    currentX: null,
    entryPrice: null,
  });
  
  const [prediction, setPrediction] = useState(1.0);
  const [submitting, setSubmitting] = useState(false);
  
  // Fetch live price every 5 seconds during waiting phase
  useEffect(() => {
    if (state.phase !== 'waiting' || !state.token?.address || !state.entryPrice) return;
    
    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/arena/price/${state.token!.address}`);
        const data = await res.json();
        
        if (data.success && data.price) {
          const currentX = data.price / state.entryPrice!;
          setState(prev => ({
            ...prev,
            currentPrice: data.price,
            currentX: currentX,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch live price:', error);
      }
    };
    
    // Fetch immediately
    fetchPrice();
    
    // Then every 5 seconds
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, [state.phase, state.token?.address, state.entryPrice]);

  // Load room and create guest bot
  useEffect(() => {
    async function init() {
      try {
        // Fetch room details
        const res = await fetch(`/api/arena/fight/${roomId}`);
        const data = await res.json();
        
        if (data.error) {
          alert(data.error);
          router.push('/lobby');
          return;
        }
        
        setState(prev => ({
          ...prev,
          phase: 'predict',
          room: data.room,
          hostBot: data.hostBot,
          guestBot: data.guestBot,
          token: data.token,
        }));
      } catch (error) {
        console.error('Failed to load fight:', error);
        router.push('/lobby');
      }
    }
    
    init();
  }, [roomId, router]);

  // Submit prediction
  const submitPrediction = async () => {
    setSubmitting(true);
    
    try {
      const res = await fetch(`/api/arena/fight/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'predict',
          prediction,
          guestBotId: state.guestBot?.id,
          token: state.token, // Pass real token data
        }),
      });
      
      const data = await res.json();
      
      setState(prev => ({
        ...prev,
        phase: 'waiting',
        myPrediction: prediction,
        opponentPrediction: data.opponentPrediction,
        countdown: 60,
        entryPrice: prev.token?.price || 0.0001,
        currentPrice: prev.token?.price || null,
        currentX: 1.0,
      }));
      
      // Start countdown
      const interval = setInterval(() => {
        setState(prev => {
          if (prev.countdown <= 1) {
            clearInterval(interval);
            resolveBattle();
            return { ...prev, countdown: 0 };
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to submit prediction:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve battle
  const resolveBattle = async () => {
    setState(prev => ({ ...prev, phase: 'reveal' }));
    
    try {
      const res = await fetch(`/api/arena/fight/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'resolve',
          guestBotId: state.guestBot?.id,
        }),
      });
      
      const data = await res.json();
      
      // Dramatic reveal
      await new Promise(r => setTimeout(r, 2000));
      
      setState(prev => ({
        ...prev,
        phase: 'result',
        actualResult: data.actualResult,
        winner: data.winnerId === prev.guestBot?.id ? 'me' : 'opponent',
        damage: data.damage,
        guestBot: data.updatedGuestBot || prev.guestBot,
        hostBot: data.updatedHostBot || prev.hostBot,
      }));
      
    } catch (error) {
      console.error('Failed to resolve battle:', error);
    }
  };

  // Loading state
  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <motion.div
          className="text-2xl"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          ⚔️ Preparing Battle Arena...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">⚔️ Battle Arena</h1>
        <p className="text-gray-400 text-center">Predict better than your opponent to win!</p>
      </div>

      {/* Battle Arena */}
      <div className="max-w-4xl mx-auto">
        {/* Bots Face-off */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-8">
          {/* Guest Bot (You) */}
          <motion.div 
            className="bg-gray-900 border border-green-500/50 rounded-xl p-6 text-center"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="text-xs text-green-400 mb-2">YOU</div>
            <div className="text-5xl mb-3">🎮</div>
            <div className="font-bold text-lg mb-3">{state.guestBot?.name}</div>
            <HPBar hp={state.guestBot?.hp || 100} side="left" />
            <div className="mt-3 text-sm text-gray-400">
              {state.guestBot?.wins || 0}W / {state.guestBot?.losses || 0}L
            </div>
            
            {/* My prediction */}
            {state.myPrediction && (
              <motion.div 
                className="mt-4 py-2 px-4 bg-green-900/50 rounded-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <span className="text-green-400 font-bold text-xl">{state.myPrediction.toFixed(1)}x</span>
              </motion.div>
            )}
          </motion.div>

          {/* VS */}
          <div className="text-4xl font-bold text-gray-600">VS</div>

          {/* Host Bot (Opponent) */}
          <motion.div 
            className="bg-gray-900 border border-red-500/50 rounded-xl p-6 text-center"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <div className="text-xs text-red-400 mb-2">OPPONENT</div>
            <div className="text-5xl mb-3">🤖</div>
            <div className="font-bold text-lg mb-3">{state.hostBot?.name}</div>
            <HPBar hp={state.hostBot?.hp || 100} side="right" />
            <div className="mt-3 text-sm text-gray-400">
              {state.hostBot?.wins || 0}W / {state.hostBot?.losses || 0}L
            </div>
            
            {/* Opponent prediction */}
            {state.opponentPrediction && (
              <motion.div 
                className="mt-4 py-2 px-4 bg-red-900/50 rounded-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <span className="text-red-400 font-bold text-xl">{state.opponentPrediction.toFixed(1)}x</span>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Token Card */}
        {state.token && <TokenCard token={state.token} />}

        {/* Phase-specific content */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {/* Prediction Phase */}
            {state.phase === 'predict' && (
              <motion.div
                key="predict"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <h2 className="text-xl font-bold mb-6">Make Your Prediction</h2>
                <PredictionSlider 
                  value={prediction} 
                  onChange={setPrediction}
                  disabled={submitting}
                />
                
                {/* Stake SOL (optional) */}
                <div className="mt-6 mb-4">
                  <p className="text-sm text-gray-500 mb-2">Optional: stake SOL to win real rewards</p>
                  <StakeButton 
                    roomId={roomId}
                    onStakeConfirmed={(tx, amt) => {
                      console.log(`Staked ${amt} SOL: ${tx}`);
                    }}
                  />
                </div>

                <button
                  onClick={submitPrediction}
                  disabled={submitting}
                  className="mt-4 px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-xl font-bold disabled:opacity-50 transition-all transform hover:scale-105"
                >
                  {submitting ? '⏳ Submitting...' : '🎯 Lock In Prediction'}
                </button>
              </motion.div>
            )}

            {/* Waiting Phase */}
            {state.phase === 'waiting' && (() => {
              // Calculate who's winning
              const myDiff = state.currentX ? Math.abs((state.myPrediction || 1) - state.currentX) : 999;
              const oppDiff = state.currentX ? Math.abs((state.opponentPrediction || 1) - state.currentX) : 999;
              const imWinning = myDiff < oppDiff;
              
              return (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  <h2 className="text-xl font-bold mb-4">Predictions Locked! ⏳</h2>
                  
                  {/* Live Price Display */}
                  <div className="mb-6 p-4 bg-gray-800 rounded-xl">
                    <div className="text-sm text-gray-500 mb-1">LIVE Price</div>
                    <motion.div 
                      className="text-4xl font-bold"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 0.5 }}
                      key={state.currentX}
                    >
                      <span className={state.currentX && state.currentX >= 1 ? 'text-green-400' : 'text-red-400'}>
                        {state.currentX?.toFixed(4) || '---'}x
                      </span>
                    </motion.div>
                    {state.currentPrice && (
                      <div className="text-xs text-gray-500 mt-1">
                        ${state.currentPrice.toFixed(10)}
                      </div>
                    )}
                  </div>
                  
                  {/* Who's Winning Indicator */}
                  {state.currentX && (
                    <motion.div
                      className={`mb-4 py-2 px-4 rounded-lg inline-block ${
                        imWinning ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                      }`}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      {imWinning ? '🏆 You\'re winning!' : '😰 Opponent is closer!'}
                    </motion.div>
                  )}
                  
                  {/* Countdown */}
                  <motion.div 
                    className="text-6xl font-mono font-bold mb-4"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    {state.countdown}s
                  </motion.div>
                  
                  {/* Predictions comparison */}
                  <div className="mt-6 flex justify-center gap-8">
                    <div className={`text-center p-3 rounded-lg ${imWinning ? 'bg-green-900/30 ring-2 ring-green-500' : 'bg-gray-800'}`}>
                      <div className="text-sm text-gray-500">Your bet</div>
                      <div className="text-2xl font-bold text-green-400">{state.myPrediction?.toFixed(2)}x</div>
                      {state.currentX && (
                        <div className="text-xs text-gray-500">diff: {myDiff.toFixed(4)}</div>
                      )}
                    </div>
                    <div className={`text-center p-3 rounded-lg ${!imWinning ? 'bg-red-900/30 ring-2 ring-red-500' : 'bg-gray-800'}`}>
                      <div className="text-sm text-gray-500">Opponent bet</div>
                      <div className="text-2xl font-bold text-red-400">{state.opponentPrediction?.toFixed(2)}x</div>
                      {state.currentX && (
                        <div className="text-xs text-gray-500">diff: {oppDiff.toFixed(4)}</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Reveal Phase */}
            {state.phase === 'reveal' && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <motion.div
                  className="text-6xl mb-4"
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  🎰
                </motion.div>
                <h2 className="text-2xl font-bold">Calculating Result...</h2>
              </motion.div>
            )}

            {/* Result Phase */}
            {state.phase === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                {/* Actual result */}
                <div className="mb-6">
                  <div className="text-gray-400 mb-2">Actual Result</div>
                  <div className="text-5xl font-bold text-white">{state.actualResult?.toFixed(2)}x</div>
                </div>
                
                {/* Winner announcement */}
                <motion.div
                  className={`py-6 px-8 rounded-2xl mb-6 ${
                    state.winner === 'me' 
                      ? 'bg-green-900/50 border-2 border-green-500' 
                      : 'bg-red-900/50 border-2 border-red-500'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                >
                  <div className="text-6xl mb-2">
                    {state.winner === 'me' ? '🏆' : '💔'}
                  </div>
                  <div className="text-2xl font-bold">
                    {state.winner === 'me' ? 'YOU WIN!' : 'YOU LOSE!'}
                  </div>
                  <div className="text-gray-400 mt-2">
                    {state.winner === 'me' 
                      ? `${state.hostBot?.name} takes ${state.damage} damage!`
                      : `You take ${state.damage} damage!`
                    }
                  </div>
                </motion.div>
                
                {/* Play again */}
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => router.push('/lobby')}
                    className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-all"
                  >
                    Back to Lobby
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold transition-all"
                  >
                    Play Again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
