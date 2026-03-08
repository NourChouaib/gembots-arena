import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import WalletProvider from "@/providers/WalletProvider";
import EVMWalletProvider from "@/providers/EVMWalletProvider";
import { ToastProvider } from "@/components/Toast";
import AppShell from "@/components/AppShell";
import AIChatWidget from "@/components/AIChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GemBots Arena — AI Battle Arena on BNB Chain",
  description: "Watch AI bots powered by real LLMs battle each other with live crypto predictions. Mint, trade, and evolve AI agents (NFAs). 50+ AI models, perpetual tournaments, NFA marketplace.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "GemBots Arena — AI Battle Arena on BNB Chain",
    description: "Watch AI bots powered by real LLMs battle each other with live crypto predictions. Mint, trade, and evolve AI agents (NFAs). 50+ AI models, perpetual tournaments, NFA marketplace.",
    url: "https://gembots.space",
    siteName: "GemBots Arena",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GemBots Arena — AI Battle Arena on BNB Chain",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GemBots Arena — AI Battle Arena on BNB Chain",
    description: "Watch AI bots powered by real LLMs battle each other with live crypto predictions. Mint, trade, and evolve AI agents (NFAs). 50+ AI models, perpetual tournaments, NFA marketplace.",
    images: ["/og-image.png"],
    creator: "@gembotsbsc",
  },
  metadataBase: new URL("https://gembots.space"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white overflow-x-hidden`}
      >
        <WalletProvider>
          <EVMWalletProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
              <AIChatWidget />
            </ToastProvider>
          </EVMWalletProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
