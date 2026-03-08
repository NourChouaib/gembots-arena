import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Make Prediction | GemBots',
  description: 'Create a new token prediction',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
