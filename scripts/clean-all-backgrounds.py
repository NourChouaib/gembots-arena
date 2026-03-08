#!/usr/bin/env python3
"""
Aggressively clean backgrounds from ALL robot PNG sprites.
Removes dark semi-transparent and nearly-black pixels that form visible halos.
"""
from PIL import Image
import glob, os, shutil

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'robots', 'states')

def clean_background(filepath, alpha_threshold=220, rgb_threshold=60):
    """
    Make dark semi-transparent pixels fully transparent.
    - Any pixel with alpha < alpha_threshold AND rgb all < rgb_threshold → transparent
    - Also clean very dark pixels with low alpha (halo effect)
    """
    im = Image.open(filepath).convert('RGBA')
    pixels = im.load()
    w, h = im.size
    cleaned = 0
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            
            # Fully transparent — skip
            if a == 0:
                continue
            
            # Dark semi-transparent → make transparent
            # This catches the dark halo/glow artifacts from AI image generation
            if a < alpha_threshold and r < rgb_threshold and g < rgb_threshold and b < rgb_threshold:
                pixels[x, y] = (0, 0, 0, 0)
                cleaned += 1
            
            # Very low alpha dark pixels (barely visible dark haze)
            elif a < 40 and r < 80 and g < 80 and b < 80:
                pixels[x, y] = (0, 0, 0, 0)
                cleaned += 1
    
    if cleaned > 0:
        im.save(filepath, 'PNG', optimize=True)
    
    return cleaned

def main():
    os.chdir(STATES_DIR)
    
    # Backup dir
    backup_dir = os.path.join(STATES_DIR, '_backup_clean')
    os.makedirs(backup_dir, exist_ok=True)
    
    all_files = sorted(glob.glob('*.png'))
    print(f"Processing {len(all_files)} files...\n")
    
    total_cleaned = 0
    files_modified = 0
    
    for f in all_files:
        # Skip backup dirs
        if f.startswith('_'):
            continue
            
        # Backup first time only
        backup_path = os.path.join(backup_dir, f)
        if not os.path.exists(backup_path):
            shutil.copy2(f, backup_path)
        
        cleaned = clean_background(f)
        total_cleaned += cleaned
        
        if cleaned > 0:
            files_modified += 1
            total_pixels = Image.open(f).size[0] * Image.open(f).size[1]
            pct = cleaned / total_pixels * 100
            print(f"  🧹 {f}: removed {cleaned} pixels ({pct:.1f}%)")
    
    print(f"\n✅ Done! Modified {files_modified}/{len(all_files)} files, removed {total_cleaned} total pixels")

if __name__ == '__main__':
    main()
