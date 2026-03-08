#!/usr/bin/env python3
"""
Clean and split GemBots training dataset for QLoRA fine-tuning.

Steps:
1. Remove anomalies (extreme predictions, outlier actual_x)
2. Remove duplicates (same token + same prediction range)
3. Improve instruction quality (add market context variety)
4. Remove _meta field (not needed for training)
5. Split into train/val (90/10)
6. Output stats

Usage: python3 scripts/clean-training-data.py
"""

import json
import random
import os
from collections import defaultdict

INPUT = 'data/training-dataset.jsonl'
TRAIN_OUT = 'data/train.jsonl'
VAL_OUT = 'data/val.jsonl'
STATS_OUT = 'data/dataset-stats.json'

# Thresholds
MAX_PREDICTION_X = 3.0      # Filter predictions > 3x (unrealistic)
MIN_PREDICTION_X = 0.3      # Filter predictions < 0.3x
MAX_ACTUAL_X = 5.0           # Filter actual moves > 5x (outliers)
MIN_ACTUAL_X = 0.5           # Filter actual moves < 0.5x
VAL_RATIO = 0.10

# Diverse instruction templates
INSTRUCTION_TEMPLATES = [
    "You are a crypto trading AI. Predict {token}'s price movement over the next {duration} minutes. Will it go up or down? Give a multiplier prediction.",
    "Analyze {token} for a {duration}-minute trade. Predict the price multiplier (1.0 = flat, >1.0 = up, <1.0 = down).",
    "As a trading bot, predict where {token} will be in {duration} minutes. Respond with a price multiplier and your reasoning.",
    "{token} — {duration} minute prediction. What's your call? Give a multiplier (e.g., 1.05 = +5%, 0.95 = -5%) and brief reasoning.",
    "Quick trade analysis: {token}, {duration}min window. Predict the price multiplier and explain your strategy.",
    "You're competing in a prediction arena. Predict {token}'s {duration}-minute price movement as a multiplier. Be precise.",
    "Trading signal needed: {token}, timeframe {duration}min. Output your prediction as a price multiplier with confidence level.",
    "Predict the short-term movement of {token} (next {duration} min). Give multiplier prediction and trading strategy rationale.",
]

# Diverse output templates
OUTPUT_TEMPLATES_UP = [
    "BULLISH on {token}. Prediction: {pred}x ({pct}). {strategy} strategy signals upward momentum. Confidence: {confidence}.",
    "BUY {token}. I predict {pred}x ({pct}) in {duration}min. {strategy} approach — current conditions favor longs. {confidence} confidence.",
    "Going LONG on {token}. Multiplier: {pred}x ({pct}). My {strategy} analysis shows buying pressure. Confidence: {confidence}.",
    "{token} looks bullish. Prediction: {pred}x ({pct}). Using {strategy} — momentum supports an upward move. {confidence} confidence.",
]

OUTPUT_TEMPLATES_DOWN = [
    "BEARISH on {token}. Prediction: {pred}x ({pct}). {strategy} strategy signals downward pressure. Confidence: {confidence}.",
    "SELL {token}. I predict {pred}x ({pct}) in {duration}min. {strategy} approach — conditions favor shorts. {confidence} confidence.",
    "Going SHORT on {token}. Multiplier: {pred}x ({pct}). My {strategy} analysis shows selling pressure. Confidence: {confidence}.",
    "{token} looks bearish. Prediction: {pred}x ({pct}). Using {strategy} — momentum supports a downward move. {confidence} confidence.",
]

OUTPUT_TEMPLATES_FLAT = [
    "NEUTRAL on {token}. Prediction: {pred}x ({pct}). {strategy} strategy shows no clear direction. Confidence: {confidence}.",
    "HOLD {token}. Predicting {pred}x ({pct}) — {strategy} analysis shows consolidation. {confidence} confidence.",
]

def get_confidence(pred_x):
    diff = abs(pred_x - 1.0)
    if diff > 0.10: return "high"
    if diff > 0.03: return "moderate"
    return "low"

def get_pct_str(pred_x):
    pct = (pred_x - 1) * 100
    return f"{pct:+.1f}%" 

def format_record(meta, idx):
    """Create a diverse, clean training record"""
    token = meta['token']
    pred = meta['winning_pred']
    strategy = meta['strategy'].replace('_', ' ')
    duration = 3  # default
    confidence = get_confidence(pred)
    pct = get_pct_str(pred)
    
    # Pick template based on index (deterministic but varied)
    inst_tmpl = INSTRUCTION_TEMPLATES[idx % len(INSTRUCTION_TEMPLATES)]
    instruction = inst_tmpl.format(token=token, duration=duration)
    
    if pred > 1.01:
        out_tmpl = OUTPUT_TEMPLATES_UP[idx % len(OUTPUT_TEMPLATES_UP)]
    elif pred < 0.99:
        out_tmpl = OUTPUT_TEMPLATES_DOWN[idx % len(OUTPUT_TEMPLATES_DOWN)]
    else:
        out_tmpl = OUTPUT_TEMPLATES_FLAT[idx % len(OUTPUT_TEMPLATES_FLAT)]
    
    output = out_tmpl.format(
        token=token, pred=f"{pred:.4f}", pct=pct,
        strategy=strategy, confidence=confidence, duration=duration
    )
    
    return {
        "instruction": instruction,
        "input": f"Token: {token}",
        "output": output
    }

def main():
    # Load
    records = []
    with open(INPUT) as f:
        for line in f:
            records.append(json.loads(line))
    
    print(f"📥 Loaded: {len(records)} records")
    
    stats = defaultdict(int)
    clean = []
    seen_keys = set()
    
    for r in records:
        meta = r['_meta']
        pred = meta['winning_pred']
        actual = meta['actual_x']
        token = meta['token']
        
        # Filter extreme predictions
        if pred > MAX_PREDICTION_X or pred < MIN_PREDICTION_X:
            stats['filtered_extreme_pred'] += 1
            continue
        
        # Filter extreme actual moves
        if actual > MAX_ACTUAL_X or actual < MIN_ACTUAL_X:
            stats['filtered_extreme_actual'] += 1
            continue
        
        # Dedup: same token + prediction rounded to 3 decimals + strategy + actual rounded to 2
        dedup_key = f"{token}_{round(pred, 3)}_{meta['strategy']}_{round(actual, 2)}"
        if dedup_key in seen_keys:
            stats['filtered_duplicate'] += 1
            continue
        seen_keys.add(dedup_key)
        
        clean.append(r)
        stats['kept'] += 1
        stats[f'token_{token}'] += 1
        stats[f'strategy_{meta["strategy"]}'] += 1
    
    print(f"\n🧹 Cleaning results:")
    print(f"   Extreme predictions (>{MAX_PREDICTION_X}x or <{MIN_PREDICTION_X}x): {stats['filtered_extreme_pred']}")
    print(f"   Extreme actual (>{MAX_ACTUAL_X}x or <{MIN_ACTUAL_X}x): {stats['filtered_extreme_actual']}")
    print(f"   Duplicates: {stats['filtered_duplicate']}")
    print(f"   ✅ Kept: {stats['kept']}")
    
    # Shuffle
    random.seed(42)
    random.shuffle(clean)
    
    # Format with diverse templates
    formatted = [format_record(r['_meta'], i) for i, r in enumerate(clean)]
    
    # Split
    split_idx = int(len(formatted) * (1 - VAL_RATIO))
    train = formatted[:split_idx]
    val = formatted[split_idx:]
    
    # Write
    os.makedirs('data', exist_ok=True)
    
    with open(TRAIN_OUT, 'w') as f:
        for r in train:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    
    with open(VAL_OUT, 'w') as f:
        for r in val:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    
    train_size = os.path.getsize(TRAIN_OUT) / 1024 / 1024
    val_size = os.path.getsize(VAL_OUT) / 1024 / 1024
    
    print(f"\n📦 Output:")
    print(f"   Train: {len(train)} records ({train_size:.1f} MB) → {TRAIN_OUT}")
    print(f"   Val:   {len(val)} records ({val_size:.1f} MB) → {VAL_OUT}")
    
    # Token distribution
    print(f"\n📈 Top tokens:")
    token_stats = {k.replace('token_', ''): v for k, v in stats.items() if k.startswith('token_')}
    for token, count in sorted(token_stats.items(), key=lambda x: -x[1])[:10]:
        print(f"   {token:10s}: {count:,}")
    
    # Strategy distribution
    print(f"\n🎯 Strategies:")
    strat_stats = {k.replace('strategy_', ''): v for k, v in stats.items() if k.startswith('strategy_')}
    for strat, count in sorted(strat_stats.items(), key=lambda x: -x[1]):
        print(f"   {strat:20s}: {count:,}")
    
    # Show samples
    print(f"\n📝 Sample records:")
    for i in range(3):
        r = train[i]
        print(f"\n--- Sample {i+1} ---")
        print(f"INST: {r['instruction']}")
        print(f"IN:   {r['input']}")
        print(f"OUT:  {r['output']}")
    
    # Save stats
    summary = {
        'total_raw': len(records),
        'total_clean': stats['kept'],
        'train_count': len(train),
        'val_count': len(val),
        'train_size_mb': round(train_size, 1),
        'val_size_mb': round(val_size, 1),
        'tokens': len(token_stats),
        'strategies': len(strat_stats),
        'filters': {
            'extreme_predictions': stats['filtered_extreme_pred'],
            'extreme_actual': stats['filtered_extreme_actual'],
            'duplicates': stats['filtered_duplicate']
        }
    }
    with open(STATS_OUT, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n✅ Done! Stats saved to {STATS_OUT}")

if __name__ == '__main__':
    main()
