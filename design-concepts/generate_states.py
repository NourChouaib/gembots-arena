#!/usr/bin/env python3
"""Generate 4 HP states for the cyberpunk mech warrior style."""

import base64
import json
import os
import time
import urllib.request
import urllib.error

API_KEY = os.environ["GEMINI_API_KEY"]
MODEL = "gemini-2.5-flash-image"
BASE_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# Read the reference image
ref_path = os.path.join(OUTPUT_DIR, "01_cyberpunk_mech.png")
with open(ref_path, "rb") as f:
    ref_b64 = base64.b64encode(f.read()).decode("utf-8")

def generate_image(prompt: str, filename: str, use_ref=True) -> bool:
    url = f"{BASE_URL}?key={API_KEY}"
    
    parts = [{"text": prompt}]
    if use_ref:
        parts.insert(0, {
            "inlineData": {
                "mimeType": "image/png",
                "data": ref_b64
            }
        })
        parts.insert(0, {"text": "Here is the reference robot design. Generate a new image of this SAME robot but in a different state as described below:"})
    
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "temperature": 1.0
        }
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode('utf-8'))
        
        for candidate in result.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if "inlineData" in part:
                    img_data = base64.b64decode(part["inlineData"]["data"])
                    mime = part["inlineData"].get("mimeType", "image/png")
                    ext = "png" if "png" in mime else "jpg"
                    filepath = os.path.join(OUTPUT_DIR, f"{filename}.{ext}")
                    with open(filepath, 'wb') as f:
                        f.write(img_data)
                    print(f"  ✅ Saved: {filepath} ({len(img_data)} bytes)")
                    return True
                elif "text" in part:
                    print(f"  📝 {part['text'][:150]}")
        
        print(f"  ❌ No image in response")
        return False
        
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.readable() else str(e)
        print(f"  ❌ HTTP {e.code}: {error_body[:300]}")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


STATES = [
    {
        "name": "state_01_fresh",
        "prompt": "Draw this same cyberpunk mech warrior robot at FULL HEALTH. Single robot character, game sprite, battle-ready pose, solid black background. The robot is brand new and pristine: all neon cyan and magenta circuit lines are glowing brightly at maximum intensity, armor is clean and undamaged, steam venting powerfully from joints showing peak performance, visor eyes blazing with full power, plasma cannon arm charged and glowing, energy crackling around fists. Vibrant, energetic, powerful. Premium quality game art. No text."
    },
    {
        "name": "state_02_hurt",  
        "prompt": "Draw this same cyberpunk mech warrior robot at HALF HEALTH (50% HP, moderately damaged). Single robot character, game sprite, battle-ready pose, solid black background. The robot shows battle damage: some armor panels cracked and dented, a few neon circuit lines flickering or dimmed, one shoulder plate partially broken off revealing wiring underneath, minor scorch marks and scratches across the body, small sparks flying from one knee joint, visor still lit but slightly dimmer, still fighting strong. Premium quality game art. No text."
    },
    {
        "name": "state_03_critical",
        "prompt": "Draw this same cyberpunk mech warrior robot at CRITICAL HEALTH (10% HP, severely damaged). Single robot character, game sprite, barely standing pose, solid black background. The robot is HEAVILY damaged and barely functional: large chunks of armor missing exposing inner machinery and sparking wires, one arm hanging loose or completely detached, heavy black smoke billowing from multiple points, most neon lines dead or barely flickering red instead of cyan, visor cracked with one eye dark, oil/coolant leaking, stagger pose like about to fall but still defiantly fighting. Dramatic and cool-looking destruction. Premium quality game art. No text."
    },
    {
        "name": "state_04_victory",
        "prompt": "Draw this same cyberpunk mech warrior robot in VICTORY POSE (just won the battle). Single robot character, game sprite, triumphant pose, solid black background. The robot celebrates victory: standing tall and dominant, plasma cannon arm raised to the sky like a fist pump, all neon lines overcharged and blazing ultra-bright with energy radiating outward, visor glowing intensely, energy particles and light effects swirling around the robot, confident powerful stance, maybe slight battle scars but wearing them proudly. Epic victorious moment. Premium quality game art. No text."
    }
]

for state in STATES:
    print(f"\n🤖 Generating: {state['name']}")
    success = generate_image(state["prompt"], state["name"])
    if not success:
        print("   Retrying without reference...")
        time.sleep(3)
        generate_image(state["prompt"], state["name"], use_ref=False)
    time.sleep(4)
