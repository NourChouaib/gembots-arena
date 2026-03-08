#!/usr/bin/env python3
"""Generate robot concept art using Gemini image generation."""

import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error

API_KEY = os.environ["GEMINI_API_KEY"]
# Use gemini-2.0-flash with image generation
MODEL = "gemini-2.5-flash-image"
BASE_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_image(prompt: str, filename: str) -> bool:
    """Generate an image using Gemini's native image generation."""
    url = f"{BASE_URL}?key={API_KEY}"
    
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "temperature": 1.0
        }
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode('utf-8'))
        
        # Extract image from response
        for candidate in result.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if "inlineData" in part:
                    img_data = base64.b64decode(part["inlineData"]["data"])
                    mime = part["inlineData"].get("mimeType", "image/png")
                    ext = "png" if "png" in mime else "jpg" if "jpeg" in mime or "jpg" in mime else "webp"
                    filepath = os.path.join(OUTPUT_DIR, f"{filename}.{ext}")
                    with open(filepath, 'wb') as f:
                        f.write(img_data)
                    print(f"  ✅ Saved: {filepath} ({len(img_data)} bytes)")
                    return True
                elif "text" in part:
                    print(f"  📝 Text response: {part['text'][:200]}")
        
        print(f"  ❌ No image in response")
        print(f"  Response keys: {json.dumps(result, indent=2)[:500]}")
        return False
        
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.readable() else str(e)
        print(f"  ❌ HTTP {e.code}: {error_body[:300]}")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


# Robot style concepts
STYLES = [
    {
        "name": "01_cyberpunk_mech",
        "prompt": "Generate an image of a single robot character, game sprite, facing left, battle-ready pose, solid black background. Cyberpunk mech warrior style: heavy armored robot with glowing neon cyan and magenta circuit lines running across dark metallic body, exposed pistons and cables, visor helmet with glowing red eyes, one arm is a plasma cannon, chunky industrial boots, steam venting from joints. Premium quality game art, detailed, dramatic neon lighting. No text."
    },
    {
        "name": "02_chibi_kawaii",
        "prompt": "Generate an image of a single robot character, game sprite, facing left, battle-ready pose, solid black background. Cute chibi kawaii robot style: round oversized head with big sparkly blue eyes, small stubby body with pastel pink and white armor, tiny fists raised in fighting pose, antenna with a star on top, blushing cheeks (LED circles), tiny wings on back, adorable but fierce expression. Premium quality game art, clean cel-shaded style. No text."
    },
    {
        "name": "03_weathered_battle_mech",
        "prompt": "Generate an image of a single robot character, game sprite, facing left, battle-ready pose, solid black background. Weathered battle mech style: heavy military robot covered in rust, scratches, dents, and battle scars, one eye cracked and sparking, torn shoulder armor revealing inner wiring, oil stains dripping down chassis, riveted steel plates with peeling paint (olive drab and yellow hazard stripes), chain-fed minigun arm, intimidating but worn veteran look. Premium quality game art, gritty realistic style. No text."
    },
    {
        "name": "04_crystal_gem_golem",
        "prompt": "Generate an image of a single robot character, game sprite, facing left, battle-ready pose, solid black background. Crystal gem-powered golem style: massive robot-golem hybrid with glowing purple and emerald crystals embedded in rocky dark armor, crystals pulsing with inner light energy, crystal shoulder pads and crystal-tipped fists, chest cavity contains a large brilliant diamond core radiating energy beams, geometric faceted design elements, mystical and powerful appearance. Premium quality game art, fantasy-tech fusion style. No text."
    },
    {
        "name": "05_sleek_futuristic_android",
        "prompt": "Generate an image of a single robot character, game sprite, facing left, battle-ready pose, solid black background. Sleek futuristic android style: minimalist clean white and silver robot with smooth curved surfaces like Apple product design, subtle blue LED strip accents, elegant proportions, translucent panels showing holographic inner workings, floating detached forearm segments held by energy fields, featureless smooth face with single horizontal blue light visor, premium sophisticated look. Premium quality game art, clean modern style. No text."
    },
    {
        "name": "06_pixel_art",
        "prompt": "Generate an image of a single robot character, game sprite, facing left, battle-ready pose, solid black background. Pixel art style: 64x64 pixel robot character scaled up, chunky blocky pixels clearly visible, retro 16-bit SNES era aesthetic, bright saturated colors (red and gold armor), sword in hand, pixel shading with limited color palette, nostalgic retro gaming feel, each pixel deliberately placed. Premium quality pixel art, retro game style. No text."
    }
]

def main():
    if len(sys.argv) > 1:
        indices = [int(x) for x in sys.argv[1:]]
    else:
        indices = list(range(len(STYLES)))
    
    for i in indices:
        style = STYLES[i]
        print(f"\n🤖 Generating: {style['name']}")
        print(f"   Prompt: {style['prompt'][:80]}...")
        success = generate_image(style["prompt"], style["name"])
        if not success:
            print(f"   Retrying with adjusted prompt...")
            time.sleep(2)
            generate_image(style["prompt"], style["name"])
        time.sleep(3)  # Rate limiting

if __name__ == "__main__":
    main()
