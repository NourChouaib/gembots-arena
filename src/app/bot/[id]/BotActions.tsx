'use client';

import { useState, useCallback } from 'react';
import { useEVMWallet } from '@/providers/EVMWalletProvider';
import {
  fundAgent,
  withdrawFromAgent,
  pauseAgent,
  unpauseAgent,
  AgentStatus,
} from '@/lib/nfa';
import type { NFAData } from '@/lib/nfa';

interface BotActionsProps {
  nfa: NFAData;
  onRefresh: () => void;
}

export function BotActions({ nfa, onRefresh }: BotActionsProps) {
  const { connected, address, signer } = useEVMWallet();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('0.01');
  const [showFundModal, setShowFundModal] = useState(false);
  const [txMessage, setTxMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isOwner = connected && address && nfa.owner.toLowerCase() === address.toLowerCase();
  const status = nfa.state?.status ?? AgentStatus.Active;
  const isActive = status === AgentStatus.Active;
  const isPaused = status === AgentStatus.Paused;
  const balance = nfa.state?.balance ? Number(nfa.state.balance) / 1e18 : 0;

  const handleAction = useCallback(async (action: string) => {
    if (!signer || nfa.nfaId === null) return;
    setActionLoading(action);
    setTxMessage(null);
    try {
      let tx;
      switch (action) {
        case 'fund':
          tx = await fundAgent(signer, nfa.nfaId, fundAmount);
          break;
        case 'withdraw':
          tx = await withdrawFromAgent(signer, nfa.nfaId, balance.toString());
          break;
        case 'pause':
          tx = await pauseAgent(signer, nfa.nfaId);
          break;
        case 'unpause':
          tx = await unpauseAgent(signer, nfa.nfaId);
          break;
        default:
          return;
      }
      if (tx) {
        setTxMessage({ type: 'success', text: `✅ ${action} successful! TX: ${tx.hash?.slice(0, 14) || 'confirmed'}...` });
      }
      setTimeout(onRefresh, 3000);
    } catch (e: any) {
      setTxMessage({ type: 'error', text: `❌ ${action} failed: ${e.message?.slice(0, 100)}` });
    } finally {
      setActionLoading(null);
      setShowFundModal(false);
    }
  }, [signer, nfa.nfaId, fundAmount, balance, onRefresh]);

  if (!isOwner) return null;

  return (
    <>
      {/* TX Message */}
      {txMessage && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          txMessage.type === 'success' ? 'bg-green-900/20 border border-green-500/30 text-green-400' :
          'bg-red-900/20 border border-red-500/30 text-red-400'
        }`}>
          {txMessage.text}
        </div>
      )}

      {/* Owner Actions */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          🔧 Agent Controls
          <span className="text-xs text-gray-500 font-normal">(owner only)</span>
        </h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowFundModal(true)} disabled={!!actionLoading}
            className="px-4 py-2 rounded-lg bg-[#F0B90B]/20 border border-[#F0B90B]/40 text-[#F0B90B] font-medium text-sm hover:bg-[#F0B90B]/30 disabled:opacity-50 transition-all">
            {actionLoading === 'fund' ? '⏳ Funding...' : '💰 Fund Agent'}
          </button>
          <button onClick={() => handleAction('withdraw')} disabled={!!actionLoading || balance === 0}
            className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 font-medium text-sm hover:bg-blue-500/30 disabled:opacity-50 transition-all">
            {actionLoading === 'withdraw' ? '⏳ Withdrawing...' : '💸 Withdraw'}
          </button>
          {isActive ? (
            <button onClick={() => handleAction('pause')} disabled={!!actionLoading}
              className="px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-medium text-sm hover:bg-yellow-500/30 disabled:opacity-50 transition-all">
              {actionLoading === 'pause' ? '⏳...' : '⏸ Pause'}
            </button>
          ) : isPaused ? (
            <button onClick={() => handleAction('unpause')} disabled={!!actionLoading}
              className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 font-medium text-sm hover:bg-green-500/30 disabled:opacity-50 transition-all">
              {actionLoading === 'unpause' ? '⏳...' : '▶️ Unpause'}
            </button>
          ) : null}
          <button onClick={onRefresh}
            className="px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-400 font-medium text-sm hover:bg-gray-700 transition-all">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Fund Modal */}
      {showFundModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowFundModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">💰 Fund Agent</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Amount (BNB)</label>
              <input type="number" step="0.001" min="0.001" value={fundAmount}
                onChange={e => setFundAmount(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:border-[#F0B90B]/50" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleAction('fund')} disabled={!!actionLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-[#F0B90B] text-black font-bold hover:bg-yellow-400 disabled:opacity-50 transition-all">
                {actionLoading === 'fund' ? '⏳ Sending...' : 'Confirm'}
              </button>
              <button onClick={() => setShowFundModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
