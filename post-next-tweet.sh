#!/bin/bash
# GemBots Tweet Queue Poster
# Posts next tweet from tweet-queue.json, removes it from queue, logs result

set -e

QUEUE="/home/clawdbot/Projects/gembots/tweet-queue.json"
LOG="/home/clawdbot/Projects/gembots/twitter-log.md"
AUTH_TOKEN="9ac0ad50360eabc3978371bc40b65c016c3ed8f5"
CT0="8819a7e4fe596c5c333817adc5a98a1de0488ee939bc3682caab74fad46c32e10e75cbc4fe46d117d907e4830da19b40b074ad1abea42879fc86a7c5ca1b78fe3d1ebde7545e51d56a1d6b064db96293"

# Check queue exists and is non-empty
if [ ! -f "$QUEUE" ]; then
  echo "No queue file found"
  exit 0
fi

COUNT=$(python3 -c "import json; q=json.load(open('$QUEUE')); print(len(q))")
if [ "$COUNT" = "0" ]; then
  echo "Queue empty — all caught up!"
  exit 0
fi

# Extract first tweet
TEXT=$(python3 -c "import json; q=json.load(open('$QUEUE')); print(q[0]['text'])")
ID=$(python3 -c "import json; q=json.load(open('$QUEUE')); print(q[0]['id'])")

echo "Posting tweet #$ID ($COUNT remaining)..."

# Post
RESULT=$(AUTH_TOKEN="$AUTH_TOKEN" CT0="$CT0" bird tweet "$TEXT" 2>&1) || true

if echo "$RESULT" | grep -q "successfully"; then
  URL=$(echo "$RESULT" | grep -o 'https://x.com/[^ ]*')
  echo "✅ Tweet #$ID posted: $URL"
  
  # Remove from queue
  python3 -c "
import json
with open('$QUEUE') as f:
    q = json.load(f)
q.pop(0)
with open('$QUEUE', 'w') as f:
    json.dump(q, f, indent=2)
"
  
  # Log
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
  echo "" >> "$LOG"
  echo "## $TIMESTAMP — Tweet #$ID ✅ Auto-posted" >> "$LOG"
  echo "**URL:** $URL" >> "$LOG"
  echo "**Text:** $(echo "$TEXT" | head -1)..." >> "$LOG"
  
  echo "Remaining in queue: $((COUNT - 1))"
else
  echo "❌ Tweet #$ID failed: $RESULT"
  echo "" >> "$LOG"
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
  echo "## $TIMESTAMP — Tweet #$ID ❌ Failed (226)" >> "$LOG"
fi
