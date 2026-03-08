#!/usr/bin/env python3
"""
Permanently flip all left-facing robot PNGs to face RIGHT.
This eliminates the need for any CSS runtime flip normalization.
After this, ALL PNGs face right, and only the parent scaleX(-1) for right-side bots is needed.
"""
from PIL import Image
import glob, os, shutil

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'robots', 'states')

# Skin indices that face LEFT (need to be flipped to face RIGHT)
# Based on manual image analysis
FACES_LEFT_PREFIXES = {
    1: 'cyber-fang',
    3: 'iron-golem',
    4: 'laser-hawk',
    9: 'mech-spider',
    10: '11_dragon_mech',
    11: 'arctic-frost',
    12: 'volcanic-core',
    13: 'neon-racer',
    14: 'bio-hazard',
    19: 'omega-prime',
}

def main():
    os.chdir(STATES_DIR)
    
    backup_dir = os.path.join(STATES_DIR, '_backup_flip')
    os.makedirs(backup_dir, exist_ok=True)
    
    total = 0
    for idx, prefix in sorted(FACES_LEFT_PREFIXES.items()):
        files = sorted(glob.glob(f'{prefix}*.png'))
        if not files:
            print(f"⚠️ No files for prefix '{prefix}' (skin {idx})")
            continue
        
        print(f"\n🔄 Flipping skin {idx} ({prefix}): {len(files)} files")
        for f in files:
            # Backup
            shutil.copy2(f, os.path.join(backup_dir, f))
            
            # Flip horizontally
            im = Image.open(f).convert('RGBA')
            flipped = im.transpose(Image.FLIP_LEFT_RIGHT)
            flipped.save(f, 'PNG', optimize=True)
            total += 1
            print(f"  ✅ {f}")
    
    print(f"\n✅ Flipped {total} files. Backups in {backup_dir}")

if __name__ == '__main__':
    main()
