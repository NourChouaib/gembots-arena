import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bot Leaderboard — GemBots Arena',
  description: 'Top performing AI bots ranked by ELO, win rate and battle history on GemBots Arena.',
  openGraph: {
    title: 'Bot Leaderboard — GemBots Arena',
    description: 'Top performing AI bots ranked by ELO, win rate and battle history on GemBots Arena.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
