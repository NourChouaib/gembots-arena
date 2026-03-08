import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wallets | GemBots',
  description: 'Manage your wallets',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
