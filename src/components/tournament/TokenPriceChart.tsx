'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PricePoint {
  price: number;
  timestamp: number;
}

interface TokenPriceChartProps {
  token: string;
}

// ─── FETCH PRICE FROM BYBIT API ───────────────────────────────────────────────

async function fetchTokenPrice(token: string): Promise<{ price: number; priceChange5m: number; priceChange1h: number } | null> {
  try {
    const cleanToken = token.replace(/^\$/, '');
    const res = await fetch(`/api/token-price?token=${cleanToken}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.price) return null;
    return {
      price: data.price,
      priceChange5m: data.priceChange5m ?? 0,
      priceChange1h: data.priceChange1h ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── FORMAT PRICE ─────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price === 0) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  const str = price.toFixed(12);
  const match = str.match(/^0\.(0+)(\d{4})/);
  if (match) return `$0.0(${match[1].length})${match[2]}`;
  return `$${price.toFixed(8)}`;
}

// ─── SMOOTH SVG PATH (Catmull-Rom spline) ─────────────────────────────────────

function catmullRomPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  
  let d = `M ${points[0].x},${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  
  return d;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function TokenPriceChart({ token }: TokenPriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChange1h, setPriceChange1h] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chartId = useRef(`chart-${Math.random().toString(36).slice(2, 8)}`).current;

  const fetchAndUpdate = useCallback(async () => {
    const data = await fetchTokenPrice(token);
    if (!data || data.price === 0) {
      setLoading(false);
      return;
    }
    
    setLoading(false);
    setCurrentPrice(data.price);
    setPriceChange(data.priceChange5m);
    setPriceChange1h(data.priceChange1h);
    
    setPriceHistory(prev => {
      const now = Date.now();
      const newPoint: PricePoint = { price: data.price, timestamp: now };
      const cutoff = now - 15 * 60 * 1000;
      const filtered = [...prev, newPoint].filter(p => p.timestamp > cutoff);
      if (filtered.length > 90) filtered.splice(0, filtered.length - 90);
      return filtered;
    });
  }, [token]);

  useEffect(() => {
    setPriceHistory([]);
    setLoading(true);
    fetchAndUpdate();
    intervalRef.current = setInterval(fetchAndUpdate, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [token, fetchAndUpdate]);

  // Chart dimensions — bigger and more visible
  const WIDTH = 400;
  const HEIGHT = 100;
  const PX = 8;
  const PY = 8;

  const { linePath, areaPath, lastPoint, minPrice, maxPrice } = useMemo(() => {
    if (priceHistory.length < 2) {
      return { linePath: '', areaPath: '', lastPoint: null, minPrice: 0, maxPrice: 0 };
    }

    const prices = priceHistory.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || min * 0.002 || 0.0001;

    const points = priceHistory.map((p, i) => ({
      x: PX + (i / (priceHistory.length - 1)) * (WIDTH - 2 * PX),
      y: PY + ((max - p.price) / range) * (HEIGHT - 2 * PY),
    }));

    const line = catmullRomPath(points);
    const last = points[points.length - 1];
    const first = points[0];
    const area = `${line} L ${last.x.toFixed(1)},${HEIGHT} L ${first.x.toFixed(1)},${HEIGHT} Z`;

    return { linePath: line, areaPath: area, lastPoint: last, minPrice: min, maxPrice: max };
  }, [priceHistory]);

  const isUp = priceChange >= 0;
  const accentColor = isUp ? '#14F195' : '#FF4444';
  const glowColor = isUp ? 'rgba(20, 241, 149, 0.7)' : 'rgba(255, 68, 68, 0.7)';
  const bgGlow = isUp ? 'rgba(20, 241, 149, 0.08)' : 'rgba(255, 68, 68, 0.08)';

  if (!token) return null;

  return (
    <motion.div
      className="relative w-full mx-auto"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      style={{ maxWidth: '95%' }}
    >
      {/* Glass container */}
      <div
        className="relative rounded-xl overflow-hidden border border-white/[0.06]"
        style={{
          background: `linear-gradient(180deg, ${bgGlow} 0%, rgba(0,0,0,0.3) 100%)`,
          backdropFilter: 'blur(8px)',
          boxShadow: `0 0 30px ${bgGlow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        {/* Price header */}
        <div className="flex items-center justify-center gap-3 pt-2 pb-1 px-3">
          {loading ? (
            <motion.span
              className="text-[10px] text-gray-500 font-mono"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Loading...
            </motion.span>
          ) : (
            <>
              <motion.span
                className="font-orbitron text-base md:text-lg font-black text-white"
                style={{ textShadow: `0 0 12px ${glowColor}, 0 0 25px ${glowColor}` }}
                key={currentPrice}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {formatPrice(currentPrice)}
              </motion.span>
              
              <motion.div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-xs font-bold ${
                  isUp
                    ? 'text-green-300 bg-green-500/15 border border-green-500/30'
                    : 'text-red-300 bg-red-500/15 border border-red-500/30'
                }`}
                style={{
                  boxShadow: `0 0 10px ${isUp ? 'rgba(20,241,149,0.2)' : 'rgba(255,68,68,0.2)'}`,
                }}
                key={priceChange}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <span className="text-[10px]">{isUp ? '▲' : '▼'}</span>
                <span>{Math.abs(priceChange).toFixed(2)}%</span>
              </motion.div>

              {/* 1h change (smaller) */}
              <span className={`text-[9px] font-mono ${priceChange1h >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>
                1h: {priceChange1h >= 0 ? '+' : ''}{priceChange1h.toFixed(1)}%
              </span>
            </>
          )}
        </div>

        {/* SVG Chart */}
        <div className="relative w-full px-1" style={{ height: `${HEIGHT + 4}px` }}>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${WIDTH} ${HEIGHT + 4}`}
            preserveAspectRatio="none"
            className="overflow-visible"
          >
            <defs>
              {/* Gradient fill under line */}
              <linearGradient id={`${chartId}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
                <stop offset="50%" stopColor={accentColor} stopOpacity="0.12" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
              </linearGradient>
              {/* Neon glow filter */}
              <filter id={`${chartId}-glow`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Strong glow for the dot */}
              <filter id={`${chartId}-dotglow`} x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
              </filter>
            </defs>

            {/* Subtle horizontal grid */}
            {[0.25, 0.5, 0.75].map(frac => (
              <line
                key={frac}
                x1={PX} y1={PY + frac * (HEIGHT - 2 * PY)}
                x2={WIDTH - PX} y2={PY + frac * (HEIGHT - 2 * PY)}
                stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" strokeDasharray="3 6"
              />
            ))}

            {priceHistory.length >= 2 ? (
              <>
                {/* Area fill */}
                <motion.path
                  d={areaPath} fill={`url(#${chartId}-fill)`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                />

                {/* Glow line (wide, blurred) */}
                <motion.path
                  d={linePath} fill="none" stroke={accentColor}
                  strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                  opacity="0.4" filter={`url(#${chartId}-glow)`}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                />

                {/* Main line */}
                <motion.path
                  d={linePath} fill="none" stroke={accentColor}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                />

                {/* Current price dot */}
                {lastPoint && (
                  <>
                    {/* Big glow behind dot */}
                    <motion.circle
                      cx={lastPoint.x} cy={lastPoint.y} r="10"
                      fill={accentColor} filter={`url(#${chartId}-dotglow)`}
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* Expanding ring */}
                    <motion.circle
                      cx={lastPoint.x} cy={lastPoint.y}
                      fill="none" stroke={accentColor} strokeWidth="1.5"
                      animate={{ r: [3, 12, 3], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
                    />
                    {/* Bright center dot */}
                    <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill={accentColor} />
                    <circle cx={lastPoint.x} cy={lastPoint.y} r="1.5" fill="white" opacity="0.8" />
                  </>
                )}

                {/* Price labels on Y axis */}
                {maxPrice > 0 && (
                  <>
                    <text x={WIDTH - PX + 2} y={PY + 4} fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="monospace">
                      {maxPrice >= 1 ? maxPrice.toFixed(2) : maxPrice.toFixed(6)}
                    </text>
                    <text x={WIDTH - PX + 2} y={HEIGHT - PY + 2} fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="monospace">
                      {minPrice >= 1 ? minPrice.toFixed(2) : minPrice.toFixed(6)}
                    </text>
                  </>
                )}
              </>
            ) : (
              /* Animated placeholder while collecting data */
              <>
                <motion.line
                  x1={PX} y1={HEIGHT / 2} x2={WIDTH - PX} y2={HEIGHT / 2}
                  stroke={accentColor} strokeWidth="1.5" strokeDasharray="6 8" opacity="0.2"
                  animate={{ strokeDashoffset: [0, -28] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
                <motion.text
                  x={WIDTH / 2} y={HEIGHT / 2 + 4}
                  textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="monospace"
                  animate={{ opacity: [0.15, 0.35, 0.15] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  collecting price data...
                </motion.text>
              </>
            )}
          </svg>
        </div>
      </div>
    </motion.div>
  );
}
