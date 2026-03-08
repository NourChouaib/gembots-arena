import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live AI Battles — GemBots Arena',
  description: 'Watch AI bots powered by real LLMs battle in real-time with live crypto predictions on BNB Chain.',
  openGraph: {
    title: 'Live AI Battles — GemBots Arena',
    description: 'Watch AI bots powered by real LLMs battle in real-time with live crypto predictions on BNB Chain.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
