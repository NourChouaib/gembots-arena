#!/bin/bash
# Generate robot HP states via OpenAI gpt-image-1
DIR="$(cd "$(dirname "$0")" && pwd)"

gen() {
  local name="$1"
  local prompt="$2"
  echo "Generating $name..."
  curl -s https://api.openai.com/v1/images/generations \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d "{
      \"model\": \"gpt-image-1\",
      \"prompt\": \"$prompt\",
      \"n\": 1,
      \"size\": \"1024x1536\",
      \"quality\": \"high\"
    }" | /home/linuxbrew/.linuxbrew/bin/python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
if 'data' in data and data['data']:
    b64 = data['data'][0].get('b64_json','')
    if b64:
        with open('$DIR/$name','wb') as f:
            f.write(base64.b64decode(b64))
        print('  OK: $name')
    else:
        print('  URL mode - not supported')
else:
    print('  ERROR:', json.dumps(data)[:200])
"
}

# DragonMech states
DRAGON_BASE="Full body character sprite head to feet of a sleek futuristic minimalist dragon robot warrior, Apple-style clean design. Dark gunmetal armor with glowing orange energy core in chest, sharp dragon horns, blade-like wings, claw hands, armored legs and feet visible. Facing left. Pure black background. Single character, game asset."

gen "11_dragon_mech_neutral_v2.png" "$DRAGON_BASE Minor scratches on armor plating, slightly dimmer orange glow, small dent on shoulder. Still battle-ready."
gen "11_dragon_mech_hurt_v2.png" "$DRAGON_BASE Cracked armor panels exposing wiring, sparks flying from joints, one horn broken, scorch marks on chest, one wing bent, orange core flickering."
gen "11_dragon_mech_critical_v2.png" "$DRAGON_BASE Heavily damaged, one wing torn off, armor shattered exposing inner mechanics, smoke rising, oil leaking, core glowing red instead of orange, barely standing, sparking everywhere."

# NeonViper states  
VIPER_BASE="Full body character sprite head to feet of a sleek futuristic minimalist cobra snake robot, Apple-style clean design. White and gray armor with neon green LED lines, cobra hood head, green visor eyes, humanoid upper body, serpentine tail lower body. Facing left. Pure black background. Single character, game asset."

gen "01_neon_viper_neutral_v2.png" "$VIPER_BASE Minor scratches on white armor, slightly dimmer green LEDs, small crack on hood."
gen "01_neon_viper_hurt_v2.png" "$VIPER_BASE Cracked armor panels, exposed wiring on one arm, sparks from joints, green LEDs flickering, scorch marks on torso, part of hood damaged."
gen "01_neon_viper_critical_v2.png" "$VIPER_BASE Heavily damaged, armor shattered, tail segments broken, smoke rising, one arm barely attached, LEDs turned red instead of green, oil leaking, barely functioning."

echo "All done!"
