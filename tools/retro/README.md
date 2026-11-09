# Retro mode tools

Retro mode is the Retro Bowl web build with the NFL mod, served as a static page at
`public/retro/index.html` (the RETRO button on the home screen). It doesn't go through Vite:
everything in `public/retro/` is copied to the site as is.

These scripts rebuild its data. Run them from the repo root:

```bash
python3 tools/retro/fetch_rosters.py   # refresh public/retro/nfl-rosters.js from EA's current Madden ratings
python3 tools/retro/team_ratings.py    # recompute team offense / defense in public/retro/html5game/Teams.txt
python3 tools/retro/build_logos.py     # rebuild the team logo sheet from tools/retro/logos/<ABBR>.png
```

`build_logos.py` writes `public/retro/html5game/RetroBowl_texture_2.png`. Each logo in `logos/` is
pixel art on a 4x grid (256x256 = 64x64 art pixels) and fits a 52x52 box; `public/retro/nfl-mod.js`
sizes the logos from that box (`LOGO_W` / `LOGO_H`). A team with no image falls back to a lettered
shield badge.

`inject-logo-sprite.js` is the one-time patch that registered the logo sheet as a sprite in
`RetroBowl.js`; it has already been applied and is a no-op if run again.

`README-upstream.md` is the mod's original readme (features and how the NFL mode works).
