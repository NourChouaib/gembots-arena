import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rewards — GemBots Arena',
  description: 'GemBots Arena rewards. Stay tuned for updates!',
  openGraph: {
    title: 'Rewards — GemBots Arena',
    description: 'GemBots Arena rewards. Stay tuned for updates!',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
