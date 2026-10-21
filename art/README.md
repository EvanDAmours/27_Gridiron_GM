# Player art (work in progress)

Source art for the player renders that will appear on the player card, draft night, free agency
signings and the Hall of Fame induction. Nothing in this folder ships with the game yet; the
screens will load processed copies from `public/` once they are built.

## Status

| | Done | Teams |
|---|---|---|
| Player sprites (6 per team) | 12 / 32 | ARI BAL BUF CAR CHI CIN DAL DEN DET GB HOU NYG |
| Number sheets | 32 / 32 | all (Giants use `numbers/NYG_original.png`) |

Giants: `players/NYG_numbered/NYG_{00-99}.png` are full renders with the real number already on the
chest, shoulders and helmet (1086 x 1448, one per available number, 88 in all). The build follows the
number (slimmer in the teens and 80s, heaviest in the 60s and 70s). Use these for Giants players; the
six number-less Giants sprites are the fallback. Missing numbers are retired by the Giants: 4, 7, 10,
11, 14, 16, 32, 40, 42, 50, 56, 92. A player who arrives wearing one of those uses a fallback sprite
with his number added.

Open notes:
- **MIA** numbers are aqua with orange trim (for a white jersey). If the Dolphins sprites come back
  in aqua jerseys, the sheet needs white numbers instead.
- **CLE** numbers are plain white with no outline; real Browns home numbers are orange.

## Layout

- `players/{TEAM}/{TEAM}_{Lean|Athletic|Big}_{Dark|Light}.png`: 1024 x 1536, transparent, no numbers.
  File names were checked against the images (four Giants files were mislabeled by ChatGPT and renamed).
- `numbers/{TEAM}.png`: a cleaned row of ten digits 0-9 (green screens keyed out, specks removed,
  dot textures stripped on DEN and DET).
- `numbers/source/`: the sheets as delivered, before cleaning.
- `tools/compose.py`: puts a number and the moody grade on a player. `python3 compose.py --sheet NYG`
  renders all six. `tools/clean_number_sheets.py` rebuilds `numbers/` from `numbers/source/`.
  `tools/check_players.py TEAM` checks a batch (size, transparency, stray pieces, build/skin labels).

Needs Python 3 with `opencv-python-headless`, `numpy` and `Pillow`.

## ChatGPT prompt: player sprites

```
TEAM = Pittsburgh Steelers
(Everywhere this prompt says [TEAM], it means the team named on the line above.
[TEAM_CODE] means that team's 2–3 letter abbreviation, e.g. PIT, NYG, KC.)

READ ALL OF THIS BEFORE DOING ANYTHING.

I need player images for a football video game. The game adds jersey numbers itself, so every
image must have NO numbers. These images must all match each other exactly in pose and framing,
so follow every rule below.

WHAT TO MAKE: SIX SEPARATE IMAGES FOR [TEAM]
  1. Lean, darker skin      2. Lean, lighter skin
  3. Athletic, darker skin  4. Athletic, lighter skin
  5. Big, darker skin       6. Big, lighter skin

RULE 1 — ONE PLAYER PER IMAGE. NEVER A GROUP. (MOST IMPORTANT)
- Generate SIX SEPARATE IMAGES. Each image contains exactly ONE player.
- NEVER make an image with more than one player in it, for ANY reason, at ANY point —
  not as a draft, not as a preview, not as a summary, not as a reference, not at the end.
- No group shots, lineups, "team photo", side-by-side, grid, contact sheet, comparison, collage.
- Do NOT generate one big image and crop it into six. Each player is its own full 1024 x 1536 generation.
- Use IMAGE GENERATION. Do not write code.

RULE 2 — BODY BUILDS (REAL NFL PLAYERS, NOT BODYBUILDERS)
- LEAN (QB/WR/CB/S): tall and athletic, long limbs, lean but not skinny, normal arm size.
- ATHLETIC (RB/TE/LB): solid and compact, thick legs and shoulders, some definition, realistic —
  a real running back or linebacker, NOT a fitness model.
- BIG (OL/DL): 310–340 lb linemen. Heavy and thick, NOT ripped: round full belly pushing the jersey
  out, thick soft arms with little definition, wide hips, thick thighs and neck, rounded shoulders.
  NO six-pack, NO veins, NO bulging biceps, NO V-shaped torso. A real starting tackle at media day.
- Similar height across builds (Big is wider, not taller).

RULE 3 — POSE AND FRAMING (IDENTICAL IN ALL SIX)
- Standing, facing the camera, head bowed so the helmet hides the face, hands clasped at the waist.
- Full body, top of helmet to feet, centered: helmet top ~40 px from the top, feet ~40 px from the bottom.

RULE 4 — UNIFORM
- [TEAM]'s real 2026 HOME uniform: jersey, helmet, stripes/decals, pants, socks, colors.
- NO NUMBERS ANYWHERE (chest, back, shoulders, sleeves, helmet). Logos and decals are fine.

RULE 5 — IMAGE STYLE
- PNG, exactly 1024 x 1536, TRANSPARENT background, soft even studio lighting.
- No background, floor, shadow, text, watermark. Clean edges, no halos or specks.

DELIVERY
- One zip with exactly six PNGs and NOTHING ELSE, named:
  [TEAM_CODE]_Lean_Dark.png, [TEAM_CODE]_Lean_Light.png, [TEAM_CODE]_Athletic_Dark.png,
  [TEAM_CODE]_Athletic_Light.png, [TEAM_CODE]_Big_Dark.png, [TEAM_CODE]_Big_Light.png
- Do NOT include or show any preview, overview, or combined image — in the zip or in the chat.

BEFORE YOU DELIVER — for each file answer yes/no: 1024x1536 transparent? ONE player? same pose and
framing? file name matches the image (Big = heaviest, Lean = slimmest, Dark/Light = skin tone)?
Big is heavy, not a bodybuilder? no numbers anywhere? Also confirm: "I did not create any image
containing more than one player." Fix anything that fails before delivering.
```

## ChatGPT prompt: number sheet (attach `numbers/source/NYG_original_sheet.png` as the reference)

```
TEAM = Pittsburgh Steelers
(Everywhere this prompt says [TEAM], it means the team named on the line above.)

READ ALL OF THIS BEFORE DOING ANYTHING.
The attached image is the New York Giants' jersey numbers 0–9. It is EXACTLY the kind of result
I want. Make the same thing for [TEAM]'s 2026 HOME jersey.

RULE 1 — Use IMAGE GENERATION. Do NOT write code, use Python, fonts, SVG or vectors, and do NOT
make a sprite pack, zip, manifest or multiple teams. ONE generated image.
RULE 2 — Draw [TEAM]'s real jersey numbers: real shapes, proportions, stroke, corner cuts, serifs,
fill color and outline colors. NOT a generic block or condensed font.
RULE 3 — Ten digits in ONE row, 0 1 2 3 4 5 6 7 8 9, same height, same baseline, clear gaps,
filling most of the image height.
RULE 4 — Flat and front-on. No jersey, fabric, texture, dots, shadow, glow, 3D or text.
Transparent background, or a solid bright green (#00FF00) with no green in the digits.

Before generating, describe [TEAM]'s real numbers in 2–3 sentences. After, confirm: image
generation and no code? ten digits 0–9 in order? real [TEAM] style? correct colors? flat, nothing
else in the image? Fix and regenerate if anything is "no".
```
