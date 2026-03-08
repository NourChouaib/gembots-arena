import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stake | GemBots',
  description: 'Stake tokens on predictions',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
