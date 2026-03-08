#!/usr/bin/env python3
"""
GemBots Forge — Fine-tune Gemma 3 12B on arena battle data.

Run on RunPod with RTX 4090 (24GB VRAM).
Estimated: ~2-3 hours training, ~$1.50 total.

Setup on RunPod:
  pip install unsloth transformers datasets peft trl accelerate bitsandbytes
  # Upload data/train-gemma.jsonl and data/val-gemma.jsonl

Usage:
  python3 finetune-gemma.py
"""

from unsloth import FastLanguageModel
from trl import SFTTrainer, SFTConfig
from datasets import load_dataset
import torch
import os
import json

# ---- Config ----
MODEL_NAME = "unsloth/gemma-3-12b-it-bnb-4bit"  # Pre-quantized 4-bit for QLoRA
MAX_SEQ_LENGTH = 1024   # Our records are short (~200-400 tokens)
LORA_R = 32             # LoRA rank (higher = more capacity, more VRAM)
LORA_ALPHA = 64         # LoRA alpha (usually 2x rank)
LORA_DROPOUT = 0.05
OUTPUT_DIR = "./gembots-trader-gemma12b"
EPOCHS = 2
BATCH_SIZE = 4
GRADIENT_ACCUMULATION = 4  # Effective batch size = 4 * 4 = 16
LEARNING_RATE = 2e-4
WARMUP_RATIO = 0.05

print("🔨 GemBots Forge — Fine-tuning Gemma 3 12B")
print(f"   Model: {MODEL_NAME}")
print(f"   LoRA: r={LORA_R}, alpha={LORA_ALPHA}")
print(f"   Epochs: {EPOCHS}, LR: {LEARNING_RATE}")
print()

# ---- Load Model ----
print("📥 Loading model...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,  # Auto-detect
    load_in_4bit=True,
)

# ---- Apply LoRA ----
print("🔧 Applying LoRA adapters...")
model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_R,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                     "gate_proj", "up_proj", "down_proj"],
    lora_alpha=LORA_ALPHA,
    lora_dropout=LORA_DROPOUT,
    bias="none",
    use_gradient_checkpointing="unsloth",  # Memory efficient
    random_state=42,
)

trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
total = sum(p.numel() for p in model.parameters())
print(f"   Trainable: {trainable:,} / {total:,} ({trainable/total*100:.1f}%)")

# ---- Load Dataset ----
print("📊 Loading dataset...")
train_dataset = load_dataset("json", data_files="data/train-gemma.jsonl", split="train")
val_dataset = load_dataset("json", data_files="data/val-gemma.jsonl", split="train")
print(f"   Train: {len(train_dataset):,} | Val: {len(val_dataset):,}")

# ---- Format for training ----
def format_chat(example):
    """Format conversations into Gemma chat template"""
    messages = example["conversations"]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
    return {"text": text}

train_dataset = train_dataset.map(format_chat)
val_dataset = val_dataset.map(format_chat)

# ---- Training Config ----
print("🚀 Starting training...")
training_args = SFTConfig(
    output_dir=OUTPUT_DIR,
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=GRADIENT_ACCUMULATION,
    learning_rate=LEARNING_RATE,
    warmup_ratio=WARMUP_RATIO,
    lr_scheduler_type="cosine",
    logging_steps=50,
    save_steps=500,
    save_total_limit=2,
    eval_strategy="steps",
    eval_steps=500,
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),
    optim="adamw_8bit",
    weight_decay=0.01,
    max_grad_norm=1.0,
    seed=42,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    packing=True,  # Pack multiple short examples into one sequence
)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    args=training_args,
)

# ---- Train ----
stats = trainer.train()
print(f"\n✅ Training complete!")
print(f"   Total steps: {stats.global_step}")
print(f"   Training loss: {stats.training_loss:.4f}")
print(f"   Runtime: {stats.metrics['train_runtime']/3600:.1f} hours")

# ---- Save ----
print(f"\n💾 Saving to {OUTPUT_DIR}...")
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

# ---- Save merged model for GGUF conversion ----
print("🔄 Merging LoRA weights...")
merged_dir = f"{OUTPUT_DIR}-merged"
model.save_pretrained_merged(merged_dir, tokenizer, save_method="merged_16bit")
print(f"   Merged model saved to {merged_dir}")

# ---- Convert to GGUF ----
print("📦 Converting to GGUF (Q4_K_M)...")
gguf_dir = f"{OUTPUT_DIR}-gguf"
model.save_pretrained_gguf(gguf_dir, tokenizer, quantization_method="q4_k_m")
print(f"   GGUF model saved to {gguf_dir}")

# ---- Summary ----
gguf_files = [f for f in os.listdir(gguf_dir) if f.endswith('.gguf')] if os.path.exists(gguf_dir) else []
print(f"\n🎉 Done! Files ready:")
print(f"   LoRA adapter: {OUTPUT_DIR}/")
print(f"   Merged model: {merged_dir}/")
print(f"   GGUF (Q4_K_M): {gguf_dir}/ — {', '.join(gguf_files)}")
print(f"\n📋 Next steps:")
print(f"   1. Download GGUF file to Alpha-Machine")
print(f"   2. Create Ollama Modelfile")
print(f"   3. ollama create gembots-trader -f Modelfile")
print(f"   4. Test: ollama run gembots-trader")
print(f"   5. Add as GemBots provider")
