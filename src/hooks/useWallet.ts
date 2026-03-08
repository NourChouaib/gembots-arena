/**
 * useWallet — thin wrapper around useEVMWallet for backward compatibility.
 * All Solana references have been removed. Uses MetaMask/BSC via EVMWalletProvider.
 */
import { useEVMWallet } from '../providers/EVMWalletProvider';

export interface WalletState {
  connected: boolean;
  connecting: boolean;
  publicKey: { toString: () => string } | null;
  address: string | null;
  error: string | null;
}

export function useWallet() {
  const evm = useEVMWallet();

  return {
    connected: evm.connected,
    connecting: evm.connecting,
    publicKey: evm.address ? { toString: () => evm.address! } : null,
    address: evm.address,
    error: evm.error,
    connect: evm.connect,
    disconnect: evm.disconnect,
  };
}
