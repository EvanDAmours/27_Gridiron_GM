// Easy Mode's lineup: the staff set the team by rating, around the few picks you make.
//
// bestLine: the offensive line's best five, whatever spot each is listed at. Every way of putting the
// healthy linemen in the five spots is tried and the one with the most rating at the spots wins (a
// lineman's rating at another spot is the one the game gives him there: positions.js moveOL), so two
// good right guards never sit one behind the other while a poor left guard starts; the backup moves
// over. Only the moves real clubs make: side to side, tackle and guard (for a real gain), a center to
// guard; nobody is made a center. Returns the moves to make ({ id, to }); none when the line is already its best. A move
// has to be worth more than a hair of rating, so the line doesn't shuffle on ties.
//
// easyDepth: the depth chart behind your picks. Your picks keep their spots; everyone else is ordered
// by overall (the real NFL depth chart only breaks ties, so a 78 starts over a 72 the real club lists
// first). The defensive line and the role spots (receivers X / Z / slot, corners 1-3, linebackers,
// safeties) are left to the game's own fit-based fill (dline.js, roles.js), which already starts the
// best player at each spot by his rating there.
import { OL_POS, moveOL } from "./positions.js";
import { ROLE_SLOTS } from "./roles.js";

const out = (p) => p.injured || p.holdout || p.suspended;
const MOVE_COST = 0.01; // (only a real gain moves a man off his listed spot)
const CROSS_COST = 1; // (to a different kind of spot, tackle and guard, it has to be worth more than a point)
const KIND = { LT: "T", RT: "T", LG: "G", RG: "G", C: "C" };

export function bestLine(roster) {
  const able = (roster || []).filter((p) => OL_POS.includes(p.pos) && !out(p));
  if (able.length < OL_POS.length) return [];
  // the ten best are plenty to look through (10 x 9 x 8 x 7 x 6 lineups)
  const cand = [...able].sort((a, b) => b.ovr - a.ovr).slice(0, 10);
  // who starts at each spot as listed: when moving either of two men gains the same, the backup moves
  const listed = new Set(OL_POS.map((pos) => able.filter((p) => p.pos === pos).sort((a, b) => b.ovr - a.ovr || (a.dk ?? 99) - (b.dk ?? 99))[0]?.id));
  const memo = new Map();
  const at = (p, spot) => {
    const k = `${p.id}|${spot}`;
    if (!memo.has(k)) {
      const home = KIND[p.posFrom?.pos || p.pos], to = KIND[spot];
      // the moves clubs make: a tackle to the other side, a guard to the other side, a tackle inside
      // to guard or a guard out to tackle, a center out to guard; nobody new snaps the ball
      const ok = p.pos === spot || home === to || (home === "T" && to === "G") || (home === "G" && to === "T") || (home === "C" && to === "G");
      memo.set(k, !ok ? -Infinity : moveOL(p, spot).ovr - (p.pos === spot ? 0 : (home === to ? MOVE_COST : CROSS_COST) * (listed.has(p.id) ? 1.5 : 1)));
    }
    return memo.get(k);
  };
  let best = -Infinity, pick = null;
  const used = new Set(), cur = [];
  const go = (i, sum) => {
    if (i === OL_POS.length) { if (sum > best + 1e-9) { best = sum; pick = [...cur]; } return; }
    for (const p of cand) {
      if (used.has(p.id)) continue;
      used.add(p.id); cur.push(p); go(i + 1, sum + at(p, OL_POS[i])); cur.pop(); used.delete(p.id);
    }
  };
  go(0, 0);
  return (pick || []).map((p, i) => (p.pos === OL_POS[i] ? null : { id: p.id, to: OL_POS[i] })).filter(Boolean);
}

const FIT_FILLED = new Set(["DL", ...Object.keys(ROLE_SLOTS)]);
const byRating = (a, b) => b.ovr - a.ovr || (a.dk ?? 99) - (b.dk ?? 99);

// picks: { pos: [id or null by spot] } (your choices from the Lineup page)
export function easyDepth(roster, picks = {}) {
  const byPos = {};
  for (const p of roster || []) (byPos[p.pos] ||= []).push(p);
  const depth = {};
  for (const [pos, ps] of Object.entries(byPos)) {
    const ids = new Set(ps.map((p) => p.id));
    const want = (picks?.[pos] || []).map((id) => (id != null && ids.has(id) ? id : null));
    if (FIT_FILLED.has(pos)) { if (want.some((x) => x != null)) depth[pos] = want; continue; }
    const rest = ps.filter((p) => !want.includes(p.id)).sort(byRating).map((p) => p.id);
    depth[pos] = [...want.map((id) => id ?? rest.shift()), ...rest].filter((x) => x != null);
  }
  return depth;
}
