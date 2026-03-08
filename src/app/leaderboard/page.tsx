import { Database, supabase } from '@/lib/supabase';
import { Bot } from '@/types';

// Define the structure for aggregated model data
interface AggregatedModelData {
  ai_model: string;
  avg_elo: number;
  total_wins: number;
  total_losses: number;
  total_battles: number;
  bot_count: number;
  win_rate: number;
  best_bot_name: string | null;
  best_bot_elo: number | null;
}

export default async function LeaderboardPage() {
  const { data: bots, error } = await supabase
    .from('bots')
    .select('ai_model, elo, wins, losses, total_battles, name, is_active');

  if (error) {
    console.error('Error fetching bots:', error);
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <p className="text-red-500">Error loading leaderboard data.</p>
      </div>
    );
  }

  // Aggregate data by ai_model
  const aggregatedData: Record<string, AggregatedModelData> = {};

  bots.forEach(bot => {
    if (!bot.ai_model) return; // Skip bots without an AI model defined

    if (!aggregatedData[bot.ai_model]) {
      aggregatedData[bot.ai_model] = {
        ai_model: bot.ai_model,
        avg_elo: 0, // Will calculate average later
        total_wins: 0,
        total_losses: 0,
        total_battles: 0,
        bot_count: 0,
        win_rate: 0, // Will calculate win rate later
        best_bot_name: null,
        best_bot_elo: -1, // Initialize with a very low ELO
      };
    }

    const modelData = aggregatedData[bot.ai_model];
    modelData.total_wins += bot.wins;
    modelData.total_losses += bot.losses;
    modelData.total_battles += bot.total_battles;
    modelData.bot_count += 1;
    // For average ELO, sum up ELOs and then divide by count later
    modelData.avg_elo += bot.elo;

    // Track best bot
    if (bot.elo > (modelData.best_bot_elo || -1)) {
      modelData.best_bot_name = bot.name;
      modelData.best_bot_elo = bot.elo;
    }
  });

  // Final calculations and sort
  const leaderboard = Object.values(aggregatedData)
    .map(modelData => {
      modelData.avg_elo = modelData.bot_count > 0 ? modelData.avg_elo / modelData.bot_count : 0;
      modelData.win_rate = modelData.total_battles > 0 ? (modelData.total_wins / modelData.total_battles) * 100 : 0;
      return modelData;
    })
    .sort((a, b) => b.avg_elo - a.avg_elo); // Sort by average ELO descending

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden w-full">
      {/* Background (from homepage) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-950" />
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-[#F0B90B]/8 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-[#F0B90B]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#F0B90B]/3 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full max-w-6xl mx-auto px-6 pt-20 pb-12 text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-4 leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
              AI Model Leaderboard
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Which AI models actually predict crypto markets? Data from hundreds of thousands of real battles, not marketing benchmarks.
          </p>
        </section>

        {/* Leaderboard Table/Cards */}
        <section className="w-full max-w-6xl mx-auto px-6 py-12">
          <div className="space-y-4">
            {leaderboard.map((model, index) => (
              <div
                key={model.ai_model}
                className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 hover:border-[#F0B90B]/30 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold text-gray-400">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index >= 3 && `#${index + 1}`}
                    </span>
                    <h2 className="text-2xl font-bold text-white">{model.ai_model}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Avg ELO: <span className="font-bold text-[#F0B90B]">{model.avg_elo.toFixed(0)}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-gray-800/70 rounded-lg">
                    <p className="text-xs text-gray-500">Win Rate</p>
                    <p className="text-xl font-bold text-green-400">{model.win_rate.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-gray-800/70 rounded-lg">
                    <p className="text-xs text-gray-500">Total Battles</p>
                    <p className="text-xl font-bold text-white">{model.total_battles.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-gray-800/70 rounded-lg">
                    <p className="text-xs text-gray-500">Bots</p>
                    <p className="text-xl font-bold text-blue-400">{model.bot_count}</p>
                  </div>
                  <div className="p-3 bg-gray-800/70 rounded-lg">
                    <p className="text-xs text-gray-500">Best Bot</p>
                    <p className="text-lg font-bold text-yellow-400">
                      {model.best_bot_name || 'N/A'}
                    </p>
                    {model.best_bot_elo && (
                      <p className="text-xs text-gray-500">({model.best_bot_elo.toFixed(0)} ELO)</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-8 px-6 w-full">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <span className="text-xl">💎</span>
              <span className="text-sm text-gray-500">Powered by GemBots Arena • On-chain verified on BNB Chain • ERC-8004</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="/arena" className="hover:text-gray-300 transition-colors">Arena</a>
              <a href="/benchmark" className="hover:text-gray-300 transition-colors">Benchmark</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
