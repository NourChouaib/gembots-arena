#!/usr/bin/env python3
"""
Convert enriched dataset from Alpaca format (instruction/input/output)
to Gemma 3 chat format for fine-tuning.

Gemma 3 uses this chat template:
<start_of_turn>user
{system prompt + user message}<end_of_turn>
<start_of_turn>model
{response}<end_of_turn>

For SFT we use "conversations" format (ShareGPT-style) which Unsloth/TRL support:
[
  {"role": "system", "content": "..."},
  {"role": "user", "content": "..."},
  {"role": "assistant", "content": "..."}
]
"""

import json
import os

SYSTEM_PROMPT = """You are GemBots Arena Trader, an AI trained on 400K+ real prediction battles on BNB Chain. You analyze crypto market data and predict short-term price movements. You give precise predictions with multipliers, strategy reasoning, and confidence levels. Your predictions are based on real battle performance data — not theory."""

def convert_record(record):
    """Convert Alpaca format to Gemma chat format"""
    instruction = record['instruction']
    input_text = record['input']
    output = record['output']
    
    # Combine instruction + input into user message
    user_msg = f"{instruction}\n\nMarket Data: {input_text}"
    
    return {
        "conversations": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": output},
        ]
    }

def convert_file(input_path, output_path):
    records = []
    with open(input_path) as f:
        for line in f:
            r = json.loads(line.strip())
            records.append(convert_record(r))
    
    with open(output_path, 'w') as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    
    return len(records)

if __name__ == '__main__':
    os.makedirs('data', exist_ok=True)
    
    n_train = convert_file('data/train-enriched.jsonl', 'data/train-gemma.jsonl')
    n_val = convert_file('data/val-enriched.jsonl', 'data/val-gemma.jsonl')
    
    train_mb = os.path.getsize('data/train-gemma.jsonl') / 1024 / 1024
    val_mb = os.path.getsize('data/val-gemma.jsonl') / 1024 / 1024
    
    print(f"✅ Gemma 3 dataset ready:")
    print(f"   Train: {n_train:,} records ({train_mb:.1f} MB) → data/train-gemma.jsonl")
    print(f"   Val:   {n_val:,} records ({val_mb:.1f} MB) → data/val-gemma.jsonl")
    
    # Show sample
    with open('data/train-gemma.jsonl') as f:
        sample = json.loads(f.readline())
    
    print(f"\n📝 Sample record:")
    for msg in sample['conversations']:
        role = msg['role'].upper()
        content = msg['content'][:150] + '...' if len(msg['content']) > 150 else msg['content']
        print(f"   [{role}]: {content}")
