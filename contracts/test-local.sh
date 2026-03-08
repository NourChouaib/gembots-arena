#!/bin/bash
# GemBots Betting Contract — Local Test Script
# Tests: deploy → initialize → create_pool → place_bet → lock → resolve → claim → collect_fees
set -e

export PATH="/home/clawdbot/.cargo/bin:/home/clawdbot/.local/share/solana/install/active_release/bin:$PATH"

PROGRAM_ID="ENAhq5nKQnQzjwj48bjUBefu8QvZ9vwArotgfWsbSax6"
PROGRAM_SO="target/deploy/gembots_betting.so"
KEYPAIR="target/deploy/gembots_betting-keypair.json"

echo "🔧 Setting up localnet..."
solana config set --url localhost -k ~/.config/solana/id.json > /dev/null 2>&1

# Kill any existing validator
pkill -f solana-test-validator 2>/dev/null || true
sleep 2

echo "🚀 Starting local validator..."
solana-test-validator --reset --quiet &
VALIDATOR_PID=$!
sleep 5

# Check validator is running
if ! solana cluster-version > /dev/null 2>&1; then
  echo "❌ Validator failed to start"
  exit 1
fi
echo "✅ Validator running (PID: $VALIDATOR_PID)"

# Airdrop SOL to our wallet
echo "💰 Airdropping SOL..."
solana airdrop 100 > /dev/null 2>&1
BALANCE=$(solana balance | awk '{print $1}')
echo "   Balance: $BALANCE SOL"

echo "📦 Deploying program..."
solana program deploy $PROGRAM_SO --program-id $KEYPAIR 2>&1 | tail -3

echo "✅ Program deployed at: $PROGRAM_ID"
echo ""
echo "📋 Program is deployed on localnet!"
echo "   RPC: http://localhost:8899"
echo "   Program ID: $PROGRAM_ID"
echo ""
echo "Now running TypeScript tests..."

# Kill validator on exit
cleanup() {
  echo "🛑 Stopping validator..."
  kill $VALIDATOR_PID 2>/dev/null || true
}
trap cleanup EXIT

# Run the JS test
cd /home/clawdbot/Projects/gembots/contracts
node test-contract.mjs

echo ""
echo "🎉 All tests complete!"
