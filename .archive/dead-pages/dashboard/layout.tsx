import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | GemBots',
  description: 'View your bot stats and predictions',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
