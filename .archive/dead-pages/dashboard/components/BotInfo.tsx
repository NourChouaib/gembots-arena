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

interface BotInfoProps {
  bot: Bot;
}

export function BotInfo({ bot }: BotInfoProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="bg-[--surface] rounded-2xl p-6 neon-box">
      <h3 className="text-xl font-bold font-orbitron mb-4 text-[--secondary]">
        Bot Information
      </h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[--muted] mb-1">
              Bot Name
            </label>
            <p className="text-lg font-semibold">{bot.name}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[--muted] mb-1">
              Bot ID
            </label>
            <p className="text-lg font-semibold">#{bot.id}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[--muted] mb-1">
              Created Date
            </label>
            <p className="text-lg">{formatDate(bot.created_at)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[--muted] mb-1">
              Wallet Address
            </label>
            <div className="flex items-center space-x-2">
              <p className="text-lg font-mono">{formatAddress(bot.wallet_address)}</p>
              <button
                onClick={() => copyToClipboard(bot.wallet_address)}
                className="p-1 hover:bg-[--primary]/20 rounded transition-colors"
                title="Copy full address"
              >
                <svg className="w-4 h-4 text-[--primary]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-[--muted] mt-1">{bot.wallet_address}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[--muted] mb-1">
              Last Active
            </label>
            <p className="text-lg">
              {bot.last_active_at 
                ? formatDate(bot.last_active_at)
                : 'Never'
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[--muted] mb-1">
              Status
            </label>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                bot.last_active_at ? 'bg-[--secondary] animate-pulse-glow' : 'bg-gray-500'
              }`}></div>
              <span className="text-lg">
                {bot.last_active_at ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}