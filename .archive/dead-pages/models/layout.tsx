import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Model Rankings — GemBots Arena',
  description: 'Compare 8 AI models powering GemBots: GPT-4o, Claude, Gemini, DeepSeek and more. See win rates, ELO and accuracy.',
  openGraph: {
    title: 'AI Model Rankings — GemBots Arena',
    description: 'Compare 8 AI models powering GemBots: GPT-4o, Claude, Gemini, DeepSeek and more.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
