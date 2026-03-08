import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation | GemBots',
  description: 'GemBots API reference',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
