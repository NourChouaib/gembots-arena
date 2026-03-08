// @ts-nocheck
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============= TYPES =============

export interface CommentatorMessage {
  id: string;
  text: string;
  eventType: 'BUY' | 'SELL' | 'WIN' | 'LOSS' | 'DUEL_START' | 'DUEL_END' | 'KING_CHANGE' | 'STREAK';
  timestamp: number;
}

interface CommentatorProps {
  messages: CommentatorMessage[];
  maxMessages?: number;
  className?: string;
}

// ============= EVENT COLORS =============

const EVENT_COLORS: Record<CommentatorMessage['eventType'], string> = {
  BUY: 'text-green-400 border-green-500/30',
  SELL: 'text-orange-400 border-orange-500/30',
  WIN: 'text-emerald-400 border-emerald-500/30',
  LOSS: 'text-red-400 border-red-500/30',
  DUEL_START: 'text-purple-400 border-purple-500/30',
  DUEL_END: 'text-purple-400 border-purple-500/30',
  KING_CHANGE: 'text-yellow-400 border-yellow-500/30',
  STREAK: 'text-orange-400 border-orange-500/30',
};

const EVENT_BG: Record<CommentatorMessage['eventType'], string> = {
  BUY: 'bg-green-500/10',
  SELL: 'bg-orange-500/10',
  WIN: 'bg-emerald-500/10',
  LOSS: 'bg-red-500/10',
  DUEL_START: 'bg-purple-500/10',
  DUEL_END: 'bg-purple-500/10',
  KING_CHANGE: 'bg-yellow-500/10',
  STREAK: 'bg-orange-500/10',
};

// ============= COMPONENT =============

export function Commentator({ 
  messages, 
  maxMessages = 5,
  className = '' 
}: CommentatorProps) {
  const [visibleMessages, setVisibleMessages] = useState<CommentatorMessage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Обновляем видимые сообщения когда приходят новые
  useEffect(() => {
    setVisibleMessages(messages.slice(0, maxMessages));
  }, [messages, maxMessages]);

  if (visibleMessages.length === 0) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}>
        <div className="bg-gray-900/90 backdrop-blur-md border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3 text-gray-500">
              <span className="text-xl">🎙️</span>
              <span className="text-sm italic">Комментатор ждёт action на арене...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}
    >
      <div className="bg-gray-900/95 backdrop-blur-md border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-2">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <motion.span 
              className="text-xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              🎙️
            </motion.span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Live Commentary
            </span>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">LIVE</span>
            </div>
          </div>

          {/* Messages Ticker */}
          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {visibleMessages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, x: -50, height: 0 }}
                  animate={{ 
                    opacity: 1 - (index * 0.15), // Fade older messages
                    x: 0, 
                    height: 'auto',
                  }}
                  exit={{ opacity: 0, x: 50, height: 0 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 500, 
                    damping: 30,
                    opacity: { duration: 0.2 }
                  }}
                  className={`
                    px-3 py-2 rounded-lg border
                    ${EVENT_BG[message.eventType]}
                    ${EVENT_COLORS[message.eventType]}
                    ${index === 0 ? 'ring-1 ring-white/10' : ''}
                  `}
                >
                  <p className={`text-sm font-medium ${index > 0 ? 'text-opacity-70' : ''}`}>
                    {message.text}
                  </p>
                  <span className="text-xs text-gray-500 mt-0.5 block">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= COMPACT VERSION =============

export function CommentatorCompact({ 
  messages, 
  className = '' 
}: Pick<CommentatorProps, 'messages' | 'className'>) {
  const latestMessage = messages[0];

  return (
    <div className={`${className}`}>
      <AnimatePresence mode="wait">
        {latestMessage ? (
          <motion.div
            key={latestMessage.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full
              ${EVENT_BG[latestMessage.eventType]}
              ${EVENT_COLORS[latestMessage.eventType]}
              border backdrop-blur-sm
            `}
          >
            <motion.span 
              className="text-lg"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              🎙️
            </motion.span>
            <p className="text-sm font-medium truncate max-w-md">
              {latestMessage.text}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="flex items-center gap-2 px-4 py-2 text-gray-500"
          >
            <span>🎙️</span>
            <span className="text-sm italic">Waiting...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============= INLINE TICKER VERSION =============

export function CommentatorTicker({ 
  messages,
  className = '' 
}: Pick<CommentatorProps, 'messages' | 'className'>) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 bg-gray-900/80 backdrop-blur-sm border-y border-gray-800 py-2 px-4">
        <motion.span 
          className="text-lg flex-shrink-0"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🎙️
        </motion.span>
        
        <div className="flex-1 overflow-hidden">
          <motion.div
            className="flex gap-8 whitespace-nowrap"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ 
              duration: 30, 
              repeat: Infinity, 
              ease: 'linear' 
            }}
          >
            {/* Duplicate messages for seamless loop */}
            {[...messages, ...messages].map((message, index) => (
              <span 
                key={`${message.id}-${index}`}
                className={`inline-flex items-center gap-2 ${EVENT_COLORS[message.eventType]}`}
              >
                <span className="text-sm font-medium">{message.text}</span>
                <span className="text-gray-600">•</span>
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ============= UTILS =============

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  
  return new Date(timestamp).toLocaleTimeString();
}

export default Commentator;
