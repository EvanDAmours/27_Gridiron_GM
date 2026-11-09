"""Sets each team's offense / defense rating in html5game/Teams.txt from nfl-rosters.js.

    python3 tools/nfl/team_ratings.py

Offense = QB, HB, 2 WR, TE, 2 OL starters. Defense = 2 DL, 2 LB, 2 CB, 1 S.
Teams are ranked and spread across the 3..10 range the game uses.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..", "public", "retro")
src = open(os.path.join(ROOT, "nfl-rosters.js")).read()
rosters = json.loads(src[src.index("["):src.rindex("]") + 1])

OL = ("LT", "LG", "C", "RG", "RT")
# (positions, weight) - the QB counts double
OFF = [(("QB",), 2), (("HB",), 1), (("WR",), 1), (("WR",), 1), (("TE",), 1), (OL, 1), (OL, 1)]
DEF = [(("DT", "LEDG", "REDG"), 1), (("DT", "LEDG", "REDG"), 1), (("MIKE", "WILL", "SAM"), 1),
       (("MIKE", "WILL", "SAM"), 1), (("CB",), 1), (("CB",), 1), (("FS", "SS"), 1)]


def unit(players, groups):
    used, total, weight = set(), 0, 0
    for positions, w in groups:  # players are sorted best-first
        for i, p in enumerate(players):
            if i not in used and p["pos"] in positions:
                used.add(i)
                total += p["ovr"] * w
                weight += w
                break
    return total / max(1, weight)


def spread(scores):
    order = sorted(range(len(scores)), key=lambda i: scores[i])
    out = [0] * len(scores)
    for rank, i in enumerate(order):
        out[i] = 3 + round(rank / (len(scores) - 1) * 7)
    return out


off = spread([unit(r, OFF) for r in rosters])
dfn = spread([unit(r, DEF) for r in rosters])
path = os.path.join(ROOT, "html5game", "Teams.txt")
raw = open(path, newline="").read()
nl = "\r\n" if "\r\n" in raw else "\n"
lines = raw.split(nl)
head = lines[0].split("\t")
di, oi = head.index("defense"), head.index("offense")
for n, line in enumerate(lines[1:], 1):
    if not line.strip():
        continue
    c = line.split("\t")
    uid = int(c[0])
    c[di], c[oi] = str(dfn[uid]), str(off[uid])
    lines[n] = "\t".join(c)
    print(f"{c[1]:<11} OFF {off[uid]:>2}  DEF {dfn[uid]:>2}")
open(path, "w", newline="").write(nl.join(lines))
