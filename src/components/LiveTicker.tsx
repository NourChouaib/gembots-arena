'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TickerEvent {
  id: string;
  text: string;
  icon: string;
  time: string;
  type: 'battle' | 'result' | 'tournament';
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function LiveTicker() {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      // Fetch recent battles (active + recently finished)
      const { data: active } = await supabase
        .from('battles')
        .select('id, bot1_id, bot2_id, token_symbol, status, created_at, resolves_at, winner_name')
        .in('status', ['active', 'finished'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (!active || active.length === 0) {
        setIsLive(false);
        return;
      }

      // Get bot names
      const botIds = new Set<number>();
      active.forEach(b => { botIds.add(b.bot1_id); botIds.add(b.bot2_id); });
      const { data: bots } = await supabase
        .from('bots')
        .select('id, name')
        .in('id', Array.from(botIds));
      
      const botMap = new Map(bots?.map(b => [b.id, b.name]) || []);

      const tickerEvents: TickerEvent[] = active.map(b => {
        const bot1 = botMap.get(b.bot1_id) || `Bot #${b.bot1_id}`;
        const bot2 = botMap.get(b.bot2_id) || `Bot #${b.bot2_id}`;
        
        if (b.status === 'active') {
          return {
            id: b.id,
            text: `${bot1} vs ${bot2} on $${b.token_symbol}`,
            icon: '⚔️',
            time: timeAgo(b.created_at),
            type: 'battle' as const,
          };
        } else {
          return {
            id: b.id,
            text: `${b.winner_name || bot1} won vs ${b.winner_name === bot1 ? bot2 : bot1} on $${b.token_symbol}`,
            icon: '🏆',
            time: timeAgo(b.created_at),
            type: 'result' as const,
          };
        }
      });

      setEvents(tickerEvents);
      setIsLive(tickerEvents.some(e => e.type === 'battle'));
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, []);

  // Rotate through events
  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % events.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [events.length]);

  if (events.length === 0) return null;

  const current = events[currentIndex % events.length];

  return (
    <div className="w-full bg-gray-900/80 backdrop-blur-sm border-y border-gray-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-3 text-sm">
          {/* LIVE indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`relative flex h-2.5 w-2.5 ${isLive ? '' : 'opacity-50'}`}>
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-red-500' : 'bg-gray-500'}`}></span>
            </span>
            <span className={`font-bold text-xs tracking-wider ${isLive ? 'text-red-400' : 'text-gray-500'}`}>
              {isLive ? 'LIVE' : 'RECENT'}
            </span>
          </div>

          {/* Ticker content */}
          <div className="flex-1 overflow-hidden relative h-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={current?.id || 'empty'}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center gap-2"
              >
                <span>{current?.icon}</span>
                <span className="text-gray-200 truncate">{current?.text}</span>
                <span className="text-gray-500 text-xs shrink-0">{current?.time}</span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Battle count */}
          <div className="shrink-0 text-xs text-gray-500">
            {events.filter(e => e.type === 'battle').length} active
          </div>
        </div>
      </div>
    </div>
  );
}
