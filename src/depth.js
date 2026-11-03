// Depth charts without the drawing: who starts where, from your order, the real depth chart and
// snap shares. Pure (no React), so the game engine and the tests can use it.
import { snapOrdered } from "./snaps.js";
import { DL_SLOTS, dlOrder, naturalLine } from "./dline.js";
import { returnerOrder } from "./special.js";
import { ROLE_SLOTS, roleOrder } from "./roles.js";
import { isSpec, specialistOrder } from "./specialists.js";

// Starters per position: the same counts the game sim plays with.
export const STARTERS = { QB: 1, RB: 1, WR: 3, TE: 1, LT: 1, LG: 1, C: 1, RG: 1, RT: 1, DL: 4, LB: 3, CB: 3, S: 2, K: 1, P: 1 };

// Default pecking order: the club's real (ESPN) depth chart rank "dk" for this season, then rating.
// That only seeds the chart: once you order a position or set snap shares, yours win.
export const byDepth = (a, b) => (a.dk ?? 99) - (b.dk ?? 99) || b.ovr - a.ovr;

// Your order for a position (anyone you haven't placed goes behind, by default order). Pass your
// snap shares and the players getting the most snaps move to the front: snap share decides who starts.
export function depthOrderFor(roster, depthOrder, pos, snaps) {
  if (pos === "KR" || pos === "PR") return returnerOrder(roster, depthOrder, pos); // kick / punt returner
  if (isSpec(pos)) return specialistOrder(roster, depthOrder, pos); // situational specialists
  // A tight end you've put in the receiver chart is split out wide: he plays receiver (rated at
  // the receiver role, roles.js) and leaves the tight end chart until you move him back.
  const wide = new Set(((depthOrder || {}).WR || []).filter((id) => roster.some((p) => p.id === id && p.pos === "TE")));
  const players = roster.filter((p) => (p.pos === pos && !(pos === "TE" && wide.has(p.id))) || (pos === "WR" && wide.has(p.id)));
  const order = ((depthOrder || {})[pos] || []).map((id) => players.find((p) => p.id === id)).filter(Boolean);
  // the line's default order is its natural one (best fit at each spot), not the real depth chart's
  const base = pos === "DL" && !order.length ? naturalLine(players) : [...order, ...players.filter((p) => !order.includes(p)).sort(byDepth)];
  const ordered = snaps ? snapOrdered(pos, base, snaps) : base;
  // The line plays by spot (two ends, two tackles), so who's out matters to where everyone lines up:
  // the line is built from the players who can play (an injured starter's spot goes to the best
  // fit for it), and the ones who can't come last. The game, the field view and the depth chart
  // all read this same line, so a hurt end never shifts a teammate into a tackle spot.
  if (pos === "DL") {
    const out = (p) => p.injured || p.holdout || p.suspended;
    const able = players.filter((p) => !out(p));
    return [...dlOrder(able, (depthOrder || {}).DL || [], ordered.filter((p) => !out(p)), snaps), ...players.filter(out)];
  }
  // linebackers (SAM, MIKE, WILL), corners (CB1, CB2, nickel) and receivers (X, Z, slot) by role
  return ROLE_SLOTS[pos] ? roleOrder(pos, players, (depthOrder || {})[pos] || [], ordered, snaps) : ordered;
}



// Where each player sits: "QB1", "WR3", or "QB #2" for backups.
export function depthSlots(roster, depthOrder, snaps) {
  const out = {};
  for (const pos of Object.keys(STARTERS)) {
    depthOrderFor(roster, depthOrder, pos, snaps).forEach((p, i) => {
      const starter = i < STARTERS[pos];
      out[p.id] = { starter, label: pos === "DL" && starter ? DL_SLOTS[i] : ROLE_SLOTS[pos] && starter ? ROLE_SLOTS[pos][i] : starter ? (STARTERS[pos] > 1 ? `${pos}${i + 1}` : `${pos}1`) : `${pos} #${i + 1}` };
    });
  }
  return out;
}

// Spots without cover: positions with fewer healthy players than starters ("short"), or with
// just the starters and no one behind them ("thin"). The line counts as one group (a backup
// lineman covers more than one spot), as long as every spot has someone; kickers and punters
// carry no backups in the real league, so they only show when there's none.
// Returns [{ pos, side, kind: "short" | "thin", have, need }].
const SIDE_OF = { QB: "offense", RB: "offense", WR: "offense", TE: "offense", OL: "offense", LT: "offense", LG: "offense", C: "offense", RG: "offense", RT: "offense", DL: "defense", LB: "defense", CB: "defense", S: "defense", K: "special", P: "special" };
export function depthGaps(roster) {
  const ok = (roster || []).filter((p) => !p.injured && !p.holdout && !p.suspended);
  const n = (pos) => ok.filter((p) => p.pos === pos).length;
  const out = [];
  for (const pos of ["QB", "RB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "DL", "LB", "CB", "S", "K", "P"]) {
    const have = n(pos), need = STARTERS[pos];
    if (have < need) out.push({ pos, side: SIDE_OF[pos], kind: "short", have, need });
    else if (have === need && !["LT", "LG", "C", "RG", "RT", "K", "P"].includes(pos)) out.push({ pos, side: SIDE_OF[pos], kind: "thin", have, need });
  }
  const ol = ["LT", "LG", "C", "RG", "RT"];
  if (ol.every((pos) => n(pos) >= 1) && ol.reduce((s, pos) => s + n(pos), 0) <= 5) out.push({ pos: "OL", side: "offense", kind: "thin", have: 5, need: 5 });
  return out;
}
