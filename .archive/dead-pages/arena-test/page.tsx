// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function ArenaTestPage() {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const sendTestEvent = async (eventType: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/arena/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventType }),
      });
      
      const data = await res.json();
      setResponse(data);
      console.log('Test event response:', data);
    } catch (error) {
      console.error('Error sending test event:', error);
      setResponse({ error: 'Failed to send test event' });
    } finally {
      setLoading(false);
    }
  };

  const checkWebSocketStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/arena/test');
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error('Error checking status:', error);
      setResponse({ error: 'Failed to check WebSocket status' });
    } finally {
      setLoading(false);
    }
  };

  const initWebSocket = async () => {
    try {
      const res = await fetch('/api/arena/socket');
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      setResponse({ error: 'Failed to initialize WebSocket' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <motion.h1 
          className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🛠️ Arena Test Dashboard
        </motion.h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Controls */}
          <motion.div
            className="bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-purple-300">Test Controls</h2>
            
            <div className="space-y-4">
              <button
                onClick={initWebSocket}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Loading...' : 'Initialize WebSocket'}
              </button>

              <button
                onClick={checkWebSocketStatus}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Loading...' : 'Check WebSocket Status'}
              </button>

              <button
                onClick={() => sendTestEvent('bot_trade')}
                disabled={loading}
                className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Loading...' : 'Send Bot Trade Event'}
              </button>

              <button
                onClick={() => sendTestEvent('moonshot')}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Loading...' : 'Send Moonshot Event'}
              </button>
            </div>
          </motion.div>

          {/* Response Display */}
          <motion.div
            className="bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-2xl font-bold mb-6 text-blue-300">Response</h2>
            
            <div className="bg-gray-900 rounded-lg p-4 min-h-[200px] overflow-auto">
              <pre className="text-sm text-green-400 whitespace-pre-wrap">
                {response ? JSON.stringify(response, null, 2) : 'No response yet...'}
              </pre>
            </div>
          </motion.div>
        </div>

        {/* Arena Link */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <a
            href="/arena"
            className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
          >
            🏟️ Go to Live Arena
          </a>
        </motion.div>

        {/* Instructions */}
        <motion.div
          className="mt-8 bg-black/20 border border-gray-600 rounded-xl p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-xl font-bold mb-4 text-gray-300">Test Instructions</h3>
          <ol className="text-gray-400 space-y-2 list-decimal list-inside">
            <li>First, click "Initialize WebSocket" to start the WebSocket server</li>
            <li>Check "Check WebSocket Status" to verify it's running</li>
            <li>Open the Arena page in another tab: <code className="bg-gray-800 px-2 py-1 rounded">/arena</code></li>
            <li>Send test events and watch them appear in real-time in the Arena</li>
            <li>Try both "Bot Trade Event" and "Moonshot Event" to test different event types</li>
          </ol>
        </motion.div>
      </div>
    </div>
  );
}