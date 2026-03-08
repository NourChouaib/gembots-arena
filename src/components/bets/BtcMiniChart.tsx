'use client';

import { useEffect, useRef, useMemo } from 'react';
import { PricePoint, MARKET_DURATION_MS, getCurrentEpoch } from '@/lib/bets-engine';

interface BtcMiniChartProps {
  priceHistory: PricePoint[];
  currentPrice: number;
  marketStartPrice: number | null;
}

export default function BtcMiniChart({ priceHistory, currentPrice, marketStartPrice }: BtcMiniChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Only show last 30 min of data
  const visibleHistory = useMemo(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    return priceHistory.filter(p => p.time >= cutoff);
  }, [priceHistory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || visibleHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padding = { top: 20, right: 16, bottom: 30, left: 60 };

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Price range
    const prices = visibleHistory.map(p => p.price);
    const minP = Math.min(...prices) * 0.9999;
    const maxP = Math.max(...prices) * 1.0001;
    const pRange = maxP - minP || 1;

    // Time range
    const minT = visibleHistory[0].time;
    const maxT = Date.now();
    const tRange = maxT - minT || 1;

    const toX = (t: number) => padding.left + ((t - minT) / tRange) * (W - padding.left - padding.right);
    const toY = (p: number) => padding.top + (1 - (p - minP) / pRange) * (H - padding.top - padding.bottom);

    // Draw 5-min market epoch bands
    const { startTime } = getCurrentEpoch();
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    let epochStart = Math.floor(thirtyMinAgo / MARKET_DURATION_MS) * MARKET_DURATION_MS;
    
    while (epochStart < maxT) {
      const epochEnd = epochStart + MARKET_DURATION_MS;
      const x1 = Math.max(toX(epochStart), padding.left);
      const x2 = Math.min(toX(epochEnd), W - padding.right);
      
      if (x2 > x1) {
        const isCurrentEpoch = epochStart === startTime;
        if (isCurrentEpoch) {
          ctx.fillStyle = 'rgba(139, 92, 246, 0.08)';
          ctx.fillRect(x1, padding.top, x2 - x1, H - padding.top - padding.bottom);
          
          // Current epoch border
          ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x1, padding.top);
          ctx.lineTo(x1, H - padding.bottom);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Subtle alternating bands
          const band = Math.floor(epochStart / MARKET_DURATION_MS) % 2;
          if (band === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.015)';
            ctx.fillRect(x1, padding.top, x2 - x1, H - padding.top - padding.bottom);
          }
        }
      }
      epochStart += MARKET_DURATION_MS;
    }

    // Grid lines (horizontal)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i / gridLines) * (H - padding.top - padding.bottom);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();

      // Price labels
      const price = maxP - (i / gridLines) * pRange;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(price.toLocaleString('en-US', { maximumFractionDigits: 0 }), padding.left - 8, y + 3);
    }

    // Time labels (bottom)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const t = minT + (i / 5) * tRange;
      const x = toX(t);
      const d = new Date(t);
      ctx.fillText(`${d.getUTCHours().toString().padStart(2,'0')}:${d.getUTCMinutes().toString().padStart(2,'0')}`, x, H - 8);
    }

    // Market start price line
    if (marketStartPrice !== null) {
      const y = toY(marketStartPrice);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Label
      ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('OPEN', padding.left + 4, y - 4);
    }

    // Price line - gradient based on current vs market start
    const isUp = marketStartPrice ? currentPrice >= marketStartPrice : true;
    const lineColor = isUp ? '#22c55e' : '#ef4444';
    const lineColorAlpha = isUp ? 'rgba(34, 197, 94,' : 'rgba(239, 68, 68,';

    // Draw fill gradient under line
    ctx.beginPath();
    ctx.moveTo(toX(visibleHistory[0].time), toY(visibleHistory[0].price));
    for (let i = 1; i < visibleHistory.length; i++) {
      ctx.lineTo(toX(visibleHistory[i].time), toY(visibleHistory[i].price));
    }
    ctx.lineTo(toX(visibleHistory[visibleHistory.length - 1].time), H - padding.bottom);
    ctx.lineTo(toX(visibleHistory[0].time), H - padding.bottom);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, padding.top, 0, H - padding.bottom);
    gradient.addColorStop(0, `${lineColorAlpha}0.15)`);
    gradient.addColorStop(1, `${lineColorAlpha}0.01)`);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(toX(visibleHistory[0].time), toY(visibleHistory[0].price));
    for (let i = 1; i < visibleHistory.length; i++) {
      ctx.lineTo(toX(visibleHistory[i].time), toY(visibleHistory[i].price));
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current price dot (pulsing effect via glow)
    if (visibleHistory.length > 0) {
      const last = visibleHistory[visibleHistory.length - 1];
      const cx = toX(last.time);
      const cy = toY(last.price);
      
      // Glow
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = `${lineColorAlpha}0.3)`;
      ctx.fill();
      
      // Dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
    }

  }, [visibleHistory, currentPrice, marketStartPrice]);

  return (
    <div className="w-full rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono">BTC/USD</span>
          <span className="text-xs text-gray-600">30min</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
          <span className="text-[10px] text-gray-600">5-min epochs</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: '200px' }}
      />
    </div>
  );
}
