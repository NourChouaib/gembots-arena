#!/usr/bin/env python3
"""
Enrich GemBots battle data with real market context.

Steps:
1. Download 1-minute candles from Binance/Bybit for all tokens
2. Store in SQLite for fast lookup
3. For each battle, find the closest candle and compute market context
4. Export enriched training dataset

Usage: python3 scripts/enrich-dataset.py [--download] [--export]
"""

import json
import sqlite3
import time
import argparse
import os
import sys
import requests
import psycopg2
from datetime import datetime, timezone, timedelta
from collections import defaultdict

# Token → Exchange mapping
BINANCE_SYMBOLS = {
    'BTC': 'BTCUSDT', 'SOL': 'SOLUSDT', 'ETH': 'ETHUSDT', 'BNB': 'BNBUSDT',
    'WIF': 'WIFUSDT', 'BONK': 'BONKUSDT', 'RENDER': 'RENDERUSDT', 'BOME': 'BOMEUSDT',
    'JTO': 'JTOUSDT', 'CAKE': 'CAKEUSDT', 'LINK': 'LINKUSDT', 'ADA': 'ADAUSDT',
    'XRP': 'XRPUSDT', 'PEPE': 'PEPEUSDT',
}

BYBIT_SYMBOLS = {
    'MEW': 'MEWUSDT', 'POPCAT': 'POPCATUSDT',
}

# Skip tokens with too few battles (<1000) or not on major exchanges
SKIP_TOKENS = {'schizo', 'Runner', 'SAFEMOON', 'SPOK', 'USDC', 'SERIOUS', 'Mars',
               'LEO', 'PEAK', 'Jellycat', 'Elephant', 'Chud', 'Coin', 'Winston',
               'BEALL', 'This', 'AMZN', 'Millie', 'Percolator', 'RAVEN',
               'REKTOBER', '$PENG', 'CLWD', 'USEFUL'}

# MYRO is not on Binance or Bybit spot — we'll skip it (28K battles but no price data)
SKIP_TOKENS.add('MYRO')

DB_PATH = 'data/market-data.db'
PG_CONFIG = {'host': 'localhost', 'port': 54322, 'user': 'postgres', 'password': 'postgres', 'dbname': 'postgres'}

def init_market_db():
    """Create SQLite DB for candle data"""
    os.makedirs('data', exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS candles (
            symbol TEXT,
            ts INTEGER,  -- unix ms
            open REAL, high REAL, low REAL, close REAL,
            volume REAL,
            PRIMARY KEY (symbol, ts)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_candles_symbol_ts ON candles(symbol, ts)")
    conn.commit()
    return conn

def download_binance_candles(db, symbol, binance_symbol, start_date, end_date):
    """Download 1-min candles from Binance"""
    start_ms = int(start_date.timestamp() * 1000)
    end_ms = int(end_date.timestamp() * 1000)
    
    # Check what we already have
    existing = db.execute("SELECT MAX(ts) FROM candles WHERE symbol = ?", (symbol,)).fetchone()[0]
    if existing and existing > start_ms:
        start_ms = existing + 60000  # start from next minute
    
    total = 0
    current = start_ms
    
    while current < end_ms:
        url = f"https://api.binance.com/api/v3/klines?symbol={binance_symbol}&interval=1m&startTime={current}&limit=1000"
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 429:
                print(f"  ⚠️ Rate limited, waiting 60s...")
                time.sleep(60)
                continue
            if resp.status_code != 200:
                print(f"  ❌ {binance_symbol}: HTTP {resp.status_code}")
                break
            
            data = resp.json()
            if not data:
                break
            
            rows = [(symbol, int(d[0]), float(d[1]), float(d[2]), float(d[3]), float(d[4]), float(d[5])) for d in data]
            db.executemany("INSERT OR IGNORE INTO candles VALUES (?,?,?,?,?,?,?)", rows)
            db.commit()
            
            total += len(rows)
            current = int(data[-1][0]) + 60000
            
            # Brief pause to respect rate limits
            time.sleep(0.15)
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
            time.sleep(5)
            continue
    
    return total

def download_bybit_candles(db, symbol, bybit_symbol, start_date, end_date):
    """Download 1-min candles from Bybit"""
    start_ms = int(start_date.timestamp() * 1000)
    end_ms = int(end_date.timestamp() * 1000)
    
    existing = db.execute("SELECT MAX(ts) FROM candles WHERE symbol = ?", (symbol,)).fetchone()[0]
    if existing and existing > start_ms:
        start_ms = existing + 60000
    
    total = 0
    current = start_ms
    
    while current < end_ms:
        url = f"https://api.bybit.com/v5/market/kline?category=spot&symbol={bybit_symbol}&interval=1&start={current}&limit=1000"
        try:
            resp = requests.get(url, timeout=10)
            data = resp.json()
            
            if data.get('retCode') != 0 or not data.get('result', {}).get('list'):
                break
            
            klines = data['result']['list']
            # Bybit returns [ts, open, high, low, close, volume, turnover] in reverse order
            rows = [(symbol, int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4]), float(k[5])) for k in klines]
            db.executemany("INSERT OR IGNORE INTO candles VALUES (?,?,?,?,?,?,?)", rows)
            db.commit()
            
            total += len(rows)
            # Bybit returns newest first, so advance using the oldest timestamp
            oldest_ts = min(int(k[0]) for k in klines)
            newest_ts = max(int(k[0]) for k in klines)
            current = newest_ts + 60000
            
            time.sleep(0.2)
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
            time.sleep(5)
            continue
    
    return total

def download_all(start_date, end_date):
    """Download candles for all tokens"""
    db = init_market_db()
    
    print("📥 Downloading market data...\n")
    
    # Always download BTC for market context
    if 'BTC' not in BINANCE_SYMBOLS:
        BINANCE_SYMBOLS['BTC'] = 'BTCUSDT'
    
    for symbol, binance_sym in BINANCE_SYMBOLS.items():
        count = db.execute("SELECT COUNT(*) FROM candles WHERE symbol = ?", (symbol,)).fetchone()[0]
        print(f"  📊 {symbol:8s} (Binance {binance_sym}) — existing: {count:,}", end='')
        n = download_binance_candles(db, symbol, binance_sym, start_date, end_date)
        print(f" → downloaded {n:,} new candles")
    
    for symbol, bybit_sym in BYBIT_SYMBOLS.items():
        count = db.execute("SELECT COUNT(*) FROM candles WHERE symbol = ?", (symbol,)).fetchone()[0]
        print(f"  📊 {symbol:8s} (Bybit {bybit_sym}) — existing: {count:,}", end='')
        n = download_bybit_candles(db, symbol, bybit_sym, start_date, end_date)
        print(f" → downloaded {n:,} new candles")
    
    # Summary
    total = db.execute("SELECT COUNT(*) FROM candles").fetchone()[0]
    symbols = db.execute("SELECT COUNT(DISTINCT symbol) FROM candles").fetchone()[0]
    print(f"\n✅ Total: {total:,} candles for {symbols} tokens")
    
    db.close()

def get_market_context(db_cursor, symbol, battle_ts_ms):
    """Get market context for a battle timestamp"""
    # Find closest candle (within 5 min)
    row = db_cursor.execute("""
        SELECT ts, open, high, low, close, volume
        FROM candles WHERE symbol = ? AND ts BETWEEN ? AND ?
        ORDER BY ABS(ts - ?) LIMIT 1
    """, (symbol, battle_ts_ms - 300000, battle_ts_ms + 300000, battle_ts_ms)).fetchone()
    
    if not row:
        return None
    
    price = row[4]  # close price
    volume = row[5]
    
    # Get 1h ago price
    hour_ago = db_cursor.execute("""
        SELECT close FROM candles WHERE symbol = ? AND ts BETWEEN ? AND ?
        ORDER BY ABS(ts - ?) LIMIT 1
    """, (symbol, battle_ts_ms - 3900000, battle_ts_ms - 3300000, battle_ts_ms - 3600000)).fetchone()
    
    # Get 24h ago price
    day_ago = db_cursor.execute("""
        SELECT close FROM candles WHERE symbol = ? AND ts BETWEEN ? AND ?
        ORDER BY ABS(ts - ?) LIMIT 1
    """, (symbol, battle_ts_ms - 87600000, battle_ts_ms - 84600000, battle_ts_ms - 86400000)).fetchone()
    
    # Get BTC price for market context
    btc = db_cursor.execute("""
        SELECT close FROM candles WHERE symbol = 'BTC' AND ts BETWEEN ? AND ?
        ORDER BY ABS(ts - ?) LIMIT 1
    """, (battle_ts_ms - 300000, battle_ts_ms + 300000, battle_ts_ms)).fetchone()
    
    btc_1h = db_cursor.execute("""
        SELECT close FROM candles WHERE symbol = 'BTC' AND ts BETWEEN ? AND ?
        ORDER BY ABS(ts - ?) LIMIT 1
    """, (battle_ts_ms - 3900000, battle_ts_ms - 3300000, battle_ts_ms - 3600000)).fetchone()
    
    # Compute changes
    change_1h = ((price / hour_ago[0]) - 1) * 100 if hour_ago and hour_ago[0] > 0 else None
    change_24h = ((price / day_ago[0]) - 1) * 100 if day_ago and day_ago[0] > 0 else None
    btc_price = btc[0] if btc else None
    btc_change_1h = ((btc[0] / btc_1h[0]) - 1) * 100 if btc and btc_1h and btc_1h[0] > 0 else None
    
    # Volume classification (simple: compare to recent average)
    recent_vols = db_cursor.execute("""
        SELECT AVG(volume) FROM candles WHERE symbol = ? AND ts BETWEEN ? AND ?
    """, (symbol, battle_ts_ms - 3600000, battle_ts_ms)).fetchone()
    avg_vol = recent_vols[0] if recent_vols and recent_vols[0] else 0
    vol_ratio = volume / avg_vol if avg_vol > 0 else 1.0
    if vol_ratio > 2.0:
        vol_label = "very high"
    elif vol_ratio > 1.3:
        vol_label = "above average"
    elif vol_ratio > 0.7:
        vol_label = "normal"
    else:
        vol_label = "below average"
    
    return {
        'price': price,
        'change_1h': change_1h,
        'change_24h': change_24h,
        'volume_label': vol_label,
        'vol_ratio': round(vol_ratio, 2),
        'btc_price': btc_price,
        'btc_change_1h': btc_change_1h,
    }

def format_market_input(token, ctx, duration):
    """Format market context as training input"""
    parts = [f"Token: {token}"]
    
    if ctx['price']:
        parts.append(f"Price: ${ctx['price']:.4f}" if ctx['price'] < 1 else f"Price: ${ctx['price']:.2f}")
    
    if ctx['change_1h'] is not None:
        parts.append(f"1h: {ctx['change_1h']:+.1f}%")
    
    if ctx['change_24h'] is not None:
        parts.append(f"24h: {ctx['change_24h']:+.1f}%")
    
    parts.append(f"Volume: {ctx['volume_label']}")
    
    if ctx['btc_price']:
        btc_str = f"BTC: ${ctx['btc_price']:,.0f}"
        if ctx['btc_change_1h'] is not None:
            btc_str += f" ({ctx['btc_change_1h']:+.1f}%)"
        parts.append(btc_str)
    
    parts.append(f"Timeframe: {duration}min")
    
    return ", ".join(parts)

# Instruction templates (diverse)
INSTRUCTIONS = [
    "You are a crypto trading AI competing in a prediction arena. Analyze the market data and predict {token}'s price movement. Give a multiplier prediction with reasoning.",
    "Predict {token}'s short-term price movement based on the provided market context. Respond with direction, multiplier, and strategy rationale.",
    "As an expert trading bot, analyze {token}'s current market state and predict where the price will be. Include your prediction multiplier and confidence.",
    "Trading arena battle: predict {token}'s next move. Use the market data to form your prediction. Give a precise multiplier.",
    "Analyze this market snapshot for {token} and make a price prediction. Be specific — give a multiplier (1.0 = flat, >1.0 = up, <1.0 = down) and explain.",
    "You're a top-performing trading AI. Given {token}'s current market data, predict the short-term price movement with a multiplier and confidence level.",
    "Market analysis required: {token}. Review the data and predict price direction. Output format: direction, multiplier, strategy, confidence.",
    "Quick trade analysis: examine {token}'s market context and deliver a prediction. Include multiplier, strategy reasoning, and confidence.",
]

def get_reasoning(token, pred_x, ctx, strategy):
    """Generate reasoning based on market context"""
    parts = []
    
    # Trend analysis
    if ctx['change_1h'] is not None:
        if ctx['change_1h'] > 2:
            parts.append(f"{token} is in a strong uptrend (+{ctx['change_1h']:.1f}% last hour)")
        elif ctx['change_1h'] > 0.5:
            parts.append(f"{token} showing mild bullish momentum ({ctx['change_1h']:+.1f}% 1h)")
        elif ctx['change_1h'] < -2:
            parts.append(f"{token} is in a sharp downtrend ({ctx['change_1h']:.1f}% last hour)")
        elif ctx['change_1h'] < -0.5:
            parts.append(f"{token} showing bearish pressure ({ctx['change_1h']:+.1f}% 1h)")
        else:
            parts.append(f"{token} consolidating near current levels ({ctx['change_1h']:+.1f}% 1h)")
    
    # Volume
    if ctx['vol_ratio'] > 2:
        parts.append("volume surge detected — high conviction move likely")
    elif ctx['vol_ratio'] > 1.3:
        parts.append("above-average volume supports the move")
    elif ctx['vol_ratio'] < 0.5:
        parts.append("low volume — caution, weak conviction")
    
    # BTC correlation
    if ctx['btc_change_1h'] is not None:
        if ctx['btc_change_1h'] > 1:
            parts.append(f"BTC is bullish ({ctx['btc_change_1h']:+.1f}% 1h), risk-on environment")
        elif ctx['btc_change_1h'] < -1:
            parts.append(f"BTC dropping ({ctx['btc_change_1h']:+.1f}% 1h), risk-off pressure on alts")
    
    # Strategy-specific reasoning
    strat = strategy.replace('_', ' ')
    if strategy == 'mean_reversion' and ctx['change_1h'] is not None:
        if abs(ctx['change_1h']) > 2:
            parts.append(f"mean reversion strategy: expecting pullback after {ctx['change_1h']:+.1f}% move")
    elif strategy == 'trend_follower' and ctx['change_1h'] is not None:
        if ctx['change_1h'] > 0.5:
            parts.append("trend following: riding the existing upward momentum")
        elif ctx['change_1h'] < -0.5:
            parts.append("trend following: momentum is bearish, staying short")
    elif strategy == 'contrarian':
        parts.append("contrarian approach: looking for reversal signals against the crowd")
    
    return ". ".join(parts) + "." if parts else f"Using {strat} strategy on current market conditions."

def export_enriched(min_wr=52):
    """Export enriched training dataset"""
    market_db = sqlite3.connect(DB_PATH)
    mc = market_db.cursor()
    
    pg = psycopg2.connect(**PG_CONFIG)
    pc = pg.cursor()
    
    # Get winning bot IDs
    pc.execute("""
        SELECT id, name, model_id, strategy, wins, losses,
               CASE WHEN wins + losses > 0 THEN ROUND(wins::numeric / (wins + losses) * 100, 2) ELSE 0 END
        FROM bots WHERE wins + losses > 50
    """)
    bots = {r[0]: {'name': r[1], 'model_id': r[2], 'strategy': r[3], 'wins': r[4], 'losses': r[5], 'wr': float(r[6])} for r in pc.fetchall()}
    good_bot_ids = [bid for bid, b in bots.items() if b['wr'] >= min_wr]
    
    print(f"📊 Good bots (WR >= {min_wr}%): {len(good_bot_ids)}")
    
    # Get battles with winners from good bots, excluding junk tokens
    pc.execute("""
        SELECT bat.token_symbol, bat.created_at, bat.duration_minutes, bat.actual_x,
               CASE WHEN bat.winner_id = bat.bot1_id THEN bat.bot1_prediction ELSE bat.bot2_prediction END,
               bat.winner_id
        FROM battles bat
        WHERE bat.status = 'resolved' AND bat.actual_x IS NOT NULL
          AND bat.winner_id = ANY(%s)
          AND bat.token_symbol NOT IN ('schizo','Runner','SAFEMOON','SPOK','USDC','SERIOUS','Mars',
               'LEO','PEAK','Jellycat','Elephant','Chud','Coin','Winston','BEALL','This',
               'AMZN','Millie','Percolator','RAVEN','REKTOBER','$PENG','CLWD','USEFUL','MYRO')
        ORDER BY bat.created_at
    """, (good_bot_ids,))
    
    rows = pc.fetchall()
    print(f"🎯 Total battles to process: {len(rows):,}")
    
    stats = defaultdict(int)
    records = []
    
    for i, row in enumerate(rows):
        token, created_at, duration, actual_x, winning_pred, winner_id = row
        duration = duration or 3
        actual_x = float(actual_x)
        winning_pred = float(winning_pred)
        
        # Filter extremes
        if winning_pred > 3.0 or winning_pred < 0.3:
            stats['filtered_extreme_pred'] += 1
            continue
        if actual_x > 5.0 or actual_x < 0.5:
            stats['filtered_extreme_actual'] += 1
            continue
        
        # Skip flat
        if abs((actual_x - 1) * 100) < 0.01:
            stats['filtered_flat'] += 1
            continue
        
        # Get market context
        battle_ts_ms = int(created_at.timestamp() * 1000)
        ctx = get_market_context(mc, token, battle_ts_ms)
        
        if not ctx:
            stats['no_market_data'] += 1
            continue
        
        bot = bots[winner_id]
        strategy = bot['strategy']
        
        # Format
        instruction = INSTRUCTIONS[i % len(INSTRUCTIONS)].format(token=token)
        input_text = format_market_input(token, ctx, duration)
        
        # Direction
        pct = (winning_pred - 1) * 100
        if pct > 5: direction = "STRONG BUY"
        elif pct > 1: direction = "BUY"
        elif pct > -1: direction = "HOLD"
        elif pct > -5: direction = "SELL"
        else: direction = "STRONG SELL"
        
        confidence = "high" if abs(pct) > 10 else "moderate" if abs(pct) > 3 else "low"
        reasoning = get_reasoning(token, winning_pred, ctx, strategy)
        
        output = f"{direction}. Prediction: {winning_pred:.4f}x ({pct:+.1f}%). {reasoning} Strategy: {strategy.replace('_', ' ')}. Confidence: {confidence}."
        
        record = {
            "instruction": instruction,
            "input": input_text,
            "output": output
        }
        records.append(record)
        stats['exported'] += 1
        stats[f'token_{token}'] += 1
        
        if (i + 1) % 50000 == 0:
            print(f"  ... processed {i+1:,}/{len(rows):,}")
    
    pg.close()
    market_db.close()
    
    # Dedup on input similarity
    import hashlib
    seen = set()
    unique = []
    for r in records:
        key = hashlib.md5((r['input'] + r['output'][:50]).encode()).hexdigest()
        if key not in seen:
            seen.add(key)
            unique.append(r)
    
    print(f"\n🧹 Dedup: {len(records):,} → {len(unique):,}")
    
    # Shuffle and split
    import random
    random.seed(42)
    random.shuffle(unique)
    
    split = int(len(unique) * 0.9)
    train = unique[:split]
    val = unique[split:]
    
    # Write
    with open('data/train-enriched.jsonl', 'w') as f:
        for r in train:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    
    with open('data/val-enriched.jsonl', 'w') as f:
        for r in val:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    
    train_mb = os.path.getsize('data/train-enriched.jsonl') / 1024 / 1024
    val_mb = os.path.getsize('data/val-enriched.jsonl') / 1024 / 1024
    
    print(f"\n✅ Enriched dataset:")
    print(f"   Train: {len(train):,} records ({train_mb:.1f} MB)")
    print(f"   Val:   {len(val):,} records ({val_mb:.1f} MB)")
    print(f"\n   Filtered - extreme pred: {stats.get('filtered_extreme_pred', 0)}")
    print(f"   Filtered - extreme actual: {stats.get('filtered_extreme_actual', 0)}")
    print(f"   Filtered - flat: {stats.get('filtered_flat', 0)}")
    print(f"   No market data: {stats.get('no_market_data', 0)}")
    
    # Samples
    print(f"\n📝 Samples:")
    for i in range(3):
        r = train[i]
        print(f"\n--- Sample {i+1} ---")
        print(f"INST: {r['instruction']}")
        print(f"IN:   {r['input']}")
        print(f"OUT:  {r['output']}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true', help='Download market data')
    parser.add_argument('--export', action='store_true', help='Export enriched dataset')
    parser.add_argument('--min-wr', type=float, default=52)
    parser.add_argument('--all', action='store_true', help='Download + export')
    args = parser.parse_args()
    
    start_date = datetime(2026, 2, 6, tzinfo=timezone.utc)  # 1 day before first battle
    end_date = datetime(2026, 3, 9, tzinfo=timezone.utc)
    
    if args.download or args.all:
        download_all(start_date, end_date)
    
    if args.export or args.all:
        export_enriched(args.min_wr)
    
    if not args.download and not args.export and not args.all:
        print("Usage: --download (get market data), --export (create dataset), --all (both)")
