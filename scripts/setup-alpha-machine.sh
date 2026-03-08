#!/bin/bash
# GemBots Forge — Setup Alpha-Machine for model inference
# Run on Alpha-Machine (WSL2, Ryzen 7, 16GB RAM)

set -e
echo "🔨 GemBots Forge — Alpha-Machine Setup"
echo ""

# 1. Check system
echo "=== System Info ==="
echo "CPU: $(lscpu | grep 'Model name' | cut -d: -f2 | xargs)"
echo "Cores: $(nproc)"
echo "RAM: $(free -h | awk '/Mem:/ {print $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $4}') free"
echo ""

# 2. Install Ollama
if command -v ollama &>/dev/null; then
    echo "✅ Ollama already installed: $(ollama --version 2>&1)"
else
    echo "📥 Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    echo "✅ Ollama installed"
fi

# 3. Start Ollama service
echo "🚀 Starting Ollama..."
if pgrep -x "ollama" > /dev/null; then
    echo "   Already running"
else
    ollama serve &
    sleep 3
    echo "   Started"
fi

# 4. Pull base Gemma 3 12B (for comparison / fallback)
echo ""
echo "📥 Pulling Gemma 3 12B (Q4_K_M, ~8GB)..."
echo "   This may take a while depending on internet speed..."
ollama pull gemma3:12b

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 After fine-tuning, to load custom model:"
echo "   1. Copy GGUF file to this machine"
echo "   2. Create Modelfile:"
echo '      echo "FROM ./gembots-trader-gemma12b.gguf" > Modelfile'
echo '      echo "SYSTEM \"You are GemBots Arena Trader...\"" >> Modelfile'  
echo "   3. ollama create gembots-trader -f Modelfile"
echo "   4. Test: ollama run gembots-trader"
echo ""
echo "🌐 Ollama API: http://localhost:11434"
echo "   From Tailscale: http://$(hostname -I | awk '{print $1}'):11434"
