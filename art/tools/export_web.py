"""Exports the player art the game loads, into public/players/:

  {TEAM}/{Lean|Athletic|Big}_{Dark|Light}.webp   blank players, cropped helmet to mid-thigh, 480x640
  nums/{TEAM}.webp                               the team's ten digits in a row (160 px tall)
  NYG/n/{NN}.webp                                the numbered Giants renders (new Giants)
  NYG/c/{Last}_{NN}.webp                         the custom Giants renders
  manifest.json                                  where each number goes, digit cells, which art exists

  python3 export_web.py [skin.json] [--keep]   (skin.json: ESPN ids of players with darker skin, measured from headshots)
The game adds the number and the lighting itself (src/playerArt.js), so the files stay blank.
"""
import os, re, sys, json, glob
import cv2, numpy as np
from PIL import Image
from compose import ART, sprites, clean_alpha, jersey_box, path

ROOT = os.path.join(ART, "..")
OUT = os.path.join(ROOT, "public", "players")
W, H = 480, 640
CROP = (170, 0, 854, 912)             # x0, y0, x1, y1 of a 1024x1536 sprite: helmet to mid-thigh
KINDS = [f"{b}_{s}" for b in ("Lean", "Athletic", "Big") for s in ("Dark", "Light")]

KEEP = "--keep" in sys.argv   # leave files that already exist (just rebuild the manifest)

def webp(img_bgra, dst, size=(W, H)):
    if KEEP and os.path.exists(dst): return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.fromarray(cv2.cvtColor(img_bgra, cv2.COLOR_BGRA2RGBA)).resize(size, Image.LANCZOS)
    im.save(dst, "WEBP", quality=82, method=6)

def number_spot(img):
    """Same placement as compose.add_number: centre and height of the number, in crop units (0-1)."""
    t, b, l, r = jersey_box(img); jh = b - t
    nh = int(jh * 0.37); cx = (l + r) // 2; cy = t + int(jh * 0.63)
    hsv = cv2.cvtColor(img[:, :, :3], cv2.COLOR_BGR2HSV); bw = (r - l) // 6
    band = hsv[t:t + int(jh * 0.5), cx - bw:cx + bw]
    rows = np.where(((band[:, :, 1] < 70) & (band[:, :, 2] > 150)).sum(1) > 2)[0]
    if len(rows): cy = max(cy, t + rows[-1] + int(jh * 0.04) + nh // 2)
    x0, y0, x1, y1 = CROP
    return [round((cx - x0) / (x1 - x0), 4), round((cy - y0) / (y1 - y0), 4), round(nh / (y1 - y0), 4)]

def digits(ab, dst):
    S = sprites(ab); dh = 160; cells, ims, x = [], [], 0
    for d in "0123456789":
        g = S[d]; w = max(1, int(g.shape[1] * dh / g.shape[0]))
        ims.append(cv2.resize(g, (w, dh), interpolation=cv2.INTER_AREA)); cells.append([x, w]); x += w + 4
    strip = np.zeros((dh, x, 4), np.uint8)
    for (cx, w), g in zip(cells, ims): strip[:, cx:cx + w] = g
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not (KEEP and os.path.exists(dst)): Image.fromarray(strip, "RGBA").save(dst, "WEBP", quality=90, method=6)   # sprites() rows are RGBA
    return {"h": dh, "cells": cells}

def norm(n):   # the game's name key (src/playerArt.js)
    n = re.sub(r"[.'’]", "", n.lower()); n = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b", "", n)
    return re.sub(r"[^a-z]+", " ", n).strip()

def main():
    man = {"w": W, "h": H, "teams": {}, "nygNumbered": [], "custom": {}, "nygOriginal": [], "dark": []}
    for d in sorted(glob.glob(os.path.join(ART, "players", "*"))):
        ab = os.path.basename(d)
        if not (len(ab) <= 3 and all(os.path.exists(path(ab, k)) for k in KINDS)): continue
        spots = {}
        for k in KINDS:
            img = clean_alpha(cv2.imread(path(ab, k), cv2.IMREAD_UNCHANGED))
            spots[k] = number_spot(img)
            x0, y0, x1, y1 = CROP
            webp(img[y0:y1, x0:x1], os.path.join(OUT, ab, f"{k}.webp"))
        man["teams"][ab] = {"spots": spots, "digits": digits(ab, os.path.join(OUT, "nums", f"{ab}.webp"))}
        print(ab, "ok")
    for f in sorted(glob.glob(os.path.join(ART, "players", "NYG_numbered", "NYG_*.png"))):
        n = os.path.basename(f)[4:-4]
        webp(clean_alpha(cv2.imread(f, cv2.IMREAD_UNCHANGED)), os.path.join(OUT, "NYG", "n", f"{n}.webp")); man["nygNumbered"].append(int(n))
    roster = json.load(open(os.path.join(ROOT, "src", "data", "madden27.json")))
    nyg = [p["name"] for t in roster["teams"] if t["ab"] == "NYG" for p in t["roster"]]
    for f in sorted(glob.glob(os.path.join(ART, "players", "NYG_custom", "NYG_*.png"))):
        last, n = os.path.basename(f)[4:-4].rsplit("_", 1)
        img = clean_alpha(cv2.imread(f, cv2.IMREAD_UNCHANGED))[:1448]
        webp(img, os.path.join(OUT, "NYG", "c", f"{last}_{n}.webp"))
        full = [q for q in nyg if q.split()[-1].lower() == last.lower()]   # the Giant with that last name
        man["custom"][norm(full[0])] = [f"{last}_{n}", int(n)]
    man["nygOriginal"] = nyg
    skin = [a for a in sys.argv[1:] if not a.startswith("--")]
    if skin: man["dark"] = sorted(json.load(open(skin[0])))
    json.dump(man, open(os.path.join(OUT, "manifest.json"), "w"), separators=(",", ":"))
    print(len(man["teams"]), "teams,", len(man["nygNumbered"]), "numbered Giants,", len(man["custom"]), "custom")

if __name__ == "__main__":
    main()
