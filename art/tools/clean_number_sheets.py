# Clean a ChatGPT digit sheet: key out a green-screen background, strip dot textures inside the
# digits, drop specks, then report the ten digit columns.
import sys, glob, os, numpy as np, cv2
from PIL import Image
ART = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
out_dir = os.path.join(ART, "numbers"); os.makedirs(out_dir, exist_ok=True)
DOTS = {"DEN", "DET"}
for f in sorted(glob.glob(os.path.join(ART, "numbers", "source", "*_Home_Numbers_0-9.png"))):
    ab = os.path.basename(f).split("_")[0]
    im = np.array(Image.open(f).convert("RGBA")).astype(np.float32)
    rgb = im[:, :, :3]
    if im[:, :, 3].min() == 255:                       # green screen
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        green = np.clip((g - np.maximum(r, b) - 40) / 80, 0, 1)   # 1 = pure background
        a = 255 * (1 - green)
        # despill: pull green toward the other channels at the edges
        rgb[..., 1] = np.minimum(g, np.maximum(r, b) + 10 * (1 - green))
        im[:, :, 3] = a
    if ab in DOTS:                                      # dots inside the white fill: paint them white
        hsv = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2HSV)
        fillish = (im[:, :, 3] > 200)
        white = fillish & (hsv[..., 1] < 40) & (hsv[..., 2] > 200)
        region = cv2.morphologyEx(white.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)).astype(bool)
        dots = region & ~white
        rgb[dots] = np.median(rgb[white], 0)
    a = im[:, :, 3]; a[a < 30] = 0
    # remove specks: keep components bigger than a small threshold
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 0).astype(np.uint8), 8)
    keep = np.zeros(n, bool); keep[1:] = st[1:, 4] > 400
    a[~keep[lab]] = 0
    res = np.dstack([np.clip(rgb, 0, 255), a]).astype(np.uint8)
    # tight crop to the digits row
    ys = np.where((a > 60).any(1))[0]; res = res[max(0, ys[0] - 4): ys[-1] + 5]
    Image.fromarray(res).save(f"{out_dir}/{ab}.png")
    al = res[:, :, 3]; cols = np.where((al > 60).sum(0) > 2)[0]
    runs = []; st_ = p = cols[0]
    for c in cols[1:]:
        if c - p > 4: runs.append((st_, p)); st_ = c
        p = c
    runs.append((st_, p))
    print(ab, "digits found:", len(runs), "height", res.shape[0])
