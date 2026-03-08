#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "pillow>=10.0.0",
# ]
# ///
"""
Generate GemBots robot sprites using Gemini (Nano Banana — standard, not Pro).
Generates 4 HP states for each robot skin.
"""

import argparse
import os
import sys
import time
from pathlib import Path
from io import BytesIO

# Robot definitions — matches BotSkins.tsx
ROBOTS = {
    1:  {"id": "cyber-fang",      "name": "CyberFang",     "desc": "Aggressive wolf-like mech with fangs and claws, angular armor plates, sharp predatory head with glowing visor, sleek body"},
    2:  {"id": "shadow-ninja",    "name": "ShadowNinja",   "desc": "Thin hooded ninja robot with triangular head, flowing cape/scarf, minimalist stealth design, slit visor eye"},
    3:  {"id": "iron-golem",      "name": "IronGolem",     "desc": "Massive square heavy robot with no neck, huge flat rectangular head, wide powerful body, thick legs, brutalist industrial design"},
    4:  {"id": "laser-hawk",      "name": "LaserHawk",     "desc": "Bird-like robot with angular hawk head and beak visor, wing fins extending from back, aerodynamic sleek torso"},
    5:  {"id": "tech-samurai",    "name": "TechSamurai",   "desc": "Samurai warrior robot with helmet crest, layered shoulder armor plates, waist skirt plates, visor slit face, Japanese mech design"},
    6:  {"id": "crystal-mage",    "name": "CrystalMage",   "desc": "Mystical robot with crystal crown spikes on head, crystal cluster shoulders, diamond-shaped eyes, floating crystal accents"},
    7:  {"id": "storm-trooper",   "name": "StormTrooper",  "desc": "Soldier robot with rounded dome helmet, T-shaped visor, rounded shoulder pads, chest armor plates, military mech design"},
    8:  {"id": "phantom-wraith",  "name": "PhantomWraith",  "desc": "Ghostly floating robot with hollow glowing eyes, flowing cloak/cape body instead of legs, ethereal spectral design, wispy bottom"},
    9:  {"id": "mech-spider",     "name": "MechSpider",    "desc": "Spider-like robot with small round head with 4 eyes cluster, wide oval body, 4 mechanical spider legs extending outward, creepy mechanical arachnid"},
    11: {"id": "arctic-frost",    "name": "ArcticFrost",   "desc": "Icy angular robot with hexagonal eyes, ice crystal shoulders, frost pattern accents, ice spike on head, cold blue-white design"},
    12: {"id": "volcanic-core",   "name": "VolcanicCore",  "desc": "Massive heavy robot with wide flat head with smoke vents, angry slit eyes, lava crack patterns on body, huge reactor core, volcanic industrial"},
    13: {"id": "neon-racer",      "name": "NeonRacer",     "desc": "Streamlined speed robot with aerodynamic visor helmet, racing stripes, air intakes on sides, sleek tapered body, racing number 01"},
    14: {"id": "bio-hazard",      "name": "BioHazard",     "desc": "Organic-mechanical robot with blob-like head with tendrils, compound round eyes, organic curved body, biohazard symbol on chest"},
    15: {"id": "thunder-bolt",    "name": "ThunderBolt",   "desc": "Lightning-themed robot with zigzag lightning bolt antennae, sharp angular head, lightning bolt emblem on chest, electric arc accents"},
    16: {"id": "gravity-well",    "name": "GravityWell",   "desc": "Robot with compact round head with single cyclopean visor, central floating gravity sphere in chest, magnetic field rings orbiting body"},
    17: {"id": "quantum-shift",   "name": "QuantumShift",  "desc": "Glitchy digital robot with rectangular head with glitch double-outline, square pixel eyes, scan lines on body, digital mouth display"},
    18: {"id": "void-walker",     "name": "VoidWalker",    "desc": "Minimalist dark robot with single large cyclops eye, slim elegant body, void symbol on chest, subtle sparse neon lines"},
    19: {"id": "omega-prime",     "name": "OmegaPrime",    "desc": "Final boss robot with crown/halo above head, crown spikes, imposing wide dual-slit eyes, massive layered shoulders, Omega symbol on chest, dual cores, grand powerful build"},
}

HP_TIERS = {
    "fresh":    "pristine condition, clean polished metal, bright glowing elements, no damage, vibrant neon accents",
    "neutral":  "slightly worn, minor scuffs and scratches, dimmer glow, some dust, still functional",
    "hurt":     "battle damaged, visible cracks and dents, sparking exposed wires, flickering dim lights, smoke wisps, damaged armor panels",
    "critical": "heavily destroyed, deep gashes and broken armor, red warning lights, many cracks exposing internals, sparking circuits, barely standing, emergency state",
}

BASE_STYLE = (
    "Semi-realistic digital illustration of a humanoid battle robot, "
    "clean cel-shading with smooth gradients, polished mecha design. "
    "Full body portrait, 3/4 view, standing pose. "
    "Dark steel gray and charcoal body with neon accent color glowing elements (eyes, core reactor on chest, accent lines). "
    "Transparent/white background, soft drop shadow beneath feet. "
    "Segmented armor panels with visible seam lines. "
    "Video game character concept art style. "
    "High detail, clean linework, no text, no watermark."
)

def generate_robot(client, types, PILImage, robot_info, hp_tier, hp_desc, output_dir, model_name):
    """Generate a single robot image."""
    filename = f"{robot_info['id']}_{hp_tier}.png"
    output_path = output_dir / filename
    
    if output_path.exists():
        print(f"  SKIP {filename} (already exists)")
        return True
    
    prompt = f"{BASE_STYLE} This robot is: {robot_info['desc']}. Current state: {hp_desc}."
    
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            )
        )
        
        for part in response.parts:
            if part.inline_data is not None:
                image_data = part.inline_data.data
                if isinstance(image_data, str):
                    import base64
                    image_data = base64.b64decode(image_data)
                
                image = PILImage.open(BytesIO(image_data))
                if image.mode == 'RGBA':
                    image.save(str(output_path), 'PNG')
                elif image.mode == 'RGB':
                    image.save(str(output_path), 'PNG')
                else:
                    image.convert('RGBA').save(str(output_path), 'PNG')
                
                print(f"  ✅ {filename} ({image.size[0]}x{image.size[1]})")
                return True
        
        print(f"  ❌ {filename} — no image in response")
        return False
        
    except Exception as e:
        print(f"  ❌ {filename} — {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate GemBots robot sprites")
    parser.add_argument("--output", "-o", default="./public/robots/states", help="Output directory")
    parser.add_argument("--robots", "-r", help="Comma-separated robot indices (default: all missing)")
    parser.add_argument("--tiers", "-t", help="Comma-separated HP tiers (default: all)")
    parser.add_argument("--model", "-m", default="gemini-2.0-flash-exp-image-generation",
                       help="Gemini model to use (default: nano banana standard)")
    parser.add_argument("--delay", "-d", type=float, default=5.0, help="Delay between API calls (seconds)")
    args = parser.parse_args()
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    
    from google import genai
    from google.genai import types
    from PIL import Image as PILImage
    
    client = genai.Client(api_key=api_key)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Select robots
    if args.robots:
        robot_indices = [int(x) for x in args.robots.split(",")]
    else:
        robot_indices = sorted(ROBOTS.keys())
    
    # Select tiers
    if args.tiers:
        tiers = args.tiers.split(",")
    else:
        tiers = list(HP_TIERS.keys())
    
    total = len(robot_indices) * len(tiers)
    done = 0
    failed = 0
    
    print(f"🤖 Generating {total} robot images ({len(robot_indices)} robots × {len(tiers)} tiers)")
    print(f"📁 Output: {output_dir}")
    print(f"🧠 Model: {args.model}")
    print()
    
    for idx in robot_indices:
        robot = ROBOTS[idx]
        print(f"🔧 [{idx}] {robot['name']}:")
        
        for tier in tiers:
            success = generate_robot(client, types, PILImage, robot, tier, HP_TIERS[tier], output_dir, args.model)
            done += 1
            if not success:
                failed += 1
            
            if done < total:
                time.sleep(args.delay)
        
        print()
    
    print(f"✅ Done! {done - failed}/{total} generated, {failed} failed")
    

if __name__ == "__main__":
    main()
