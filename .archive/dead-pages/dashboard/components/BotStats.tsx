'use client';

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

interface BotStatsProps {
  bot: Bot;
}

export function BotStats({ bot }: BotStatsProps) {
  const stats = [
    {
      label: 'Total Bets',
      value: bot.total_bets.toLocaleString(),
      color: 'text-white',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      label: 'Wins',
      value: bot.wins.toLocaleString(),
      color: 'text-[--secondary]',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Losses',
      value: bot.losses.toLocaleString(),
      color: 'text-red-400',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Win Rate',
      value: `${bot.win_rate.toFixed(1)}%`,
      color: bot.win_rate >= 50 ? 'text-[--secondary]' : 'text-yellow-400',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    }
  ];

  return (
    <div className="bg-[--surface] rounded-2xl p-6 neon-box-secondary">
      <h3 className="text-xl font-bold font-orbitron mb-6 text-[--primary]">
        Performance Statistics
      </h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div 
            key={index}
            className="bg-black/30 rounded-xl p-4 border border-[--primary]/20 hover:border-[--primary]/40 transition-all card-hover"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.color} opacity-80`}>
                {stat.icon}
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold font-orbitron ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </div>
            <p className="text-[--muted] text-sm font-medium">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Performance Indicators */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-black/30 rounded-xl p-4 border border-[--secondary]/20">
          <h4 className="text-[--secondary] font-semibold mb-2">Win Rate Progress</h4>
          <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
            <div 
              className="bg-gradient-to-r from-[--primary] to-[--secondary] h-3 rounded-full transition-all duration-1000 animate-glow"
              style={{ width: `${Math.min(bot.win_rate, 100)}%` }}
            ></div>
          </div>
          <p className="text-[--muted] text-sm">
            {bot.win_rate >= 70 ? 'Excellent' : 
             bot.win_rate >= 50 ? 'Good' : 
             bot.win_rate >= 30 ? 'Average' : 'Needs Improvement'}
          </p>
        </div>

        <div className="bg-black/30 rounded-xl p-4 border border-[--primary]/20">
          <h4 className="text-[--primary] font-semibold mb-2">Activity Level</h4>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full animate-pulse-glow ${
              bot.total_bets > 100 ? 'bg-[--secondary]' :
              bot.total_bets > 50 ? 'bg-yellow-400' :
              bot.total_bets > 10 ? 'bg-orange-400' : 'bg-red-400'
            }`}></div>
            <span className="text-sm">
              {bot.total_bets > 100 ? 'Very Active' :
               bot.total_bets > 50 ? 'Active' :
               bot.total_bets > 10 ? 'Moderate' : 'Low Activity'}
            </span>
          </div>
          <p className="text-[--muted] text-sm mt-1">
            Based on total bets placed
          </p>
        </div>
      </div>
    </div>
  );
}