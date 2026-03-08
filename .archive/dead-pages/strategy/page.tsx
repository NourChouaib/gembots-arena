'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { NFA_CONTRACT_ADDRESS, NFA_ABI, BSC_CHAIN_ID, BSCSCAN_BASE } from '@/lib/nfa';

// ─── Types ───────────────────────────────────────────────────────────────────

type BaseStyle = 'momentum' | 'mean_reversion' | 'scalper' | 'swing' | 'contrarian';

interface StrategyParams {
  entry_threshold: number;
  exit_threshold: number;
  trend_lookback: number;
  position_size_pct: number;
  max_hold_ticks: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  noise_factor: number;
  boredom_trade_chance: number;
}

interface Strategy {
  name: string;
  description: string;
  base_style: BaseStyle;
  params: StrategyParams;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STYLE_DEFAULTS: Record<BaseStyle, StrategyParams> = {
  momentum: { entry_threshold: 0.005, exit_threshold: 0.003, trend_lookback: 5, position_size_pct: 50, max_hold_ticks: 8, stop_loss_pct: 3.0, take_profit_pct: 8.0, noise_factor: 0.01, boredom_trade_chance: 0.3 },
  mean_reversion: { entry_threshold: 0.005, exit_threshold: 0.005, trend_lookback: 5, position_size_pct: 50, max_hold_ticks: 9, stop_loss_pct: 4.0, take_profit_pct: 6.0, noise_factor: 0.01, boredom_trade_chance: 0.25 },
  scalper: { entry_threshold: 0.001, exit_threshold: 0.001, trend_lookback: 3, position_size_pct: 25, max_hold_ticks: 3, stop_loss_pct: 1.5, take_profit_pct: 3.0, noise_factor: 0.005, boredom_trade_chance: 0.8 },
  swing: { entry_threshold: 0.01, exit_threshold: 0.008, trend_lookback: 8, position_size_pct: 75, max_hold_ticks: 12, stop_loss_pct: 5.0, take_profit_pct: 12.0, noise_factor: 0.01, boredom_trade_chance: 0.15 },
  contrarian: { entry_threshold: 0.005, exit_threshold: 0.008, trend_lookback: 5, position_size_pct: 50, max_hold_ticks: 7, stop_loss_pct: 3.0, take_profit_pct: 10.0, noise_factor: 0.01, boredom_trade_chance: 0.35 },
};

const STYLE_INFO: { id: BaseStyle; icon: string; label: string; desc: string }[] = [
  { id: 'momentum', icon: '🚀', label: 'Momentum', desc: 'Ride the trend, catch the wave' },
  { id: 'mean_reversion', icon: '🔄', label: 'Mean Reversion', desc: 'Buy dips, sell rips — revert to mean' },
  { id: 'scalper', icon: '⚡', label: 'Scalper', desc: 'Lightning-fast micro trades' },
  { id: 'swing', icon: '📊', label: 'Swing', desc: 'Patient macro moves, big swings' },
  { id: 'contrarian', icon: '🎯', label: 'Contrarian', desc: 'Bet against the crowd' },
];

const PARAM_CONFIG: {
  group: string;
  params: { key: keyof StrategyParams; label: string; min: number; max: number; step: number; format?: (v: number) => string }[];
}[] = [
  {
    group: 'Entry / Exit',
    params: [
      { key: 'entry_threshold', label: 'Entry Threshold', min: 0.001, max: 0.05, step: 0.001, format: (v) => v.toFixed(3) },
      { key: 'exit_threshold', label: 'Exit Threshold', min: 0.001, max: 0.05, step: 0.001, format: (v) => v.toFixed(3) },
      { key: 'trend_lookback', label: 'Trend Lookback', min: 2, max: 15, step: 1, format: (v) => v.toString() },
    ],
  },
  {
    group: 'Position',
    params: [
      { key: 'position_size_pct', label: 'Position Size %', min: 10, max: 100, step: 5, format: (v) => `${v}%` },
      { key: 'max_hold_ticks', label: 'Max Hold Ticks', min: 2, max: 20, step: 1, format: (v) => v.toString() },
    ],
  },
  {
    group: 'Risk',
    params: [
      { key: 'stop_loss_pct', label: 'Stop Loss %', min: 0.5, max: 10.0, step: 0.5, format: (v) => `${v.toFixed(1)}%` },
      { key: 'take_profit_pct', label: 'Take Profit %', min: 1.0, max: 20.0, step: 0.5, format: (v) => `${v.toFixed(1)}%` },
    ],
  },
  {
    group: 'Behavior',
    params: [
      { key: 'noise_factor', label: 'Noise Factor', min: 0.001, max: 0.05, step: 0.001, format: (v) => v.toFixed(3) },
      { key: 'boredom_trade_chance', label: 'Boredom Trade Chance', min: 0.0, max: 1.0, step: 0.05, format: (v) => v.toFixed(2) },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRiskProfile(params: StrategyParams): { level: string; color: string; glow: string } {
  const score = (params.stop_loss_pct / 10) * 0.3 + (1 - params.take_profit_pct / 20) * 0.3 + (params.position_size_pct / 100) * 0.4;
  if (score > 0.7) return { level: 'EXTREME', color: 'text-red-400', glow: 'shadow-red-500/40' };
  if (score > 0.5) return { level: 'HIGH', color: 'text-orange-400', glow: 'shadow-orange-500/40' };
  if (score > 0.3) return { level: 'MEDIUM', color: 'text-yellow-400', glow: 'shadow-yellow-500/40' };
  return { level: 'LOW', color: 'text-green-400', glow: 'shadow-green-500/40' };
}

function getActivityLevel(params: StrategyParams): { level: string; color: string } {
  const score = params.boredom_trade_chance * 0.6 + (1 - params.max_hold_ticks / 20) * 0.4;
  if (score > 0.7) return { level: 'HYPERACTIVE', color: 'text-[#14F195]' };
  if (score > 0.45) return { level: 'ACTIVE', color: 'text-blue-400' };
  if (score > 0.25) return { level: 'MODERATE', color: 'text-yellow-400' };
  return { level: 'PATIENT', color: 'text-purple-400' };
}

// ─── Components ──────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  format?: (v: number) => string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-4 py-2">
      <span className="text-sm text-gray-400 w-44 shrink-0">{label}</span>
      <div className="relative flex-1 h-2 group">
        <div className="absolute inset-0 rounded-full bg-gray-700/50" />
        <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195]" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#9945FF] shadow-[0_0_8px_rgba(153,69,255,0.5)] transition-all pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <span className="text-sm font-mono text-[#14F195] w-16 text-right shrink-0">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

function StyleCard({ style, selected, onClick }: {
  style: typeof STYLE_INFO[0]; selected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 cursor-pointer text-center ${
        selected
          ? 'border-[#9945FF] bg-[#9945FF]/10 shadow-[0_0_20px_rgba(153,69,255,0.3)]'
          : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/60'
      }`}
    >
      <span className="text-3xl">{style.icon}</span>
      <span className={`text-sm font-bold font-orbitron ${selected ? 'text-[#14F195]' : 'text-gray-200'}`}>
        {style.label}
      </span>
      <span className="text-xs text-gray-500 leading-tight">{style.desc}</span>
      {selected && (
        <motion.div
          layoutId="style-glow"
          className="absolute inset-0 rounded-xl border-2 border-[#9945FF] pointer-events-none"
          initial={false}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </motion.button>
  );
}

function PreviewCard({ strategy }: { strategy: Strategy }) {
  const styleInfo = STYLE_INFO.find((s) => s.id === strategy.base_style)!;
  const risk = getRiskProfile(strategy.params);
  const activity = getActivityLevel(strategy.params);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-900 via-gray-800/50 to-gray-900 p-6 sticky top-28"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">{styleInfo.icon}</span>
        <div>
          <h3 className="font-orbitron font-bold text-white text-lg leading-tight">
            {strategy.name || 'Unnamed Strategy'}
          </h3>
          <span className="text-xs text-[#9945FF] font-semibold uppercase tracking-wider">{styleInfo.label}</span>
        </div>
      </div>

      {strategy.description && (
        <p className="text-xs text-gray-400 mb-4 line-clamp-2 italic">&quot;{strategy.description}&quot;</p>
      )}

      <div className="space-y-3 mb-5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Risk Profile</span>
          <span className={`font-bold font-orbitron ${risk.color}`}>{risk.level}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-700/50 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              risk.level === 'EXTREME' ? 'bg-red-500' :
              risk.level === 'HIGH' ? 'bg-orange-500' :
              risk.level === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${risk.level === 'EXTREME' ? 95 : risk.level === 'HIGH' ? 70 : risk.level === 'MEDIUM' ? 45 : 20}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Activity Level</span>
          <span className={`font-bold font-orbitron ${activity.color}`}>{activity.level}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-700/50 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              activity.level === 'HYPERACTIVE' ? 'bg-[#14F195]' :
              activity.level === 'ACTIVE' ? 'bg-blue-500' :
              activity.level === 'MODERATE' ? 'bg-yellow-500' : 'bg-purple-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${activity.level === 'HYPERACTIVE' ? 90 : activity.level === 'ACTIVE' ? 65 : activity.level === 'MODERATE' ? 40 : 15}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <div className="border-t border-gray-700/50 pt-4 space-y-2">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Key Parameters</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between"><span className="text-gray-500">Entry</span><span className="text-gray-300 font-mono">{strategy.params.entry_threshold.toFixed(3)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Exit</span><span className="text-gray-300 font-mono">{strategy.params.exit_threshold.toFixed(3)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Size</span><span className="text-gray-300 font-mono">{strategy.params.position_size_pct}%</span></div>
          <div className="flex justify-between"><span className="text-gray-500">SL/TP</span><span className="text-gray-300 font-mono">{strategy.params.stop_loss_pct}/{strategy.params.take_profit_pct}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Lookback</span><span className="text-gray-300 font-mono">{strategy.params.trend_lookback}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Hold</span><span className="text-gray-300 font-mono">{strategy.params.max_hold_ticks}</span></div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StrategyPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseStyle, setBaseStyle] = useState<BaseStyle>('momentum');
  const [params, setParams] = useState<StrategyParams>({ ...STYLE_DEFAULTS.momentum });
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ txHash: string; tokenId: number } | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  const handleStyleChange = useCallback((style: BaseStyle) => {
    setBaseStyle(style);
    setParams({ ...STYLE_DEFAULTS[style] });
  }, []);

  const handleParamChange = useCallback((key: keyof StrategyParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const strategy: Strategy = useMemo(() => ({
    name,
    description,
    base_style: baseStyle,
    params,
  }), [name, description, baseStyle, params]);

  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum) {
      setMintError('MetaMask not found. Please install MetaMask.');
      return null;
    }
    try {
      const ethereum = (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum;
      const provider = new ethers.BrowserProvider(ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== BSC_CHAIN_ID) {
        try {
          await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] });
        } catch (switchErr: unknown) {
          if ((switchErr as { code?: number }).code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x38', chainName: 'BNB Smart Chain', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'], blockExplorerUrls: ['https://bscscan.com'],
              }],
            });
          } else { throw switchErr; }
        }
      }
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setWalletAddress(addr);
      setMintError(null);
      return signer;
    } catch (err: unknown) {
      setMintError(`Wallet error: ${(err as Error).message || 'Unknown error'}`);
      return null;
    }
  }, []);

  const handleMint = useCallback(async () => {
    setMinting(true);
    setMintError(null);
    setMintResult(null);
    try {
      const signer = await connectWallet();
      if (!signer) { setMinting(false); return; }

      // Build NFA-compatible strategy with both builder params and NFA params
      const nfaStrategy = {
        name: strategy.name || 'Custom Strategy',
        style: strategy.base_style,
        description: strategy.description || '',
        // NFA params (0-100) derived from builder params
        params: {
          aggression: Math.round(Math.min(100, (strategy.params.position_size_pct / 100) * 60 + (strategy.params.boredom_trade_chance) * 40)),
          defense: Math.round(Math.min(100, (strategy.params.stop_loss_pct / 10) * 50 + ((20 - strategy.params.take_profit_pct) / 20) * 50)),
          speed: Math.round(Math.min(100, (1 - strategy.params.max_hold_ticks / 20) * 60 + strategy.params.boredom_trade_chance * 40)),
          adaptability: Math.round(Math.min(100, strategy.params.noise_factor / 0.05 * 50 + (strategy.params.trend_lookback / 15) * 50)),
          riskTolerance: Math.round(Math.min(100, (strategy.params.take_profit_pct / 20) * 50 + (strategy.params.position_size_pct / 100) * 50)),
          patternRecognition: Math.round(Math.min(100, (strategy.params.trend_lookback / 15) * 70 + (strategy.params.entry_threshold / 0.05) * 30)),
          counterStrategy: strategy.base_style === 'contrarian' ? 80 : strategy.base_style === 'mean_reversion' ? 60 : 30,
          bluffFrequency: strategy.base_style === 'contrarian' ? 40 : Math.round(strategy.params.noise_factor / 0.05 * 20),
          endgameShift: Math.round(Math.min(100, strategy.params.position_size_pct * 0.7 + (strategy.params.take_profit_pct / 20) * 30)),
        },
        // Also keep original builder params for reference
        builderParams: strategy.params,
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      };
      const strategyJSON = JSON.stringify(nfaStrategy);
      const configJSON = JSON.stringify({ name: strategy.name, base_style: strategy.base_style, version: '1.0' });
      const configHash = ethers.keccak256(ethers.toUtf8Bytes(configJSON));
      const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(strategyJSON));
      const agentId = Date.now(); // Unique agent ID
      const configURI = `data:application/json;base64,${btoa(configJSON)}`;
      const strategyURI = `data:application/json;base64,${btoa(strategyJSON)}`;

      const contract = new ethers.Contract(NFA_CONTRACT_ADDRESS, NFA_ABI, signer);
      const tx = await contract.mint(agentId, configHash, configURI, 'gembots/strategy-v1', strategyHash, strategyURI);
      const receipt = await tx.wait();

      // Parse NFAMinted event to get tokenId
      const mintEvent = receipt.logs.find((log: ethers.Log) => {
        try { return contract.interface.parseLog({ topics: [...log.topics], data: log.data })?.name === 'NFAMinted'; } catch { return false; }
      });
      const tokenId = mintEvent ? Number(contract.interface.parseLog({ topics: [...mintEvent.topics], data: mintEvent.data })?.args[0]) : 0;

      // Link NFA to a bot in Supabase (best-effort)
      if (tokenId > 0 && walletAddress) {
        try {
          await fetch('/api/nfa/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              botId: agentId,
              nfaId: tokenId,
              evmAddress: walletAddress,
            }),
          });
        } catch {
          // Non-critical — NFA is already on-chain
          console.warn('Failed to auto-link NFA to bot, can be done manually');
        }
      }

      setMintResult({ txHash: receipt.hash, tokenId });
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Mint failed';
      if (msg.includes('user rejected')) setMintError('Transaction rejected by user');
      else if (msg.includes('insufficient funds')) setMintError('Insufficient BNB for gas fees');
      else setMintError(msg.length > 100 ? msg.slice(0, 100) + '...' : msg);
    } finally {
      setMinting(false);
    }
  }, [strategy, connectWallet]);

  const exportJSON = useCallback(() => {
    const json = JSON.stringify(strategy, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [strategy]);

  const saveStrategy = useCallback(() => {
    const existing = JSON.parse(localStorage.getItem('gembots_strategies') || '[]');
    existing.push({ ...strategy, created_at: new Date().toISOString() });
    localStorage.setItem('gembots_strategies', JSON.stringify(existing));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [strategy]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-orbitron text-3xl sm:text-5xl font-black bg-gradient-to-r from-[#9945FF] via-[#FFD700] to-[#14F195] bg-clip-text text-transparent mb-3">
            ⚔️ STRATEGY BUILDER
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
            Create your unique trading strategy and mint it as an NFA
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column — Builder */}
          <div className="flex-1 space-y-8">
            {/* Name & Description */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-gray-700/50 bg-gray-900/50 p-6"
            >
              <h2 className="font-orbitron text-lg font-bold text-[#FFD700] mb-4">📝 Identity</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Strategy Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aggressive Momentum Scalper"
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-[#9945FF] focus:outline-none focus:ring-1 focus:ring-[#9945FF]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Catches momentum spikes, fast in/out with tight stops"
                    rows={3}
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-[#9945FF] focus:outline-none focus:ring-1 focus:ring-[#9945FF]/50 transition-all resize-none"
                  />
                </div>
              </div>
            </motion.section>

            {/* Base Style Selector */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-gray-700/50 bg-gray-900/50 p-6"
            >
              <h2 className="font-orbitron text-lg font-bold text-[#FFD700] mb-4">🎮 Base Style</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {STYLE_INFO.map((style) => (
                  <StyleCard
                    key={style.id}
                    style={style}
                    selected={baseStyle === style.id}
                    onClick={() => handleStyleChange(style.id)}
                  />
                ))}
              </div>
            </motion.section>

            {/* Parameters */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-gray-700/50 bg-gray-900/50 p-6"
            >
              <h2 className="font-orbitron text-lg font-bold text-[#FFD700] mb-4">⚙️ Parameters</h2>
              <div className="space-y-6">
                {PARAM_CONFIG.map((group) => (
                  <div key={group.group}>
                    <h3 className="text-xs font-bold text-[#9945FF] uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span className="w-8 h-px bg-[#9945FF]/50" />
                      {group.group}
                      <span className="flex-1 h-px bg-[#9945FF]/20" />
                    </h3>
                    {group.params.map((p) => (
                      <Slider
                        key={p.key}
                        label={p.label}
                        value={params[p.key]}
                        min={p.min}
                        max={p.max}
                        step={p.step}
                        format={p.format}
                        onChange={(v) => handleParamChange(p.key, v)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={handleMint}
                disabled={minting || !name}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-orbitron font-bold text-sm transition-all ${
                  minting ? 'bg-gray-700 text-gray-400 cursor-wait animate-pulse' :
                  !name ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                  'bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white hover:shadow-[0_0_20px_rgba(153,69,255,0.4)] hover:scale-105'
                }`}
              >
                {minting ? '⏳ MINTING...' : walletAddress ? '🔗 MINT AS NFA' : '🦊 CONNECT & MINT'}
              </button>

              <button
                onClick={saveStrategy}
                className="px-6 py-3 rounded-xl font-orbitron font-bold text-sm border border-[#14F195]/50 text-[#14F195] hover:bg-[#14F195]/10 transition-all"
              >
                <AnimatePresence mode="wait">
                  {saved ? (
                    <motion.span key="saved" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                      ✅ SAVED!
                    </motion.span>
                  ) : (
                    <motion.span key="save" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                      💾 SAVE STRATEGY
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <button
                onClick={exportJSON}
                className="px-6 py-3 rounded-xl font-orbitron font-bold text-sm border border-[#FFD700]/50 text-[#FFD700] hover:bg-[#FFD700]/10 transition-all"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.span key="copied" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                      ✅ COPIED!
                    </motion.span>
                  ) : (
                    <motion.span key="copy" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                      📋 EXPORT JSON
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>

            {/* Mint Result / Error */}
            <AnimatePresence>
              {mintResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-xl border border-[#14F195]/50 bg-[#14F195]/10 p-4"
                >
                  <p className="text-[#14F195] font-bold font-orbitron text-sm mb-2">✅ NFA #{mintResult.tokenId} Minted!</p>
                  <a
                    href={`${BSCSCAN_BASE}/tx/${mintResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline break-all"
                  >
                    View on BscScan →
                  </a>
                </motion.div>
              )}
              {mintError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-xl border border-red-500/50 bg-red-500/10 p-4"
                >
                  <p className="text-red-400 text-sm">❌ {mintError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Connected Wallet Info */}
            {walletAddress && (
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse" />
                Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)} (BSC)
              </div>
            )}
          </div>

          {/* Right column — Preview */}
          <div className="w-full lg:w-80 shrink-0">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="font-orbitron text-lg font-bold text-[#FFD700] mb-4">👁️ Preview</h2>
              <PreviewCard strategy={strategy} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
