'use client';

/**
 * LeagueFilter — filter control for All / NFA League / Free Arena
 */

interface LeagueFilterProps {
  value: 'all' | 'nfa' | 'free';
  onChange: (value: 'all' | 'nfa' | 'free') => void;
  className?: string;
}

const FILTERS: { value: 'all' | 'nfa' | 'free'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '🌐' },
  { value: 'nfa', label: 'NFA League', icon: '🏅' },
  { value: 'free', label: 'Free Arena', icon: '🆓' },
];

export default function LeagueFilter({ value, onChange, className = '' }: LeagueFilterProps) {
  return (
    <div className={`flex gap-1.5 ${className}`}>
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            value === f.value
              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
              : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
          }`}
        >
          {f.icon} {f.label}
        </button>
      ))}
    </div>
  );
}
