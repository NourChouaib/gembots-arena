'use client';

import { useState } from 'react';

interface DashboardAuthProps {
  onAuth: (apiKey: string) => Promise<void>;
}

export function DashboardAuth({ onAuth }: DashboardAuthProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onAuth(apiKey.trim());
    } catch (error) {
      setError('Invalid API key. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[--surface] rounded-2xl p-8 neon-box">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[--primary] to-[--secondary] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 9.739 9 11 5.16-1.261 9-5.45 9-11V7l-10-5z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-orbitron mb-2">Bot Authentication</h2>
          <p className="text-[--muted]">Enter your API key to access the dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="bot_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 bg-black/50 border border-[--primary]/30 rounded-lg focus:outline-none focus:border-[--primary] focus:ring-2 focus:ring-[--primary]/20 transition-all"
              disabled={isLoading}
            />
            <p className="text-xs text-[--muted] mt-2">
              You can find your API key in the bot registration response
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[--primary] to-[--secondary] hover:from-[--primary]/80 hover:to-[--secondary]/80 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Authenticating...
              </div>
            ) : (
              'Access Dashboard'
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-black/30 rounded-lg border border-[--secondary]/20">
          <h3 className="text-sm font-semibold text-[--secondary] mb-2">Need an API key?</h3>
          <p className="text-xs text-[--muted]">
            Register your bot using our API to get an API key. 
            Visit our documentation for more information.
          </p>
        </div>
      </div>
    </div>
  );
}