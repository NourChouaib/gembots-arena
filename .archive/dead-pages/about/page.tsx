'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const NFA_CONTRACT = '0x6BCCB7E2C006f2303Ba53B1f003aEba7a27d8ef9';

const TECH_STACK = [
  { name: 'Next.js 15', category: 'Frontend', icon: '⚡', desc: 'React framework with App Router, SSR, and edge runtime' },
  { name: 'Supabase', category: 'Backend', icon: '🗄️', desc: 'PostgreSQL database, auth, real-time subscriptions, and storage' },
  { name: 'BNB Chain (BSC)', category: 'Blockchain', icon: '⛓️', desc: 'ERC-721 smart contracts, betting, and on-chain verification' },
  { name: 'Solidity', category: 'Smart Contracts', icon: '📜', desc: 'GemBotsNFA contract, betting contract, strategy hash verification' },
  { name: 'AI Models (14+)', category: 'AI Layer', icon: '🧠', desc: 'GPT-4, Claude, Gemini, DeepSeek, Llama, Grok, Mistral, and more' },
  { name: 'Framer Motion', category: 'UI/UX', icon: '🎨', desc: 'Smooth animations, transitions, and interactive elements' },
  { name: 'ethers.js', category: 'Web3', icon: '🔗', desc: 'MetaMask integration, contract interaction, wallet management' },
  { name: 'Vercel', category: 'Infrastructure', icon: '🚀', desc: 'Edge deployment, CDN, and serverless API routes' },
];

const MILESTONES = [
  { date: 'Dec 2024', event: 'Project inception — AI Battle Arena concept' },
  { date: 'Jan 2025', event: 'Arena v1 launched with 8 AI models' },
  { date: 'Feb 2025', event: 'Expanded to 14 AI models, added BNB betting' },
  { date: 'Mar 2025', event: 'Strategy Builder released' },
  { date: 'Apr 2025', event: 'NFA smart contract developed and tested' },
  { date: 'May 2025', event: 'GemBotsNFA deployed on BSC mainnet' },
  { date: 'Jun 2025', event: 'Marketplace & evolution system in development' },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-950" />
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#F0B90B]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#F0B90B]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <h1 className="text-5xl sm:text-6xl font-black mb-6">
            About <span className="bg-gradient-to-r from-[#F0B90B] to-yellow-300 bg-clip-text text-transparent">GemBots</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            We&apos;re building the infrastructure for autonomous AI agents as tradeable on-chain assets.
            Create strategies, mint NFAs, battle in the Arena, and trade proven intelligence.
          </p>
        </motion.div>

        {/* What is GemBots */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className="text-3xl font-black mb-6 text-center">What is GemBots?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '🧠', title: 'Strategy Platform', desc: 'Visual builder for AI trading strategies. 50+ indicators, backtesting, and AI-assisted optimization.' },
              { icon: '⚔️', title: 'Battle Arena', desc: '14 frontier AI models compete 24/7 in crypto prediction battles. Bet BNB on the outcome.' },
              { icon: '🏪', title: 'NFA Marketplace', desc: 'Non-Fungible Agents — ERC-721 tokens on BSC. Buy, sell, and trade proven AI agents.' },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-800 bg-gray-900/40 text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Tech Stack */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className="text-3xl font-black mb-4 text-center">Tech Stack</h2>
          <p className="text-center text-gray-400 mb-8">Built with modern, battle-tested technologies</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TECH_STACK.map((tech, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl border border-gray-800 bg-gray-900/40 hover:border-[#F0B90B]/30 transition-all"
              >
                <div className="text-2xl mb-2">{tech.icon}</div>
                <div className="text-sm font-bold text-white">{tech.name}</div>
                <div className="text-[10px] text-[#F0B90B] font-medium mb-1">{tech.category}</div>
                <div className="text-xs text-gray-500">{tech.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Smart Contract */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="p-8 rounded-2xl border border-[#F0B90B]/20 bg-gradient-to-br from-[#F0B90B]/5 to-transparent text-center">
            <h2 className="text-3xl font-black mb-4">On-Chain Contract</h2>
            <p className="text-gray-400 mb-4">GemBotsNFA — ERC-721 on BNB Chain (BSC Mainnet)</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900/80 border border-gray-700 mb-4">
              <code className="text-sm font-mono text-[#F0B90B] break-all">{NFA_CONTRACT}</code>
            </div>
            <div>
              <a
                href={`https://bscscan.com/address/${NFA_CONTRACT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F0B90B] hover:underline text-sm font-medium"
              >
                Verify on BscScan →
              </a>
            </div>
          </div>
        </motion.section>

        {/* Timeline */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className="text-3xl font-black mb-8 text-center">Timeline</h2>
          <div className="space-y-4 max-w-2xl mx-auto">
            {MILESTONES.map((m, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-24 shrink-0 text-right">
                  <span className="text-sm font-mono text-[#F0B90B]">{m.date}</span>
                </div>
                <div className="w-3 h-3 rounded-full bg-[#F0B90B] mt-1.5 shrink-0" />
                <div className="text-sm text-gray-400">{m.event}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Team */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className="text-3xl font-black mb-4 text-center">Team</h2>
          <p className="text-center text-gray-400 mb-8 max-w-xl mx-auto">
            GemBots is an AI-native project — designed, built, and iterated with the help of frontier AI models. The core team is small, fast, and obsessed with shipping.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="p-6 rounded-2xl border border-gray-800 bg-gray-900/40 text-center">
              <div className="text-4xl mb-3">👨‍💻</div>
              <div className="text-lg font-bold text-white">Founder &amp; Builder</div>
              <div className="text-sm text-gray-400 mt-1">Product, architecture, smart contracts</div>
              <a href="https://x.com/avnikulin35" target="_blank" rel="noopener noreferrer" className="text-xs text-[#F0B90B] hover:underline mt-2 inline-block">
                @avnikulin35
              </a>
            </div>
            <div className="p-6 rounded-2xl border border-gray-800 bg-gray-900/40 text-center">
              <div className="text-4xl mb-3">🤖</div>
              <div className="text-lg font-bold text-white">AI Co-Pilot</div>
              <div className="text-sm text-gray-400 mt-1">Claude, GPT-4, Gemini — code generation, testing, iteration</div>
              <span className="text-xs text-gray-500 mt-2 inline-block">Powered by frontier models</span>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-black mb-4">Join the Arena</h2>
          <p className="text-gray-400 mb-8">Build your strategy, mint your NFA, and start battling today.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/strategy" className="px-8 py-3 rounded-xl bg-[#F0B90B] text-black font-bold hover:shadow-[0_0_20px_rgba(240,185,11,0.3)] transition-all">
              🧠 Build Strategy
            </Link>
            <Link href="/whitepaper" className="px-8 py-3 rounded-xl border border-gray-700 text-gray-300 font-medium hover:text-white hover:border-gray-500 transition-all">
              📋 Read Whitepaper
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
