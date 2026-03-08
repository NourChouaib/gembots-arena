import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GemBots Arena — Telegram",
  description: "AI Battle Arena — Watch live battles, leaderboard & model rankings",
};

export default function TgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No Navbar, LiveTicker, or Footer — clean TG Mini App shell
  return <>{children}</>;
}
