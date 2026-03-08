'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, FC } from 'react';
import { ethers } from 'ethers';

// ============================================================================
// BSC Chain Configuration
// ============================================================================

const BSC_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_BSC_CHAIN_ID || '56');
const BSC_RPC_URL = process.env.NEXT_PUBLIC_BSC_RPC || 'https://bsc-dataseed.binance.org/';

const BSC_CHAIN_CONFIG = {
  chainId: `0x${BSC_CHAIN_ID.toString(16)}`,
  chainName: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: [BSC_RPC_URL],
  blockExplorerUrls: ['https://bscscan.com'],
};

// ============================================================================
// Context Types
// ============================================================================

interface EVMWalletContextType {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  balance: string | null;
  chainId: number | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToBSC: () => Promise<boolean>;
}

const EVMWalletContext = createContext<EVMWalletContextType>({
  connected: false,
  connecting: false,
  address: null,
  signer: null,
  provider: null,
  balance: null,
  chainId: null,
  error: null,
  connect: async () => {},
  disconnect: () => {},
  switchToBSC: async () => false,
});

export const useEVMWallet = () => useContext(EVMWalletContext);

// ============================================================================
// Provider Component
// ============================================================================

interface Props {
  children: ReactNode;
}

export const EVMWalletProvider: FC<Props> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get ethereum provider from window
  const getEthereum = useCallback(() => {
    if (typeof window === 'undefined') return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).ethereum || null;
  }, []);

  // Fetch balance
  const fetchBalance = useCallback(async (prov: ethers.BrowserProvider, addr: string) => {
    try {
      const bal = await prov.getBalance(addr);
      setBalance(ethers.formatEther(bal));
    } catch {
      setBalance(null);
    }
  }, []);

  // Switch to BSC network
  const switchToBSC = useCallback(async (): Promise<boolean> => {
    const ethereum = getEthereum();
    if (!ethereum) return false;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_CHAIN_CONFIG.chainId }],
      });
      return true;
    } catch (switchError: unknown) {
      // Chain not added — try adding it
      const err = switchError as { code?: number };
      if (err.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_CHAIN_CONFIG],
          });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }, [getEthereum]);

  // Connect wallet
  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      // On mobile, redirect to MetaMask in-app browser via deep link
      if (typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
        return;
      }
      setError('No EVM wallet detected. Install MetaMask or Trust Wallet.');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      // Request accounts
      const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      // Check chain
      const currentChainId = await ethereum.request({ method: 'eth_chainId' });
      const currentChainNum = parseInt(currentChainId, 16);

      if (currentChainNum !== BSC_CHAIN_ID) {
        const switched = await switchToBSC();
        if (!switched) {
          setError('Please switch to BNB Smart Chain in your wallet');
          setConnecting(false);
          return;
        }
      }

      // Create provider + signer
      const browserProvider = new ethers.BrowserProvider(ethereum);
      const walletSigner = await browserProvider.getSigner();
      const walletAddress = await walletSigner.getAddress();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(walletSigner);
      setAddress(walletAddress);
      setChainId(Number(network.chainId));
      setConnected(true);

      // Fetch balance
      fetchBalance(browserProvider, walletAddress);

      // Persist connection preference
      localStorage.setItem('evm_wallet_connected', 'true');
    } catch (err: unknown) {
      const e = err as { message?: string; code?: number };
      if (e.code === 4001) {
        setError('Connection rejected by user');
      } else {
        setError(e.message || 'Failed to connect wallet');
      }
    } finally {
      setConnecting(false);
    }
  }, [getEthereum, switchToBSC, fetchBalance]);

  // Disconnect
  const disconnect = useCallback(() => {
    setConnected(false);
    setAddress(null);
    setSigner(null);
    setProvider(null);
    setBalance(null);
    setChainId(null);
    setError(null);
    localStorage.removeItem('evm_wallet_connected');
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (!mounted) return;
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (connected) {
        // Re-establish connection with new account
        connect();
      }
    };

    const handleChainChanged = () => {
      // Re-establish connection on chain change
      if (connected) {
        connect();
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [mounted, connected, connect, disconnect, getEthereum]);

  // Auto-reconnect if previously connected
  useEffect(() => {
    if (!mounted) return;
    const wasConnected = localStorage.getItem('evm_wallet_connected');
    if (wasConnected === 'true') {
      const ethereum = getEthereum();
      if (ethereum) {
        connect();
      }
    }
  }, [mounted, connect, getEthereum]);

  // Refresh balance periodically
  useEffect(() => {
    if (!connected || !provider || !address) return;
    const interval = setInterval(() => {
      fetchBalance(provider, address);
    }, 15000);
    return () => clearInterval(interval);
  }, [connected, provider, address, fetchBalance]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <EVMWalletContext.Provider
      value={{
        connected,
        connecting,
        address,
        signer,
        provider,
        balance,
        chainId,
        error,
        connect,
        disconnect,
        switchToBSC,
      }}
    >
      {children}
    </EVMWalletContext.Provider>
  );
};

export default EVMWalletProvider;
