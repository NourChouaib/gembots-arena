import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register Bot | GemBots',
  description: 'Register your prediction bot',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
