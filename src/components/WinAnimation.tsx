'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface WinAnimationProps {
  isWin: boolean;
  multiplier?: number;
}

export default function WinAnimation({ isWin, multiplier }: WinAnimationProps) {
  useEffect(() => {
    if (!isWin) return;

    // Basic confetti
    const fireConfetti = () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00F0FF', '#FF00FF', '#FFD700', '#10B981', '#8B5CF6']
      });
    };

    // Special animation for big wins
    const fireBigWinConfetti = () => {
      // Left side
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0.1, y: 0.7 },
        colors: ['#FFD700', '#FFC107', '#FF9800']
      });
      
      // Right side  
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 0.9, y: 0.7 },
        colors: ['#FFD700', '#FFC107', '#FF9800']
      });

      // Center burst
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 160,
          origin: { y: 0.6 },
          colors: ['#00F0FF', '#FF00FF', '#FFD700']
        });
      }, 200);
    };

    // Trigger appropriate animation based on multiplier
    if (multiplier && multiplier >= 100) {
      // Epic win animation for 100x+
      fireBigWinConfetti();
      setTimeout(fireBigWinConfetti, 500);
      setTimeout(fireBigWinConfetti, 1000);
    } else if (multiplier && multiplier >= 50) {
      // Big win animation for 50x+
      fireBigWinConfetti();
      setTimeout(fireConfetti, 500);
    } else if (multiplier && multiplier >= 10) {
      // Good win animation for 10x+
      fireConfetti();
      setTimeout(fireConfetti, 300);
    } else {
      // Regular win animation
      fireConfetti();
    }
  }, [isWin, multiplier]);

  return null; // This component only handles side effects
}

// Hook for programmatically triggering confetti
export const useWinAnimation = () => {
  const triggerWin = (multiplier: number = 1) => {
    if (multiplier >= 100) {
      // Epic win
      [...Array(3)].forEach((_, i) => {
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 180,
            origin: { y: 0.4 },
            colors: ['#FFD700', '#FFC107', '#FF6B6B', '#4ECDC4', '#45B7D1']
          });
        }, i * 300);
      });
    } else if (multiplier >= 50) {
      // Big win
      [...Array(2)].forEach((_, i) => {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 120,
            origin: { y: 0.5 },
            colors: ['#00F0FF', '#FF00FF', '#FFD700']
          });
        }, i * 200);
      });
    } else if (multiplier >= 10) {
      // Good win
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#8B5CF6']
      });
    } else {
      // Regular win
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00F0FF', '#FF00FF']
      });
    }
  };

  return { triggerWin };
};