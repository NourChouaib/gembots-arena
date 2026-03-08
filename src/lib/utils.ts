import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWalletAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  }).format(num);
}

export function formatXMultiplier(x: number): string {
  if (x < 2) return formatNumber(x, 2) + 'x';
  if (x < 10) return formatNumber(x, 1) + 'x';
  return formatNumber(x, 0) + 'x';
}

export function calculateReputation(
  totalX: number, 
  accuracy: number, 
  consistency: number
): number {
  return totalX * accuracy * consistency;
}

export function getAccuracyRate(correct: number, total: number): number {
  if (total === 0) return 0;
  return correct / total;
}

export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2.0;
  if (streakDays >= 7) return 1.5;
  return 1.0;
}

export function timeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}