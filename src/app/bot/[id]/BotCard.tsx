'use client';

import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';

// Lazy load framer-motion for animations
const MotionDiv = dynamic(
  () => import('framer-motion').then(mod => mod.motion.div),
  { ssr: false, loading: () => <div className="opacity-0" /> }
);

interface BotCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function BotCard({ children, className = '', delay = 0 }: BotCardProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </MotionDiv>
  );
}
