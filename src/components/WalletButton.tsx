'use client';

import { useEVMWallet } from '../providers/EVMWalletProvider';

/**
 * WalletButton — connects to MetaMask/BSC via EVMWalletProvider.
 * Replaces the old Solana/Phantom-based WalletButton.
 */
export default function WalletButton() {
  const { connected, connecting, address, balance, error, connect, disconnect } = useEVMWallet();

  const handleClick = async () => {
    if (connected) {
      disconnect();
    } else {
      // On mobile, redirect to MetaMask deep link if no wallet detected
      const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
      if (!ethereum) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.open(`https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`, '_blank');
          return;
        }
        window.open('https://metamask.io/download/', '_blank');
        return;
      }
      await connect();
    }
  };

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={connecting}
        className={`
          px-6 py-2 rounded-lg font-medium transition-all duration-200
          ${connecting
            ? 'bg-gray-600 cursor-not-allowed'
            : connected
              ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600'
              : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500'
          }
          text-white border border-gray-700 hover:border-yellow-500
          shadow-lg hover:shadow-yellow-500/20
        `}
      >
        {connecting
          ? 'Connecting...'
          : connected
            ? shortAddress
            : 'Connect Wallet'
        }
      </button>

      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-900/80 border border-red-600 rounded text-red-200 text-sm whitespace-nowrap z-50">
          {error}
        </div>
      )}
    </div>
  );
}
