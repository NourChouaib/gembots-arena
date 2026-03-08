'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Bot {
  id: number;
  name: string;
  hp: number;
  wins: number;
  losses: number;
  win_streak: number;
  league: string;
  avatar_state: string;
}

interface Battle {
  id: string;
  round_number: number;
  bot1_id: number;
  bot2_id: number;
  token_symbol: string;
  entry_price: number;
  resolves_at: string;
  status: string;
  bot1_prediction?: number;
  bot2_prediction?: number;
  winner_id?: number;
  actual_x?: number;
  damage_dealt?: number;
  bot1?: Bot;
  bot2?: Bot;
}

// Bot avatar based on state
function BotAvatar({ bot, side }: { bot: Bot; side: 'left' | 'right' }) {
  const stateEmojis: Record<string, string> = {
    neutral: '🤖',
    fighting: '😤',
    winning: '😎',
    losing: '😰',
    critical: '😱',
    ko: '💀',
  };
  
  const emoji = stateEmojis[bot.avatar_state] || '🤖';
  const isWinning = bot.avatar_state === 'winning';
  const isCritical = bot.hp <= 20;
  
  return (
    <motion.div
      className={`flex flex-col items-center ${side === 'right' ? 'scale-x-[-1]' : ''}`}
      animate={isWinning ? { scale: [1, 1.1, 1] } : isCritical ? { x: [-2, 2, -2, 0] } : {}}
      transition={{ repeat: isWinning ? 3 : isCritical ? Infinity : 0, duration: 0.3 }}
    >
      <div className="text-6xl mb-2">{emoji}</div>
      <div className={`text-lg font-bold ${side === 'right' ? 'scale-x-[-1]' : ''}`}>
        {bot.name}
      </div>
    </motion.div>
  );
}

// HP Bar component
function HPBar({ hp, maxHp = 100 }: { hp: number; maxHp?: number }) {
  const percentage = (hp / maxHp) * 100;
  const color = hp > 50 ? 'bg-green-500' : hp > 20 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
      <motion.div
        className={`h-full ${color}`}
        initial={{ width: '100%' }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}

// Battle Card
function BattleCard({ battle, onResolve, defaultExpanded = false }: { battle: Battle; onResolve?: () => void; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(battle.resolves_at).getTime();
      const diff = end - now;
      
      if (diff <= 0) {
        setTimeLeft('RESOLVING...');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [battle.resolves_at]);
  
  const isResolved = battle.status === 'resolved';
  
  // Collapsed view - compact bar
  if (!expanded) {
    return (
      <motion.div
        className="bg-gray-900 border border-gray-700 rounded-lg p-3 max-w-2xl mx-auto cursor-pointer hover:border-gray-500 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">#{battle.round_number}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{battle.bot1?.name}</span>
              <span className="text-xs text-gray-500">HP:{battle.bot1?.hp}</span>
            </div>
            <span className="text-gray-600 text-sm">vs</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{battle.bot2?.name}</span>
              <span className="text-xs text-gray-500">HP:{battle.bot2?.hp}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 text-sm">${battle.token_symbol}</span>
            <span className="text-gray-400 text-xs font-mono">{timeLeft}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${
              isResolved ? 'bg-green-900 text-green-400' : 'bg-yellow-900/50 text-yellow-400'
            }`}>
              {isResolved ? '✓' : '🔴'}
            </span>
            <span className="text-gray-500">▼</span>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Expanded view - full details
  return (
    <motion.div
      className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <span className="text-gray-400">⚔️ BATTLE #{battle.round_number}</span>
          <button 
            onClick={() => setExpanded(false)}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            ▲ свернуть
          </button>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          isResolved ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'
        }`}>
          {isResolved ? '✓ RESOLVED' : '🔴 LIVE'}
        </span>
      </div>
      
      {/* Bots */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-6">
        {/* Bot 1 */}
        <div className="text-center">
          {battle.bot1 && <BotAvatar bot={battle.bot1} side="left" />}
          <div className="mt-2 max-w-[150px] mx-auto">
            <HPBar hp={battle.bot1?.hp || 100} />
            <div className="text-sm text-gray-400 mt-1">HP: {battle.bot1?.hp || 100}</div>
          </div>
          <div className="mt-2 text-lg h-8">
            {battle.bot1_prediction && (
              <>Prediction: <span className="text-cyan-400 font-bold">{battle.bot1_prediction}x</span></>
            )}
          </div>
          {isResolved && battle.winner_id === battle.bot1_id && (
            <motion.div
              className="mt-2 text-xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              👑 WINNER
            </motion.div>
          )}
        </div>
        
        {/* VS */}
        <div className="text-3xl font-bold text-gray-600">VS</div>
        
        {/* Bot 2 */}
        <div className="text-center">
          {battle.bot2 && <BotAvatar bot={battle.bot2} side="right" />}
          <div className="mt-2 max-w-[150px] mx-auto">
            <HPBar hp={battle.bot2?.hp || 100} />
            <div className="text-sm text-gray-400 mt-1">HP: {battle.bot2?.hp || 100}</div>
          </div>
          <div className="mt-2 text-lg h-8">
            {battle.bot2_prediction && (
              <>Prediction: <span className="text-cyan-400 font-bold">{battle.bot2_prediction}x</span></>
            )}
          </div>
          {isResolved && battle.winner_id === battle.bot2_id && (
            <motion.div
              className="mt-2 text-xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              👑 WINNER
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Token Info */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-gray-400">Token:</span>
            <span className="ml-2 text-xl font-bold text-white">${battle.token_symbol}</span>
          </div>
          <div>
            <span className="text-gray-400">Entry:</span>
            <span className="ml-2 text-white">${battle.entry_price?.toFixed(6)}</span>
          </div>
        </div>
        
        {isResolved && battle.actual_x && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-400">Actual Result:</span>
              <span className={`text-xl font-bold ${battle.actual_x >= 2 ? 'text-green-400' : 'text-red-400'}`}>
                {battle.actual_x.toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-400">Damage Dealt:</span>
              <span className="text-red-400 font-bold">-{battle.damage_dealt} HP</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Timer or Results */}
      {!isResolved ? (
        <div className="text-center">
          <div className="text-gray-400 text-sm">Resolves in</div>
          <div className="text-3xl font-mono font-bold text-white">{timeLeft}</div>
        </div>
      ) : (
        <div className="text-center text-green-400">
          Battle Complete! 🎉
        </div>
      )}
      
      {/* Debug: Resolve button */}
      {!isResolved && onResolve && (
        <button
          onClick={onResolve}
          className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold"
        >
          ⚡ Simulate Resolution (Debug)
        </button>
      )}
    </motion.div>
  );
}

// Leaderboard
function Leaderboard({ bots }: { bots: Bot[] }) {
  const leagueIcons: Record<string, string> = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    diamond: '💎',
  };
  
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 overflow-hidden">
      <h3 className="text-xl font-bold mb-4">🏆 Leaderboard</h3>
      
      {/* Header */}
      <div className="grid grid-cols-[24px_20px_1fr_36px_28px_48px_32px] gap-1 px-2 pb-2 text-xs text-gray-500 border-b border-gray-700">
        <span>#</span>
        <span></span>
        <span>Name</span>
        <span className="text-right">W</span>
        <span className="text-right">L</span>
        <span className="text-right">HP</span>
        <span></span>
      </div>
      
      <div className="space-y-1 mt-2">
        {bots.map((bot, i) => (
          <div
            key={bot.id}
            className={`grid grid-cols-[24px_20px_1fr_36px_28px_48px_32px] gap-1 items-center px-2 py-1.5 rounded text-sm ${
              i === 0 ? 'bg-yellow-900/30' : 'bg-gray-800/50'
            }`}
          >
            <span className="font-bold text-gray-500">#{i + 1}</span>
            <span>{leagueIcons[bot.league] || '🤖'}</span>
            <span className="truncate font-medium" title={bot.name}>{bot.name}</span>
            <span className="text-right text-green-400">{bot.wins}W</span>
            <span className="text-right text-red-400">{bot.losses}L</span>
            <span className="text-right text-gray-400">{bot.hp}</span>
            <span className="text-orange-400">{bot.win_streak > 0 ? `🔥${bot.win_streak}` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Battle Arena Page
export default function BattleArenaPage() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [leaderboard, setLeaderboard] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const fetchData = async () => {
    try {
      const res = await fetch('/api/arena/battles');
      const data = await res.json();
      setBattles(data.battles || []);
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching battles:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);
  
  const createBattle = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/arena/battles', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        fetchData();
      }
    } catch (error) {
      console.error('Error creating battle:', error);
    } finally {
      setCreating(false);
    }
  };
  
  const resolveBattle = async (battleId: string) => {
    // Simulate price change (random 0.5x to 4x)
    // Range: 0.1x (90% dump) to 10x (moonshot)
    const finalPrice = battles.find(b => b.id === battleId)!.entry_price * (0.1 + Math.random() * 9.9);
    
    try {
      await fetch(`/api/arena/battles/${battleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', final_price: finalPrice }),
      });
      fetchData();
    } catch (error) {
      console.error('Error resolving battle:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-2xl animate-pulse">Loading Arena...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-center mb-2">
          🥊 GemBots Battle Arena
        </h1>
        <p className="text-gray-400 text-center">
          Bots fight. Predictions clash. Only the accurate survive.
        </p>
      </div>
      
      {/* Create Battle Button */}
      <div className="max-w-6xl mx-auto mb-8 text-center">
        <button
          onClick={createBattle}
          disabled={creating}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-xl font-bold disabled:opacity-50 transition-all transform hover:scale-105"
        >
          {creating ? '⏳ Matchmaking...' : '⚔️ Start New Battle'}
        </button>
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Battles */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold mb-2">🔴 Active Battles</h2>
          
          {battles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No active battles. Click "Start New Battle" to begin!
            </div>
          ) : (
            <AnimatePresence>
              {battles.map((battle, index) => (
                <BattleCard
                  key={battle.id}
                  battle={battle}
                  onResolve={() => resolveBattle(battle.id)}
                  defaultExpanded={index === 0}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6 lg:mt-10">
          <Leaderboard bots={leaderboard} />
        </div>
      </div>
    </div>
  );
}
