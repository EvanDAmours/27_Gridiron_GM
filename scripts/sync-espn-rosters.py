"""Sync the game's real rosters with the NFL's current ones (ESPN's public team rosters).

Trades, releases and signings since src/data/madden27.json was built: a player on another club's
ESPN roster moves there (ratings and contract kept), one on no roster goes to free agency, and one
of our free agents now on a roster signs there. Every active roster stays at 53: a club over it
sends its lowest-rated depth player to the practice squad, one under it calls up its best
practice-squad player (or signs the best free agent). Each move is recorded in
src/data/realMoves2026.json, so saves already in the 2026 season get them too (realMoves.js).

Usage: python3 scripts/sync-espn-rosters.py [rosters.json]   (a saved fetch, else downloads it)
Re-run it any week; moves already made are kept.
"""
import json, re, sys, time, unicodedata, urllib.request
from datetime import datetime, timezone

ROSTER, PS = 53, 10
MD, CT, MV = "src/data/madden27.json", "src/data/contracts2026.json", "src/data/realMoves2026.json"


def key(n):
    n = unicodedata.normalize("NFKD", n).encode("ascii", "ignore").decode().lower()
    n = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b\.?", "", n)
    return re.sub(r"[^a-z]", "", n)


# position groups on both sides (ESPN lists OT/G/DE/DT/PK; the game LT/LG/DL/K)
GROUP = {"LT": "OL", "RT": "OL", "LG": "OL", "RG": "OL", "C": "OL", "OT": "OL", "G": "OL", "OL": "OL", "T": "OL",
         "DL": "DL", "DE": "DL", "DT": "DL", "NT": "DL", "EDGE": "DL", "LB": "LB", "OLB": "LB", "ILB": "LB", "MLB": "LB",
         "S": "S", "FS": "S", "SS": "S", "K": "K", "PK": "K", "RB": "RB", "FB": "RB", "HB": "RB"}
grp = lambda pos: GROUP.get(pos, pos)
SUFFIX = re.compile(r"^(jr|sr|ii|iii|iv|v)\.?$", re.I)
def last(n):
    w = [x for x in n.split() if not SUFFIX.match(x)]
    return key(w[-1]) if w else key(n)


def fetch():
    get = lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "gridiron-gm-data/1.0"}), timeout=30))
    teams = get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams")["sports"][0]["leagues"][0]["teams"]
    out = {}
    for t in teams:
        t = t["team"]
        d = get(f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{t['id']}/roster")
        out[{"WSH": "WAS"}.get(t["abbreviation"], t["abbreviation"])] = [{"name": a["fullName"], "pos": (a.get("position") or {}).get("abbreviation")} for g in d.get("athletes", []) for a in g.get("items", [])]
        time.sleep(0.2)
    return out


R = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else fetch()
M, C = json.load(open(MD)), json.load(open(CT))
try:
    log = json.load(open(MV))
except FileNotFoundError:
    log = {"season": 2026, "moves": []}
espn = {}
for ab, ps in R.items():
    for p in ps:
        espn.setdefault(key(p["name"]), []).append(ab)
# the same man under a shorter or longer name (Cam/Camryn Bynum, Olaivavega/Vega Ioane): his
# club has a player with his last name at his position group, and nobody has his exact name
def same_man_here(p, ab):
    return any(last(q["name"]) == last(p["name"]) and grp(q["pos"]) == grp(p["pos"]) for q in R.get(ab, []))
team = {t["ab"]: t for t in M["teams"]}
today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
moves = []
lost = {}  # club -> the position groups it lost (to fill those first)


def contract_move(name, a, b):
    k = f"{a}|{name}"
    if k in C["players"]:
        v = C["players"].pop(k)
        if b != "FA":
            C["players"][f"{b}|{name}"] = v


# 1. players on one of our clubs: still there, traded/signed elsewhere, or released
for t in M["teams"]:
    for lst in ("roster", "ps"):
        for p in list(t[lst]):
            hits = espn.get(key(p["name"]), [])
            if t["ab"] in hits or (not hits and same_man_here(p, t["ab"])):
                continue
            if len(hits) > 1:
                print("ambiguous, left alone:", p["name"], hits)
                continue
            to = hits[0] if hits else "FA"
            t[lst].remove(p)
            lost.setdefault(t["ab"], []).append(grp(p["pos"]))
            if to == "FA":
                p.pop("dk", None)
                M["fa"].append(p)
            else:
                team[to]["roster"].append(p)
            contract_move(p["name"], t["ab"], to)
            moves.append({"name": p["name"], "pos": p["pos"], "from": t["ab"], "to": to, "ovr": p["ovr"]})
# 2. our free agents who've signed with a club
for p in list(M["fa"]):
    hits = espn.get(key(p["name"]), [])
    if len(hits) != 1 or any(m["name"] == p["name"] and m["to"] == "FA" for m in moves):
        continue
    M["fa"].remove(p)
    team[hits[0]]["roster"].append(p)
    moves.append({"name": p["name"], "pos": p["pos"], "from": "FA", "to": hits[0], "ovr": p["ovr"]})

# 2b. a club left without a kicker: the kicker ESPN lists for it, if he isn't in our data, rated a
# couple of points under the man he replaced (kickers have no Madden card of their own here)
ours = {key(p["name"]) for t in M["teams"] for p in t["roster"] + t["ps"]} | {key(p["name"]) for p in M["fa"]}
for t in M["teams"]:
    if any(p["pos"] == "K" for p in t["roster"]):
        continue
    gone = next((m for m in moves if m["from"] == t["ab"] and m["pos"] == "K"), None)
    new = next((q for q in R.get(t["ab"], []) if q["pos"] == "PK" and key(q["name"]) not in ours), None)
    tpl = next((p for p in M["fa"] if gone and p["name"] == gone["name"]), None)
    if not (new and tpl):
        print("no kicker for", t["ab"])
        continue
    k = {**tpl, "name": new["name"], "ovr": tpl["ovr"] - 2, "dk": 1, "est": True}
    k["attrs"] = {a2: max(40, v - 2) for a2, v in (tpl.get("attrs") or {}).items()}
    t["roster"].append(k)
    moves.append({"name": k["name"], "pos": "K", "from": "FA", "to": t["ab"], "ovr": k["ovr"]})

# 3. every active roster back to 53 (kickers, punters and quarterbacks stay on it)
keep = lambda p: p["pos"] in ("K", "P", "QB")
for t in M["teams"]:
    while len(t["roster"]) > ROSTER:
        cut = min((p for p in t["roster"] if not keep(p)), key=lambda p: (p["ovr"], -p.get("dk", 9)))
        t["roster"].remove(cut)
        t["ps"].append(cut)
    # a club short-handed calls up from its practice squad (at the spot it lost first), else signs a
    # depth-level free agent at that spot (never a man just released, nor a star nobody has signed)
    need = list(lost.get(t["ab"], []))
    released = {m["name"] for m in moves if m["to"] == "FA"}
    while len(t["roster"]) < ROSTER:
        g = need.pop(0) if need else None
        ps = sorted(t["ps"], key=lambda p: (grp(p["pos"]) != g, -p["ovr"]))
        if ps:
            up = ps[0]
            t["ps"].remove(up)
        else:
            pool = [p for p in M["fa"] if p["name"] not in released and p["ovr"] <= 72]
            up = sorted(pool, key=lambda p: (grp(p["pos"]) != g, -p["ovr"]))[0]
            M["fa"].remove(up)
            moves.append({"name": up["name"], "pos": up["pos"], "from": "FA", "to": t["ab"], "ovr": up["ovr"], "fill": True})
        t["roster"].append(up)
    while len(t["ps"]) > PS:
        drop = min(t["ps"], key=lambda p: p["ovr"])
        t["ps"].remove(drop)
        drop.pop("dk", None)
        M["fa"].append(drop)

seen = {(m["name"], m["from"], m["to"]) for m in log["moves"]}
for m in moves:
    m["id"] = f"{today}-{key(m['name'])}-{m['to'].lower()}"
    m["date"] = today
    if (m["name"], m["from"], m["to"]) not in seen:
        log["moves"].append(m)
M["source"] = re.sub(r"; rosters synced with ESPN.*$", "", M["source"]) + f"; rosters synced with ESPN {today}"
json.dump(M, open(MD, "w"), separators=(",", ":"))
json.dump(C, open(CT, "w"), separators=(",", ":"))
json.dump(log, open(MV, "w"), indent=1)
print(f"{len(moves)} moves")
for m in sorted(moves, key=lambda m: -m["ovr"]):
    print(f"  {m['from']:4} -> {m['to']:4} {m['name']:26}{m['pos']:4}{m['ovr']}{'  (to fill a roster)' if m.get('fill') else ''}")
