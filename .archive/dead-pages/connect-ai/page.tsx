'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useEVMWallet } from '@/providers/EVMWalletProvider';

interface BotWithNFA {
  id: number;
  name: string;
  nfa_id: number | null;
  webhook_url: string | null;
  evm_address: string | null;
  wins: number;
  losses: number;
  elo: number;
}

type PingStatus = 'idle' | 'pinging' | 'success' | 'error';

export default function ConnectAIPage() {
  const { connected, address, connect, connecting } = useEVMWallet();
  const [bots, setBots] = useState<BotWithNFA[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<BotWithNFA | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pingStatus, setPingStatus] = useState<PingStatus>('idle');
  const [pingLatency, setPingLatency] = useState<number>(0);

  const fetchBots = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/nfa/bots?address=${address.toLowerCase()}`);
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots || []);
      }
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (connected && address) {
      fetchBots();
    }
  }, [connected, address, fetchBots]);

  const handleSelectBot = (bot: BotWithNFA) => {
    setSelectedBot(bot);
    setWebhookUrl(bot.webhook_url || '');
    setMessage(null);
    setPingStatus('idle');
  };

  const handleTestPing = async () => {
    if (!webhookUrl) return;
    setPingStatus('pinging');
    try {
      const start = Date.now();
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'ping',
          bot_id: selectedBot?.id,
          timestamp: new Date().toISOString(),
        }),
      });
      const latency = Date.now() - start;
      setPingLatency(latency);
      if (res.ok || res.status < 500) {
        setPingStatus('success');
      } else {
        setPingStatus('error');
      }
    } catch {
      setPingStatus('error');
      setPingLatency(0);
    }
  };

  const handleSaveWebhook = async () => {
    if (!selectedBot || !webhookUrl) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/nfa/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: selectedBot.id, webhookUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Webhook connected! ${data.data.ping?.reachable ? '✅ Reachable' : '⚠️ Could not reach — saved anyway'}` });
        setBots(prev => prev.map(b => b.id === selectedBot.id ? { ...b, webhook_url: webhookUrl } : b));
        setSelectedBot(prev => prev ? { ...prev, webhook_url: webhookUrl } : null);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWebhook = async () => {
    if (!selectedBot) return;
    setRemoving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/nfa/webhook', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: selectedBot.id }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Webhook disconnected' });
        setWebhookUrl('');
        setBots(prev => prev.map(b => b.id === selectedBot.id ? { ...b, webhook_url: null } : b));
        setSelectedBot(prev => prev ? { ...prev, webhook_url: null } : null);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/20 via-transparent to-purple-900/20" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                🤖 Connect Your AI
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
              Connect your own neural network to your NFA bot via webhook.
              Your AI will receive market data and respond with predictions during battles.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Not connected */}
        {!connected && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🦊</div>
            <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">Connect MetaMask to see your NFA bots and configure webhook.</p>
            <button
              onClick={connect}
              disabled={connecting}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : '🦊 Connect Wallet'}
            </button>
          </div>
        )}

        {/* Connected — loading */}
        {connected && loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
              <div className="absolute inset-0 rounded-full border-2 border-t-cyan-500 animate-spin" />
            </div>
            <p className="text-gray-400 animate-pulse">Loading your NFA bots...</p>
          </div>
        )}

        {/* Connected — no bots */}
        {connected && !loading && bots.filter(b => b.nfa_id !== null).length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold text-white mb-4">No NFA Bots Found</h2>
            <p className="text-gray-400 mb-6">
              You need an NFA-linked bot to connect your AI. Mint an NFA or link one to your bot first.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/mint" className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-lg transition-all">
                ⚡ Mint NFA
              </Link>
              <Link href="/arena" className="px-6 py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 font-medium hover:text-white transition-all">
                ⚔️ Go to Arena
              </Link>
            </div>
          </div>
        )}

        {/* Connected — has bots */}
        {connected && !loading && bots.filter(b => b.nfa_id !== null).length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Bot List */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-bold text-white mb-4">Your NFA Bots</h3>
              <div className="space-y-3">
                {bots.filter(b => b.nfa_id !== null).map(bot => (
                  <button
                    key={bot.id}
                    onClick={() => handleSelectBot(bot)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedBot?.id === bot.id
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-sm">{bot.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">NFA #{bot.nfa_id} • ELO {bot.elo}</div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${bot.webhook_url ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`} />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-green-400">{bot.wins}W</span>
                      <span className="text-[10px] text-red-400">{bot.losses}L</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        bot.webhook_url 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-700/50 text-gray-500'
                      }`}>
                        {bot.webhook_url ? '🟢 Connected' : '⚫ Not Connected'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configuration Panel */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {!selectedBot ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="text-5xl mb-4">👈</div>
                    <p className="text-gray-400">Select a bot to configure its webhook</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={selectedBot.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Bot Info */}
                    <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
                      <h3 className="text-xl font-bold text-white mb-1">{selectedBot.name}</h3>
                      <p className="text-sm text-gray-400">NFA #{selectedBot.nfa_id} • ELO {selectedBot.elo} • {selectedBot.wins}W/{selectedBot.losses}L</p>
                    </div>

                    {/* Webhook URL */}
                    <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5 space-y-4">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">🔗 Webhook URL</h3>
                      <div className="relative">
                        <input
                          type="url"
                          value={webhookUrl}
                          onChange={(e) => { setWebhookUrl(e.target.value); setPingStatus('idle'); }}
                          placeholder="https://your-server.com/gembots-webhook"
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                        />
                      </div>

                      {/* Test Ping */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleTestPing}
                          disabled={!webhookUrl || pingStatus === 'pinging'}
                          className="px-4 py-2 rounded-lg bg-gray-700 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {pingStatus === 'pinging' ? (
                            <>
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                              Pinging...
                            </>
                          ) : '📡 Test Ping'}
                        </button>
                        {pingStatus === 'success' && (
                          <span className="text-sm text-green-400">✅ Reachable ({pingLatency}ms)</span>
                        )}
                        {pingStatus === 'error' && (
                          <span className="text-sm text-red-400">❌ Unreachable</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleSaveWebhook}
                          disabled={saving || !webhookUrl}
                          className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : selectedBot.webhook_url ? '💾 Update Webhook' : '🔗 Connect Webhook'}
                        </button>
                        {selectedBot.webhook_url && (
                          <button
                            onClick={handleRemoveWebhook}
                            disabled={removing}
                            className="px-6 py-3 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 font-bold hover:bg-red-600/30 transition-all disabled:opacity-50"
                          >
                            {removing ? 'Removing...' : '❌ Disconnect'}
                          </button>
                        )}
                      </div>

                      {/* Message */}
                      {message && (
                        <div className={`p-3 rounded-lg border ${
                          message.type === 'success'
                            ? 'bg-green-900/20 border-green-500/30 text-green-400'
                            : 'bg-red-900/20 border-red-500/30 text-red-400'
                        }`}>
                          <p className="text-sm">{message.text}</p>
                        </div>
                      )}
                    </div>

                    {/* How It Works */}
                    <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📖 How It Works</h3>
                      <div className="space-y-3 text-sm text-gray-400">
                        <div className="flex gap-3">
                          <span className="text-cyan-400 font-bold shrink-0">1.</span>
                          <span>When your bot enters a battle, we POST market data to your webhook</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-cyan-400 font-bold shrink-0">2.</span>
                          <span>Your AI has <strong className="text-white">10 seconds</strong> to respond with a prediction</span>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-cyan-400 font-bold shrink-0">3.</span>
                          <span>If timeout/error → falls back to NFA strategy or preset</span>
                        </div>
                      </div>

                      {/* Request/Response format */}
                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-1 font-bold">REQUEST (we send to you):</div>
                          <pre className="bg-gray-900/70 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto font-mono">
{`POST your-webhook-url
{
  "event": "battle_prediction",
  "battle_id": "uuid",
  "token": {
    "symbol": "BTC",
    "price": 65000,
    "change_1h": 2.5
  },
  "opponent": {
    "name": "DragonScale",
    "elo": 1200
  },
  "deadline_seconds": 10
}`}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1 font-bold">RESPONSE (you return):</div>
                          <pre className="bg-gray-900/70 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto font-mono">
{`{
  "prediction": 1.05,
  "confidence": 0.8
}`}
                          </pre>
                        </div>
                      </div>
                    </div>

                    {/* Quick Start Examples */}
                    <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">⚡ Quick Start</h3>
                      
                      {/* Python Example */}
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-1 font-bold">Python (Flask):</div>
                        <pre className="bg-gray-900/70 rounded-lg p-3 text-xs text-green-400 overflow-x-auto font-mono">
{`from flask import Flask, request, jsonify
app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def predict():
    data = request.json
    token = data['token']
    # Your AI logic here
    prediction = 1.0 + token['change_1h'] / 100
    return jsonify({
        "prediction": round(prediction, 4),
        "confidence": 0.75
    })

app.run(port=8080)`}
                        </pre>
                      </div>

                      {/* Node.js Example */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1 font-bold">Node.js (Express):</div>
                        <pre className="bg-gray-900/70 rounded-lg p-3 text-xs text-yellow-400 overflow-x-auto font-mono">
{`const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const { token, opponent } = req.body;
  // Your AI logic here
  const prediction = 1.0 + token.change_1h / 100;
  res.json({
    prediction: +prediction.toFixed(4),
    confidence: 0.75
  });
});

app.listen(8080);`}
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
