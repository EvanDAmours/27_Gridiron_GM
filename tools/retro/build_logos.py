"""Builds html5game/RetroBowl_texture_2.png (the spr_nfl_logos sheet).

Each team's logo comes from tools/nfl/logos/<ABBR>.png (e.g. BUF.png). Those images are
pixel art drawn on a 4x grid (256x256 = 64x64 art pixels), so they are sampled back to
their real 64x64 pixels with no blurring. A team without an image falls back to a
generated badge: a shield in the team's colours with its abbreviation.

    python3 tools/nfl/build_logos.py [--preview out.png]

Layout: 8 x 4 grid of 64x64 cells; frame N (team uid N) is centred in cell N.
"""
import os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "retro", "html5game", "RetroBowl_texture_2.png")
CELL, COLS = 64, 8
LOGOS = os.path.join(HERE, "logos")

# uid -> (abbreviation, fill, trim, letters)   index == team uid in Teams.txt
TEAMS = [
    ("BUF", "#00338d", "#c60c30", "#ffffff"), ("MIA", "#008e97", "#fc4c02", "#ffffff"),
    ("NE", "#002244", "#c60c30", "#ffffff"), ("NYJ", "#125740", "#ffffff", "#ffffff"),
    ("DEN", "#fb4f14", "#002244", "#ffffff"), ("KC", "#e31837", "#ffb81c", "#ffffff"),
    ("LAC", "#0080c6", "#ffc20e", "#ffffff"), ("LV", "#000000", "#a5acaf", "#a5acaf"),
    ("BAL", "#241773", "#9e7c0c", "#ffffff"), ("CIN", "#fb4f14", "#000000", "#000000"),
    ("CLE", "#311d00", "#ff3c00", "#ff3c00"), ("PIT", "#101820", "#ffb612", "#ffb612"),
    ("HOU", "#03202f", "#a71930", "#ffffff"), ("IND", "#002c5f", "#ffffff", "#ffffff"),
    ("JAX", "#006778", "#d7a22a", "#ffffff"), ("TEN", "#0c2340", "#4b92db", "#ffffff"),
    ("DAL", "#003594", "#869397", "#ffffff"), ("NYG", "#0b2265", "#a71930", "#ffffff"),
    ("PHI", "#004c54", "#a5acaf", "#ffffff"), ("WAS", "#5a1414", "#ffb612", "#ffb612"),
    ("ARI", "#97233f", "#ffb612", "#ffffff"), ("LAR", "#003594", "#ffd100", "#ffd100"),
    ("SF", "#aa0000", "#b3995d", "#ffffff"), ("SEA", "#002244", "#69be28", "#ffffff"),
    ("CHI", "#0b162a", "#c83803", "#ffffff"), ("DET", "#0076b6", "#b0b7bc", "#ffffff"),
    ("GB", "#203731", "#ffb612", "#ffb612"), ("MIN", "#4f2683", "#ffc62f", "#ffffff"),
    ("ATL", "#a71930", "#000000", "#ffffff"), ("CAR", "#0085ca", "#101820", "#ffffff"),
    ("NO", "#101820", "#d3bc8d", "#d3bc8d"), ("TB", "#d50a0a", "#34302b", "#ffffff"),
]

FONT = {  # 3x5 pixel font
    "A": ["###", "#.#", "###", "#.#", "#.#"], "B": ["##.", "#.#", "##.", "#.#", "##."],
    "C": ["###", "#..", "#..", "#..", "###"], "D": ["##.", "#.#", "#.#", "#.#", "##."],
    "E": ["###", "#..", "##.", "#..", "###"], "F": ["###", "#..", "##.", "#..", "#.."],
    "G": ["###", "#..", "#.#", "#.#", "###"], "H": ["#.#", "#.#", "###", "#.#", "#.#"],
    "I": ["###", ".#.", ".#.", ".#.", "###"], "J": ["..#", "..#", "..#", "#.#", "###"],
    "K": ["#.#", "#.#", "##.", "#.#", "#.#"], "L": ["#..", "#..", "#..", "#..", "###"],
    "M": ["#.#", "###", "###", "#.#", "#.#"], "N": ["##.", "#.#", "#.#", "#.#", "#.#"],
    "O": ["###", "#.#", "#.#", "#.#", "###"], "P": ["###", "#.#", "###", "#..", "#.."],
    "R": ["##.", "#.#", "##.", "#.#", "#.#"], "S": ["###", "#..", "###", "..#", "###"],
    "T": ["###", ".#.", ".#.", ".#.", ".#."], "U": ["#.#", "#.#", "#.#", "#.#", "###"],
    "V": ["#.#", "#.#", "#.#", "#.#", ".#."], "W": ["#.#", "#.#", "###", "###", "#.#"],
    "X": ["#.#", "#.#", ".#.", "#.#", "#.#"], "Y": ["#.#", "#.#", "###", ".#.", ".#."],
}

# 28x28 shield silhouette, row = (left, right) inclusive columns
SHIELD = [(3, 24)] * 2 + [(2, 25)] * 14 + [(3, 24), (3, 24), (4, 23), (5, 22), (6, 21),
          (7, 20), (8, 19), (10, 17), (11, 16), (12, 15), (13, 14)]


def rgba(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def darker(c, f=0.45):
    return tuple(int(v * f) for v in c[:3]) + (255,)


def badge(abbr, fill, trim, ink):
    fill, trim, ink = rgba(fill), rgba(trim), rgba(ink)
    if fill[:3] == ink[:3]:
        ink = rgba("#ffffff")
    im = Image.new("RGBA", (28, len(SHIELD) + 1), (0, 0, 0, 0))
    px = im.load()
    inside = {(x, y) for y, (l, r) in enumerate(SHIELD) for x in range(l, r + 1)}
    for (x, y) in inside:
        px[x, y] = fill
    # trim: a 2px band just inside the edge, plus a stripe across the top
    for (x, y) in inside:
        near_edge = any((x + dx, y + dy) not in inside for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)
                        if abs(dx) + abs(dy) <= 2)
        if near_edge or 5 <= y <= 6:
            px[x, y] = trim
    for (x, y) in inside:  # dark outline
        if any((x + dx, y + dy) not in inside for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            px[x, y] = darker(fill if fill[:3] != (0, 0, 0) else trim, 0.35)
    # letters, 2x scale, centred
    scale = 2 if len(abbr) <= 3 else 1
    adv = 3 * scale + (scale if len(abbr) < 3 else 1)
    w = len(abbr) * adv - (adv - 3 * scale)
    x0, y0 = (28 - w) // 2, 9
    shadow = darker(fill, 0.5)
    for i, ch in enumerate(abbr):
        for gy, row in enumerate(FONT[ch]):
            for gx, c in enumerate(row):
                if c != "#":
                    continue
                for sy in range(scale):
                    for sx in range(scale):
                        x = x0 + i * adv + gx * scale + sx
                        y = y0 + gy * scale + sy
                        if (x + 1, y + 1) in inside:
                            px[x + 1, y + 1] = shadow
        for gy, row in enumerate(FONT[ch]):
            for gx, c in enumerate(row):
                if c != "#":
                    continue
                for sy in range(scale):
                    for sx in range(scale):
                        px[x0 + i * adv + gx * scale + sx, y0 + gy * scale + sy] = ink
    return im


def from_file(path):
    """Sample a pixel-art image back to its native pixel grid and crop it."""
    src = Image.open(path).convert("RGBA")
    grid = max(1, src.width // CELL)  # 256px image -> 4px per art pixel
    w, h = src.width // grid, src.height // grid
    out = Image.new("RGBA", (w, h))
    sp, op = src.load(), out.load()
    for y in range(h):
        for x in range(w):  # centre of each block, no averaging
            op[x, y] = sp[x * grid + grid // 2, y * grid + grid // 2]
    box = out.getbbox()
    out = out.crop(box) if box else out
    if out.width > CELL - 2 or out.height > CELL - 2:
        out.thumbnail((CELL - 2, CELL - 2), Image.NEAREST)
    return out


def main():
    assert len(TEAMS) == 32
    sheet = Image.new("RGBA", (CELL * COLS, CELL * 4), (0, 0, 0, 0))
    for i, t in enumerate(TEAMS):
        path = os.path.join(LOGOS, t[0] + ".png")
        if os.path.exists(path):
            im = from_file(path)
        else:
            im = badge(*t).resize((56, 56), Image.NEAREST)
        cx, cy = (i % COLS) * CELL, (i // COLS) * CELL
        sheet.alpha_composite(im, (cx + (CELL - im.width) // 2, cy + (CELL - im.height) // 2))
    sheet.save(OUT)
    print("wrote", os.path.normpath(OUT))
    if "--preview" in sys.argv:
        dst = sys.argv[sys.argv.index("--preview") + 1]
        bg = Image.new("RGBA", sheet.size, (60, 120, 60, 255))
        bg.alpha_composite(sheet)
        bg.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(dst)


if __name__ == "__main__":
    main()
