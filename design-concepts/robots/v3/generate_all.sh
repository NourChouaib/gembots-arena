#!/bin/bash
# Generate all 20 robots × 4 HP states via OpenAI gpt-image-1
# Then remove backgrounds with rembg

export OPENAI_API_KEY="${OPENAI_API_KEY:?Set OPENAI_API_KEY env var}"

DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON3="/home/linuxbrew/.linuxbrew/bin/python3"
REMBG_PYTHON="/usr/bin/python3"

GENERATED=0
FAILED=0
SKIPPED=0

gen() {
  local filename="$1"
  local prompt="$2"
  local filepath="$DIR/$filename"
  
  # Skip if already exists
  if [ -f "$filepath" ]; then
    echo "  SKIP (exists): $filename"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi
  
  echo "  Generating $filename..."
  
  local result
  result=$(curl -s --max-time 120 https://api.openai.com/v1/images/generations \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d "{
      \"model\": \"gpt-image-1\",
      \"prompt\": $(echo "$prompt" | $PYTHON3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))"),
      \"n\": 1,
      \"size\": \"1024x1536\",
      \"quality\": \"high\"
    }" 2>/dev/null | $PYTHON3 -c "
import sys, json, base64
try:
    data = json.load(sys.stdin)
    if 'data' in data and data['data']:
        b64 = data['data'][0].get('b64_json','')
        if b64:
            with open('$filepath','wb') as f:
                f.write(base64.b64decode(b64))
            print('OK')
        else:
            print('ERROR_NO_B64')
    else:
        err = json.dumps(data)[:200]
        print(f'ERROR: {err}')
except Exception as e:
    print(f'PARSE_ERROR: {e}')
" 2>/dev/null)

  if [ "$result" = "OK" ]; then
    echo "    ✓ $filename"
    GENERATED=$((GENERATED + 1))
    return 0
  else
    echo "    ✗ FAILED: $result — retrying in 5s..."
    sleep 5
    
    # Retry once
    result=$(curl -s --max-time 120 https://api.openai.com/v1/images/generations \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $OPENAI_API_KEY" \
      -d "{
        \"model\": \"gpt-image-1\",
        \"prompt\": $(echo "$prompt" | $PYTHON3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))"),
        \"n\": 1,
        \"size\": \"1024x1536\",
        \"quality\": \"high\"
      }" 2>/dev/null | $PYTHON3 -c "
import sys, json, base64
try:
    data = json.load(sys.stdin)
    if 'data' in data and data['data']:
        b64 = data['data'][0].get('b64_json','')
        if b64:
            with open('$filepath','wb') as f:
                f.write(base64.b64decode(b64))
            print('OK')
        else:
            print('ERROR_NO_B64')
    else:
        err = json.dumps(data)[:200]
        print(f'ERROR: {err}')
except Exception as e:
    print(f'PARSE_ERROR: {e}')
" 2>/dev/null)

    if [ "$result" = "OK" ]; then
      echo "    ✓ $filename (retry)"
      GENERATED=$((GENERATED + 1))
      return 0
    else
      echo "    ✗✗ PERMANENTLY FAILED: $result"
      FAILED=$((FAILED + 1))
      return 1
    fi
  fi
}

rembg_batch() {
  local prefix="$1"
  echo "  Removing backgrounds for ${prefix}*..."
  for f in "$DIR"/${prefix}*.png; do
    if [ -f "$f" ]; then
      echo "    rembg: $(basename $f)"
      $REMBG_PYTHON -c "
from rembg import remove
from PIL import Image
img = Image.open('$f')
out = remove(img)
out.save('$f')
" 2>/dev/null
      if [ $? -eq 0 ]; then
        echo "      ✓ done"
      else
        echo "      ✗ rembg failed"
      fi
    fi
  done
}

# HP state damage descriptions
FRESH="Clean, pristine condition, all LEDs and lights bright, full energy glow, perfect armor, no damage."
NEUTRAL="Minor scratches on armor plating, slightly dimmer lights, small dent on shoulder, mostly intact but used."
HURT="Cracked armor panels, exposed wiring on one arm, sparks flying from joints, one eye flickering, scorch marks on body."
CRITICAL="Heavily damaged, missing armor pieces, smoke rising, oil leaking, one arm hanging loose, red warning lights everywhere, barely standing, sparking and sputtering."

# Base template
BASE_SUFFIX="Apple-style sleek futuristic minimalist design, clean lines, dark background. Standing battle-ready pose facing left. Single character, game asset, premium quality digital art."

generate_robot() {
  local num="$1"
  local prefix="$2"
  local desc="$3"
  
  echo ""
  echo "═══════════════════════════════════════"
  echo "Robot $num: $prefix"
  echo "═══════════════════════════════════════"
  
  gen "${num}_${prefix}_fresh.png" "Full body character sprite head to feet of a ${desc}, ${BASE_SUFFIX} ${FRESH}"
  gen "${num}_${prefix}_neutral.png" "Full body character sprite head to feet of a ${desc}, ${BASE_SUFFIX} ${NEUTRAL}"
  gen "${num}_${prefix}_hurt.png" "Full body character sprite head to feet of a ${desc}, ${BASE_SUFFIX} ${HURT}"
  gen "${num}_${prefix}_critical.png" "Full body character sprite head to feet of a ${desc}, ${BASE_SUFFIX} ${CRITICAL}"
  
  # Remove backgrounds
  rembg_batch "${num}_${prefix}_"
}

echo "Starting generation of all 20 robots × 4 HP states..."
echo "Time: $(date)"
echo ""

# Start from a specific robot if given as argument
START=${1:-1}

if [ $START -le 1 ]; then
generate_robot "01" "neon_viper" "cobra/snake robot warrior, white-gray armor with neon green LED accent lines running along body, cobra hood shaped head with green visor eyes, humanoid armored upper body, serpentine mechanical tail as lower body"
fi

if [ $START -le 2 ]; then
generate_robot "02" "cyber_fang" "wolf-themed aggressive combat robot, angular wolf snout visor helmet, metallic gray-blue armor plating, razor-sharp claw gauntlets on both hands, mechanical wolf tail, powerful stance"
fi

if [ $START -le 3 ]; then
generate_robot "03" "shadow_ninja" "stealth assassin robot, slim matte black body armor, hooded head with glowing slit visor, one arm replaced with retractable katana blade, ninja-style silent killer aesthetic, dark purple accent lights"
fi

if [ $START -le 4 ]; then
generate_robot "04" "iron_golem" "massive heavy tank robot warrior, thick blocky reinforced armor plating, oversized mechanical fists, small head relative to huge body, fortress-like defensive build, iron gray with orange accents"
fi

if [ $START -le 5 ]; then
generate_robot "05" "laser_hawk" "aerial bird-like robot warrior, swept-back mechanical wings, sleek aerodynamic body, hawk-shaped visor head with targeting reticle eyes, sharp talon feet, blue and silver color scheme"
fi

if [ $START -le 6 ]; then
generate_robot "06" "tech_samurai" "samurai-armored robot warrior, traditional Japanese kabuto helmet with crescent crest, energy katana weapon, layered honor armor plates with circuit patterns, red and dark steel Japanese aesthetic"
fi

if [ $START -le 7 ]; then
generate_robot "07" "crystal_mage" "floating mystical mage robot, crystalline growths sprouting from shoulders arms and head, hovering slightly off ground, magical glowing orbs orbiting around it, purple and cyan crystal energy"
fi

if [ $START -le 8 ]; then
generate_robot "08" "storm_trooper" "military heavy armor combat robot, full face tactical helmet with HUD visor, shoulder-mounted cannon, ammunition belts crossing chest, tactical pouches, olive and gunmetal military color scheme"
fi

if [ $START -le 9 ]; then
generate_robot "09" "phantom_wraith" "ghostly translucent ethereal robot, wispy dissolving parts at edges, hooded head with eerie glowing eyes, floating slightly above ground, spectral blue-white glow, haunting presence"
fi

if [ $START -le 10 ]; then
generate_robot "10" "mech_spider" "multi-legged spider robot, 6 mechanical arachnid legs extending from compact armored body, multiple glowing red eyes on small head, creepy menacing posture, dark metallic body with red accents"
fi

if [ $START -le 11 ]; then
generate_robot "11" "dragon_mech" "dragon-themed robot warrior, sharp horns on head, blade-like mechanical wings, glowing orange energy core visible in chest, powerful claw hands, armored tail, dark gunmetal with orange energy accents"
fi

if [ $START -le 12 ]; then
generate_robot "12" "arctic_frost" "ice-themed robot warrior, white-blue armor plating, frost crystals growing on shoulders and arms, cold mist emanating from body, icy blue visor, frozen aesthetic with crystalline details"
fi

if [ $START -le 13 ]; then
generate_robot "13" "volcanic_core" "lava-themed robot warrior, dark volcanic armor with glowing orange-red cracks running through it, visible magma core in chest cavity, heat distortion around body, ember particles floating up"
fi

if [ $START -le 14 ]; then
generate_robot "14" "neon_racer" "speed-themed streamlined robot, aerodynamic body with racing stripes, thruster boosters on legs, sleek visor helmet, neon pink and cyan racing livery accents, built for velocity"
fi

if [ $START -le 15 ]; then
generate_robot "15" "bio_hazard" "toxic organic-tech hybrid robot, green glowing bio-luminescent veins visible through semi-organic armor, hazard warning symbols, mutant-like growths, toxic green and dark brown color scheme"
fi

if [ $START -le 16 ]; then
generate_robot "16" "thunder_bolt" "electric-themed robot warrior, lightning bolt design accents on armor, tesla coil structures on shoulders crackling with electricity, blue-white electrical energy arcing across body, dynamic power"
fi

if [ $START -le 17 ]; then
generate_robot "17" "gravity_well" "heavy dense gravity-controlling robot, dark purple-black armor, visible gravity distortion field around body, small debris and particles floating around it, compressed dense build, purple energy accents"
fi

if [ $START -le 18 ]; then
generate_robot "18" "quantum_shift" "glitching quantum robot partially dissolving into digital particles on one side, phase-shifting parts flickering between visible and transparent, quantum energy effects, cyan and white digital aesthetic"
fi

if [ $START -le 19 ]; then
generate_robot "19" "void_walker" "cosmic dark robot warrior, starfield and nebula patterns visible inside translucent body panels, deep space theme, dark matter armor, nebula glow emanating from core, cosmic purple and deep blue"
fi

if [ $START -le 20 ]; then
generate_robot "20" "omega_prime" "ultimate boss robot warrior, the largest and most imposing, golden crown and accents on dark premium armor, combining elements from multiple robot types, regal commanding presence, gold black and red color scheme"
fi

echo ""
echo "═══════════════════════════════════════"
echo "GENERATION COMPLETE"
echo "Generated: $GENERATED"
echo "Skipped (existing): $SKIPPED"  
echo "Failed: $FAILED"
echo "Time: $(date)"
echo "═══════════════════════════════════════"
