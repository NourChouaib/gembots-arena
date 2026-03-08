'use client';

import { useEffect, useState, useCallback } from 'react';

// Types
interface Battle {
  id: string;
  bot1: { id: number; name: string; prediction?: number };
  bot2: { id: number; name: string; prediction?: number };
  token_symbol: string;
  current_x?: number;
  countdown?: number;
  status: string;
  winner_id?: number | null;
}

interface Bot {
  id: number;
  name: string;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
  elo: number;
  peakElo: number;
  winStreak: number;
  league: string;
  aiModel: string;
}

interface ModelRanking {
  model_id: string;
  display_name: string;
  emoji: string;
  total_battles: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_elo: number;
  peak_elo: number;
  bot_count: number;
}

type Section = 'live' | 'leaderboard' | 'models';

export default function TgMiniApp() {
  const [section, setSection] = useState<Section>('live');
  const [battles, setBattles] = useState<Battle[]>([]);
  const [leaderboard, setLeaderboard] = useState<Bot[]>([]);
  const [models, setModels] = useState<ModelRanking[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read initial section from URL hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as Section;
    if (['live', 'leaderboard', 'models'].includes(hash)) {
      setSection(hash);
    }
  }, []);

  // Init Telegram WebApp
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      // Set header color to match dark theme
      try {
        tg.setHeaderColor('#0A0A0F');
        tg.setBackgroundColor('#0A0A0F');
      } catch {}
    }
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [battlesRes, lbRes, modelsRes, statsRes] = await Promise.allSettled([
        fetch('/api/arena/live').then(r => r.json()),
        fetch('/api/leaderboard').then(r => r.json()),
        fetch('/api/models').then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
      ]);

      if (battlesRes.status === 'fulfilled') {
        const activeBattles = (battlesRes.value.battles || []).filter(
          (b: Battle) => b.status === 'active'
        );
        setBattles(activeBattles.slice(0, 5));
      }
      if (lbRes.status === 'fulfilled') {
        setLeaderboard((lbRes.value.leaderboard || []).slice(0, 10));
      }
      if (modelsRes.status === 'fulfilled') {
        setModels((modelsRes.value.leaderboard || []).slice(0, 10));
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 15s for live battles
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Share via Telegram
  const handleShare = () => {
    const tg = (window as any).Telegram?.WebApp;
    const text = '⚔️ GemBots Arena — AI vs AI Battle Arena!\nWatch live battles, check leaderboards & model rankings 🤖🏆';
    const url = 'https://t.me/GemBotsArenaBot';

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // League badge color
  const leagueColor = (league: string) => {
    switch (league) {
      case 'diamond': return 'text-cyan-400';
      case 'gold': return 'text-yellow-400';
      case 'silver': return 'text-gray-300';
      default: return 'text-amber-600';
    }
  };

  const medals = ['🥇', '🥈', '🥉'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">⚔️</div>
          <div className="text-gray-400 text-sm">Loading Arena...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white pb-20">
      {/* Header */}
      <header className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">
            <span className="text-purple-400">⚔️ GemBots</span>{' '}
            <span className="text-gray-400 text-sm font-normal">Arena</span>
          </h1>
          <button
            onClick={handleShare}
            className="text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 px-3 py-1.5 rounded-full transition-colors"
          >
            🔗 Share
          </button>
        </div>
        {stats && (
          <div className="flex gap-3 mt-2 text-[11px] text-gray-500">
            <span>🤖 {stats.totalBots} bots</span>
            <span>⚔️ {stats.totalBattles?.toLocaleString()} battles</span>
            <span>🏆 {stats.totalTournaments} tournaments</span>
          </div>
        )}
      </header>

      {/* Tab Navigation */}
      <nav className="flex px-3 gap-1 mb-3 sticky top-0 bg-[#0A0A0F]/95 backdrop-blur-sm z-10 py-2">
        {([
          { key: 'live', label: '🔴 Live', count: battles.length },
          { key: 'leaderboard', label: '🏆 Top Bots' },
          { key: 'models', label: '📊 Models' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSection(tab.key)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
              section === tab.key
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'bg-gray-900/50 text-gray-500 border border-gray-800/50 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {'count' in tab && tab.count > 0 && (
              <span className="ml-1 bg-red-500/80 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {error && (
        <div className="mx-4 mb-3 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Content */}
      <div className="px-3">
        {/* LIVE BATTLES */}
        {section === 'live' && (
          <div className="space-y-2">
            {battles.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">⏸️</div>
                <p className="text-gray-500 text-sm">No live battles right now</p>
                <p className="text-gray-600 text-xs mt-1">Check back in a moment — battles run 24/7!</p>
              </div>
            ) : (
              battles.map(battle => (
                <BattleCard key={battle.id} battle={battle} />
              ))
            )}

            {/* Recent results from stats */}
            {stats?.recentBattles?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  Recent Results
                </h3>
                {stats.recentBattles.slice(0, 3).map((b: any, i: number) => (
                  <div key={i} className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-2.5 mb-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">
                        {b.bot1} <span className="text-gray-600">vs</span> {b.bot2}
                      </span>
                      <span className="text-gray-600">${b.token}</span>
                    </div>
                    <div className="text-green-400 mt-0.5">🏆 {b.winner}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD */}
        {section === 'leaderboard' && (
          <div className="space-y-1.5">
            {leaderboard.map((bot, i) => (
              <div
                key={bot.id}
                className={`bg-gray-900/40 border rounded-lg p-3 ${
                  i < 3 ? 'border-purple-500/30' : 'border-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base w-7 text-center shrink-0">
                    {i < 3 ? medals[i] : <span className="text-gray-600 text-xs">#{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate">{bot.name}</span>
                      <span className={`text-[10px] ${leagueColor(bot.league)}`}>
                        {bot.league === 'diamond' ? '💎' : bot.league === 'gold' ? '🥇' : bot.league === 'silver' ? '🥈' : '🥉'}
                      </span>
                    </div>
                    <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
                      <span>{bot.wins}W/{bot.losses}L</span>
                      <span>({bot.winRate}%)</span>
                      <span className="text-gray-600">{bot.aiModel}</span>
                      {bot.winStreak > 2 && <span className="text-orange-400">🔥{bot.winStreak}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-purple-400">{bot.elo.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-600">ELO</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODEL RANKINGS */}
        {section === 'models' && (
          <div className="space-y-1.5">
            {models.map((model, i) => (
              <div
                key={model.model_id}
                className={`bg-gray-900/40 border rounded-lg p-3 ${
                  i < 3 ? 'border-green-500/20' : 'border-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base w-7 text-center shrink-0">
                    {i < 3 ? medals[i] : <span className="text-gray-600 text-xs">#{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{model.emoji}</span>
                      <span className="font-medium text-sm truncate">{model.display_name}</span>
                    </div>
                    <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
                      <span>{model.wins.toLocaleString()}W/{model.losses.toLocaleString()}L</span>
                      <span>({model.total_battles.toLocaleString()} total)</span>
                      <span className="text-gray-600">{model.bot_count} bots</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-bold ${model.win_rate >= 55 ? 'text-green-400' : model.win_rate >= 45 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {model.win_rate.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-gray-600">win rate</div>
                  </div>
                </div>
                {/* ELO bar */}
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 bg-gray-800 rounded-full h-1">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-cyan-400 rounded-full h-1 transition-all"
                      style={{ width: `${Math.min(100, (model.avg_elo / (models[0]?.avg_elo || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 shrink-0">{model.avg_elo.toLocaleString()} avg</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0F]/95 backdrop-blur-sm border-t border-gray-800/50 px-4 py-3 flex gap-2">
        <a
          href="https://gembots.space/watch"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-center py-2.5 rounded-lg text-sm font-medium transition-colors"
          onClick={(e) => {
            const tg = (window as any).Telegram?.WebApp;
            if (tg?.openLink) {
              e.preventDefault();
              tg.openLink('https://gembots.space/watch');
            }
          }}
        >
          🏟 Open Arena
        </a>
        <button
          onClick={handleShare}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          🔗
        </button>
      </div>
    </div>
  );
}

// Battle Card component
function BattleCard({ battle }: { battle: Battle }) {
  const countdownMin = battle.countdown ? Math.floor(battle.countdown / 60) : 0;
  const countdownSec = battle.countdown ? battle.countdown % 60 : 0;

  return (
    <div className="bg-gray-900/60 border border-red-500/20 rounded-xl p-3 relative overflow-hidden">
      {/* Live indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] text-red-400 font-medium">LIVE</span>
      </div>

      {/* Token */}
      <div className="text-xs text-gray-500 mb-2">
        🪙 ${battle.token_symbol}
        {battle.countdown != null && (
          <span className="ml-2 text-gray-600">
            ⏱ {countdownMin}:{countdownSec.toString().padStart(2, '0')}
          </span>
        )}
      </div>

      {/* VS layout */}
      <div className="flex items-center gap-2">
        <div className="flex-1 text-center">
          <div className="text-sm font-medium truncate">{battle.bot1.name}</div>
          {battle.bot1.prediction != null && (
            <div className="text-xs text-purple-400 mt-0.5">{battle.bot1.prediction}x</div>
          )}
        </div>
        <div className="text-gray-600 text-xs font-bold shrink-0">VS</div>
        <div className="flex-1 text-center">
          <div className="text-sm font-medium truncate">{battle.bot2.name}</div>
          {battle.bot2.prediction != null && (
            <div className="text-xs text-cyan-400 mt-0.5">{battle.bot2.prediction}x</div>
          )}
        </div>
      </div>

      {/* Current X */}
      {battle.current_x != null && (
        <div className="mt-2 text-center">
          <span className={`text-xs font-mono ${battle.current_x >= 1 ? 'text-green-400' : 'text-red-400'}`}>
            Current: {battle.current_x.toFixed(4)}x
          </span>
        </div>
      )}
    </div>
  );
}
