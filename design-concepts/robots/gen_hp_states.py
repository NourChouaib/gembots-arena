#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "pillow>=10.0.0",
# ]
# ///
"""Generate HP state variants for all 20 GemBots robots using Imagen 4.0"""

import sys
import time
from pathlib import Path
from io import BytesIO

from google import genai
from google.genai import types
from PIL import Image as PILImage

API_KEY = os.environ["GEMINI_API_KEY"]
OUTDIR = Path.home() / "Projects/gembots/design-concepts/robots/states"
OUTDIR.mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=API_KEY)

STYLE = "Sleek futuristic android robot character design, Apple-style minimalist aesthetic, clean smooth lines, premium polished surfaces, dark black background, full body battle-ready pose facing left, professional digital concept art illustration, 3D render quality."

# Damage descriptions per tier
DAMAGE = {
    "neutral": "Minor battle damage: small scratches on armor surfaces, slightly dimmer LED lights and glowing accents, a small dent on one shoulder plate, faint scuff marks on legs, overall still functional but showing signs of combat wear.",
    "hurt": "Moderate battle damage: cracked and fractured armor panels revealing internal structure, exposed wiring and circuitry on one arm, bright sparks flying from damaged joints, one eye/visor flickering and glitching, dark scorch marks from energy weapon hits, a chunk of shoulder armor missing, warning lights visible.",
    "critical": "Severely damaged and barely functioning: large armor pieces completely missing exposing skeletal frame, thick smoke rising from multiple joints, dark oil/coolant leaking and dripping down body, one arm hanging loose and disconnected, red emergency warning lights pulsing, sparking exposed wires everywhere, cracked visor with distorted glow, body listing to one side, on the verge of shutdown."
}

# Robot descriptions (same as original gen but used for HP states)
ROBOTS = [
    ("01_neon_viper", "serpentine snake-like robot with elongated flexible segmented body, hooded cobra-shaped head with narrow glowing neon green visor, smooth white and gunmetal armor with neon green vein-like accent lines, coiled serpent tail"),
    ("02_cyber_fang", "wolf-inspired aggressive android with angular pointed wolf ears on helmet, exposed mechanical fangs and jaw, broad hunched shoulders, sharp clawed hands, layered fur-like armor plates, glowing red eyes, white and dark gray armor with crimson red accents"),
    ("03_shadow_ninja", "stealth ninja android with hooded cowl head covering, slim lightweight athletic frame, holding a glowing energy katana sword, asymmetric armor with one shoulder guard, matte black and dark purple armor, subtle violet accent lines"),
    ("04_iron_golem", "massive heavy tank android, extremely wide and stocky powerful build, thick layered armored plates everywhere, small head relative to enormous body, oversized mechanical fists, gunmetal and titanium white armor with orange warning stripe accents"),
    ("05_laser_hawk", "bird-of-prey android with sleek aerodynamic streamlined body, swept-back wing appendages from back, sharp beak-shaped visor helmet, jet thruster wings, white and silver armor with electric blue streak accents"),
    ("06_tech_samurai", "samurai warrior android with modernized kabuto helmet with crescent moon crest, samurai shoulder pauldrons in tech style, carrying energy katana, layered skirt armor plates, white and pearl armor with gold accent lines"),
    ("07_crystal_mage", "mystical floating android hovering off the ground, large crystalline growths from shoulders and arms, flowing robe-like lower body panels, ornate crystal crown on head, translucent prismatic crystal elements, white and ice blue armor with rainbow light refraction"),
    ("08_storm_trooper", "heavy military soldier android with fully enclosed tactical helmet with T-shaped visor, bulky chest armor, thick arm gauntlets, heavy combat boots, shoulder-mounted targeting system, white and matte olive green armor with red tactical markings"),
    ("09_phantom_wraith", "ghostly ethereal android with partially transparent fading body parts, wispy trailing lower body dissolving into mist, hollow glowing pale blue eye sockets, tattered flowing cape-like back panels, skeletal frame visible through translucent armor, white fading to transparent with pale cyan ghost glow"),
    ("10_mech_spider", "arachnid spider android with compact rounded central body, 8 long articulated mechanical spider legs, multiple small glowing eyes, low menacing wide stance, sharp front pincers, dark gunmetal and white armor with toxic yellow accent nodes on joints"),
    ("11_dragon_mech", "dragon-inspired android with horned helmet with two long swept-back horns, powerful mechanical tail, wing-like back structures, clawed dragon feet and hands, elongated snout visor, armored spine ridges, white and platinum armor with fiery orange-red accent lines and glowing chest reactor"),
    ("12_arctic_frost", "ice warrior android with frosted crystalline armor surfaces, icicle-like spikes on shoulders and forearms, cold breath mist effect, smooth rounded cold-weather design, frost patterns on armor, pure white and ice blue armor with pale frost-white glowing accents"),
    ("13_volcanic_core", "lava-powered android with armor cracks and fissures revealing molten orange magma glow from within, heavy volcanic rock-textured armor plates, smoldering glowing core in chest cavity, ember particles, dark charcoal obsidian armor with intense orange-magma glow from internal cracks"),
    ("14_neon_racer", "speed-focused ultra-streamlined android, extremely aerodynamic body, racing stripe patterns, visor shaped like racing helmet, wheel-like circular joints, rear spoiler on back, lean forward sprinting pose, white and glossy carbon fiber armor with hot pink and cyan neon racing stripes"),
    ("15_bio_hazard", "organic-tech hybrid android with bio-mechanical textures mixing smooth tech with organic tendrils, toxic canister on back, gas mask respirator face, one arm mutated and larger, hazmat suit inspired, dark green and white armor with toxic neon green bio-luminescent accents"),
    ("16_thunder_bolt", "electrical warrior android with tesla coil-like spines from back, crackling energy arcs between horns on head, lightning bolt patterns on armor, charged gauntlets with visible arc electricity, white and chrome armor with bright electric blue and purple lightning bolt accents"),
    ("17_gravity_well", "dense heavy android with gravitational distortion effect, dark energy sphere in chest, small orbiting debris rings around body, extremely grounded wide stance, compressed powerful build, dark charcoal and white armor with deep purple-violet gravity field accents"),
    ("18_quantum_shift", "glitching android partially dissolving into digital particles, some body parts pixelating into voxels, digital noise distortion effects, geometric fractal patterns, one arm solid while other breaks into floating cubes, white and chrome armor with glitchy cyan and magenta chromatic aberration"),
    ("19_void_walker", "cosmic ethereal android with body interior filled with starfield nebula space, flowing cloak-like panels trailing behind, featureless smooth face with single glowing eye, tall thin elongated build, cosmic dust particles, deep black armor with galaxy purple and starlight white accents"),
    ("20_omega_prime", "ultimate powerful boss android, imposing tall commanding build, crown-like ornate head crest, one arm with energy blade and one with energy shield, dramatic cape flowing behind, chest with powerful glowing multi-color reactor core, pristine white and gold armor with shifting holographic rainbow accents"),
]

def generate_state(filename, robot_desc, state, attempt=1, max_attempts=5):
    outpath = OUTDIR / f"{filename}_{state}.png"
    if outpath.exists():
        print(f"SKIP: {outpath.name} already exists")
        return True
    
    damage_desc = DAMAGE[state]
    prompt = f"{STYLE} {robot_desc}. {damage_desc}"
    
    for i in range(attempt, max_attempts + 1):
        try:
            print(f"  [{filename}_{state}] Attempt {i}...")
            result = client.models.generate_images(
                model='imagen-4.0-generate-001',
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    output_mime_type='image/png',
                )
            )
            for img in result.generated_images:
                image = PILImage.open(BytesIO(img.image.image_bytes))
                image.save(str(outpath), 'PNG')
                print(f"  SAVED: {outpath.name}")
                return True
        except Exception as e:
            err = str(e)
            if '503' in err or 'UNAVAILABLE' in err or '429' in err or 'quota' in err.lower():
                wait = min(10 * (2 ** (i - 1)), 120)
                print(f"  Rate limited, waiting {wait}s... ({err[:80]})")
                time.sleep(wait)
            else:
                print(f"  ERROR: {err}")
                time.sleep(15)
    
    print(f"  FAILED: {filename}_{state}")
    return False


# Command line: start_idx end_idx [states]
# states: comma-separated, e.g. "neutral,hurt,critical" or "hurt,critical"
start_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
end_idx = int(sys.argv[2]) if len(sys.argv) > 2 else len(ROBOTS)
states_arg = sys.argv[3] if len(sys.argv) > 3 else "neutral,hurt,critical"
states = [s.strip() for s in states_arg.split(",")]

success = 0
failed = 0
total = (end_idx - start_idx) * len(states)

for idx in range(start_idx, end_idx):
    filename, desc = ROBOTS[idx]
    for state in states:
        print(f"\n=== [{success+failed+1}/{total}] {filename}_{state} ===")
        if generate_state(filename, desc, state):
            success += 1
        else:
            failed += 1
        time.sleep(2)

print(f"\n=== DONE: {success} success, {failed} failed out of {total} ===")
