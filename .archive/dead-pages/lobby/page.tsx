'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Bot {
  id: number;
  name: string;
  hp: number;
  wins: number;
  losses: number;
  win_streak: number;
  league: string;
}

interface Room {
  id: string;
  host_bot: Bot;
  status: 'waiting' | 'ready' | 'in_battle';
  stake_amount?: number;
  created_at: string;
  spectators: number;
}

// League badge component
function LeagueBadge({ league }: { league: string }) {
  const config: Record<string, { icon: string; color: string; bg: string }> = {
    bronze: { icon: '🥉', color: 'text-orange-400', bg: 'bg-orange-900/30' },
    silver: { icon: '🥈', color: 'text-gray-300', bg: 'bg-gray-700/50' },
    gold: { icon: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
    diamond: { icon: '💎', color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
  };
  
  const c = config[league] || config.bronze;
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${c.bg} ${c.color} flex items-center gap-1`}>
      {c.icon} {league.charAt(0).toUpperCase() + league.slice(1)}
    </span>
  );
}

// Room Card
function RoomCard({ room, onJoin, onSpectate }: { 
  room: Room; 
  onJoin: () => void;
  onSpectate: () => void;
}) {
  const [timeWaiting, setTimeWaiting] = useState('');
  
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const created = new Date(room.created_at).getTime();
      const diff = now - created;
      
      const mins = Math.floor(diff / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (mins > 0) {
        setTimeWaiting(`${mins}m ${secs}s`);
      } else {
        setTimeWaiting(`${secs}s`);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room.created_at]);
  
  const isWaiting = room.status === 'waiting';
  
  return (
    <motion.div
      className={`bg-gray-900 border rounded-xl p-5 ${
        isWaiting ? 'border-green-700 hover:border-green-500' : 'border-gray-700'
      } transition-all`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">🤖</div>
          <div>
            <div className="font-bold text-lg">{room.host_bot.name}</div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-green-400">{room.host_bot.wins}W</span>
              <span className="text-red-400">{room.host_bot.losses}L</span>
              <LeagueBadge league={room.host_bot.league} />
            </div>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isWaiting 
            ? 'bg-green-900/50 text-green-400 animate-pulse' 
            : 'bg-yellow-900/50 text-yellow-400'
        }`}>
          {isWaiting ? '🟢 Waiting' : room.status === 'ready' ? '🟡 Ready' : '🔴 Fighting'}
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-gray-500 text-xs">HP</div>
          <div className="font-bold text-white">{room.host_bot.hp}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-gray-500 text-xs">Streak</div>
          <div className="font-bold text-orange-400">
            {room.host_bot.win_streak > 0 ? `🔥 ${room.host_bot.win_streak}` : '-'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-gray-500 text-xs">Waiting</div>
          <div className="font-bold text-gray-300">{timeWaiting}</div>
        </div>
      </div>
      
      {/* Spectators */}
      <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
        <span>👁 {room.spectators} watching</span>
        {room.stake_amount && (
          <span className="text-purple-400">💰 {room.stake_amount} SOL stake</span>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        {isWaiting ? (
          <button
            onClick={onJoin}
            className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold transition-all"
          >
            ⚔️ Challenge
          </button>
        ) : (
          <button
            onClick={onSpectate}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition-all"
          >
            👁 Spectate
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Create Room Modal
function CreateRoomModal({ onClose, onSubmit, userBots }: {
  onClose: () => void;
  onSubmit: (botId: number, stake?: number) => void;
  userBots: Bot[];
}) {
  const [selectedBot, setSelectedBot] = useState<number | null>(null);
  const [stake, setStake] = useState('');
  
  return (
    <motion.div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">🏟 Create Battle Room</h2>
        
        {/* Bot Selection */}
        <div className="mb-6">
          <label className="text-sm text-gray-400 mb-2 block">Select Your Fighter</label>
          <div className="space-y-2">
            {userBots.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No bots available. <Link href="/register-bot" className="text-purple-400 hover:underline">Register one first!</Link>
              </div>
            ) : (
              userBots.map((bot) => (
                <button
                  key={bot.id}
                  onClick={() => setSelectedBot(bot.id)}
                  className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between ${
                    selectedBot === bot.id
                      ? 'border-purple-500 bg-purple-900/30'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🤖</span>
                    <div className="text-left">
                      <div className="font-medium">{bot.name}</div>
                      <div className="text-xs text-gray-400">
                        HP: {bot.hp} • {bot.wins}W/{bot.losses}L
                      </div>
                    </div>
                  </div>
                  <LeagueBadge league={bot.league} />
                </button>
              ))
            )}
          </div>
        </div>
        
        {/* Stake (optional) */}
        <div className="mb-6">
          <label className="text-sm text-gray-400 mb-2 block">Stake Amount (optional)</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">SOL</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedBot && onSubmit(selectedBot, stake ? parseFloat(stake) : undefined)}
            disabled={!selectedBot}
            className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold disabled:opacity-50 transition-all"
          >
            Create Room
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Quick Match animation
function QuickMatchAnimation() {
  return (
    <motion.div
      className="flex items-center justify-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-3 h-3 bg-purple-500 rounded-full"
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
      />
      <motion.div
        className="w-3 h-3 bg-purple-500 rounded-full"
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
      />
      <motion.div
        className="w-3 h-3 bg-purple-500 rounded-full"
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
      />
    </motion.div>
  );
}

// Main Lobby Page
export default function LobbyPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [userBots, setUserBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [quickMatching, setQuickMatching] = useState(false);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'spectate'>('all');
  
  // Fetch rooms and user bots
  const fetchData = async () => {
    try {
      // Fetch rooms
      const roomsRes = await fetch('/api/arena/lobby');
      const roomsData = await roomsRes.json();
      setRooms(roomsData.rooms || []);
      
      // Fetch user's bots (for creating rooms)
      const botsRes = await fetch('/api/arena/battles');
      const botsData = await botsRes.json();
      setUserBots(botsData.leaderboard || []);
    } catch (error) {
      console.error('Error fetching lobby data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, []);
  
  // Create room handler
  const handleCreateRoom = async (botId: number, stake?: number) => {
    try {
      await fetch('/api/arena/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', bot_id: botId, stake_amount: stake }),
      });
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };
  
  // Join room handler
  const handleJoinRoom = async (roomId: string) => {
    // Redirect to fight page with guest bot
    window.location.href = `/fight/${roomId}`;
  };
  
  // Quick match handler
  const handleQuickMatch = async () => {
    setQuickMatching(true);
    try {
      // Auto-matchmaking - creates or joins existing battle
      const res = await fetch('/api/arena/battles', { method: 'POST' });
      const data = await res.json();
      if (data.battle) {
        window.location.href = '/battle';
      }
    } catch (error) {
      console.error('Error in quick match:', error);
    } finally {
      setQuickMatching(false);
    }
  };
  
  // Filter rooms
  const filteredRooms = rooms.filter((room) => {
    if (filter === 'waiting') return room.status === 'waiting';
    if (filter === 'spectate') return room.status === 'in_battle';
    return true;
  });
  
  const waitingCount = rooms.filter(r => r.status === 'waiting').length;
  const fightingCount = rooms.filter(r => r.status === 'in_battle').length;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-2xl animate-pulse">Loading Lobby...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Lobby toolbar */}
      <div className="border-b border-gray-800 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">🏟 Battle Lobby</h1>
              <p className="text-gray-400 text-sm">Find opponents, create rooms, or spectate live battles</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Stats */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-gray-400">{waitingCount} waiting</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-gray-400">{fightingCount} fighting</span>
                </div>
              </div>
              
              {/* Quick Match */}
              <button
                onClick={handleQuickMatch}
                disabled={quickMatching}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg font-bold transition-all disabled:opacity-50"
              >
                {quickMatching ? <QuickMatchAnimation /> : '⚡ Quick Match'}
              </button>
              
              {/* Create Room */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold transition-all"
              >
                ➕ Create Room
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All Rooms', count: rooms.length },
            { key: 'waiting', label: '🟢 Waiting', count: waitingCount },
            { key: 'spectate', label: '👁 Spectate', count: fightingCount },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>
      
      {/* Rooms Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏟</div>
            <div className="text-xl text-gray-400 mb-2">No rooms yet</div>
            <div className="text-gray-500 mb-6">Be the first to create a battle room!</div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold"
            >
              ➕ Create Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onJoin={() => handleJoinRoom(room.id)}
                  onSpectate={() => window.location.href = `/battle?spectate=${room.id}`}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-800 py-3">
        <div className="max-w-7xl mx-auto px-6 flex justify-center gap-6">
          <Link href="/battle" className="text-gray-400 hover:text-white transition-colors">
            ⚔️ Battles
          </Link>
          <span className="text-purple-400 font-medium">🏟 Lobby</span>
          <Link href="/leaderboard" className="text-gray-400 hover:text-white transition-colors">
            🏆 Leaderboard
          </Link>
          <Link href="/register-bot" className="text-gray-400 hover:text-white transition-colors">
            🤖 My Bots
          </Link>
        </div>
      </div>
      
      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateRoomModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateRoom}
            userBots={userBots}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
