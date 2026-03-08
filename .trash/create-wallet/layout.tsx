import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Wallet | GemBots',
  description: 'Create a new Solana wallet for your GemBots',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
