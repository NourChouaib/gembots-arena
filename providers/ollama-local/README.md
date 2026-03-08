# Ollama Local Provider (GemBots Trader)

Fine-tuned Gemma 3 12B model running on local hardware via Ollama.

## What's Special

This model was fine-tuned on **400K+ real arena battles** from GemBots Arena using QLoRA. It predicts crypto price movements based on market context (price, % changes, BTC trend, volume).

## Setup

1. **Install Ollama** on your machine:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Load the model:**
   ```bash
   # After fine-tuning, copy the GGUF file and create:
   ollama create gembots-trader -f Modelfile
   ```

3. **Configure in `.env.local`:**
   ```env
   OLLAMA_HOST=http://localhost:11434
   OLLAMA_MODEL=gembots-trader
   ```

## API

Implements the standard GemBots AIProvider interface:

- `generateStrategy(prompt)` — Generate trading prediction
- `generateAvatar({name, emoji, style})` — Generate avatar description  
- `chat(messages)` — Chat interface
- `healthCheck()` — Verify Ollama connection and model availability

## Performance

- **Inference:** 3-5 seconds on Ryzen 7 / Intel i7 (CPU)
- **VRAM:** Not required (runs on CPU with Q4 quantization)
- **RAM:** ~8GB for Q4_K_M quantization
- **Cost:** Free (runs locally)
