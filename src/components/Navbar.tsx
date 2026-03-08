'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useEVMWallet } from '@/providers/EVMWalletProvider';

const NAV_LINKS: { href: string; label: string; badge?: string }[] = [
  { href: '/watch', label: '⚔️ Arena' },
  { href: '/collection', label: '🤖 Collection' },
  { href: '/leaderboard', label: '🏆 Leaderboard' },
  { href: '/trading', label: '💰 Trading' },
  { href: '/forge', label: '🔮 AI Forge', badge: 'NEW' },
  { href: '/mint', label: '⚡ Mint' },
];

const BETTING_NETWORK = process.env.NEXT_PUBLIC_BETTING_NETWORK || 'solana';

function BSCWalletButton() {
  const { connected, connecting, address, balance, connect, disconnect, error } = useEVMWallet();
  const [showError, setShowError] = useState(false);

  const handleConnect = async () => {
    // Check if MetaMask/EVM wallet exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
    if (!ethereum) {
      // No wallet — open MetaMask install/deeplink
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        // Deep link to MetaMask mobile app
        window.open(`https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`, '_blank');
      } else {
        window.open('https://metamask.io/download/', '_blank');
      }
      return;
    }
    await connect();
  };

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (connected && address) {
    return (
      <button
        onClick={disconnect}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all"
      >
        <span className="text-[10px] font-bold text-yellow-400">BNB</span>
        <span className="text-xs font-mono text-gray-300">
          {address.slice(0, 4)}...{address.slice(-4)}
        </span>
        {balance && (
          <span className="text-[10px] font-mono text-yellow-400/70">
            {parseFloat(balance).toFixed(3)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-xs font-bold hover:shadow-[0_0_10px_rgba(234,179,8,0.3)] transition-all disabled:opacity-50"
      >
        {connecting ? (
          <>
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting...
          </>
        ) : (
          <>🦊 Connect BSC</>
        )}
      </button>
      {showError && error && (
        <div className="absolute top-full mt-2 right-0 bg-red-900/90 border border-red-500/50 text-red-200 text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

function NetworkBadge() {
  if (BETTING_NETWORK === 'bsc') {
    return (
      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-[10px] font-bold text-yellow-400">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        BNB Chain
      </span>
    );
  }
  return (
    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-bold text-purple-400">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
      Solana
    </span>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="relative z-50 sticky top-0 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
      <div className="w-full max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo + Network Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                <span className="text-3xl">💎</span> GemBots
              </h1>
            </Link>
            <NetworkBadge />
          </div>

          {/* Desktop nav links + Wallet */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors font-medium flex items-center gap-1.5 ${
                  isActive(link.href)
                    ? 'text-[#F0B90B] font-semibold'
                    : 'text-gray-300 hover:text-[#F0B90B]'
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 leading-none">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
            {/* BSC Wallet Button (only show for BSC network) */}
            {BETTING_NETWORK === 'bsc' && <BSCWalletButton />}
          </div>

          {/* Mobile: wallet + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {BETTING_NETWORK === 'bsc' && <BSCWalletButton />}
            <button
              className="p-2 text-gray-300 hover:text-white transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden mt-3 pb-2 border-t border-gray-800 pt-3 flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isActive(link.href)
                    ? 'text-[#F0B90B] bg-gray-800/50 font-semibold'
                    : 'text-gray-300 hover:text-[#F0B90B] hover:bg-gray-800/30'
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 leading-none">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
