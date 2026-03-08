#!/usr/bin/env python3
"""
Fix robot PNG sprites:
1. Remove dark semi-transparent background pixels
2. Crop to content bounding box
3. Resize to 1024x1024 (matching all other skins)
4. Center robot in the canvas
"""
from PIL import Image
import glob, os, shutil

STATES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'robots', 'states')
TARGET_SIZE = (1024, 1024)

# Skins that need fixing (1024x1536 with dark background)
PREFIXES_TO_FIX = ['01_neon_viper', '11_dragon_mech']


def clean_dark_background(im: Image.Image, threshold_alpha=180, threshold_rgb=50) -> Image.Image:
    """Make dark semi-transparent pixels fully transparent."""
    im = im.convert('RGBA')
    pixels = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # Semi-transparent AND dark → make fully transparent
            if 0 < a < threshold_alpha and r < threshold_rgb and g < threshold_rgb and b < threshold_rgb:
                pixels[x, y] = (0, 0, 0, 0)
    return im


def get_content_bbox(im: Image.Image, alpha_threshold=10):
    """Get bounding box of non-transparent content."""
    im = im.convert('RGBA')
    alpha = im.split()[3]
    # Find bbox where alpha > threshold
    bbox = None
    pixels = alpha.load()
    w, h = im.size
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            if pixels[x, y] > alpha_threshold:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if max_x > min_x and max_y > min_y:
        return (min_x, min_y, max_x + 1, max_y + 1)
    return None


def process_image(filepath: str) -> bool:
    """Process a single image: clean bg, crop, resize to 1024x1024."""
    im = Image.open(filepath).convert('RGBA')
    original_size = im.size
    
    # Step 1: Clean dark semi-transparent background
    im = clean_dark_background(im)
    
    # Step 2: Get content bounding box
    bbox = get_content_bbox(im)
    if not bbox:
        print(f"  ⚠️ No content found in {filepath}")
        return False
    
    # Step 3: Crop to content
    content = im.crop(bbox)
    cw, ch = content.size
    
    # Step 4: Scale content to fit in 1024x1024 with padding
    # Keep aspect ratio, fit within target
    scale = min(TARGET_SIZE[0] / cw, TARGET_SIZE[1] / ch)
    # Don't upscale too much, max 1.0
    scale = min(scale, 1.0)
    new_w = int(cw * scale)
    new_h = int(ch * scale)
    
    if scale < 1.0:
        content = content.resize((new_w, new_h), Image.LANCZOS)
    
    # Step 5: Center in 1024x1024 canvas
    canvas = Image.new('RGBA', TARGET_SIZE, (0, 0, 0, 0))
    paste_x = (TARGET_SIZE[0] - new_w) // 2
    paste_y = (TARGET_SIZE[1] - new_h) // 2
    canvas.paste(content, (paste_x, paste_y))
    
    # Save
    canvas.save(filepath, 'PNG', optimize=True)
    print(f"  ✅ {os.path.basename(filepath)}: {original_size} → {TARGET_SIZE} (content: {bbox[2]-bbox[0]}x{bbox[3]-bbox[1]} → {new_w}x{new_h})")
    return True


def main():
    os.chdir(STATES_DIR)
    
    # Backup first
    backup_dir = os.path.join(STATES_DIR, '_backup')
    os.makedirs(backup_dir, exist_ok=True)
    
    for prefix in PREFIXES_TO_FIX:
        files = sorted(glob.glob(f'{prefix}*.png'))
        if not files:
            print(f"No files found for prefix: {prefix}")
            continue
        
        print(f"\n🔧 Fixing {prefix} ({len(files)} files):")
        for f in files:
            # Backup
            shutil.copy2(f, os.path.join(backup_dir, f))
            process_image(f)
    
    print(f"\n✅ Done! Backups in {backup_dir}")


if __name__ == '__main__':
    main()
