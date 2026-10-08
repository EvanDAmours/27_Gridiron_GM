"""Build src/data/madden27.json: real NFL rosters with EA SPORTS Madden NFL 27 ratings.

Inputs (downloaded into a work dir you pass as the first argument):
  m27.json              every player from https://www.ea.com/games/madden-nfl/ratings (all pages,
                        the __NEXT_DATA__ ratingDetails.items lists)
Usage: python3 scripts/build-madden27.py /tmp/m27
"""
import json, random, sys
from collections import defaultdict

SEASON = 2026
CAP = 200  # the game's cap, in $M; real deals keep their share of the cap
ROSTER, PS = 53, 10
src = sys.argv[1]
eap = json.load(open(f"{src}/m27.json"))

TEAMS = {  # EA label -> game team
  "Buffalo Bills": ("Buffalo", "Bills", "BUF", "AFC", "East", "#00338d", "#c60c30"),
  "Miami Dolphins": ("Miami", "Dolphins", "MIA", "AFC", "East", "#008e97", "#fc4c02"),
  "New England Patriots": ("New England", "Patriots", "NE", "AFC", "East", "#002244", "#c60c30"),
  "NY Jets": ("New York", "Jets", "NYJ", "AFC", "East", "#125740", "#ffffff"),
  "Baltimore Ravens": ("Baltimore", "Ravens", "BAL", "AFC", "North", "#241773", "#9e7c0c"),
  "Cincinnati Bengals": ("Cincinnati", "Bengals", "CIN", "AFC", "North", "#fb4f14", "#000000"),
  "Cleveland Browns": ("Cleveland", "Browns", "CLE", "AFC", "North", "#311d00", "#ff3c00"),
  "Pittsburgh Steelers": ("Pittsburgh", "Steelers", "PIT", "AFC", "North", "#101820", "#ffb612"),
  "Houston Texans": ("Houston", "Texans", "HOU", "AFC", "South", "#03202f", "#a71930"),
  "Indianapolis Colts": ("Indianapolis", "Colts", "IND", "AFC", "South", "#002c5f", "#a2aaad"),
  "Jacksonville Jaguars": ("Jacksonville", "Jaguars", "JAX", "AFC", "South", "#006778", "#d7a22a"),
  "Tennessee Titans": ("Tennessee", "Titans", "TEN", "AFC", "South", "#0c2340", "#4b92db"),
  "Denver Broncos": ("Denver", "Broncos", "DEN", "AFC", "West", "#fb4f14", "#002244"),
  "Kansas City Chiefs": ("Kansas City", "Chiefs", "KC", "AFC", "West", "#e31837", "#ffb81c"),
  "Las Vegas Raiders": ("Las Vegas", "Raiders", "LV", "AFC", "West", "#000000", "#a5acaf"),
  "Los Angeles Chargers": ("Los Angeles", "Chargers", "LAC", "AFC", "West", "#0080c6", "#ffc20e"),
  "Dallas Cowboys": ("Dallas", "Cowboys", "DAL", "NFC", "East", "#041e42", "#869397"),
  "NY Giants": ("New York", "Giants", "NYG", "NFC", "East", "#0b2265", "#a71930"),
  "Philadelphia Eagles": ("Philadelphia", "Eagles", "PHI", "NFC", "East", "#004c54", "#a5acaf"),
  "Washington Commanders": ("Washington", "Commanders", "WAS", "NFC", "East", "#5a1414", "#ffb612"),
  "Chicago Bears": ("Chicago", "Bears", "CHI", "NFC", "North", "#0b162a", "#c83803"),
  "Detroit Lions": ("Detroit", "Lions", "DET", "NFC", "North", "#0076b6", "#b0b7bc"),
  "Green Bay Packers": ("Green Bay", "Packers", "GB", "NFC", "North", "#203731", "#ffb612"),
  "Minnesota Vikings": ("Minnesota", "Vikings", "MIN", "NFC", "North", "#4f2683", "#ffc62f"),
  "Atlanta Falcons": ("Atlanta", "Falcons", "ATL", "NFC", "South", "#a71930", "#000000"),
  "Carolina Panthers": ("Carolina", "Panthers", "CAR", "NFC", "South", "#0085ca", "#101820"),
  "New Orleans Saints": ("New Orleans", "Saints", "NO", "NFC", "South", "#101820", "#d3bc8d"),
  "Tampa Bay Buccaneers": ("Tampa Bay", "Buccaneers", "TB", "NFC", "South", "#d50a0a", "#34302b"),
  "Arizona Cardinals": ("Arizona", "Cardinals", "ARI", "NFC", "West", "#97233f", "#ffb612"),
  "Los Angeles Rams": ("Los Angeles", "Rams", "LAR", "NFC", "West", "#003594", "#ffa300"),
  "San Francisco 49ers": ("San Francisco", "49ers", "SF", "NFC", "West", "#aa0000", "#b3995d"),
  "Seattle Seahawks": ("Seattle", "Seahawks", "SEA", "NFC", "West", "#002244", "#69be28"),
}
POS = {"QB": "QB", "HB": "RB", "FB": "RB", "WR": "WR", "TE": "TE", "LT": "LT", "LG": "LG", "C": "C", "RG": "RG", "RT": "RT",
       "LEDG": "DL", "REDG": "DL", "DT": "DL", "SAM": "LB", "MIKE": "LB", "WILL": "LB", "CB": "CB", "FS": "S", "SS": "S", "K": "K"}
NEED = {"QB": 2, "RB": 3, "WR": 5, "TE": 3, "LT": 1, "LG": 1, "C": 1, "RG": 1, "RT": 1, "DL": 7, "LB": 5, "CB": 5, "S": 4, "K": 1}

def avg(*xs): return round(sum(xs) / len(xs))
OL = lambda s: {"passBlock": s["passBlock"], "footwork": s["passBlockFinesse"], "anchor": s["passBlockPower"], "awareness": s["awareness"],
  "handUse": s["runBlockFinesse"], "reach": s["impactBlocking"], "agility": s["agility"], "toughness": s["toughness"], "runBlock": s["runBlock"],
  "pulling": avg(s["runBlockFinesse"], s["agility"]), "strength": s["strength"], "drive": s["runBlockPower"], "snapping": s["awareness"],
  "leadership": s["awareness"], "athleticism": avg(s["speed"], s["agility"]), "power": s["runBlockPower"]}
ATTRS = {  # the game's position skills, from Madden's ratings
  "QB": lambda s: {"armStr": s["throwPower"], "accuracy": avg(s["throwAccuracyShort"], s["throwAccuracyMid"]), "pocketAwr": s["throwUnderPressure"],
    "decisions": s["awareness"], "mobility": avg(s["speed"], s["throwOnTheRun"]), "touch": s["throwAccuracyDeep"], "readDef": s["playRecognition"]},
  "RB": lambda s: {"vision": s["bCVision"], "elusiveness": s["jukeMove"], "breakTkl": s["breakTackle"], "passBlock": s["passBlock"], "receiving": s["catching"],
    "burst": s["acceleration"], "balance": avg(s["breakTackle"], s["carrying"]), "stiffArm": s["stiffArm"]},
  "WR": lambda s: {"routeRun": avg(s["shortRouteRunning"], s["mediumRouteRunning"], s["deepRouteRunning"]), "catching": s["catching"],
    "separation": avg(s["changeOfDirection"], s["mediumRouteRunning"]), "release": s["release"], "bodyCtrl": s["spectacularCatch"], "yac": s["bCVision"],
    "deepSpd": s["speed"], "catchTraffic": s["catchInTraffic"]},
  "TE": lambda s: {"blocking": s["runBlock"], "receiving": s["catching"], "routeRun": avg(s["shortRouteRunning"], s["mediumRouteRunning"]),
    "redZone": s["spectacularCatch"], "passBlock": s["passBlock"], "yac": s["breakTackle"], "seaming": s["deepRouteRunning"], "toughness": s["toughness"]},
  "DL": lambda s: {"passRush": avg(s["powerMoves"], s["finesseMoves"]), "runStop": s["blockShedding"], "handUse": s["finesseMoves"], "motor": s["stamina"],
    "getOff": s["acceleration"], "bullRush": s["powerMoves"], "swim": s["finesseMoves"], "spin": avg(s["finesseMoves"], s["agility"])},
  "LB": lambda s: {"tackling": s["tackle"], "coverage": avg(s["zoneCoverage"], s["manCoverage"]), "blitzing": avg(s["powerMoves"], s["finesseMoves"]),
    "runFit": s["playRecognition"], "instincts": s["awareness"], "pursuit": s["pursuit"], "shedBlock": s["blockShedding"], "zoneAwr": s["zoneCoverage"]},
  "CB": lambda s: {"manCov": s["manCoverage"], "zoneCov": s["zoneCoverage"], "press": s["press"], "ballSkills": s["catching"], "tackling": s["tackle"],
    "recovery": s["speed"], "footwork": s["agility"], "playRec": s["playRecognition"]},
  "S": lambda s: {"range": s["speed"], "runSupport": s["hitPower"], "coverage": s["zoneCoverage"], "tackling": s["tackle"], "ballHawk": s["catching"],
    "blitzing": s["finesseMoves"], "comms": s["awareness"], "versatility": s["manCoverage"]},
  "K": lambda s: {"legStr": s["kickPower"], "accuracy": s["kickAccuracy"], "clutch": s["awareness"], "distance": s["kickPower"], "hangTime": s["kickPower"],
    "consistency": s["kickAccuracy"], "coldWx": s["toughness"], "pressure": s["awareness"]},
}
for p in ("LT", "LG", "C", "RG", "RT"): ATTRS[p] = OL

# Salaries: the data has no contracts, so price each player like the market does: by position
# and rating, with players still on rookie deals cheap. Years left follow age and experience.
TOP = {"QB": 30, "DL": 17, "WR": 17, "LT": 15, "RT": 13, "CB": 13, "LB": 10, "S": 9, "TE": 9, "LG": 9, "RG": 9, "C": 8, "RB": 7, "K": 3}
rng = random.Random(27)
def contract(pos, ovr, age, years_pro):
    value = 1.0 + TOP[pos] * 1.25 * max(0, (ovr - 60) / 39) ** 2.2
    if years_pro <= 3: return round(min(value, 0.8 + value * 0.22), 1), max(1, 4 - years_pro)
    return round(value, 1), (rng.randint(1, 2) if age >= 31 else rng.randint(1, 5) if ovr >= 80 else rng.randint(1, 3))

teams = defaultdict(list)
for p in eap:
    pos = POS.get(p["position"]["id"])
    if not pos or not p.get("team"): continue
    s = {k: v["value"] for k, v in p["stats"].items()}
    sal, yrs = contract(pos, p["overallRating"], p["age"], p["yearsPro"])
    dev = "superstar" if any(a["type"]["id"] == "xFactor" for a in p.get("playerAbilities") or []) else \
          "star" if p.get("playerAbilities") else None
    teams[p["team"]["label"]].append({
        "name": f'{p["firstName"]} {p["lastName"]}', "pos": pos, "mpos": p["position"]["id"], "ovr": p["overallRating"], "age": p["age"],
        "ht": p["height"], "wt": p["weight"], "college": p["college"] or "", "num": p["jerseyNum"], "yp": p["yearsPro"],
        "arch": (p.get("archetype") or {}).get("label", "").split(" - ")[0], "dev": dev,
        "spd": s["speed"], "str": s["strength"], "agi": s["agility"], "acc": s["acceleration"], "jmp": s["jumping"], "end": s["stamina"],
        "attrs": ATTRS[pos](s), "sal": sal, "yrs": yrs,
    })

out = []
for label, meta in TEAMS.items():
    ps = sorted(teams[label], key=lambda x: -x["ovr"])
    keep = []
    for pos, n in NEED.items(): keep += [x for x in ps if x["pos"] == pos][:n]
    keep += [x for x in ps if x not in keep][: ROSTER - len(keep)]
    rest = [x for x in ps if x not in keep]
    squad = sorted([x for x in rest if x["yp"] <= 3], key=lambda x: -x["ovr"])[:PS]
    # Keep every club playable: between $125M and $195M to start under the game's $200M cap.
    pay = sum(x["sal"] for x in keep)
    f = 195 / pay if pay > 195 else 125 / pay if pay < 125 else 1
    for x in keep + squad: x["sal"] = round(max(0.5, x["sal"] * f), 1)
    city, name, ab, c, d, clr, ac = meta
    out.append({"city": city, "name": name, "ab": ab, "c": c, "d": d, "clr": clr, "ac": ac, "roster": keep, "ps": squad})
    print(f"{ab:4} {len(keep)} +{len(squad)} PS  payroll ${sum(x['sal'] for x in keep):.0f}M  top {keep[0]['name']} {keep[0]['ovr']}")
json.dump({"source": "EA SPORTS Madden NFL 27 ratings (Week 3)", "season": SEASON, "teams": out}, open("src/data/madden27.json", "w"), separators=(",", ":"))
pay = [sum(x["sal"] for x in t["roster"]) for t in out]
print(f"payroll min ${min(pay):.0f}M avg ${sum(pay)/len(pay):.0f}M max ${max(pay):.0f}M")
