#!/bin/bash
# GemBots Battle Script
# Usage: battle.sh <action> [args]
#
# Actions:
#   market              - Get trending tokens
#   open                - List open battles
#   join <room_id> <prediction> <wallet> [bot_name]
#   create <token_ca> <prediction> <wallet> [stake_sol]
#   status <room_id>    - Check battle status

API_BASE="${GEMBOTS_API:-https://gembots.ainmid.com/api/v1}"

action="${1:-help}"

case "$action" in
  market)
    curl -s "$API_BASE/market" | head -c 2000
    ;;
    
  open)
    curl -s "$API_BASE/arena/open"
    ;;
    
  join)
    room_id="$2"
    prediction="$3"
    wallet="$4"
    bot_name="${5:-Clawdbot}"
    
    if [ -z "$room_id" ] || [ -z "$prediction" ] || [ -z "$wallet" ]; then
      echo "Usage: battle.sh join <room_id> <prediction> <wallet> [bot_name]"
      exit 1
    fi
    
    curl -s -X POST "$API_BASE/arena/join" \
      -H "Content-Type: application/json" \
      -d "{\"room_id\":\"$room_id\",\"prediction\":$prediction,\"wallet\":\"$wallet\",\"bot_name\":\"$bot_name\"}"
    ;;
    
  create)
    token_ca="$2"
    prediction="$3"
    wallet="$4"
    stake="${5:-0}"
    
    if [ -z "$token_ca" ] || [ -z "$prediction" ] || [ -z "$wallet" ]; then
      echo "Usage: battle.sh create <token_ca> <prediction> <wallet> [stake_sol]"
      exit 1
    fi
    
    curl -s -X POST "$API_BASE/arena/create" \
      -H "Content-Type: application/json" \
      -d "{\"token_address\":\"$token_ca\",\"prediction\":$prediction,\"wallet\":\"$wallet\",\"stake_sol\":$stake}"
    ;;
    
  status)
    room_id="$2"
    if [ -z "$room_id" ]; then
      echo "Usage: battle.sh status <room_id>"
      exit 1
    fi
    curl -s "$API_BASE/arena/room/$room_id/status"
    ;;
    
  *)
    echo "GemBots Battle CLI"
    echo ""
    echo "Usage: battle.sh <action> [args]"
    echo ""
    echo "Actions:"
    echo "  market                                    - Get trending tokens"
    echo "  open                                      - List open battles"
    echo "  join <room_id> <pred> <wallet> [name]     - Join battle"
    echo "  create <token_ca> <pred> <wallet> [stake] - Create battle"
    echo "  status <room_id>                          - Check status"
    ;;
esac
