'use client';

import { useState, useEffect } from 'react';
import { BotInfo } from './BotInfo';
import { BotStats } from './BotStats';
import { BetsList } from './BetsList';

interface Bot {
  id: number;
  name: string;
  wallet_address: string;
  total_bets: number;
  wins: number;
  losses: number;
  win_rate: number;
  created_at: string;
  last_active_at: string | null;
}

interface Bet {
  id: number;
  token_mint: string;
  token_symbol: string;
  amount_sol: number;
  entry_price: number;
  current_price: number;
  target_multiplier: number;
  status: 'pending' | 'won' | 'lost';
  exit_price: number | null;
  payout_sol: number | null;
  created_at: string;
  resolved_at: string | null;
  potential_payout: number | null;
  current_multiplier: number | null;
}

interface DashboardMainProps {
  apiKey: string;
  onLogout: () => void;
}

export function DashboardMain({ apiKey, onLogout }: DashboardMainProps) {
  const [bot, setBot] = useState<Bot | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchBotData = async () => {
    try {
      const [botResponse, betsResponse] = await Promise.all([
        fetch('/api/v1/bots/me', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }),
        fetch('/api/v1/bots/me/bets', {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        })
      ]);

      if (!botResponse.ok || !betsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const botData = await botResponse.json();
      const betsData = await betsResponse.json();

      if (!botData.success || !betsData.success) {
        throw new Error('Invalid response from server');
      }

      setBot(botData.data);
      setBets(betsData.data.bets);
      setError('');
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Data fetch error:', error);
      setError('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBotData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchBotData, 30000);

    return () => clearInterval(interval);
  }, [apiKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[--primary] border-t-transparent mb-4 mx-auto"></div>
          <p className="text-[--muted]">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchBotData}
            className="bg-gradient-to-r from-[--primary] to-[--secondary] hover:from-[--primary]/80 hover:to-[--secondary]/80 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="text-center">
        <p className="text-[--muted]">No bot data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-orbitron">{bot.name}</h2>
          <p className="text-[--muted] text-sm">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg transition-all"
        >
          Logout
        </button>
      </div>

      {/* Bot Info */}
      <BotInfo bot={bot} />

      {/* Stats */}
      <BotStats bot={bot} />

      {/* Bets List */}
      <BetsList bets={bets} />

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={fetchBotData}
          className="bg-gradient-to-r from-[--primary] to-[--secondary] hover:from-[--primary]/80 hover:to-[--secondary]/80 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
}