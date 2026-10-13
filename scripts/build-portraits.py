# Matchup portraits: the source art is 627px PNG (~360 KB each, 165 MB in all) but they're shown at
# 140px at most, so they ship as 360px WebP (~27 KB each; sharp on 2-3x screens).
#   python3 scripts/build-portraits.py   (converts public/matchup-portraits/*.png in place)
import os
from PIL import Image

DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "matchup-portraits")
n = before = after = 0
for f in sorted(os.listdir(DIR)):
    if not f.endswith(".png"):
        continue
    src = os.path.join(DIR, f)
    out = src[:-4] + ".webp"
    before += os.path.getsize(src)
    Image.open(src).convert("RGBA").resize((360, 360), Image.LANCZOS).save(out, "WEBP", quality=82, method=6)
    after += os.path.getsize(out)
    os.remove(src)
    n += 1
print(f"{n} portraits: {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB")
