#!/bin/bash
# Generate all 20 GemBots robots with retry logic
export GEMINI_API_KEY="${GEMINI_API_KEY:?Set GEMINI_API_KEY env var}"
SCRIPT="/home/clawdbot/.nvm/versions/node/v24.13.0/lib/node_modules/clawdbot/skills/nano-banana-pro/scripts/generate_image.py"
OUTDIR="$HOME/Projects/gembots/design-concepts/robots"

STYLE_PREFIX="Sleek futuristic android robot character design, Apple-style minimalist aesthetic, clean lines, smooth premium surfaces, dark black background (#0a0a0a), full body battle-ready pose facing left, digital concept art illustration."

declare -A ROBOTS
ROBOTS[01_neon_viper]="NeonViper: serpentine snake-like silhouette, elongated flexible segmented body, hooded cobra-shaped head with narrow glowing neon green visor, white and gunmetal armor with green vein-like accent lines, coiled low stance ready to strike, fangs on helmet"
ROBOTS[02_cyber_fang]="CyberFang: wolf-inspired aggressive silhouette, angular pointed ears on helmet, exposed mechanical fangs/jaws, broad shoulders hunched forward, clawed hands, fur-like layered armor plates, glowing red eyes, white and dark gray armor with crimson accents"
ROBOTS[03_shadow_ninja]="ShadowNinja: stealth ninja silhouette, hooded head cowl, slim lightweight frame, holding a glowing katana blade, asymmetric armor with one shoulder guard, matte black and dark purple armor, minimal glowing violet accent lines, crouched agile pose"
ROBOTS[04_iron_golem]="IronGolem: massive heavy tank silhouette, extremely wide and stocky build, thick armored plates everywhere, small head relative to huge body, oversized fists, heavy feet planted firmly, gunmetal and titanium white armor with orange warning accents, imposing stance"
ROBOTS[05_laser_hawk]="LaserHawk: bird-of-prey silhouette, sleek aerodynamic body with swept-back wing-like appendages, sharp beak-shaped visor helmet, streamlined limbs, jet thrusters on back, white and silver armor with electric blue accent streaks, soaring battle pose"
ROBOTS[06_tech_samurai]="TechSamurai: samurai warrior silhouette, traditional kabuto-style helmet modernized with clean tech lines, shoulder armor like samurai pauldrons, carrying energy katana, layered skirt-armor plates, white and pearl armor with gold accent lines, noble warrior stance"
ROBOTS[07_crystal_mage]="CrystalMage: mystical floating silhouette, hovering slightly off ground, crystalline growths emerging from shoulders and arms, flowing robe-like lower body, ornate head crown with crystal formations, translucent crystal elements, white and ice blue armor with prismatic light accents"
ROBOTS[08_storm_trooper]="StormTrooper: heavy military soldier silhouette, full enclosed tactical helmet with T-visor, bulky chest armor with ammo details, thick arm gauntlets, heavy boots, utility belt, shoulder-mounted targeting system, white and matte olive armor with red tactical accents"
ROBOTS[09_phantom_wraith]="PhantomWraith: ghostly ethereal silhouette, partially transparent/fading body parts, wispy trailing lower body that dissolves into mist, hollow glowing eye sockets, tattered cape-like back panels, skeletal frame visible through translucent armor, white fading to transparent with pale cyan glow accents"
ROBOTS[10_mech_spider]="MechSpider: arachnid silhouette, compact central body with 8 articulated mechanical spider legs, multiple small eyes on head cluster, low wide stance, menacing front pincers, web-spinner apparatus, dark gunmetal and white armor with toxic yellow accent nodes"
ROBOTS[11_dragon_mech]="DragonMech: dragon-inspired silhouette, horned helmet with long swept horns, powerful tail extending behind, wing-like back structures, clawed feet and hands, elongated snout visor, armored spine ridges, white and platinum armor with fiery orange-red accent lines and glowing chest core"
ROBOTS[12_arctic_frost]="ArcticFrost: ice warrior silhouette, frosted crystalline armor surfaces, icicle-like spikes on shoulders and forearms, breath mist effect near face, smooth rounded cold-weather design, frost patterns etched on armor, pure white and ice blue armor with pale frost-white glowing accents"
ROBOTS[13_volcanic_core]="VolcanicCore: lava-powered silhouette, cracks in armor revealing molten orange glow from within, heat shimmer effect, heavy volcanic rock-textured armor plates, smoldering core visible in chest, ember particles, dark charcoal and obsidian armor with intense orange-magma glow from internal cracks"
ROBOTS[14_neon_racer]="NeonRacer: speed-focused streamlined silhouette, ultra-aerodynamic body, racing stripe patterns, visor shaped like racing helmet, wheel-like joints, spoiler on back, lean forward sprinting pose, white and glossy carbon fiber armor with hot pink and cyan neon racing stripe accents"
ROBOTS[15_bio_hazard]="BioHazard: organic-tech hybrid silhouette, bio-mechanical textures mixing smooth tech with organic tendrils, toxic canister on back, gas mask-like face, asymmetric mutated arm larger than other, hazmat suit-inspired design, dark green and white armor with toxic neon green bio-luminescent accents"
ROBOTS[16_thunder_bolt]="ThunderBolt: electrical warrior silhouette, tesla coil-like spines on back, crackling energy between horns on head, lightning bolt patterns on armor, charged gauntlets with arc electricity, dynamic mid-stride pose, white and chrome armor with electric bright blue and purple lightning accents"
ROBOTS[17_gravity_well]="GravityWell: dense heavy silhouette with gravitational distortion effect, dark energy sphere in chest, orbiting debris/rings around body, extremely grounded wide stance, compressed powerful build, gravitational lens effect around hands, dark charcoal and white armor with deep purple-violet gravity field accents"
ROBOTS[18_quantum_shift]="QuantumShift: glitching silhouette partially dissolving into digital particles, some body parts pixelating or fragmenting away, digital noise effects, geometric fractal patterns, one arm solid other breaking into cubes/voxels, white and chrome armor with glitchy cyan-magenta chromatic aberration accents"
ROBOTS[19_void_walker]="VoidWalker: cosmic dark silhouette, body interior filled with starfield/nebula, cloak-like flowing panels, featureless smooth face with single glowing eye, tall and thin ethereal build, cosmic dust trailing from edges, deep black armor with galaxy purple and starlight white pinpoint accents"
ROBOTS[20_omega_prime]="OmegaPrime: ultimate boss silhouette, imposing tall powerful build combining best elements - crown-like head crest, one energy blade arm, one shield arm, cape flowing behind, chest with powerful glowing reactor core, ornate ceremonial-yet-deadly design, pristine white and gold armor with multi-color shifting holographic accents"

# Sort by key to generate in order
for key in $(echo "${!ROBOTS[@]}" | tr ' ' '\n' | sort); do
    outfile="$OUTDIR/${key}.png"
    
    # Skip if already generated
    if [ -f "$outfile" ]; then
        echo "SKIP: $outfile already exists"
        continue
    fi
    
    prompt="$STYLE_PREFIX ${ROBOTS[$key]}"
    echo "=== Generating: $key ==="
    
    # Retry loop with backoff
    for attempt in 1 2 3 4 5 6 7 8; do
        echo "  Attempt $attempt..."
        if uv run "$SCRIPT" --prompt "$prompt" --filename "$outfile" --api-key "$GEMINI_API_KEY" 2>&1; then
            if [ -f "$outfile" ]; then
                echo "  SUCCESS: $outfile"
                break
            fi
        fi
        
        # Exponential backoff: 10, 20, 40, 60, 60, 60...
        wait_time=$((10 * (2 ** (attempt - 1))))
        if [ $wait_time -gt 60 ]; then wait_time=60; fi
        echo "  Failed, waiting ${wait_time}s..."
        sleep $wait_time
    done
    
    # Small delay between successful generations to avoid rate limits
    sleep 5
done

echo "=== GENERATION COMPLETE ==="
ls -la "$OUTDIR"/*.png 2>/dev/null | wc -l
echo "images generated"
