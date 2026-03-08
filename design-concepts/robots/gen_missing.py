#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
#     "pillow>=10.0.0",
# ]
# ///
"""Retry missing HP states"""

import sys
import time
from pathlib import Path
from io import BytesIO

from google import genai
from google.genai import types
from PIL import Image as PILImage

API_KEY = os.environ["GEMINI_API_KEY"]
OUTDIR = Path.home() / "Projects/gembots/design-concepts/robots/states"

client = genai.Client(api_key=API_KEY)

STYLE = "Sleek futuristic android robot character design, Apple-style minimalist aesthetic, clean smooth lines, premium polished surfaces, dark black background, full body battle-ready pose facing left, professional digital concept art illustration, 3D render quality."

DAMAGE = {
    "neutral": "Minor battle damage: small scratches on armor surfaces, slightly dimmer LED lights and glowing accents, a small dent on one shoulder plate, faint scuff marks on legs, overall still functional but showing signs of combat wear.",
    "hurt": "Moderate battle damage: cracked and fractured armor panels revealing internal structure, exposed wiring and circuitry on one arm, bright sparks flying from damaged joints, one eye/visor flickering and glitching, dark scorch marks from energy weapon hits, a chunk of shoulder armor missing, warning lights visible.",
    "critical": "Severely damaged and barely functioning: large armor pieces completely missing exposing skeletal frame, thick smoke rising from multiple joints, dark oil/coolant leaking and dripping down body, one arm hanging loose and disconnected, red emergency warning lights pulsing, sparking exposed wires everywhere, cracked visor with distorted glow, body listing to one side, on the verge of shutdown."
}

MISSING = [
    ("14_neon_racer", "speed-focused ultra-streamlined android, extremely aerodynamic body, racing stripe patterns, visor shaped like racing helmet, wheel-like circular joints, rear spoiler on back, lean forward sprinting pose, white and glossy carbon fiber armor with hot pink and cyan neon racing stripes", ["hurt", "critical"]),
    ("15_bio_hazard", "organic-tech hybrid android with bio-mechanical textures mixing smooth tech with organic tendrils, toxic canister on back, gas mask respirator face, one arm mutated and larger, hazmat suit inspired, dark green and white armor with toxic neon green bio-luminescent accents", ["neutral", "hurt", "critical"]),
    ("18_quantum_shift", "glitching android partially dissolving into digital particles, some body parts pixelating into voxels, digital noise distortion effects, geometric fractal patterns, one arm solid while other breaks into floating cubes, white and chrome armor with glitchy cyan and magenta chromatic aberration", ["critical"]),
    ("19_void_walker", "cosmic ethereal android with body interior filled with starfield nebula space, flowing cloak-like panels trailing behind, featureless smooth face with single glowing eye, tall thin elongated build, cosmic dust particles, deep black armor with galaxy purple and starlight white accents", ["neutral", "hurt", "critical"]),
    ("20_omega_prime", "ultimate powerful boss android, imposing tall commanding build, crown-like ornate head crest, one arm with energy blade and one with energy shield, dramatic cape flowing behind, chest with powerful glowing multi-color reactor core, pristine white and gold armor with shifting holographic rainbow accents", ["neutral", "hurt", "critical"]),
]

success = 0
failed = 0

for filename, desc, states in MISSING:
    for state in states:
        outpath = OUTDIR / f"{filename}_{state}.png"
        if outpath.exists():
            print(f"SKIP: {outpath.name}")
            success += 1
            continue
        
        damage_desc = DAMAGE[state]
        prompt = f"{STYLE} {desc}. {damage_desc}"
        
        ok = False
        for attempt in range(1, 8):
            try:
                print(f"[{filename}_{state}] Attempt {attempt}...", flush=True)
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
                    print(f"  SAVED: {outpath.name}", flush=True)
                    ok = True
                    break
                if ok:
                    break
            except Exception as e:
                err = str(e)
                wait = min(15 * (2 ** (attempt - 1)), 120)
                print(f"  Error: {err[:100]}, waiting {wait}s...", flush=True)
                time.sleep(wait)
        
        if ok:
            success += 1
        else:
            failed += 1
            print(f"  FAILED: {filename}_{state}", flush=True)
        
        time.sleep(3)

print(f"\nDONE: {success} success, {failed} failed", flush=True)
