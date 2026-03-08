'use client';

import { useEffect, useState } from 'react';

interface HeatmapData {
  model_name: string;
  category_id: string;
  battles: number;
  wins: number;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
}

interface InsightsResponse {
  heatmap: HeatmapData[];
  categories: Category[];
}

function getCellBg(winRate: number): string {
  if (winRate >= 65) return 'rgba(134, 239, 172, 0.20)'; // soft green
  if (winRate >= 55) return 'rgba(134, 239, 172, 0.12)'; // very light green
  if (winRate >= 45) return 'rgba(148, 163, 184, 0.08)'; // neutral gray
  if (winRate >= 35) return 'rgba(251, 191, 146, 0.15)'; // soft warm
  return 'rgba(252, 165, 165, 0.15)'; // soft rose
}

function getCellTextClass(winRate: number): string {
  if (winRate >= 60) return 'text-emerald-300';
  if (winRate >= 45) return 'text-gray-300';
  return 'text-rose-300/70';
}

export default function NeuralRingInsights() {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch('/api/insights');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data: InsightsResponse = await res.json();
        setInsights(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen text-gray-400">Загрузка...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-rose-400">Ошибка: {error}</div>;
  }

  if (!insights || insights.heatmap.length === 0) {
    return <div className="flex justify-center items-center min-h-screen text-gray-400">Нет данных для отображения.</div>;
  }

  const { heatmap, categories } = insights;

  // Group heatmap data by model
  const modelsMap = new Map<string, { totalWins: number; totalBattles: number; categories: Map<string, { wins: number; battles: number }> }>();

  heatmap.forEach((data) => {
    if (!modelsMap.has(data.model_name)) {
      modelsMap.set(data.model_name, { totalWins: 0, totalBattles: 0, categories: new Map() });
    }
    const modelData = modelsMap.get(data.model_name)!;
    modelData.categories.set(data.category_id, { wins: data.wins, battles: data.battles });
    modelData.totalWins += data.wins;
    modelData.totalBattles += data.battles;
  });

  const sortedModelNames = Array.from(modelsMap.keys()).sort();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8 text-emerald-400">📊 Тепловая карта Win Rate</h1>
      <div className="bg-gray-900 rounded-xl shadow-lg p-4">
        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-full table-auto border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-800/50">
                <th className="sticky left-0 bg-gray-800/50 px-4 py-3 text-left text-sm font-semibold text-gray-300 uppercase tracking-wider rounded-tl-lg z-10 border-r border-gray-700">
                  Модель
                </th>
                {categories.map((category) => (
                  <th
                    key={category.id}
                    title={category.name}
                    className="px-4 py-3 text-center text-sm font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700"
                  >
                    {category.emoji}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300 uppercase tracking-wider rounded-tr-lg">
                  Общий WR
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sortedModelNames.map((modelName) => {
                const modelData = modelsMap.get(modelName)!;
                const overallWinRate = modelData.totalBattles > 0 ? (modelData.totalWins / modelData.totalBattles) * 100 : 0;

                return (
                  <tr key={modelName} className="hover:bg-gray-800/30 transition-colors duration-200">
                    <td className="sticky left-0 bg-gray-900 px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-200 border-r border-gray-700">
                      {modelName}
                    </td>
                    {categories.map((category) => {
                      const catStats = modelData.categories.get(category.id);
                      const winRate = catStats && catStats.battles >= 5 ? (catStats.wins / catStats.battles) * 100 : null;
                      const displayValue = winRate !== null ? `${winRate.toFixed(1)}%` : '—';

                      return (
                        <td
                          key={`${modelName}-${category.id}`}
                          className="px-4 py-4 whitespace-nowrap text-sm text-center"
                          style={{ backgroundColor: winRate !== null ? getCellBg(winRate) : '' }}
                        >
                          <span className={winRate !== null ? getCellTextClass(winRate) : 'text-gray-700'}>
                            {displayValue}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                      <span className={getCellTextClass(overallWinRate)}>
                        {overallWinRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
