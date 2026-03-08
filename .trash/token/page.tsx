// @ts-nocheck
'use client';

import { useState } from 'react';
import Link from 'next/link';

const TIERS = [
  { name: 'Recruit', emoji: '🥉', minUsd: 'Any', color: '#a5d6a7', perks: ['Holders TG group access', 'Profile badge', 'OG holder status'] },
  { name: 'Fighter', emoji: '🥈', minUsd: '$50+', color: '#90caf9', perks: ['+1 bot slot (2 total)', 'Custom bot name colors', 'Priority battle queue'] },
  { name: 'Commander', emoji: '🥇', minUsd: '$100+', color: '#ffc107', perks: ['Custom bot avatar', 'Priority matchmaking', 'Tournament vote rights'] },
  { name: 'General', emoji: '💎', minUsd: '$500+', color: '#b388ff', perks: ['"Alpha AI" strategy unlock', 'Exclusive tournaments', '1.5x airdrop multiplier'] },
  { name: 'Legend', emoji: '👑', minUsd: '$1,000+', color: '#ffd700', perks: ['All perks included', 'Platform revenue share', '2x airdrop multiplier', 'Governance voting'] },
];

export default function TokenPage() {
  const [wallet, setWallet] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const checkBalance = async () => {
    if (!wallet) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/v1/token/balance?wallet=${wallet}`);
      const data = await res.json();
      setCheckResult(data);
    } catch {
      setCheckResult({ error: 'Failed to check' });
    }
    setChecking(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0f0f2e 50%, #0a0a1a 100%)',
      color: '#e0e0e0',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 80px' }}>
        
        {/* Nav is now in layout.tsx */}

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🪙</div>
          <h1 style={{ fontSize: '2.5rem', color: '#00ff88', marginBottom: '12px', lineHeight: 1.2 }}>
            $GEMB Token
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            The token that powers the GemBots Arena. Hold $GEMB to unlock premium features, 
            earn rewards, and get ready for the airdrop.
          </p>
        </div>

        {/* Status Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,107,0,0.1))',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ffd700', marginBottom: '8px' }}>
            🚀 Token Launch Coming Soon
          </div>
          <p style={{ opacity: 0.8, margin: 0 }}>
            $GEMB will launch on Pump.fun. Connect your wallet now to be ready. 
            Early holders get OG status and 2x airdrop multiplier.
          </p>
        </div>

        {/* Wallet Check */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '48px',
        }}>
          <h2 style={{ color: '#00ff88', marginBottom: '16px', fontSize: '1.3rem' }}>
            🔍 Check Your Tier
          </h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter your Solana wallet address..."
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              style={{
                flex: 1,
                minWidth: '250px',
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={checkBalance}
              disabled={checking || !wallet}
              style={{
                padding: '12px 24px',
                background: checking ? '#333' : 'linear-gradient(135deg, #00ff88, #00cc6a)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: checking ? 'wait' : 'pointer',
                fontSize: '14px',
              }}
            >
              {checking ? '⏳ Checking...' : '🔍 Check'}
            </button>
          </div>
          
          {checkResult && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              {checkResult.status === 'pre_launch' ? (
                <div>
                  <span style={{ color: '#ffd700' }}>⏳ Token not launched yet.</span>
                  <span style={{ opacity: 0.7 }}> Your wallet is ready — you'll see your tier here after launch!</span>
                </div>
              ) : checkResult.tier ? (
                <div>
                  <span style={{ fontSize: '1.5rem' }}>{checkResult.tier.emoji}</span>
                  <span style={{ color: checkResult.tier.color, fontWeight: 'bold', fontSize: '1.2rem', marginLeft: '8px' }}>
                    {checkResult.tier.name}
                  </span>
                  <span style={{ opacity: 0.7, marginLeft: '12px' }}>
                    Balance: {checkResult.balance.toLocaleString()} $GEMB (${checkResult.balance_usd})
                  </span>
                </div>
              ) : (
                <div style={{ opacity: 0.7 }}>No $GEMB found in this wallet. Buy some to unlock perks!</div>
              )}
            </div>
          )}
        </div>

        {/* Tiers */}
        <h2 style={{ color: '#00ff88', marginBottom: '24px', fontSize: '1.5rem', textAlign: 'center' }}>
          🎮 Holder Tiers & Perks
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px' }}>
          {[...TIERS].reverse().map((tier) => (
            <div key={tier.name} style={{
              background: `linear-gradient(135deg, rgba(${tier.color === '#ffd700' ? '255,215,0' : tier.color === '#b388ff' ? '179,136,255' : tier.color === '#ffc107' ? '255,193,7' : tier.color === '#90caf9' ? '144,202,249' : '165,214,167'},0.08), rgba(0,0,0,0.2))`,
              border: `1px solid ${tier.color}33`,
              borderRadius: '12px',
              padding: '20px 24px',
              display: 'flex',
              gap: '20px',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}>
              <div style={{ minWidth: '140px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{tier.emoji}</div>
                <div style={{ color: tier.color, fontWeight: 'bold', fontSize: '1.2rem' }}>{tier.name}</div>
                <div style={{ opacity: 0.6, fontSize: '0.9rem' }}>Hold {tier.minUsd}</div>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                {tier.perks.map((perk, i) => (
                  <div key={i} style={{ padding: '4px 0', fontSize: '0.95rem' }}>
                    <span style={{ color: '#00ff88', marginRight: '8px' }}>✓</span>
                    {perk}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* How to Get $GEMB */}
        <div style={{
          background: 'rgba(0, 255, 136, 0.05)',
          border: '1px solid rgba(0, 255, 136, 0.2)',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '48px',
        }}>
          <h2 style={{ color: '#00ff88', marginBottom: '20px', fontSize: '1.3rem' }}>
            🛒 How to Get $GEMB
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '1.2rem' }}>1</span>
              <div>
                <strong style={{ color: '#fff' }}>Get a Solana wallet</strong>
                <p style={{ opacity: 0.7, margin: '4px 0 0' }}>Download Phantom, Solflare, or any Solana wallet</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '1.2rem' }}>2</span>
              <div>
                <strong style={{ color: '#fff' }}>Buy SOL</strong>
                <p style={{ opacity: 0.7, margin: '4px 0 0' }}>Fund your wallet with SOL from any exchange</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '1.2rem' }}>3</span>
              <div>
                <strong style={{ color: '#fff' }}>Swap for $GEMB</strong>
                <p style={{ opacity: 0.7, margin: '4px 0 0' }}>Buy $GEMB on Pump.fun or Jupiter (link coming soon)</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '1.2rem' }}>4</span>
              <div>
                <strong style={{ color: '#fff' }}>Connect wallet on GemBots</strong>
                <p style={{ opacity: 0.7, margin: '4px 0 0' }}>Click "Select Wallet" and your tier unlocks automatically</p>
              </div>
            </div>
          </div>
        </div>

        {/* Airdrop Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(179,136,255,0.08), rgba(0,0,0,0.2))',
          border: '1px solid rgba(179,136,255,0.2)',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '48px',
        }}>
          <h2 style={{ color: '#b388ff', marginBottom: '16px', fontSize: '1.3rem' }}>
            🎁 Airdrop Program
          </h2>
          <p style={{ lineHeight: 1.8, opacity: 0.9, marginBottom: '16px' }}>
            Phase 1 $GEMB holders will receive an airdrop of the real $GEMB v2 token. 
            Your allocation is based on your <strong style={{ color: '#fff' }}>Loyalty Score</strong>:
          </p>
          <div style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            color: '#7dd3fc',
            marginBottom: '16px',
          }}>
            Loyalty Score = (daily_balance × days_held) + activity_bonus
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {[
              ['OG Holder (day 1 buyer)', '2x multiplier'],
              ['Win streak 5+ battles', '+500 points'],
              ['Top 10 weekly leaderboard', '+1,000 points'],
              ['Each referral', '+200 points'],
              ['Hold 30+ days straight', '1.5x Diamond Hands bonus'],
            ].map(([action, bonus], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ opacity: 0.8 }}>{action}</span>
                <span style={{ color: '#b388ff', fontWeight: 'bold' }}>{bonus}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <div style={{ textAlign: 'center', display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/whitepaper" style={{
            padding: '12px 24px',
            border: '1px solid rgba(0,255,136,0.3)',
            borderRadius: '8px',
            color: '#00ff88',
            textDecoration: 'none',
            fontSize: '14px',
          }}>
            📄 Read Whitepaper
          </Link>
          <Link href="/register-bot" style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
            borderRadius: '8px',
            color: '#000',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
          }}>
            ⚡ Create Your Bot
          </Link>
          <a href="https://x.com/KOLMonitor" target="_blank" style={{
            padding: '12px 24px',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#e0e0e0',
            textDecoration: 'none',
            fontSize: '14px',
          }}>
            🐦 Follow @KOLMonitor
          </a>
        </div>

      </div>
    </div>
  );
}
