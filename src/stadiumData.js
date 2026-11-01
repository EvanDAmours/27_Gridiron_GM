// Every club's home stadium, as Stadium.jsx draws it from above: the shape of the bowl, what the
// outside is made of, any roof (shown rolled open over the field), the boards, and the landmark
// each one is known for, plus the crowd in the club's colors.
//
// corner: how rounded the bowl is (0.5 squared off, 1 oval, 2+ round).
// shell: "louvers" (MetLife's skin), "concrete" (skin/skinHi), or "wall" (plain; canopies or a
//   roof on top). roof: { from, tex, see } a roof ring from depth `from` to the outer wall, open
//   over the field (tex: seams, rings, skylights, petals, triangles, ridge, clear; see: a
//   translucent canopy, its opacity). upper: { corners: open corners, ends: [-1|1] ends with no
//   upper deck, tarps }. boards: "corners" or [{ at, h, w, sides }] end boards at depth `at`.
// Landmarks: trusses (roof trusses end to end), retracted (roof panels stacked over the ends),
//   glassEnds, wings (sideline canopies), canopy (a canopy over every seat), spires, colonnade,
//   tower (one sideline: suite tower or warehouse), lighthouse, ship, pools, torch, horse, bleachers.
// crowd: [color, weight]; empty: the seat color where nobody sits.
const METLIFE = { name: "METLIFE STADIUM", corner: 0.62, shell: "louvers", boards: "corners" };
const SOFI = { name: "SOFI STADIUM", corner: 0.75, shell: "wall", roof: { from: 0.6, tex: "triangles", see: 0.5 }, skin: "#e2e8f0", skinHi: "#ffffff", boards: [{ at: 0.93, h: 0.5 }] };
const ENDS = [{ at: 0.93, h: 0.55 }];

export const STADIUMS = {
  // AFC East
  BUF: { name: "HIGHMARK STADIUM", corner: 0.7, shell: "concrete", skin: "#6b5d52", skinHi: "#8a7a6c", canopy: { from: 0.72 }, boards: ENDS, empty: "#1e3a8a",
    ribbon: "#00338d", ribbonHi: "#c60c30", ribbonText: "BILLS  ·  BILLS MAFIA  ·  ORCHARD PARK  ·  HIGHMARK STADIUM  ·  LET'S GO BUFFALO  ·  BILLS",
    crowd: [["#00338d", 32], ["#1d4fb8", 10], ["#c60c30", 12], ["#e5e7eb", 8], ["#0f172a", 18], ["#475569", 12]] },
  MIA: { name: "HARD ROCK STADIUM", corner: 0.7, shell: "concrete", skin: "#5b6470", skinHi: "#7b8592", canopy: { from: 0.66 }, spires: true, boards: "corners", empty: "#0e7490",
    ribbon: "#008e97", ribbonHi: "#fc4c02", ribbonText: "DOLPHINS  ·  FINS UP  ·  MIAMI GARDENS  ·  HARD ROCK STADIUM  ·  FINS UP  ·  DOLPHINS",
    crowd: [["#008e97", 30], ["#00a3ad", 8], ["#fc4c02", 10], ["#f1f5f9", 14], ["#0f172a", 12], ["#475569", 10]] },
  NE: { name: "GILLETTE STADIUM", corner: 0.6, shell: "concrete", skin: "#5c6470", skinHi: "#7b8592", upper: { ends: [-1] }, lighthouse: -1, boards: [{ at: 0.66, h: 0.6, w: 12, sides: [-1] }, { at: 0.93, h: 0.5, sides: [1] }],
    ribbon: "#002244", ribbonHi: "#c60c30", ribbonText: "PATRIOTS  ·  FOXBOROUGH  ·  GILLETTE STADIUM  ·  NEW ENGLAND  ·  PATRIOTS",
    crowd: [["#002244", 32], ["#c60c30", 12], ["#b0b7bc", 10], ["#e5e7eb", 8], ["#0f172a", 18], ["#475569", 12]] },
  NYJ: { ...METLIFE, skin: "#15803d", skinHi: "#22c55e", ribbon: "#166534", ribbonText: "JETS  ·  J-E-T-S  ·  GANG GREEN  ·  METLIFE STADIUM  ·  JETS  ·  J-E-T-S  ·  GANG GREEN",
    crowd: [["#14532d", 34], ["#1f7a45", 14], ["#cbd5e1", 12], ["#0f172a", 20], ["#475569", 12], ["#5b6b8a", 8]] },
  // AFC North
  BAL: { name: "M&T BANK STADIUM", corner: 0.75, shell: "concrete", skin: "#4b5058", skinHi: "#6b7280", boards: ENDS, empty: "#4c1d95",
    ribbon: "#241773", ribbonHi: "#9e7c0c", ribbonInk: "#e9d5a5", ribbonText: "RAVENS  ·  BALTIMORE  ·  M&T BANK STADIUM  ·  PLAY LIKE A RAVEN  ·  RAVENS",
    crowd: [["#241773", 34], ["#3b2a9a", 10], ["#0f172a", 22], ["#9e7c0c", 6], ["#e5e7eb", 6], ["#475569", 12]] },
  CIN: { name: "PAYCOR STADIUM", corner: 0.5, shell: "wall", skin: "#a3aab3", skinHi: "#d1d5db", upper: { corners: true }, wings: { at: 0.68 }, boards: [{ at: 0.74, h: 0.6, w: 15 }], empty: "#c2410c",
    ribbon: "#fb4f14", ribbonHi: "#fb4f14", ribbonInk: "#111827", ribbonText: "BENGALS  ·  WHO DEY  ·  CINCINNATI  ·  THE JUNGLE  ·  BENGALS  ·  WHO DEY",
    crowd: [["#fb4f14", 30], ["#0f172a", 26], ["#e5e7eb", 8], ["#475569", 12], ["#7c2d12", 6]] },
  CLE: { name: "HUNTINGTON BANK FIELD", corner: 0.55, shell: "concrete", skin: "#4b5058", skinHi: "#6b7280", upper: { ends: [1] }, bleachers: 1, boards: [{ at: 0.93, h: 0.5 }], empty: "#7c2d12",
    ribbon: "#311d00", ribbonHi: "#ff3c00", ribbonInk: "#ff3c00", ribbonText: "BROWNS  ·  DAWG POUND  ·  CLEVELAND  ·  HUNTINGTON BANK FIELD  ·  BROWNS",
    crowd: [["#ff3c00", 24], ["#311d00", 28], ["#5c3a0e", 8], ["#e5e7eb", 8], ["#0f172a", 14], ["#475569", 10]] },
  PIT: { name: "ACRISURE STADIUM", corner: 0.6, shell: "concrete", skin: "#4b5058", skinHi: "#6b7280", upper: { ends: [1] }, boards: [{ at: 0.72, h: 0.62, w: 14, sides: [1] }, { at: 0.93, h: 0.5, sides: [-1] }], empty: "#eab308",
    ribbon: "#101820", ribbonHi: "#ffb612", ribbonInk: "#ffb612", ribbonText: "STEELERS  ·  PITTSBURGH  ·  HERE WE GO  ·  ACRISURE STADIUM  ·  STEELERS",
    crowd: [["#101820", 34], ["#ffb612", 22], ["#e5e7eb", 8], ["#475569", 12], ["#a16207", 6]] },
  // AFC South
  HOU: { name: "NRG STADIUM", corner: 0.8, shell: "wall", roof: { from: 0.83, tex: "seams" }, skin: "#cfd6de", skinHi: "#f1f5f9", trusses: 0.05, retracted: true, boards: [{ at: 0.74, h: 0.5, w: 12 }],
    ribbon: "#03202f", ribbonHi: "#a71930", ribbonText: "TEXANS  ·  HOUSTON  ·  NRG STADIUM  ·  BATTLE RED  ·  TEXANS  ·  H-TOWN",
    crowd: [["#03202f", 30], ["#a71930", 18], ["#e5e7eb", 10], ["#1e3a5f", 8], ["#0f172a", 14], ["#475569", 10]] },
  IND: { name: "LUCAS OIL STADIUM", corner: 0.7, shell: "wall", roof: { from: 0.83, tex: "ridge" }, skin: "#9aa3ad", skinHi: "#d1d5db", glassEnds: [-1], boards: [{ at: 0.74, h: 0.5, w: 12, sides: [1] }],
    ribbon: "#002c5f", ribbonHi: "#a2aaad", ribbonText: "COLTS  ·  INDIANAPOLIS  ·  LUCAS OIL STADIUM  ·  FOR THE SHOE  ·  COLTS",
    crowd: [["#002c5f", 32], ["#1d4ed8", 10], ["#e5e7eb", 14], ["#a2aaad", 8], ["#0f172a", 16], ["#475569", 10]] },
  JAX: { name: "EVERBANK STADIUM", corner: 0.6, shell: "concrete", skin: "#4b5563", skinHi: "#6b7280", pools: -1, boards: [{ at: 0.93, h: 0.7 }], empty: "#0f766e",
    ribbon: "#006778", ribbonHi: "#d7a22a", ribbonText: "JAGUARS  ·  DUUUVAL  ·  JACKSONVILLE  ·  EVERBANK STADIUM  ·  JAGUARS",
    crowd: [["#006778", 28], ["#0e8a9a", 8], ["#d7a22a", 8], ["#0f172a", 22], ["#e5e7eb", 10], ["#475569", 12]] },
  TEN: { name: "NISSAN STADIUM", corner: 0.65, shell: "concrete", skin: "#525a66", skinHi: "#717b88", upper: { ends: [-1, 1] }, boards: [{ at: 0.75, h: 0.6, w: 14 }], empty: "#1e40af",
    ribbon: "#0c2340", ribbonHi: "#4b92db", ribbonText: "TITANS  ·  NASHVILLE  ·  NISSAN STADIUM  ·  TITAN UP  ·  TITANS",
    crowd: [["#0c2340", 28], ["#4b92db", 16], ["#c8102e", 6], ["#e5e7eb", 10], ["#0f172a", 16], ["#475569", 12]] },
  // AFC West
  DEN: { name: "EMPOWER FIELD AT MILE HIGH", corner: 0.85, shell: "concrete", skin: "#4a4f58", skinHi: "#6b7280", horse: 1, boards: ENDS, empty: "#ea580c",
    ribbon: "#002244", ribbonHi: "#fb4f14", ribbonInk: "#fb4f14", ribbonText: "BRONCOS  ·  MILE HIGH  ·  DENVER  ·  BRONCOS COUNTRY  ·  BRONCOS",
    crowd: [["#fb4f14", 30], ["#002244", 24], ["#e5e7eb", 10], ["#0f172a", 14], ["#475569", 10], ["#c2410c", 6]] },
  KC: { name: "GEHA FIELD AT ARROWHEAD", corner: 1, shell: "concrete", skin: "#4b5058", skinHi: "#6b7280", boards: ENDS, empty: "#b91c1c",
    ribbon: "#e31837", ribbonHi: "#ffb81c", ribbonInk: "#ffb81c", ribbonText: "CHIEFS  ·  ARROWHEAD  ·  KANSAS CITY  ·  CHIEFS KINGDOM  ·  CHIEFS",
    crowd: [["#e31837", 44], ["#b91c1c", 12], ["#ffb81c", 6], ["#e5e7eb", 8], ["#0f172a", 12], ["#475569", 6]] },
  LV: { name: "ALLEGIANT STADIUM", corner: 0.7, shell: "wall", roof: { from: 0.82, tex: "seams" }, skin: "#1f2937", skinHi: "#4b5563", nameInk: "#e5e7eb", glassEnds: [1], torch: 1, boards: [{ at: 0.74, h: 0.5, w: 12, sides: [-1] }],
    ribbon: "#000000", ribbonHi: "#a5acaf", ribbonInk: "#e5e7eb", ribbonText: "RAIDERS  ·  LAS VEGAS  ·  ALLEGIANT STADIUM  ·  RAIDER NATION  ·  RAIDERS",
    crowd: [["#000000", 40], ["#a5acaf", 16], ["#e5e7eb", 10], ["#475569", 14], ["#1f2937", 10]] },
  LAC: { ...SOFI, ribbon: "#0080c6", ribbonHi: "#ffc20e", ribbonText: "CHARGERS  ·  BOLT UP  ·  LOS ANGELES  ·  SOFI STADIUM  ·  CHARGERS",
    crowd: [["#0080c6", 28], ["#38bdf8", 8], ["#ffc20e", 12], ["#002a5e", 12], ["#e5e7eb", 8], ["#0f172a", 12], ["#475569", 10]] },
  // NFC East
  DAL: { name: "AT&T STADIUM", corner: 1, shell: "wall", roof: { from: 0.83, tex: "seams" }, skin: "#c3cad4", skinHi: "#eef1f5", glassEnds: [-1, 1], trusses: 0.22,
    ribbon: "#0b2a5b", ribbonHi: "#3b82f6", ribbonText: "COWBOYS  ·  AMERICA'S TEAM  ·  ARLINGTON  ·  AT&T STADIUM  ·  COWBOYS  ·  HOW 'BOUT THEM COWBOYS",
    crowd: [["#0b2a5b", 30], ["#1e40af", 10], ["#a7b1bf", 13], ["#e5e7eb", 9], ["#0f172a", 18], ["#475569", 12], ["#7f1d1d", 4]] },
  NYG: { ...METLIFE, skin: "#1d4ed8", skinHi: "#3b82f6", ribbon: "#1d4ed8", ribbonText: "GIANTS  ·  NEW YORK  ·  BIG BLUE  ·  METLIFE STADIUM  ·  GIANTS  ·  NEW YORK  ·  BIG BLUE",
    crowd: [["#1e3a8a", 34], ["#3155b8", 14], ["#a8b3c7", 7], ["#8f1d2c", 8], ["#0f172a", 17], ["#475569", 12], ["#5b6b8a", 8]] },
  PHI: { name: "LINCOLN FINANCIAL FIELD", corner: 0.5, shell: "wall", skin: "#8c96a3", skinHi: "#c4cbd4", upper: { corners: true }, wings: { at: 0.68, turbines: true, panels: true }, boards: [{ at: 0.74, h: 0.62, w: 15 }],
    ribbon: "#004c54", ribbonHi: "#14b8a6", ribbonText: "EAGLES  ·  FLY EAGLES FLY  ·  PHILADELPHIA  ·  THE LINC  ·  EAGLES  ·  GO BIRDS",
    crowd: [["#004c54", 34], ["#0b6b73", 12], ["#a5acaf", 9], ["#e5e7eb", 8], ["#0f172a", 20], ["#475569", 10], ["#1f6b2c", 4]] },
  WAS: { name: "NORTHWEST STADIUM", corner: 0.85, shell: "concrete", skin: "#4a4f58", skinHi: "#6b7280", upper: { tarps: "COMMANDERS" }, boards: ENDS, empty: "#7a1f2b",
    ribbon: "#5a1414", ribbonHi: "#ffb612", ribbonInk: "#ffb612", ribbonText: "COMMANDERS  ·  HAIL TO THE COMMANDERS  ·  WASHINGTON  ·  NORTHWEST STADIUM  ·  COMMANDERS  ·  HTTC",
    crowd: [["#5a1414", 32], ["#7a1f2b", 10], ["#ffb612", 8], ["#c99a2e", 4], ["#e5e7eb", 6], ["#0f172a", 18], ["#475569", 12]] },
  // NFC North
  CHI: { name: "SOLDIER FIELD", corner: 0.5, shell: "concrete", skin: "#bdb7a6", skinHi: "#e7e3d6", nameInk: "#1f2937", colonnade: true, boards: ENDS,
    ribbon: "#0b162a", ribbonHi: "#c83803", ribbonInk: "#c83803", ribbonText: "BEARS  ·  CHICAGO  ·  SOLDIER FIELD  ·  MONSTERS OF THE MIDWAY  ·  BEARS",
    crowd: [["#0b162a", 30], ["#c83803", 14], ["#e5e7eb", 8], ["#0f172a", 20], ["#475569", 14], ["#7c2d12", 4]] },
  DET: { name: "FORD FIELD", corner: 0.6, shell: "wall", roof: { from: 0.83, tex: "skylights" }, skin: "#9ca3af", skinHi: "#d1d5db", tower: { side: 1, style: "brick", from: 0.83 }, boards: [{ at: 0.74, h: 0.5, w: 12 }],
    ribbon: "#0076b6", ribbonHi: "#b0b7bc", ribbonText: "LIONS  ·  DETROIT  ·  FORD FIELD  ·  ONE PRIDE  ·  LIONS",
    crowd: [["#0076b6", 32], ["#38a3dd", 8], ["#b0b7bc", 10], ["#e5e7eb", 10], ["#0f172a", 16], ["#475569", 10]] },
  GB: { name: "LAMBEAU FIELD", corner: 0.9, shell: "concrete", skin: "#6b4a3a", skinHi: "#8a5f4a", boards: ENDS, empty: "#b8c0ca",
    ribbon: "#203731", ribbonHi: "#ffb612", ribbonInk: "#ffb612", ribbonText: "PACKERS  ·  LAMBEAU FIELD  ·  GREEN BAY  ·  GO PACK GO  ·  TITLETOWN",
    crowd: [["#203731", 26], ["#2f5d3a", 8], ["#ffb612", 18], ["#e5e7eb", 8], ["#0f172a", 14], ["#475569", 10], ["#ea580c", 3]] },
  MIN: { name: "U.S. BANK STADIUM", corner: 0.55, shell: "wall", roof: { from: 0.82, tex: "clear" }, skin: "#3f4650", skinHi: "#5b6470", nameInk: "#e5e7eb", glassEnds: [-1], boards: [{ at: 0.74, h: 0.5, w: 12, sides: [1] }],
    ribbon: "#4f2683", ribbonHi: "#ffc62f", ribbonText: "VIKINGS  ·  SKOL  ·  MINNEAPOLIS  ·  U.S. BANK STADIUM  ·  SKOL VIKINGS",
    crowd: [["#4f2683", 34], ["#6d3fb0", 8], ["#ffc62f", 12], ["#e5e7eb", 8], ["#0f172a", 16], ["#475569", 10]] },
  // NFC South
  ATL: { name: "MERCEDES-BENZ STADIUM", corner: 1, shell: "wall", roof: { from: 0.8, tex: "petals" }, skin: "#9ca3af", skinHi: "#e5e7eb",
    ribbon: "#a71930", ribbonHi: "#ef4444", ribbonText: "FALCONS  ·  RISE UP  ·  ATLANTA  ·  MERCEDES-BENZ STADIUM  ·  FALCONS",
    crowd: [["#a71930", 26], ["#0f172a", 28], ["#a5acaf", 10], ["#e5e7eb", 10], ["#475569", 12]] },
  CAR: { name: "BANK OF AMERICA STADIUM", corner: 0.75, shell: "concrete", skin: "#3f4650", skinHi: "#5b6470", upper: { corners: true }, boards: ENDS, empty: "#0e7490",
    ribbon: "#0085ca", ribbonHi: "#bfc0bf", ribbonText: "PANTHERS  ·  KEEP POUNDING  ·  CHARLOTTE  ·  BANK OF AMERICA STADIUM  ·  PANTHERS",
    crowd: [["#0085ca", 26], ["#0f172a", 28], ["#bfc0bf", 10], ["#e5e7eb", 10], ["#475569", 12], ["#38bdf8", 4]] },
  NO: { name: "CAESARS SUPERDOME", corner: 1.5, shell: "wall", roof: { from: 0.8, tex: "rings" }, skin: "#b8a37a", skinHi: "#e8dcc0",
    ribbon: "#101820", ribbonHi: "#d3bc8d", ribbonInk: "#d3bc8d", ribbonText: "SAINTS  ·  WHO DAT  ·  NEW ORLEANS  ·  CAESARS SUPERDOME  ·  SAINTS",
    crowd: [["#101820", 30], ["#d3bc8d", 20], ["#e5e7eb", 10], ["#475569", 12], ["#a08a5c", 6]] },
  TB: { name: "RAYMOND JAMES STADIUM", corner: 0.65, shell: "concrete", skin: "#4b5058", skinHi: "#6b7280", ship: -1, boards: ENDS, empty: "#7f1d1d",
    ribbon: "#d50a0a", ribbonHi: "#ff7900", ribbonText: "BUCCANEERS  ·  FIRE THE CANNONS  ·  TAMPA BAY  ·  RAYMOND JAMES STADIUM  ·  BUCS",
    crowd: [["#d50a0a", 26], ["#34302b", 22], ["#ff7900", 6], ["#e5e7eb", 12], ["#475569", 12]] },
  // NFC West
  ARI: { name: "STATE FARM STADIUM", corner: 0.85, shell: "wall", roof: { from: 0.83, tex: "seams" }, skin: "#d6dbe1", skinHi: "#f8fafc", trusses: 0.3, retracted: true,
    ribbon: "#97233f", ribbonHi: "#ffb612", ribbonText: "CARDINALS  ·  RED SEA  ·  GLENDALE  ·  STATE FARM STADIUM  ·  CARDINALS",
    crowd: [["#97233f", 32], ["#0f172a", 20], ["#e5e7eb", 14], ["#ffb612", 4], ["#475569", 12]] },
  LAR: { ...SOFI, ribbon: "#003594", ribbonHi: "#ffa300", ribbonText: "RAMS  ·  WHOSE HOUSE  ·  LOS ANGELES  ·  SOFI STADIUM  ·  RAMS HOUSE",
    crowd: [["#003594", 30], ["#1d4ed8", 8], ["#ffa300", 14], ["#e5e7eb", 10], ["#0f172a", 14], ["#475569", 10]] },
  SF: { name: "LEVI'S STADIUM", corner: 0.55, shell: "concrete", skin: "#5b6470", skinHi: "#7b8592", tower: { side: -1, style: "garden", from: 0.62 }, boards: ENDS,
    ribbon: "#aa0000", ribbonHi: "#b3995d", ribbonInk: "#e5d3a8", ribbonText: "49ERS  ·  FAITHFUL  ·  SANTA CLARA  ·  LEVI'S STADIUM  ·  49ERS",
    crowd: [["#aa0000", 30], ["#b3995d", 14], ["#e5e7eb", 12], ["#0f172a", 14], ["#475569", 12]] },
  SEA: { name: "LUMEN FIELD", corner: 0.55, shell: "wall", skin: "#4b5563", skinHi: "#9ca3af", upper: { ends: [-1] }, bleachers: -1, wings: { at: 0.66 }, boards: [{ at: 0.93, h: 0.5 }],
    ribbon: "#002244", ribbonHi: "#69be28", ribbonInk: "#69be28", ribbonText: "SEAHAWKS  ·  12S  ·  SEATTLE  ·  LUMEN FIELD  ·  GO HAWKS",
    crowd: [["#002244", 30], ["#69be28", 16], ["#a5acaf", 10], ["#e5e7eb", 8], ["#0f172a", 14], ["#475569", 12]] },
};
