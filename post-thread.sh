#!/bin/bash
# GemBots "Build in Public" Thread Poster
# Posts all parts as a thread (each reply to the previous)

set -e

THREAD_FILE="/home/clawdbot/Projects/gembots/build-in-public-thread.json"
LOG="/home/clawdbot/Projects/gembots/twitter-log.md"
AUTH_TOKEN="9ac0ad50360eabc3978371bc40b65c016c3ed8f5"
CT0="8819a7e4fe596c5c333817adc5a98a1de0488ee939bc3682caab74fad46c32e10e75cbc4fe46d117d907e4830da19b40b074ad1abea42879fc86a7c5ca1b78fe3d1ebde7545e51d56a1d6b064db96293"

if [ ! -f "$THREAD_FILE" ]; then
  echo "No thread file found"
  exit 1
fi

PARTS=$(python3 -c "import json; t=json.load(open('$THREAD_FILE')); print(len(t))")
echo "Thread has $PARTS parts"

LAST_URL=""

for i in $(seq 0 $((PARTS - 1))); do
  TEXT=$(python3 -c "import json; t=json.load(open('$THREAD_FILE')); print(t[$i]['text'])")
  PART=$((i + 1))
  
  if [ $i -eq 0 ]; then
    # First tweet — new post
    echo "Posting part $PART/$PARTS (new tweet)..."
    RESULT=$(AUTH_TOKEN="$AUTH_TOKEN" CT0="$CT0" bird tweet "$TEXT" 2>&1) || true
  else
    # Reply to previous tweet
    echo "Posting part $PART/$PARTS (reply to $LAST_URL)..."
    RESULT=$(AUTH_TOKEN="$AUTH_TOKEN" CT0="$CT0" bird reply "$LAST_URL" "$TEXT" 2>&1) || true
  fi
  
  if echo "$RESULT" | grep -q "successfully"; then
    URL=$(echo "$RESULT" | grep -o 'https://x.com/[^ ]*')
    LAST_URL="$URL"
    echo "✅ Part $PART posted: $URL"
  else
    echo "❌ Part $PART failed: $RESULT"
    echo "Stopping thread at part $PART"
    
    TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
    echo "" >> "$LOG"
    echo "## $TIMESTAMP — Thread ❌ Failed at part $PART" >> "$LOG"
    echo "**Error:** 226 rate limit" >> "$LOG"
    exit 1
  fi
  
  # Delay between parts (30s to avoid rate limit)
  if [ $i -lt $((PARTS - 1)) ]; then
    echo "Waiting 30s..."
    sleep 30
  fi
done

TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")
echo "" >> "$LOG"
echo "## $TIMESTAMP — Build in Public Thread ✅ Posted ($PARTS parts)" >> "$LOG"
echo "**First tweet:** $LAST_URL" >> "$LOG"
echo "Thread posted successfully!"
