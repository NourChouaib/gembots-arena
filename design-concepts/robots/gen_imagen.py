#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "pillow>=10.0.0",
# ]
# ///
"""Generate all 20 GemBots robots using Imagen 4.0"""

import sys
import time
from pathlib import Path
from io import BytesIO

from google import genai
from google.genai import types
from PIL import Image as PILImage

API_KEY = os.environ["GEMINI_API_KEY"]
OUTDIR = Path.home() / "Projects/gembots/design-concepts/robots"
OUTDIR.mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=API_KEY)

STYLE = "Sleek futuristic android robot character design, Apple-style minimalist aesthetic, clean smooth lines, premium polished surfaces, dark black background, full body battle-ready pose facing left, professional digital concept art illustration, 3D render quality."

ROBOTS = [
    ("01_neon_viper", "NeonViper: serpentine snake-like silhouette, elongated flexible segmented body, hooded cobra-shaped head with narrow glowing neon green visor, smooth white and gunmetal armor with neon green vein-like accent lines, coiled serpent tail replacing legs, low crouching strike pose"),
    ("02_cyber_fang", "CyberFang: wolf-inspired aggressive android silhouette, angular pointed wolf ears on helmet, exposed mechanical fangs and jaw, broad hunched shoulders, sharp clawed hands, layered fur-like armor plates, glowing red eyes, white and dark gray armor with crimson red accents"),
    ("03_shadow_ninja", "ShadowNinja: stealth ninja android silhouette, hooded cowl head covering, slim lightweight athletic frame, holding a glowing energy katana sword, asymmetric armor with one shoulder guard, matte black and dark purple armor, subtle violet accent lines, crouched agile ninja stance"),
    ("04_iron_golem", "IronGolem: massive heavy tank android silhouette, extremely wide and stocky powerful build, thick layered armored plates everywhere, small head relative to enormous body, oversized mechanical fists, heavy planted feet, gunmetal and titanium white armor with orange warning stripe accents"),
    ("05_laser_hawk", "LaserHawk: bird-of-prey android silhouette, sleek aerodynamic streamlined body with swept-back wing appendages extending from back, sharp beak-shaped visor helmet, jet thruster wings, white and silver armor with electric blue streak accents, dynamic soaring pose"),
    ("06_tech_samurai", "TechSamurai: samurai warrior android silhouette, modernized kabuto helmet with crescent moon crest, traditional samurai shoulder pauldrons reimagined in tech style, carrying energy katana, layered skirt armor plates, white and pearl armor with gold accent lines, noble warrior stance"),
    ("07_crystal_mage", "CrystalMage: mystical floating android silhouette, hovering off the ground, large crystalline growths emerging from shoulders and arms, flowing robe-like lower body panels, ornate crystal crown formation on head, translucent prismatic crystal elements, white and ice blue armor with rainbow light refraction accents"),
    ("08_storm_trooper", "StormTrooper: heavy military soldier android silhouette, fully enclosed tactical helmet with T-shaped visor, bulky chest armor with tactical details, thick arm gauntlets, heavy combat boots, shoulder-mounted targeting system, utility belt, white and matte olive green armor with red tactical accent markings"),
    ("09_phantom_wraith", "PhantomWraith: ghostly ethereal android silhouette, partially transparent fading body parts, wispy trailing lower body that dissolves into mist particles, hollow glowing pale blue eye sockets, tattered flowing cape-like back panels, skeletal frame visible through translucent armor, white fading to transparent with pale cyan ghost glow"),
    ("10_mech_spider", "MechSpider: arachnid spider android silhouette, compact rounded central body with 8 long articulated mechanical spider legs, multiple small glowing eyes arranged on head, low menacing wide stance, sharp front pincers, web-spinner apparatus on back, dark gunmetal and white armor with toxic yellow accent nodes on joints"),
    ("11_dragon_mech", "DragonMech: dragon-inspired android silhouette, horned helmet with two long swept-back horns, powerful mechanical tail extending behind, wing-like back structures, clawed dragon feet and hands, elongated snout visor, armored spine ridges down back, white and platinum armor with fiery orange-red accent lines and glowing chest core reactor"),
    ("12_arctic_frost", "ArcticFrost: ice warrior android silhouette, frosted crystalline armor surfaces with ice texture, icicle-like spikes on shoulders and forearms, cold breath mist effect near face, smooth rounded cold-weather design, frost patterns etched on armor panels, pure white and ice blue armor with pale frost-white glowing accents"),
    ("13_volcanic_core", "VolcanicCore: lava-powered android silhouette, armor with visible cracks and fissures revealing molten orange magma glow from within, heavy volcanic rock-textured armor plates, smoldering glowing core visible in chest cavity, ember particles floating up, dark charcoal obsidian armor with intense orange-magma glow from internal cracks"),
    ("14_neon_racer", "NeonRacer: speed-focused ultra-streamlined android silhouette, extremely aerodynamic body design, racing stripe patterns along body, visor shaped like racing helmet, wheel-like circular joints, rear spoiler on back, lean forward sprinting pose, white and glossy carbon fiber armor with hot pink and cyan neon racing stripe accents"),
    ("15_bio_hazard", "BioHazard: organic-tech hybrid android silhouette, bio-mechanical textures mixing smooth tech surfaces with organic tendrils and growths, toxic canister container on back, gas mask respirator face design, one arm mutated and larger than the other, hazmat suit inspired design, dark green and white armor with toxic neon green bio-luminescent accents"),
    ("16_thunder_bolt", "ThunderBolt: electrical warrior android silhouette, tesla coil-like spines extending from back, crackling energy arcs between horns on head, lightning bolt patterns etched on armor, charged gauntlets with visible arc electricity, dynamic mid-stride charging pose, white and chrome armor with bright electric blue and purple lightning bolt accents"),
    ("17_gravity_well", "GravityWell: dense heavy android silhouette with gravitational distortion visual effect, dark energy sphere contained in chest, small orbiting debris rings around body, extremely grounded wide power stance, compressed powerful bulky build, gravitational lens warping effect around hands, dark charcoal and white armor with deep purple-violet gravity field accents"),
    ("18_quantum_shift", "QuantumShift: glitching android silhouette partially dissolving into digital particles, some body parts pixelating or fragmenting into voxels, digital noise distortion effects, geometric fractal patterns, one arm solid while the other breaks apart into floating cubes, white and chrome armor with glitchy cyan and magenta chromatic aberration accents"),
    ("19_void_walker", "VoidWalker: cosmic ethereal android silhouette, body interior filled with starfield nebula space, flowing cloak-like panels trailing behind, featureless smooth face with single glowing eye, tall thin elongated ethereal build, cosmic dust particles trailing from edges, deep black armor with galaxy purple and starlight white pinpoint accents"),
    ("20_omega_prime", "OmegaPrime: ultimate powerful boss android silhouette, imposing tall commanding build combining the best elements - crown-like ornate head crest, one arm with energy blade and one arm with energy shield, dramatic cape flowing behind, chest with powerful glowing multi-color reactor core, ornate ceremonial yet deadly design, pristine white and gold armor with shifting holographic rainbow accents"),
]

def generate_robot(filename, description, attempt=1, max_attempts=8):
    outpath = OUTDIR / f"{filename}.png"
    if outpath.exists():
        print(f"SKIP: {outpath} already exists")
        return True
    
    prompt = f"{STYLE} {description}"
    
    for i in range(attempt, max_attempts + 1):
        try:
            print(f"  [{filename}] Attempt {i}...")
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
                print(f"  SAVED: {outpath}")
                return True
        except Exception as e:
            err = str(e)
            if '503' in err or 'UNAVAILABLE' in err or '429' in err or 'quota' in err.lower():
                wait = min(10 * (2 ** (i - 1)), 120)
                print(f"  Rate limited, waiting {wait}s... ({err[:80]})")
                time.sleep(wait)
            else:
                print(f"  ERROR: {err}")
                wait = 15
                time.sleep(wait)
    
    print(f"  FAILED after {max_attempts} attempts: {filename}")
    return False


# If command line arg provided, generate only that index range
start_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
end_idx = int(sys.argv[2]) if len(sys.argv) > 2 else len(ROBOTS)

success = 0
failed = 0

for idx in range(start_idx, end_idx):
    filename, desc = ROBOTS[idx]
    print(f"\n=== [{idx+1}/{len(ROBOTS)}] Generating: {filename} ===")
    if generate_robot(filename, desc):
        success += 1
    else:
        failed += 1
    # Brief pause between generations
    time.sleep(3)

print(f"\n=== DONE: {success} success, {failed} failed ===")
