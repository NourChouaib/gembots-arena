'use client';

import { FC, ReactNode } from 'react';

/**
 * WalletProvider — formerly Solana wallet provider, now a passthrough.
 * All wallet functionality is handled by EVMWalletProvider (MetaMask/BSC).
 * This component is kept for backward compatibility with layout.tsx wrapping.
 */
interface Props {
  children: ReactNode;
}

export const WalletProvider: FC<Props> = ({ children }) => {
  return <>{children}</>;
};

export default WalletProvider;
