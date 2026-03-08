#!/usr/bin/env python3
"""
Export GemBots battle data as fine-tuning dataset for trading LLM.

Format: Alpaca-style JSONL (instruction/input/output)
Each record = one winning prediction from a bot with WR > 50%

Usage: python3 scripts/export-training-data.py [--min-wr 52] [--output data/training-dataset.jsonl]
"""

import json
import argparse
import psycopg2
from collections import defaultdict
import os
import sys

DB_CONFIG = {
    'host': 'localhost',
    'port': 54322,
    'user': 'postgres',
    'password': 'postgres',
    'dbname': 'postgres'
}

def get_bot_stats(cur):
    """Get bot win rates"""
    cur.execute("""
        SELECT id, name, model_id, strategy, wins, losses,
               CASE WHEN wins + losses > 0 
                    THEN ROUND(wins::numeric / (wins + losses) * 100, 2) 
                    ELSE 0 END as win_rate
        FROM bots 
        WHERE wins + losses > 50
        ORDER BY win_rate DESC
    """)
    return {row[0]: {
        'id': row[0], 'name': row[1], 'model_id': row[2],
        'strategy': row[3], 'wins': row[4], 'losses': row[5],
        'win_rate': float(row[6])
    } for row in cur.fetchall()}

def format_prediction_direction(predicted_x):
    """Convert numeric prediction to direction + confidence"""
    predicted_x = float(predicted_x)
    if predicted_x > 1.05:
        return "STRONG BUY", f"+{(predicted_x - 1) * 100:.1f}%"
    elif predicted_x > 1.01:
        return "BUY", f"+{(predicted_x - 1) * 100:.1f}%"
    elif predicted_x > 0.99:
        return "HOLD", f"{(predicted_x - 1) * 100:.1f}%"
    elif predicted_x > 0.95:
        return "SELL", f"{(predicted_x - 1) * 100:.1f}%"
    else:
        return "STRONG SELL", f"{(predicted_x - 1) * 100:.1f}%"

def format_actual_result(actual_x):
    """Describe what actually happened"""
    actual_x = float(actual_x)
    pct = (actual_x - 1) * 100
    if pct > 5:
        return f"pumped {pct:.1f}%"
    elif pct > 1:
        return f"went up {pct:.1f}%"
    elif pct > -1:
        return f"stayed flat ({pct:+.1f}%)"
    elif pct > -5:
        return f"dropped {abs(pct):.1f}%"
    else:
        return f"dumped {abs(pct):.1f}%"

def export_dataset(min_wr=50, output_path='data/training-dataset.jsonl', limit=None):
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Get bot stats
    bot_stats = get_bot_stats(cur)
    winning_bot_ids = [b['id'] for b in bot_stats.values() if b['win_rate'] >= min_wr]
    
    print(f"📊 Bots with WR >= {min_wr}%: {len(winning_bot_ids)}")
    for bid in winning_bot_ids:
        b = bot_stats[bid]
        print(f"   {b['name']:20s} | {b['model_id']:40s} | {b['strategy']:15s} | WR: {b['win_rate']:.1f}% ({b['wins']}W/{b['losses']}L)")
    
    # Export winning predictions from these bots
    # A "winning prediction" = this bot was the winner of the battle
    query = """
        SELECT 
            bat.token_symbol,
            bat.entry_price,
            bat.duration_minutes,
            bat.actual_x,
            bat.created_at,
            CASE WHEN bat.winner_id = bat.bot1_id THEN bat.bot1_prediction ELSE bat.bot2_prediction END as winning_prediction,
            CASE WHEN bat.winner_id = bat.bot1_id THEN bat.bot2_prediction ELSE bat.bot1_prediction END as losing_prediction,
            bat.winner_id,
            b.model_id,
            b.strategy,
            b.name as bot_name
        FROM battles bat
        JOIN bots b ON bat.winner_id = b.id
        WHERE bat.status = 'resolved' 
          AND bat.actual_x IS NOT NULL
          AND bat.winner_id = ANY(%s)
        ORDER BY bat.created_at
    """
    if limit:
        query += f" LIMIT {limit}"
    
    cur.execute(query, (winning_bot_ids,))
    rows = cur.fetchall()
    
    print(f"\n🎯 Winning predictions from top bots: {len(rows)}")
    
    # Format as training data
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    
    stats = defaultdict(int)
    
    with open(output_path, 'w') as f:
        for row in rows:
            token = row[0]
            entry_price = row[1]
            duration = row[2] or 3
            actual_x = float(row[3])
            created_at = row[4]
            winning_pred = float(row[5])
            losing_pred = float(row[6])
            winner_id = row[7]
            model_id = row[8]
            strategy = row[9]
            bot_name = row[10]
            
            direction, pct_str = format_prediction_direction(winning_pred)
            result_desc = format_actual_result(actual_x)
            actual_pct = (actual_x - 1) * 100
            
            # Skip near-zero actual moves (noise)
            if abs(actual_pct) < 0.01:
                stats['skipped_flat'] += 1
                continue
            
            # Instruction: market context
            instruction = (
                f"You are an expert crypto trading AI. "
                f"Predict the price movement of {token} over the next {duration} minutes. "
                f"The token {result_desc} in this period. "
                f"Give your prediction as a multiplier (1.0 = no change, 1.05 = +5%, 0.95 = -5%)."
            )
            
            # Output: the winning prediction with reasoning
            if direction in ("STRONG BUY", "BUY"):
                reasoning = f"Based on current market dynamics, I predict {token} will go UP. "
            elif direction in ("STRONG SELL", "SELL"):
                reasoning = f"Based on current market dynamics, I predict {token} will go DOWN. "
            else:
                reasoning = f"Based on current market dynamics, I predict {token} will stay relatively FLAT. "
            
            output = (
                f"{reasoning}"
                f"Prediction: {winning_pred:.4f}x ({pct_str}). "
                f"Strategy: {strategy}. "
                f"Confidence: {'high' if abs(winning_pred - 1) > 0.05 else 'moderate' if abs(winning_pred - 1) > 0.02 else 'low'}."
            )
            
            record = {
                "instruction": instruction,
                "input": f"Token: {token}, Timeframe: {duration}min",
                "output": output,
                # Metadata (not used in training, for analysis)
                "_meta": {
                    "token": token,
                    "actual_x": actual_x,
                    "winning_pred": winning_pred,
                    "losing_pred": losing_pred,
                    "model": model_id,
                    "strategy": strategy,
                    "bot": bot_name,
                    "timestamp": str(created_at)
                }
            }
            
            f.write(json.dumps(record, ensure_ascii=False) + '\n')
            stats['exported'] += 1
            stats[f'token_{token}'] += 1
            stats[f'strategy_{strategy}'] += 1
    
    cur.close()
    conn.close()
    
    # Summary
    print(f"\n✅ Exported {stats['exported']} training records to {output_path}")
    print(f"   Skipped (flat): {stats.get('skipped_flat', 0)}")
    
    file_size = os.path.getsize(output_path)
    print(f"   File size: {file_size / 1024 / 1024:.1f} MB")
    
    # Top tokens
    print(f"\n📈 Top tokens in dataset:")
    token_stats = {k.replace('token_', ''): v for k, v in stats.items() if k.startswith('token_')}
    for token, count in sorted(token_stats.items(), key=lambda x: -x[1])[:10]:
        print(f"   {token:10s}: {count:,}")
    
    # Strategy distribution
    print(f"\n🎯 Strategy distribution:")
    strat_stats = {k.replace('strategy_', ''): v for k, v in stats.items() if k.startswith('strategy_')}
    for strat, count in sorted(strat_stats.items(), key=lambda x: -x[1]):
        print(f"   {strat:20s}: {count:,}")
    
    return stats

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Export GemBots training dataset')
    parser.add_argument('--min-wr', type=float, default=50, help='Minimum win rate %% (default: 50)')
    parser.add_argument('--output', default='data/training-dataset.jsonl', help='Output JSONL path')
    parser.add_argument('--limit', type=int, default=None, help='Limit records')
    args = parser.parse_args()
    
    export_dataset(args.min_wr, args.output, args.limit)
