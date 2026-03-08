#!/bin/bash
# GemBots Reply-Game: find trending tweets and reply with GemBots angle
# Usage: reply-game.sh [search_query]

AUTH_TOKEN="9ac0ad50360eabc3978371bc40b65c016c3ed8f5"
CT0="8819a7e4fe596c5c333817adc5a98a1de0488ee939bc3682caab74fad46c32e10e75cbc4fe46d117d907e4830da19b40b074ad1abea42879fc86a7c5ca1b78fe3d1ebde7545e51d56a1d6b064db96293"
LOG="/home/clawdbot/Projects/gembots/twitter-log.md"

QUERY="${1:-AI agents Solana}"

echo "🔍 Searching: $QUERY"
RESULTS=$(AUTH_TOKEN="$AUTH_TOKEN" CT0="$CT0" bird search "$QUERY" -n 5 --json 2>&1)

if echo "$RESULTS" | grep -q "226"; then
  echo "❌ 226 rate limit still active"
  exit 1
fi

echo "$RESULTS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
tweets = data if isinstance(data, list) else data.get('tweets', [])
for t in tweets[:5]:
    url = t.get('url', t.get('link', ''))
    user = t.get('user', {}).get('screen_name', t.get('author', ''))
    text = t.get('text', t.get('content', ''))[:100]
    print(f'@{user}: {text}...')
    print(f'  URL: {url}')
    print()
" 2>/dev/null || echo "Parse error — check manually"

echo ""
echo "📝 To reply manually:"
echo "AUTH_TOKEN=\"$AUTH_TOKEN\" CT0=\"$CT0\" bird reply <url> \"your reply text\""
